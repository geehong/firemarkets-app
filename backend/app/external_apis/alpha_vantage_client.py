"""
Alpha Vantage API client for financial data.
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

import httpx

from .base_client import BaseAPIClient
from ..core.config import (
    ALPHA_VANTAGE_API_KEY_1,
    ALPHA_VANTAGE_API_KEY_2,
    ALPHA_VANTAGE_API_KEY_3,
    API_REQUEST_TIMEOUT_SECONDS,
    MAX_API_RETRY_ATTEMPTS
)

logger = logging.getLogger(__name__)


class AlphaVantageClient(BaseAPIClient):
    """Alpha Vantage API client"""
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://www.alphavantage.co/query"
        self.api_keys = self._get_api_keys()
    
    def _get_api_keys(self) -> List[str]:
        """Get Alpha Vantage API keys from settings"""
        keys = []
        if ALPHA_VANTAGE_API_KEY_1:
            keys.append(ALPHA_VANTAGE_API_KEY_1)
        if ALPHA_VANTAGE_API_KEY_2:
            keys.append(ALPHA_VANTAGE_API_KEY_2)
        if ALPHA_VANTAGE_API_KEY_3:
            keys.append(ALPHA_VANTAGE_API_KEY_3)
        return keys
    
    async def test_connection(self) -> bool:
        """Test Alpha Vantage API connection"""
        if not self.api_keys:
            logger.error("No Alpha Vantage API keys configured")
            return False
        
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}?function=TIME_SERIES_INTRADAY&symbol=AAPL&interval=1min&apikey={self.api_keys[0]}"
                data = await self._fetch_async(client, url, "Alpha Vantage", "AAPL")
                return "Time Series (1min)" in data or "Note" in data
        except Exception as e:
            logger.error(f"Alpha Vantage connection test failed: {e}")
            return False
    
    def get_rate_limit_info(self) -> Dict[str, Any]:
        """Get Alpha Vantage rate limit information"""
        return {
            "free_tier": {
                "calls_per_minute": 5,
                "calls_per_day": 500
            },
            "premium_tier": {
                "calls_per_minute": 600,
                "calls_per_day": 50000
            }
        }
    
    async def get_ohlcv_data(self, ticker: str, outputsize: str = "full") -> List[Dict[str, Any]]:
        """Get OHLCV data from Alpha Vantage"""
        if not self.api_keys:
            raise ValueError("No Alpha Vantage API keys configured")
        
        for api_key in self.api_keys:
            try:
                async with httpx.AsyncClient() as client:
                    url = f"{self.base_url}?function=TIME_SERIES_DAILY&symbol={ticker}&apikey={api_key}&outputsize={outputsize}"
                    data = await self._fetch_async(client, url, "Alpha Vantage", ticker)
                    
                    if "Time Series (Daily)" in data:
                        return [
                            {
                                "timestamp_utc": self._safe_date_parse(date_str),
                                "open_price": self._safe_float(daily_data.get("1. open")),
                                "high_price": self._safe_float(daily_data.get("2. high")),
                                "low_price": self._safe_float(daily_data.get("3. low")),
                                "close_price": self._safe_float(daily_data.get("4. close")),
                                "volume": self._safe_float(daily_data.get("6. volume"), 0.0),
                            }
                            for date_str, daily_data in data["Time Series (Daily)"].items()
                            if self._safe_date_parse(date_str)
                        ]
                    elif "Error Message" in data:
                        logger.warning(f"Alpha Vantage API 오류 ({ticker}): {data['Error Message']}")
                        if "API call frequency" in data.get("Error Message", ""):
                            continue  # Try next API key
                    elif "Note" in data and "API call frequency" in data["Note"]:
                        logger.warning(f"Alpha Vantage API 주의사항 ({ticker}): {data['Note']}")
                        continue  # Try next API key
                    else:
                        logger.warning(f"Alpha Vantage: 예상치 못한 응답 형식 ({ticker})")
                        logger.debug(f"Alpha Vantage response keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
                        logger.debug(f"Alpha Vantage response sample: {str(data)[:200]}...")
                        continue
                        
            except Exception as e:
                logger.error(f"Alpha Vantage OHLCV fetch failed for {ticker} with key {api_key[:8]}...: {e}")
                continue
        
        return []
    
    async def get_company_overview(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Get company overview from Alpha Vantage"""
        if not self.api_keys:
            raise ValueError("No Alpha Vantage API keys configured")
        
        for api_key in self.api_keys:
            try:
                async with httpx.AsyncClient() as client:
                    url = f"{self.base_url}?function=OVERVIEW&symbol={ticker}&apikey={api_key}"
                    data = await self._fetch_async(client, url, "Alpha Vantage Overview", ticker)
                    
                    if isinstance(data, dict) and data.get('Symbol'):
                        return data
                    elif "Error Message" in data:
                        logger.warning(f"Alpha Vantage Overview API 오류 ({ticker}): {data['Error Message']}")
                        if "API call frequency" in data.get("Error Message", ""):
                            continue
                    elif "Note" in data and "API call frequency" in data["Note"]:
                        logger.warning(f"Alpha Vantage Overview API 주의사항 ({ticker}): {data['Note']}")
                        continue
                        
            except Exception as e:
                logger.error(f"Alpha Vantage Overview fetch failed for {ticker} with key {api_key[:8]}...: {e}")
                continue
        
        return None
    
    async def get_etf_profile(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Get ETF profile from Alpha Vantage"""
        if not self.api_keys:
            raise ValueError("No Alpha Vantage API keys configured")
        
        for api_key in self.api_keys:
            try:
                async with httpx.AsyncClient() as client:
                    url = f"{self.base_url}?function=ETF_PROFILE&symbol={ticker}&apikey={api_key}"
                    data = await self._fetch_async(client, url, "Alpha Vantage ETF Profile", ticker)
                    
                    if isinstance(data, dict) and data.get('net_assets'):
                        return data
                    elif "Error Message" in data:
                        logger.warning(f"Alpha Vantage ETF Profile API 오류 ({ticker}): {data['Error Message']}")
                        if "API call frequency" in data.get("Error Message", ""):
                            continue
                    elif "Note" in data and "API call frequency" in data["Note"]:
                        logger.warning(f"Alpha Vantage ETF Profile API 주의사항 ({ticker}): {data['Note']}")
                        continue
                        
            except Exception as e:
                logger.error(f"Alpha Vantage ETF Profile fetch failed for {ticker} with key {api_key[:8]}...: {e}")
                continue
        
        return None
