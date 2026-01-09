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

    async def _enforce_rate_limit(self):
        """
        Enforce 8 requests per hour limit internally.
        Since ApiStrategyManager only handles per-minute limits comfortably,
        we handle the hourly constraint here to support ~15 metrics collection.
        """
        import time
        import asyncio
        
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
                try:
                    response = await client.get(url, timeout=self.api_timeout)
                    if response.status_code == 200:
                        logger.info(f"Bitcoin Data API connection successful: {url}")
                        return True
                    else:
                        logger.warning(f"Connection test failed: {response.status_code}")
                except Exception as e:
                    logger.warning(f"Connection test failed for {url}: {e}")
                
                return False
        except Exception as e:
            logger.error(f"Bitcoin Data connection test failed: {e}")
            return False
    
    def get_rate_limit_info(self) -> Dict[str, Any]:
        """Get Bitcoin Data API rate limit information"""
        return {
            "free_tier": {
                "requests_per_minute": 1,  # Prevent bursts (API limit is 8/hr)
                "requests_per_hour": 8,    # Free plan: 8 requests per hour
                "requests_per_day": 15,    # Free plan: 15 requests per day
                "calls_per_minute": 1      # For ApiStrategyManager compatibility
            },
            "pro_tier": {
                "requests_per_minute": 300,
                "requests_per_day": 10000
            }
        }
    
    async def _fetch_standard(self, client: httpx.AsyncClient, endpoint: str, params: Dict = None) -> Optional[List[Dict]]:
        """
        Fetch data from standard v1 endpoint.
        """
        await self._enforce_rate_limit()
        
        try:
            url = f"{self.base_url}/{endpoint}"
            if params:
                query_string = "&".join([f"{k}={v}" for k, v in params.items()])
                url = f"{url}?{query_string}"
            
            logger.info(f"Fetching {endpoint} from {url}")
            
            response = await client.get(url, timeout=self.api_timeout)
            
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

    async def get_metric(self, metric_name: str, days: int = None, asset_id: int = None) -> Optional[List[CryptoMetricsData]]:
        """
        Fetch a specific onchain metric.
        Used by OnchainCollector via ApiStrategyManager.
        
        Args:
            metric_name: Name of the metric (snake_case)
            days: Number of days to fetch (defaults to 1 for latest)
            asset_id: Asset ID for the resulting data models
        
        Returns:
            List of CryptoMetricsData objects
        """
        try:
            # Map metric_name to API endpoint and response field
            metric_map = {
                'mvrv_z_score': {'endpoint': 'mvrv', 'field': ['mvrv', 'mvrvZscore', 'mvrv_z_score']},
                'nupl': {'endpoint': 'nupl', 'field': ['nupl']},
                'sopr': {'endpoint': 'sopr', 'field': ['sopr']},
                'hashrate': {'endpoint': 'hashrate', 'field': ['hashrate']},
                'difficulty': {'endpoint': 'difficulty-btc', 'field': ['difficultyBtc', 'difficulty']},
                'realized_price': {'endpoint': 'realized-price', 'field': ['realizedPrice', 'realized_price']},
                'thermo_cap': {'endpoint': 'thermo-cap', 'field': ['thermoCap', 'thermo_cap']},
                'true_market_mean': {'endpoint': 'true-market-mean', 'field': ['trueMarketMean', 'true_market_mean']},
                'aviv': {'endpoint': 'aviv', 'field': ['aviv']},
                'nrpl_btc': {'endpoint': 'nrpl-btc', 'field': ['nrplBtc', 'nrpl_btc']},
                'etf_btc_flow': {'endpoint': 'etf-btc-flow', 'field': ['etfFlow', 'etfBtcFlow', 'etf_btc_flow']},
                'etf_btc_total': {'endpoint': 'etf-btc-total', 'field': ['etfBtcTotal', 'etf_btc_total']},
                'hodl_waves_supply': {'endpoint': 'hodl-waves-supply', 'field': ['hodlWavesSupply', 'hodl_waves_supply']},
                'open_interest_futures': {'endpoint': 'open-interest-futures', 'field': ['openInterestFutures', 'open_interest_futures']},
                'cdd_90dma': {'endpoint': 'cdd-90dma', 'field': ['cdd90dma', 'cdd_90dma']}
            }
            
            if metric_name not in metric_map:
                logger.warning(f"Metric {metric_name} not supported by BitcoinDataClient")
                return None
            
            info = metric_map[metric_name]
            endpoint = info['endpoint']
            
            # Default to fetching latest 1 record if days not specified
            # The API 'size' parameter controls how many records to fetch (descending sort by default)
            size = days if days else 1
            
            async with httpx.AsyncClient() as client:
                data = await self._fetch_standard(client, endpoint, {'size': size, 'sort': 'timestamp,desc'})
                
                if not data:
                    logger.warning(f"No data returned for {metric_name}")
                    return None
                
                metrics_list = []
                # Use provided asset_id or 0 (OnchainCollector should handle correct asset_id)
                safe_asset_id = asset_id if asset_id else 0
                
                for item in data:
                    try:
                        # Normalize timestamp
                        ts_str = item.get('d') or item.get('timestamp') or item.get('date') or item.get('unixTs')
                        if not ts_str:
                            continue
                            
                        ts = safe_date_parse(ts_str)
                        if not ts:
                            continue
                        
                        # Find the value
                        val = None
                        for f in info['field']:
                            if f in item and item[f] is not None:
                                val = item[f]
                                break
                        
                        # Handle special case for open_interest_futures (dict/JSON)
                        if metric_name == 'open_interest_futures' and val is None:
                             # For this one, the item itself might be the container or fields are top level
                             # But let's assume standard structure. If not found, skip.
                             pass

                        if val is None:
                            # Try generic value keys if specific keys not found
                            val = item.get('value') or item.get('v')
                            if val is None: 
                                continue
                        
                        # Construct data model
                        # We only populate the specific field for this metric
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


