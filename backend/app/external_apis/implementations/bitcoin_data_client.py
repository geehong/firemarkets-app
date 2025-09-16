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
        # 하이브리드 방식: 기존 방식과 새로운 방식 모두 지원
        self.base_url_legacy = "https://bitcoin-data.com/api"  # 기존 방식 (리다이렉션)
        self.base_url_standard = "https://bitcoin-data.com"    # 새로운 표준 방식
        self.base_url = self.base_url_legacy  # 호환성을 위한 기본 URL
        self.use_legacy = True  # 기본적으로 기존 방식 사용 (안정성)
    
    async def test_connection(self) -> bool:
        """Test Bitcoin Data API connection"""
        try:
            async with httpx.AsyncClient() as client:
                # 두 가지 방식 모두 테스트
                urls_to_test = [
                    f"{self.base_url_legacy}/profile",  # 기존 방식
                    f"{self.base_url_standard}/v1/btc-price"  # 새로운 방식
                ]
                
                for url in urls_to_test:
                    try:
                        response = await client.get(url, timeout=self.api_timeout)
                        if response.status_code == 200:
                            logger.info(f"Bitcoin Data API connection successful: {url}")
                            return True
                    except Exception as e:
                        logger.warning(f"Connection test failed for {url}: {e}")
                        continue
                
                logger.error("All Bitcoin Data API connection tests failed")
                return False
        except Exception as e:
            logger.error(f"Bitcoin Data connection test failed: {e}")
            return False
    
    def get_rate_limit_info(self) -> Dict[str, Any]:
        """Get Bitcoin Data API rate limit information"""
        return {
            "free_tier": {
                "requests_per_minute": 4,  # 실제 API 문서 기준
                "requests_per_hour": 4,    # 실제 제한으로 되돌림
                "requests_per_day": 50
            },
            "pro_tier": {
                "requests_per_minute": 300,
                "requests_per_day": 10000
            }
        }
    
    async def _fetch_with_fallback(self, client: httpx.AsyncClient, endpoint: str, metric_name: str) -> Optional[Dict]:
        """
        하이브리드 방식으로 API 호출 (기존 방식 → 새로운 방식 순서로 시도)
        
        Args:
            client: httpx.AsyncClient
            endpoint: 엔드포인트 이름 (예: 'btc-price', 'mvrv-zscore')
            metric_name: 메트릭 이름 (로깅용)
            
        Returns:
            API 응답 데이터 또는 None
        """
        # 엔드포인트 매핑 (기존 방식 → 새로운 방식)
        endpoint_mapping = {
            'btc-price': {'legacy': 'btcPrices', 'standard': 'btc-price'},
            'mvrv-zscore': {'legacy': 'mvrvs', 'standard': 'mvrv-zscore'},
            'nupl': {'legacy': 'nupls', 'standard': 'nupl'},
            'sopr': {'legacy': 'soprs', 'standard': 'sopr'},
            'hashrate': {'legacy': 'hashrates', 'standard': 'hashrate'},
            'difficulty': {'legacy': 'difficultyBtcs', 'standard': 'difficulty-btc'},
            'realized-price': {'legacy': 'realizedPrices', 'standard': 'realized-price'},
            'thermo-cap': {'legacy': 'thermoCaps', 'standard': 'thermo-cap'},
            'etf-btc-total': {'legacy': 'etfBtcTotals', 'standard': 'etf-btc-total'},
            'etf-btc-flow': {'legacy': 'etfBtcFlows', 'standard': 'etf-btc-flow'},
            'hodl-waves-supply': {'legacy': 'hodlWavesSupplies', 'standard': 'hodl-waves-supply'},
            'cap-real-usd': {'legacy': 'capRealUsds', 'standard': 'cap-real-usd'},
            'cdd-90dma': {'legacy': 'cdd90dmas', 'standard': 'cdd-90dma'},
            'true-market-mean': {'legacy': 'trueMarketMeans', 'standard': 'true-market-mean'},
            'nrpl-btc': {'legacy': 'nrplBtcs', 'standard': 'nrpl-btc'},
            'aviv': {'legacy': 'avivs', 'standard': 'aviv'},
            'open-interest-futures': {'legacy': 'openInterestFutures', 'standard': 'open-interest-futures'}
        }
        
        mapping = endpoint_mapping.get(endpoint, {'legacy': endpoint, 'standard': endpoint})
        
        # 1. 기존 방식 시도 (리다이렉션 방식)
        try:
            legacy_url = f"{self.base_url_legacy}/{mapping['legacy']}?size=30&sort=timestamp,desc"
            logger.info(f"Trying legacy endpoint for {metric_name}: {legacy_url}")
            
            data = await self._fetch_async(client, legacy_url, "BitcoinData", metric_name)
            
            if data and isinstance(data, dict) and "_embedded" in data:
                # 기존 방식 응답 구조 처리
                items = data["_embedded"].get(mapping['legacy'], [])
                if items:
                    logger.info(f"Successfully fetched {len(items)} records using legacy endpoint for {metric_name}")
                    return {"data": items, "format": "legacy"}
            
        except Exception as e:
            logger.warning(f"Legacy endpoint failed for {metric_name}: {e}")
        
        # 2. 새로운 방식 시도 (표준 방식)
        try:
            standard_url = f"{self.base_url_standard}/v1/{mapping['standard']}"
            logger.info(f"Trying standard endpoint for {metric_name}: {standard_url}")
            
            data = await self._fetch_async(client, standard_url, "BitcoinData", metric_name)
            
            if data and isinstance(data, list):
                # 새로운 방식 응답 구조 처리
                logger.info(f"Successfully fetched {len(data)} records using standard endpoint for {metric_name}")
                return {"data": data, "format": "standard"}
            
        except Exception as e:
            logger.warning(f"Standard endpoint failed for {metric_name}: {e}")
        
        logger.error(f"All endpoints failed for {metric_name}")
        return None
    
    async def get_metric(self, metric_name: str, days: int = 30) -> Optional[List]:
        """
        Get a specific onchain metric by name.
        
        Args:
            metric_name: Name of the metric (e.g., "mvrv_z_score", "nupl", "sopr")
            days: Number of days to fetch
            
        Returns:
            List of metric data points or None
        """
        try:
            # 메트릭 이름 매핑
            metric_mapping = {
                "mvrv_z_score": "mvrv",
                "nupl": "nupl", 
                "sopr": "sopr",
                "hashrate": "hashrate",
                "difficulty": "difficulty"
            }
            
            metric_type = metric_mapping.get(metric_name, metric_name)
            
            if metric_type in ["mvrv", "nupl", "sopr"]:
                return await self.get_onchain_metrics(metric_type, days)
            elif metric_type in ["hashrate", "difficulty"]:
                return await self.get_network_stats(metric_type, days)
            else:
                logger.warning(f"Unknown metric: {metric_name}")
                return None
                
        except Exception as e:
            logger.error(f"Bitcoin Data get_metric error for {metric_name}: {e}")
            return None

    async def get_onchain_metrics(
        self, 
        metric_type: str = "all",
        days: int = 30
    ) -> Optional[List[OnChainMetricData]]:
        """
        Get specific onchain metrics (e.g., MVRV, SOPR).
        
        Args:
            metric_type: Type of metric ("all", "mvrv", "nupl", "sopr", etc.)
            days: Number of days to fetch
            
        Returns:
            Onchain metrics data or None
        """
        try:
            metrics = {}
            
            if metric_type in ["all", "mvrv"]:
                mvrv_data = await self._get_mvrv_ratio(days)
                if mvrv_data is not None:
                    metrics["mvrv"] = mvrv_data
            
            if metric_type in ["all", "nupl"]:
                nupl_data = await self._get_nupl_ratio(days)
                if nupl_data is not None:
                    metrics["nupl"] = nupl_data
            
            if metric_type in ["all", "sopr"]:
                sopr_data = await self._get_sopr_ratio(days)
                if sopr_data is not None:
                    metrics["sopr"] = sopr_data
            
            return metrics if metrics else None
            
        except Exception as e:
            logger.error(f"Bitcoin Data onchain metrics fetch error: {e}")
            return None
    
    async def get_network_stats(
        self, 
        stat_type: str = "all",
        days: int = 30
    ) -> Optional[List[OnChainMetricData]]:
        """
        Get network statistics (e.g., hashrate, difficulty).
        
        Args:
            stat_type: Type of statistic ("all", "hashrate", "difficulty", etc.)
            days: Number of days to fetch
            
        Returns:
            Network statistics data or None
        """
        try:
            stats = {}
            
            if stat_type in ["all", "hashrate"]:
                hashrate_data = await self._get_hashrate(days)
                if hashrate_data is not None:
                    stats["hashrate"] = hashrate_data
            
            if stat_type in ["all", "difficulty"]:
                difficulty_data = await self._get_difficulty(days)
                if difficulty_data is not None:
                    stats["difficulty"] = difficulty_data
            
            if stat_type in ["all", "price"]:
                price_data = await self._get_btc_price(days)
                if price_data is not None:
                    stats["price"] = price_data
            
            return stats if stats else None
            
        except Exception as e:
            logger.error(f"Bitcoin Data network stats fetch error: {e}")
            return None
    
    async def _get_btc_price(self, days: int = 30) -> Optional[pd.DataFrame]:
        """Get Bitcoin price data (하이브리드 방식)"""
        try:
            async with httpx.AsyncClient() as client:
                result = await self._fetch_with_fallback(client, 'btc-price', 'btc_price')
                
                if result and result.get("data"):
                    items = result["data"]
                    if items:
                        df = pd.DataFrame(items)
                        # 타임스탬프 필드명 처리
                        if 'timestamp' in df.columns:
                            df['timestamp'] = pd.to_datetime(df['timestamp'])
                        elif 'd' in df.columns:
                            df['timestamp'] = pd.to_datetime(df['d'])
                        return df
                
                return None
                
        except Exception as e:
            logger.error(f"Bitcoin Data BTC price fetch error: {e}")
            return None
    
    async def _get_mvrv_ratio(self, days: int = 30) -> Optional[pd.DataFrame]:
        """Get MVRV (Market Value to Realized Value) ratio (하이브리드 방식)"""
        try:
            async with httpx.AsyncClient() as client:
                result = await self._fetch_with_fallback(client, 'mvrv-zscore', 'mvrv')
                
                if result and result.get("data"):
                    items = result["data"]
                    if items:
                        df = pd.DataFrame(items)
                        # 타임스탬프 필드명 처리
                        if 'timestamp' in df.columns:
                            df['timestamp'] = pd.to_datetime(df['timestamp'])
                        elif 'd' in df.columns:
                            df['timestamp'] = pd.to_datetime(df['d'])
                        return df
                
                return None
                
        except Exception as e:
            logger.error(f"Bitcoin Data MVRV fetch error: {e}")
            return None
    
    async def _get_nupl_ratio(self, days: int = 30) -> Optional[pd.DataFrame]:
        """Get NUPL (Net Unrealized Profit/Loss) ratio"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/nupls?size={days}&sort=timestamp,desc"
                data = await self._fetch_async(client, url, "BitcoinData", "nupl")
                
                if data and isinstance(data, dict) and "_embedded" in data:
                    items = data["_embedded"].get("nupls", [])
                    if items:
                        df = pd.DataFrame(items)
                        df['timestamp'] = pd.to_datetime(df['timestamp'])
                        return df
                
                return None
                
        except Exception as e:
            logger.error(f"Bitcoin Data NUPL fetch error: {e}")
            return None
    
    async def _get_sopr_ratio(self, days: int = 30) -> Optional[pd.DataFrame]:
        """Get SOPR (Spent Output Profit Ratio)"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/soprs?size={days}&sort=timestamp,desc"
                data = await self._fetch_async(client, url, "BitcoinData", "sopr")
                
                if data and isinstance(data, dict) and "_embedded" in data:
                    items = data["_embedded"].get("soprs", [])
                    if items:
                        df = pd.DataFrame(items)
                        df['timestamp'] = pd.to_datetime(df['timestamp'])
                        return df
                
                return None
                
        except Exception as e:
            logger.error(f"Bitcoin Data SOPR fetch error: {e}")
            return None
    
    async def _get_hashrate(self, days: int = 30) -> Optional[pd.DataFrame]:
        """Get Bitcoin hashrate data"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/hashrates?size={days}&sort=timestamp,desc"
                data = await self._fetch_async(client, url, "BitcoinData", "hashrate")
                
                if data and isinstance(data, dict) and "_embedded" in data:
                    items = data["_embedded"].get("hashrates", [])
                    if items:
                        df = pd.DataFrame(items)
                        df['timestamp'] = pd.to_datetime(df['timestamp'])
                        return df
                
                return None
                
        except Exception as e:
            logger.error(f"Bitcoin Data hashrate fetch error: {e}")
            return None
    
    async def _get_difficulty(self, days: int = 30) -> Optional[pd.DataFrame]:
        """Get Bitcoin difficulty data"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/difficultyBtcs?size={days}&sort=timestamp,desc"
                data = await self._fetch_async(client, url, "BitcoinData", "difficulty")
                
                if data and isinstance(data, dict) and "_embedded" in data:
                    items = data["_embedded"].get("difficultyBtcs", [])
                    if items:
                        df = pd.DataFrame(items)
                        df['timestamp'] = pd.to_datetime(df['timestamp'])
                        return df
                
                return None
                
        except Exception as e:
            logger.error(f"Bitcoin Data difficulty fetch error: {e}")
            return None
    
    async def get_crypto_data(self, symbol: str) -> Optional[CryptoData]:
        """Get comprehensive cryptocurrency data from Bitcoin Data API (하이브리드 방식)"""
        try:
            # Bitcoin Data API는 주로 온체인 메트릭에 특화되어 있으므로
            # 기본적인 암호화폐 데이터는 제한적으로 제공
            async with httpx.AsyncClient() as client:
                # Get current price using hybrid approach
                result = await self._fetch_with_fallback(client, 'btc-price', symbol)
                
                if result and result.get("data"):
                    items = result["data"]
                    if items and len(items) > 0:
                        latest_item = items[0]  # 가장 최신 데이터
                        
                        # 가격 필드명 처리
                        price = None
                        if 'btcPrice' in latest_item:
                            price = safe_float(latest_item['btcPrice'])
                        elif 'price' in latest_item:
                            price = safe_float(latest_item['price'])
                        
                        if price:
                            crypto_data = CryptoData(
                                symbol=symbol,
                                price=price,
                                market_cap=None,  # Bitcoin Data API는 market cap을 제공하지 않음
                                volume_24h=None,  # Bitcoin Data API는 volume을 제공하지 않음
                                change_24h=None,  # Bitcoin Data API는 24h change를 제공하지 않음
                                circulating_supply=None,  # Bitcoin Data API는 supply 정보를 제공하지 않음
                                total_supply=None,
                                max_supply=None,
                                rank=None,  # Bitcoin Data API는 rank를 제공하지 않음
                                timestamp_utc=datetime.now()
                            )
                            return crypto_data
                    
        except Exception as e:
            logger.error(f"Bitcoin Data crypto data fetch failed for {symbol}: {e}")
        
        return None

    async def get_crypto_metrics(self, asset_id: int, days: int = 30) -> Optional[List[CryptoMetricsData]]:
        """Get comprehensive crypto metrics data matching the database schema (하이브리드 방식)"""
        try:
            # 수집할 메트릭 목록
            metrics_to_fetch = [
                'mvrv-zscore', 'sopr', 'nupl', 'realized-price', 'hashrate',
                'difficulty', 'miner-reserves', 'etf-btc-total', 'open-interest-futures',
                'cap-real-usd', 'cdd-90dma', 'true-market-mean', 'nrpl-btc',
                'aviv', 'thermo-cap', 'hodl-waves-supply', 'etf-btc-flow'
            ]
            
            metrics_list = []
            
            async with httpx.AsyncClient() as client:
                for metric_name in metrics_to_fetch:
                    try:
                        result = await self._fetch_with_fallback(client, metric_name, metric_name)
                        
                        if result and result.get("data"):
                            items = result["data"]
                            
                            for item in items:
                                try:
                                    # JSON 데이터 파싱 (open_interest_futures)
                                    open_interest_futures = None
                                    if metric_name == 'open-interest-futures' and item.get("openInterestFutures"):
                                        try:
                                            import json
                                            open_interest_futures = json.loads(item["openInterestFutures"])
                                        except (json.JSONDecodeError, TypeError):
                                            open_interest_futures = None
                                    
                                    # CryptoMetricsData 객체 생성
                                    metric = CryptoMetricsData(
                                        asset_id=asset_id,
                                        timestamp_utc=safe_date_parse(item.get("d") or item.get("timestamp")) or datetime.now(),
                                        
                                        # 기본 온체인 지표
                                        mvrv_z_score=safe_float(item.get("mvrvZscore") or item.get("mvrv_z_score")),
                                        nupl=safe_float(item.get("nupl")),
                                        sopr=safe_float(item.get("sopr")),
                                        realized_cap=safe_float(item.get("capRealUSD") or item.get("realized_cap")),
                                        realized_price=safe_float(item.get("realizedPrice") or item.get("realized_price")),
                                        thermo_cap=safe_float(item.get("thermoCap") or item.get("thermo_cap")),
                                        true_market_mean=safe_float(item.get("trueMarketMean") or item.get("true_market_mean")),
                                        
                                        # 네트워크 지표
                                        hashrate=safe_float(item.get("hashrate")),
                                        difficulty=safe_float(item.get("difficultyBtc") or item.get("difficulty")),
                                        
                                        # HODL Age 분포 (별도 엔드포인트에서 가져와야 함)
                                        hodl_age_0d_1d=None,  # 별도 처리 필요
                                        hodl_age_1d_1w=None,
                                        hodl_age_1w_1m=None,
                                        hodl_age_1m_3m=None,
                                        hodl_age_3m_6m=None,
                                        hodl_age_6m_1y=None,
                                        hodl_age_1y_2y=None,
                                        hodl_age_2y_3y=None,
                                        hodl_age_3y_4y=None,
                                        hodl_age_4y_5y=None,
                                        hodl_age_5y_7y=None,
                                        hodl_age_7y_10y=None,
                                        hodl_age_10y=None,
                                        hodl_waves_supply=safe_float(item.get("hodlWavesSupply") or item.get("hodl_waves_supply")),
                                        
                                        # 기타 지표
                                        aviv=safe_float(item.get("aviv")),
                                        cdd_90dma=safe_float(item.get("cdd90dma") or item.get("cdd_90dma")),
                                        nrpl_btc=safe_float(item.get("nrplBtc") or item.get("nrpl_btc")),
                                        miner_reserves=safe_float(item.get("reserves") or item.get("miner_reserves")),
                                        
                                        # ETF 데이터
                                        etf_btc_flow=safe_float(item.get("etfFlow") or item.get("etf_btc_flow")),
                                        etf_btc_total=safe_float(item.get("etfBtcTotal") or item.get("etf_btc_total")),
                                        
                                        # Futures 데이터
                                        open_interest_futures=open_interest_futures
                                    )
                                    metrics_list.append(metric)
                                    
                                except Exception as e:
                                    logger.error(f"Error parsing metric item for {metric_name}: {e}")
                                    continue
                        
                        # Rate limiting 고려 (Free plan: 시간당 4개)
                        await asyncio.sleep(60)  # 60초 대기 (시간당 4개 = 900초/4 = 225초 간격, 여유분 고려)
                        
                    except Exception as e:
                        logger.error(f"Error fetching {metric_name}: {e}")
                        continue
            
            return metrics_list if metrics_list else None
            
        except Exception as e:
            logger.error(f"Bitcoin Data crypto metrics fetch failed: {e}")
            return None


