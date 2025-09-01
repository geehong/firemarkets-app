"""
Bitcoin Data API client for onchain data.
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import httpx
import pandas as pd

from .base_client import BaseAPIClient

logger = logging.getLogger(__name__)


class BitcoinDataClient(BaseAPIClient):
    """Bitcoin Data API client for onchain metrics"""
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://bitcoin-data.com/api"
    
    async def test_connection(self) -> bool:
        """Test Bitcoin Data API connection"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/profile"
                response = await client.get(url, timeout=self.api_timeout)
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Bitcoin Data connection test failed: {e}")
            return False
    
    def get_rate_limit_info(self) -> Dict[str, Any]:
        """Get Bitcoin Data API rate limit information"""
        return {
            "free_tier": {
                "requests_per_minute": 60,
                "requests_per_day": 1000
            },
            "pro_tier": {
                "requests_per_minute": 300,
                "requests_per_day": 10000
            }
        }
    
    async def get_btc_price(self, days: int = 30) -> Optional[pd.DataFrame]:
        """
        비트코인 가격 데이터 조회
        
        Args:
            days: 조회할 일수 (기본값: 30일)
            
        Returns:
            DataFrame 또는 None
        """
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/btcPrices?size={days}&sort=timestamp,desc"
                data = await self._fetch_async(client, url, "BitcoinData", "btc_price")
                
                if data and isinstance(data, dict) and "_embedded" in data:
                    items = data["_embedded"].get("btcPrices", [])
                    if items:
                        df = pd.DataFrame(items)
                        df['timestamp'] = pd.to_datetime(df['timestamp'])
                        return df
                
                return None
                
        except Exception as e:
            logger.error(f"Bitcoin Data BTC price fetch error: {e}")
            return None
    
    async def get_mvrv_ratio(self, days: int = 30) -> Optional[pd.DataFrame]:
        """
        MVRV (Market Value to Realized Value) 비율 조회
        
        Args:
            days: 조회할 일수 (기본값: 30일)
            
        Returns:
            DataFrame 또는 None
        """
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/mvrvs?size={days}&sort=timestamp,desc"
                data = await self._fetch_async(client, url, "BitcoinData", "mvrv")
                
                if data and isinstance(data, dict) and "_embedded" in data:
                    items = data["_embedded"].get("mvrvs", [])
                    if items:
                        df = pd.DataFrame(items)
                        df['timestamp'] = pd.to_datetime(df['timestamp'])
                        return df
                
                return None
                
        except Exception as e:
            logger.error(f"Bitcoin Data MVRV fetch error: {e}")
            return None
    
    async def get_nupl_ratio(self, days: int = 30) -> Optional[pd.DataFrame]:
        """
        NUPL (Net Unrealized Profit/Loss) 비율 조회
        
        Args:
            days: 조회할 일수 (기본값: 30일)
            
        Returns:
            DataFrame 또는 None
        """
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
    
    async def get_sopr_ratio(self, days: int = 30) -> Optional[pd.DataFrame]:
        """
        SOPR (Spent Output Profit Ratio) 조회
        
        Args:
            days: 조회할 일수 (기본값: 30일)
            
        Returns:
            DataFrame 또는 None
        """
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
    
    async def get_hashrate(self, days: int = 30) -> Optional[pd.DataFrame]:
        """
        비트코인 해시레이트 데이터 조회
        
        Args:
            days: 조회할 일수 (기본값: 30일)
            
        Returns:
            DataFrame 또는 None
        """
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
    
    async def get_difficulty(self, days: int = 30) -> Optional[pd.DataFrame]:
        """
        비트코인 난이도 데이터 조회
        
        Args:
            days: 조회할 일수 (기본값: 30일)
            
        Returns:
            DataFrame 또는 None
        """
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
    
    async def get_onchain_metrics(self, metric_type: str = "all", days: int = 30) -> Optional[Dict[str, pd.DataFrame]]:
        """
        여러 온체인 메트릭을 한번에 조회
        
        Args:
            metric_type: 메트릭 타입 ("all", "price", "mvrv", "nupl", "sopr", "hashrate", "difficulty")
            days: 조회할 일수 (기본값: 30일)
            
        Returns:
            메트릭별 DataFrame을 포함한 딕셔너리 또는 None
        """
        try:
            metrics = {}
            
            if metric_type in ["all", "price"]:
                price_data = await self.get_btc_price(days)
                if price_data is not None:
                    metrics["price"] = price_data
            
            if metric_type in ["all", "mvrv"]:
                mvrv_data = await self.get_mvrv_ratio(days)
                if mvrv_data is not None:
                    metrics["mvrv"] = mvrv_data
            
            if metric_type in ["all", "nupl"]:
                nupl_data = await self.get_nupl_ratio(days)
                if nupl_data is not None:
                    metrics["nupl"] = nupl_data
            
            if metric_type in ["all", "sopr"]:
                sopr_data = await self.get_sopr_ratio(days)
                if sopr_data is not None:
                    metrics["sopr"] = sopr_data
            
            if metric_type in ["all", "hashrate"]:
                hashrate_data = await self.get_hashrate(days)
                if hashrate_data is not None:
                    metrics["hashrate"] = hashrate_data
            
            if metric_type in ["all", "difficulty"]:
                difficulty_data = await self.get_difficulty(days)
                if difficulty_data is not None:
                    metrics["difficulty"] = difficulty_data
            
            return metrics if metrics else None
            
        except Exception as e:
            logger.error(f"Bitcoin Data onchain metrics fetch error: {e}")
            return None
    
    async def get_historical_data(self, symbol: str, interval: str = "1d", limit: int = 100) -> Optional[pd.DataFrame]:
        """
        BaseAPIClient 호환성을 위한 메서드 - 비트코인 가격 데이터 반환
        
        Args:
            symbol: 심볼 (BTC만 지원)
            interval: 간격 (무시됨)
            limit: 조회할 데이터 개수
            
        Returns:
            DataFrame 또는 None
        """
        if symbol.upper() != "BTC":
            logger.warning(f"BitcoinDataClient only supports BTC, got {symbol}")
            return None
        
        return await self.get_btc_price(limit)
    
    async def get_crypto_data(self, symbol: str, interval: str = "1d", limit: int = 100) -> Optional[pd.DataFrame]:
        """
        암호화폐 데이터 조회 (BaseAPIClient 호환성)
        
        Args:
            symbol: 심볼 (BTC만 지원)
            interval: 간격 (무시됨)
            limit: 조회할 데이터 개수
            
        Returns:
            DataFrame 또는 None
        """
        if symbol.upper() != "BTC":
            logger.warning(f"BitcoinDataClient only supports BTC, got {symbol}")
            return None
        
        return await self.get_btc_price(limit)






