"""
Financial Modeling Prep (FMP) API client for financial data.
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

import httpx

from .base_client import BaseAPIClient
from ..core.config import FMP_API_KEY

logger = logging.getLogger(__name__)


class FMPClient(BaseAPIClient):
    """Financial Modeling Prep API client"""
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://financialmodelingprep.com/api/v3"
        self.api_key = FMP_API_KEY
    
    async def test_connection(self) -> bool:
        """Test FMP API connection"""
        if not self.api_key:
            logger.error("No FMP API key configured")
            return False
        
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/quote/AAPL?apikey={self.api_key}"
                data = await self._fetch_async(client, url, "FMP", "AAPL")
                return isinstance(data, list) and len(data) > 0
        except Exception as e:
            logger.error(f"FMP connection test failed: {e}")
            return False
    
    def get_rate_limit_info(self) -> Dict[str, Any]:
        """Get FMP rate limit information"""
        return {
            "free_tier": {
                "calls_per_minute": 30,
                "calls_per_day": 250
            },
            "premium_tier": {
                "calls_per_minute": 1000,
                "calls_per_day": 100000
            }
        }
    
    async def get_ohlcv_data(self, ticker: str) -> List[Dict[str, Any]]:
        """Get OHLCV data from FMP"""
        if not self.api_key:
            raise ValueError("No FMP API key configured")
        
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/historical-price-full/{ticker}?apikey={self.api_key}"
                data = await self._fetch_async(client, url, "FMP", ticker)
                
                if "historical" in data:
                    return [
                        {
                            "timestamp_utc": self._safe_date_parse(d.get("date")),
                            "open_price": self._safe_float(d.get("open")),
                            "high_price": self._safe_float(d.get("high")),
                            "low_price": self._safe_float(d.get("low")),
                            "close_price": self._safe_float(d.get("close")),
                            "volume": self._safe_float(d.get("volume"), 0.0),
                        }
                        for d in data["historical"] if self._safe_date_parse(d.get("date"))
                    ]
        except Exception as e:
            logger.error(f"FMP OHLCV fetch failed for {ticker}: {e}")
        
        return []
    
    async def get_company_profile(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Get company profile from FMP"""
        if not self.api_key:
            raise ValueError("No FMP API key configured")
        
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/profile/{ticker}?apikey={self.api_key}"
                data = await self._fetch_async(client, url, "FMP Profile", ticker)
                
                if isinstance(data, list) and len(data) > 0:
                    return data[0]
                elif isinstance(data, dict) and data.get('success', False):
                    return data.get('data', [{}])[0] if data.get('data') else None
        except Exception as e:
            logger.error(f"FMP Profile fetch failed for {ticker}: {e}")
        
        return None
    
    async def get_company_quote(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Get real-time quote from FMP"""
        if not self.api_key:
            raise ValueError("No FMP API key configured")
        
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/quote/{ticker}?apikey={self.api_key}"
                data = await self._fetch_async(client, url, "FMP Quote", ticker)
                
                if isinstance(data, list) and len(data) > 0:
                    return data[0]
                elif isinstance(data, dict) and data.get('success', False):
                    return data.get('data', [{}])[0] if data.get('data') else None
        except Exception as e:
            logger.error(f"FMP Quote fetch failed for {ticker}: {e}")
        
        return None
    
    async def get_analyst_estimates(self, ticker: str, period: str = "annual", limit: int = 10) -> List[Dict[str, Any]]:
        """Get analyst estimates from FMP"""
        if not self.api_key:
            raise ValueError("No FMP API key configured")
        
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/analyst-estimates?symbol={ticker}&period={period}&page=0&limit={limit}&apikey={self.api_key}"
                data = await self._fetch_async(client, url, "FMP Estimates", ticker)
                
                if isinstance(data, list):
                    return data
                elif isinstance(data, dict) and data.get('success', False):
                    return data.get('data', [])
        except Exception as e:
            logger.error(f"FMP Estimates fetch failed for {ticker}: {e}")
        
        return []
    
    async def get_etf_profile(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Get ETF profile from FMP"""
        if not self.api_key:
            raise ValueError("No FMP API key configured")
        
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/etf/profile/{ticker}?apikey={self.api_key}"
                data = await self._fetch_async(client, url, "FMP ETF Profile", ticker)
                
                if isinstance(data, list) and len(data) > 0:
                    return data[0]
                elif isinstance(data, dict):
                    return data
        except Exception as e:
            logger.error(f"FMP ETF Profile fetch failed for {ticker}: {e}")
        
        return None
    
    async def get_technical_indicators(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Get technical indicators from FMP"""
        if not self.api_key:
            raise ValueError("No FMP API key configured")
        
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/technical-indicators/{ticker}?apikey={self.api_key}"
                data = await self._fetch_async(client, url, "FMP Technical Indicators", ticker)
                
                if isinstance(data, list) and len(data) > 0:
                    return data[0]
                elif isinstance(data, dict):
                    return data
        except Exception as e:
            logger.error(f"FMP Technical Indicators fetch failed for {ticker}: {e}")
        
        return None
