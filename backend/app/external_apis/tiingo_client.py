"""
Tiingo API client for financial data.
"""
import logging
from typing import Dict, List, Optional, Any
import httpx
import asyncio

from .base_client import BaseAPIClient
from ..core.config import GLOBAL_APP_CONFIGS

logger = logging.getLogger(__name__)


class TiingoClient(BaseAPIClient):
    """Tiingo API client for financial data"""

    def __init__(self):
        super().__init__()
        self.base_url = "https://api.tiingo.com/api"
        # 직접 환경 변수에서 읽기
        import os
        self.api_key = os.getenv("TIINGO_API_KEY", "")
        if not self.api_key:
            logger.warning("TIINGO_API_KEY is not configured.")
        
        # Tiingo API 제한
        self.requests_per_hour = 50  # 무료 플랜
        self.requests_per_day = 1000  # 무료 플랜

    async def _request(self, path: str, params: Dict[str, Any] = None) -> Any:
        """Internal helper to perform GET requests with api key injected."""
        if params is None:
            params = {}
        
        # API 키 추가
        params["token"] = self.api_key
        url = f"{self.base_url}{path}"
        
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, params=params, timeout=self.api_timeout)
                resp.raise_for_status()
                return resp.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Tiingo API error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Tiingo request failed: {e}")
            raise

    async def test_connection(self) -> bool:
        """Test connectivity to Tiingo API"""
        try:
            # 간단한 API 호출로 연결 테스트
            data = await self._request("/tiingo/daily/aapl/prices", {"startDate": "2025-08-25", "endDate": "2025-08-25"})
            return isinstance(data, list) and len(data) > 0
        except Exception as e:
            logger.error(f"Tiingo connection test failed: {e}")
            return False

    def get_rate_limit_info(self) -> Dict[str, Any]:
        """Return known public rate limits for Tiingo free plan"""
        return {
            "free_tier": {
                "requests_per_hour": 50,
                "requests_per_day": 1000,
                "symbols_per_month": 500
            }
        }

    async def get_quote(self, symbol: str) -> Dict[str, Any]:
        """
        Get real-time quote for a single symbol.
        
        Args:
            symbol: Stock symbol (e.g., 'AAPL')
            
        Returns:
            Quote data including price, change, volume, etc.
        """
        try:
            # Tiingo daily prices endpoint (15분 지연)
            data = await self._request(f"/tiingo/daily/{symbol.lower()}/prices", {
                "startDate": "2025-08-25",  # 오늘 날짜
                "endDate": "2025-08-25"
            })
            
            if not data or len(data) == 0:
                logger.warning(f"No data returned for symbol: {symbol}")
                return {}
            
            # 최신 데이터 반환
            latest = data[-1]
            
            return {
                "symbol": symbol,
                "last": latest.get("close"),
                "open": latest.get("open"),
                "high": latest.get("high"),
                "low": latest.get("low"),
                "volume": latest.get("volume"),
                "change": latest.get("close") - latest.get("open") if latest.get("close") and latest.get("open") else None,
                "changePercent": self._calculate_change_percent(latest.get("close"), latest.get("open")),
                "date": latest.get("date")
            }
            
        except Exception as e:
            logger.error(f"Failed to get quote for {symbol}: {e}")
            return {}

    async def get_batch_quotes(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Get quotes for multiple symbols in batch.
        
        Args:
            symbols: List of stock symbols
            
        Returns:
            Dictionary of quotes keyed by symbol
        """
        if not symbols:
            return {}
        
        results = {}
        
        for symbol in symbols:
            try:
                quote = await self.get_quote(symbol)
                if quote:
                    results[symbol.upper()] = quote
                
                # API 제한 고려하여 딜레이
                await asyncio.sleep(0.1)
                
            except Exception as e:
                logger.warning(f"Failed to get quote for {symbol}: {e}")
                continue
        
        return results

    async def get_historical_prices(self, symbol: str, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        """
        Get historical price data for a symbol.
        
        Args:
            symbol: Stock symbol
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            
        Returns:
            List of historical price data
        """
        try:
            data = await self._request(f"/tiingo/daily/{symbol.lower()}/prices", {
                "startDate": start_date,
                "endDate": end_date
            })
            
            return data if isinstance(data, list) else []
            
        except Exception as e:
            logger.error(f"Failed to get historical prices for {symbol}: {e}")
            return []

    async def get_metadata(self, symbol: str) -> Dict[str, Any]:
        """
        Get metadata for a symbol.
        
        Args:
            symbol: Stock symbol
            
        Returns:
            Symbol metadata
        """
        try:
            data = await self._request(f"/tiingo/daily/{symbol.lower()}")
            return data if isinstance(data, dict) else {}
            
        except Exception as e:
            logger.error(f"Failed to get metadata for {symbol}: {e}")
            return {}

    def _calculate_change_percent(self, close: float, open_price: float) -> Optional[float]:
        """Calculate percentage change"""
        if close is None or open_price is None or open_price == 0:
            return None
        
        return ((close - open_price) / open_price) * 100

    async def get_market_cap(self, symbol: str) -> Optional[float]:
        """
        Get market cap for a symbol (if available).
        Note: Tiingo free plan may not include market cap data.
        """
        try:
            metadata = await self.get_metadata(symbol)
            return metadata.get("marketCap")
        except Exception as e:
            logger.warning(f"Failed to get market cap for {symbol}: {e}")
            return None


# 전역 인스턴스 생성
tiingo_client = TiingoClient()
