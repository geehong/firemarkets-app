"""
Bitcoin Data API client for onchain data.
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import httpx
import pandas as pd

from ..base.onchain_client import OnChainAPIClient
from ..utils.helpers import safe_float, safe_date_parse

logger = logging.getLogger(__name__)


class BitcoinDataClient(OnChainAPIClient):
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
    
    async def get_onchain_metrics(
        self, 
        metric_type: str = "all",
        days: int = 30
    ) -> Optional[Dict[str, Any]]:
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
    ) -> Optional[Dict[str, Any]]:
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
        """Get Bitcoin price data"""
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
    
    async def _get_mvrv_ratio(self, days: int = 30) -> Optional[pd.DataFrame]:
        """Get MVRV (Market Value to Realized Value) ratio"""
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
