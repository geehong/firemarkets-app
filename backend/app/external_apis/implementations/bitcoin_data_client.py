"""
Bitcoin Data API client for onchain data.
"""
import logging
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import httpx
import pandas as pd

from app.external_apis.base.onchain_client import OnChainAPIClient
from app.external_apis.base.schemas import CryptoData, OnChainMetricData, CryptoMetricsData
from app.external_apis.utils.helpers import safe_float, safe_date_parse

logger = logging.getLogger(__name__)


class BitcoinDataClient(OnChainAPIClient):
    """Bitcoin Data API client for onchain metrics"""
    
    def __init__(self):
        super().__init__()
        # Standard API URL (v1)
        self.base_url = "https://bitcoin-data.com/v1"
        self.call_timestamps = []  # Track request timestamps for strict rate limiting
        
        # Load API Key
        from app.core.config_manager import ConfigManager
        self.config_manager = ConfigManager()
        self.api_key = self.config_manager.get_bitcoin_data_api_key()
        
        if self.api_key:
            logger.info("BitcoinDataClient initialized with API Key")
        else:
            logger.warning("BitcoinDataClient initialized WITHOUT API Key. Strict rate limits (8/hr) apply.")

    async def _enforce_rate_limit(self):
        """
        Enforce rate limits internally.
        If API Key is present, we assume higher limits (Pro tier: 200/hr, 5000/day).
        If no API Key, we enforce strict 8 requests per hour limit.
        """
        import time
        import asyncio
        
        # If API key is present, we relax the 8/hr limit
        # But we still want to avoid bursting too fast if needed, but 200/hr is generous
        if self.api_key:
            # For Pro tier, simple burst protection is enough, handled by get_rate_limit_info
            return

        current_time = time.time()
        # Remove timestamps older than 1 hour (3600 seconds)
        self.call_timestamps = [t for t in self.call_timestamps if current_time - t < 3600]
        
        if len(self.call_timestamps) >= 8:
            # We reached the hourly limit
            # Wait until the oldest call expires
            oldest_call = min(self.call_timestamps)
            wait_time = 3600 - (current_time - oldest_call) + 5  # Add 5s buffer
            
            if wait_time > 0:
                logger.warning(f"BitcoinDataClient hourly limit reached (8/hr). Sleeping for {wait_time:.1f}s...")
                await asyncio.sleep(wait_time)
                # Recalculate after sleep
                current_time = time.time()
                self.call_timestamps = [t for t in self.call_timestamps if current_time - t < 3600]

        self.call_timestamps.append(time.time())

    async def test_connection(self) -> bool:
        """Test Bitcoin Data API connection"""
        try:
            async with httpx.AsyncClient() as client:
                # Test with a lightweight endpoint
                url = f"{self.base_url}/btc-price?size=1"
                params = {}
                if self.api_key:
                    params['api_key'] = self.api_key

                try:
                    response = await client.get(url, params=params, timeout=self.api_timeout)
                    if response.status_code == 200:
                        logger.info(f"Bitcoin Data API connection successful: {url}")
                        return True
                    else:
                        logger.warning(f"Connection test failed: {response.status_code} - {response.text}")
                except Exception as e:
                    logger.warning(f"Connection test failed for {url}: {e}")
                
                return False
        except Exception as e:
            logger.error(f"Bitcoin Data connection test failed: {e}")
            return False
    
    def get_rate_limit_info(self) -> Dict[str, Any]:
        """Get Bitcoin Data API rate limit information"""
        if self.api_key:
            # Pro tier limits
            return {
                "free_tier": {
                    "requests_per_minute": 300,
                    "requests_per_hour": 200,    # Pro tier
                    "requests_per_day": 5000,
                    "calls_per_minute": 60       # Relaxed
                }
            }
        
        return {
            "free_tier": {
                "requests_per_minute": 1,  # Prevent bursts (API limit is 8/hr)
                "requests_per_hour": 8,    # Free plan: 8 requests per hour
                "requests_per_day": 15,    # Free plan: 15 requests per day
                "calls_per_minute": 1      # For ApiStrategyManager compatibility
            }
        }
    
    async def _fetch_standard(self, client: httpx.AsyncClient, endpoint: str, params: Dict = None) -> Optional[List[Dict]]:
        """
        Fetch data from standard v1 endpoint.
        """
        await self._enforce_rate_limit()
        
        try:
            url = f"{self.base_url}/{endpoint}"
            
            final_params = params.copy() if params else {}
            if self.api_key:
                final_params['api_key'] = self.api_key
            
            # Log URL without API key for security
            log_url = url
            if final_params:
                display_params = {k: v for k, v in final_params.items() if k != 'api_key'}
                if display_params:
                     query_string = "&".join([f"{k}={v}" for k, v in display_params.items()])
                     log_url = f"{url}?{query_string}"
            
            logger.info(f"Fetching {endpoint} from {log_url}")
            
            response = await client.get(url, params=final_params, timeout=self.api_timeout)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for list directly
                if isinstance(data, list):
                    return data
                
                # Check for HAL _embedded
                if isinstance(data, dict) and "_embedded" in data:
                    for key, items in data["_embedded"].items():
                        if isinstance(items, list):
                            return items
                
                # Check if data itself is the content
                if isinstance(data, dict):
                    return [data]
                
                return None
            elif response.status_code == 429:
                logger.warning(f"Bitcoin API Rate Limit Exceeded (429). Headers: {response.headers}")
                return None
            else:
                logger.warning(f"Bitcoin API error {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error fetching {endpoint}: {e}")
            return None

    async def get_network_stats(self) -> Optional[Dict[str, Any]]:
        """
        Get network statistics (hashrate, difficulty, etc.)
        Required by OnChainAPIClient base class.
        """
        # We can implement this by fetching hashrate/difficulty via standard endpoint
        # But for now, returning None or basic stats is sufficient if not heavily used.
        # Alternatively, map to get_metric('hashrate')
        try:
            data = await self.get_metric('hashrate', days=1)
            if data and data[0].hashrate:
                return {"hashrate": data[0].hashrate}
        except Exception:
            pass
        return None

    async def get_onchain_metrics(self, metric_type: str = "all", days: int = None) -> Optional[Dict[str, Any]]:
        """
        Get specific onchain metrics.
        Required by OnChainAPIClient base class.
        Deprecated in favor of get_metric for specific metric fetching.
        """
        return None

    async def get_metric(self, metric_name: str, days: int = None, asset_id: int = None, start_date: str = None) -> Optional[List[CryptoMetricsData]]:
        """
        Fetch a specific onchain metric.
        Used by OnchainCollector via ApiStrategyManager.
        
        Args:
            metric_name: Name of the metric (snake_case)
            days: Number of days to fetch (defaults to 1 for latest)
            asset_id: Asset ID for the resulting data models
            start_date: Optional start date (YYYY-MM-DD) to fetch data from. 
                       If provided, acts as pagination to fetch data strictly AFTER this date.
        
        Returns:
            List of CryptoMetricsData objects
        """
        try:
            # Map metric_name to API endpoint and response field
            metric_map = {
                'mvrv_z_score': {'endpoint': 'mvrv-zscore', 'field': ['mvrvZscore', 'mvrvZScore', 'mvrv_z_score', 'mvrv']},
                'nupl': {'endpoint': 'nupl', 'field': ['nupl']},
                'sopr': {'endpoint': 'sopr', 'field': ['sopr']},
                'hashrate': {'endpoint': 'hashrate', 'field': ['hashrate']},
                'difficulty': {'endpoint': 'difficulty-BTC', 'field': ['difficultyBtc', 'difficulty']},
                'realized_price': {'endpoint': 'realized-price', 'field': ['realizedPrice', 'realized_price']},
                'thermo_cap': {'endpoint': 'thermo-cap', 'field': ['thermoCap', 'thermo_cap']},
                'true_market_mean': {'endpoint': 'true-market-mean', 'field': ['trueMarketMean', 'true_market_mean']},
                'aviv': {'endpoint': 'aviv', 'field': ['aviv']},
                'nrpl_usd': {'endpoint': 'nrpl-usd', 'field': ['nrplUsd', 'nrpl_usd']},
                'sth_realized_price': {'endpoint': 'sth-realized-price', 'field': ['sthRealizedPrice', 'sth_realized_price']},
                'lth_realized_price': {'endpoint': 'lth-realized-price', 'field': ['lthRealizedPrice', 'lth_realized_price']},
                'etf_btc_flow': {'endpoint': 'etf-flow-btc', 'field': ['etfFlow']},
                'etf_btc_total': {'endpoint': 'etf-btc-total', 'field': ['etfBtcTotal', 'etf_btc_total']},
                'hodl_waves_supply': {'endpoint': 'hodl-waves-supply', 'field': []},  # Field is distribution object
                'cdd_90dma': {'endpoint': 'cdd-90dma', 'field': ['cdd90dma', 'cdd_90dma']},
                # New metrics for expanded collection
                'mvrv': {'endpoint': 'mvrv', 'field': ['mvrv']},
                'lth_mvrv': {'endpoint': 'lth-mvrv', 'field': ['lthMvrv', 'mvrvLth', 'mvrv_lth']},
                'sth_mvrv': {'endpoint': 'sth-mvrv', 'field': ['sthMvrv', 'mvrvSth', 'mvrv_sth']},
                'puell_multiple': {'endpoint': 'puell-multiple', 'field': ['puellMultiple', 'puell_multiple']},
                'reserve_risk': {'endpoint': 'reserve-risk', 'field': ['reserveRisk', 'reserve_risk']},
                'rhodl_ratio': {'endpoint': 'rhodl-ratio', 'field': ['rhodlRatio', 'rhodl_ratio']},
                'terminal_price': {'endpoint': 'terminal-price', 'field': ['terminalPrice', 'terminal_price']},
                'delta_price_usd': {'endpoint': 'delta-price-usd', 'field': ['deltaPriceUsd', 'deltaPrice', 'delta_price_usd']},
                'lth_nupl': {'endpoint': 'nupl-lth', 'field': ['lthNupl', 'nuplLth', 'nupl_lth']},
                'sth_nupl': {'endpoint': 'nupl-sth', 'field': ['sthNupl', 'nuplSth', 'nupl_sth']},
                'utxos_in_profit_pct': {'endpoint': 'utxos-in-profit-pct', 'field': ['utxosInProfitPct', 'utxos_in_profit_pct']},
                'utxos_in_loss_pct': {'endpoint': 'utxos-in-loss-pct', 'field': ['utxosInLossPct', 'utxos_in_loss_pct']},
                'nvts': {'endpoint': 'nvts', 'field': ['nvts']},
                'market_cap': {'endpoint': 'market-cap', 'field': ['marketCap', 'market_cap']},
                'realized_cap': {'endpoint': 'realized-cap', 'field': ['realizedCap', 'realized_cap']}
            }
            
            if metric_name not in metric_map:
                logger.warning(f"Metric {metric_name} not supported by BitcoinDataClient")
                return None
            
            info = metric_map[metric_name]
            endpoint = info['endpoint']
            
            # Prepare query parameters
            query_params = {}
            
            # Use start_date if provided (this helps to skip massive amount of old data)
            # The API supports 'startday' parameter (YYYY-MM-DD)
            if start_date:
                query_params['startday'] = start_date
                # When using startday, we might still want to limit result size, but 'days' logic 
                # usually meant "last N days". If start_date is used, 'days' might be confusing.
                # Let's set a reasonable high limit if not specified, or use days as limit if provided.
                query_params['size'] = days if days else 2000 
                logger.info(f"Fetching {metric_name} with start_date={start_date} (size={query_params['size']})")
            else:
                # Default behavior: fetch last N records
                # By default the API returns data in descending order OR ascending depending on endpoint
                # For endpoints that return ascending (oldest first), fetching last N requires careful logic
                # unless API supports sorting. We assume 'size' usually gets us what we want 
                # or we just get what we get.
                size = days if days else 1
                query_params['size'] = size

            async with httpx.AsyncClient() as client:
                data = await self._fetch_standard(client, endpoint, query_params)
                
                if not data:
                    logger.warning(f"No data returned for {metric_name}")
                    return None
                
                metrics_list = []
                # Use provided asset_id or 0 (OnchainCollector should handle correct asset_id)
                safe_asset_id = asset_id if asset_id else 0
                
                for item in data:
                    try:
                        # Normalize timestamp
                        ts = None
                        
                        # Try unixTs first (standard across v1 endpoints)
                        if item.get('unixTs'):
                            try:
                                ts = datetime.fromtimestamp(float(item['unixTs']))
                            except (ValueError, TypeError):
                                pass

                        # Fallback to date strings
                        if not ts:
                            ts_str = item.get('theDay') or item.get('d') or item.get('timestamp') or item.get('date')
                            if ts_str:
                                ts = safe_date_parse(ts_str)
                                
                        if not ts:
                            continue
                        
                        # Special handling for hodl_waves_supply (Distribution Object)
                        if metric_name == 'hodl_waves_supply':
                             # Extract all age_* keys and format as distribution dict
                             hodl_dist = {}
                             for k, v in item.items():
                                 if k.startswith('age_'):
                                     # Remove 'age_' prefix to match expected schema (e.g. '0d_1d')
                                     key_name = k.replace('age_', '')
                                     try:
                                         if v is not None:
                                            hodl_dist[key_name] = float(v)
                                     except (ValueError, TypeError):
                                         pass
                             
                             if hodl_dist:
                                 # Create metrics object with distribution
                                 metric_obj = CryptoMetricsData(
                                     asset_id=safe_asset_id,
                                     timestamp_utc=ts,
                                     hodl_age_distribution=hodl_dist,
                                     # Also set a scalar value if needed, but likely we just want the dist.
                                     # The schema has hodl_waves_supply as float, but it's actually a concept.
                                     # We will leave hodl_waves_supply scalar as None or 0.
                                     hodl_waves_supply=0.0 
                                 )
                                 metrics_list.append(metric_obj)
                             continue

                        # Standard scalar value extraction
                        val = None
                        for f in info['field']:
                            if f in item and item[f] is not None:
                                val = item[f]
                                break
                        
                        if val is None:
                            # Try generic value keys if specific keys not found
                            val = item.get('value') or item.get('v')
                            if val is None: 
                                continue
                        
                        # Construct data model
                        kwargs = {
                            'asset_id': safe_asset_id,
                            'timestamp_utc': ts,
                            metric_name: val
                        }
                        
                        metric_obj = CryptoMetricsData(**kwargs)
                        metrics_list.append(metric_obj)
                        
                    except Exception as e:
                        logger.warning(f"Error parsing item for {metric_name}: {e}")
                        continue
                
                logger.info(f"Parsed {len(metrics_list)} records for {metric_name}")
                return metrics_list
                
        except Exception as e:
            logger.error(f"Error fetching metric {metric_name}: {e}")
            return None


