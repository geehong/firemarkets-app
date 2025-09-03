"""
Financial Modeling Prep (FMP) API client for financial data.
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

import httpx

from ..base.tradfi_client import TradFiAPIClient
from ...core.config import FMP_API_KEY
from ..utils.helpers import safe_float, safe_date_parse

logger = logging.getLogger(__name__)


class FMPClient(TradFiAPIClient):
    """Financial Modeling Prep API client"""
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://financialmodelingprep.com/api/v3"
        # 환경 변수에서 직접 API 키 가져오기
        import os
        self.api_key = os.getenv("FMP_API_KEY", FMP_API_KEY)
        if not self.api_key:
            logger.warning("FMP_API_KEY is not configured.")
    
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
    
    async def get_ohlcv_data(
        self, 
        symbol: str, 
        interval: str = "1d",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Get OHLCV data from FMP for both stocks and commodities.
        Supports date range via from/to when provided.
        """
        if not self.api_key:
            raise ValueError("No FMP API key configured")
        
        try:
            async with httpx.AsyncClient() as client:
                base = f"{self.base_url}/historical-price-full/{symbol}?apikey={self.api_key}"
                if start_date and end_date:
                    url = f"base&from={start_date}&to={end_date}"
                else:
                    url = f"{base}&limit={limit or 1000}"
                data = await self._fetch_async(client, url, "FMP", symbol)
                
                # 응답 데이터가 리스트인지, 딕셔너리 안에 'historical' 키가 있는지 확인
                historical_data = []
                if isinstance(data, dict) and "historical" in data:
                    historical_data = data["historical"]
                elif isinstance(data, list):
                    historical_data = data  # 원자재 데이터처럼 바로 리스트로 오는 경우
                else:
                    logger.warning(f"Unexpected FMP data format for {symbol}: {type(data)}")
                    return []
                
                if historical_data:
                    result = []
                    for d in historical_data:
                        date_str = d.get("date")
                        if not date_str or date_str in ["0", 0]:
                            continue
                        
                        timestamp = safe_date_parse(date_str)
                        if timestamp is not None:
                            record = {
                                "timestamp_utc": timestamp,
                                "open_price": safe_float(d.get("open")),
                                "high_price": safe_float(d.get("high")),
                                "low_price": safe_float(d.get("low")),
                                "close_price": safe_float(d.get("close")),
                                "volume": safe_float(d.get("volume"), 0.0),
                            }
                            result.append(record)
                    return result
                    
        except Exception as e:
            logger.error(f"FMP OHLCV fetch failed for {symbol}: {e}")
        
        return []
    
    async def get_company_profile(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get company profile from FMP"""
        if not self.api_key:
            raise ValueError("No FMP API key configured")
        
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/profile/{symbol}?apikey={self.api_key}"
                data = await self._fetch_async(client, url, "FMP Profile", symbol)
                
                if isinstance(data, list) and len(data) > 0:
                    return data[0]
                elif isinstance(data, dict) and data.get('success', False):
                    return data.get('data', [{}])[0] if data.get('data') else None
        except Exception as e:
            logger.error(f"FMP Profile fetch failed for {symbol}: {e}")
        
        return None
    
    async def get_market_cap(self, symbol: str) -> Optional[float]:
        """Get market cap from FMP"""
        try:
            profile = await self.get_company_profile(symbol)
            if profile:
                return safe_float(profile.get("mktCap"))
        except Exception as e:
            logger.error(f"FMP Market Cap fetch failed for {symbol}: {e}")
        
        return None
    
    async def get_realtime_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get real-time quote from FMP"""
        if not self.api_key:
            raise ValueError("No FMP API key configured")
        
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/quote/{symbol}?apikey={self.api_key}"
                data = await self._fetch_async(client, url, "FMP Quote", symbol)
                
                if isinstance(data, list) and len(data) > 0:
                    return data[0]
                elif isinstance(data, dict) and data.get('success', False):
                    return data.get('data', [{}])[0] if data.get('data') else None
        except Exception as e:
            logger.error(f"FMP Quote fetch failed for {symbol}: {e}")
        
        return None
    
    async def get_technical_indicators(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get technical indicators from FMP"""
        if not self.api_key:
            raise ValueError("No FMP API key configured")
        
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/technical-indicators/{symbol}?apikey={self.api_key}"
                data = await self._fetch_async(client, url, "FMP Technical Indicators", symbol)
                
                if isinstance(data, list) and len(data) > 0:
                    return data[0]
                elif isinstance(data, dict):
                    return data
        except Exception as e:
            logger.error(f"FMP Technical Indicators fetch failed for {symbol}: {e}")
        
        return None
