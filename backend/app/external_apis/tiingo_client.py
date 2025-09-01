"""
Tiingo API client for financial data.
"""
import logging
from typing import Dict, List, Optional, Any
import httpx
import asyncio
from datetime import datetime, timedelta

from .base_client import BaseAPIClient
from ..core.config import GLOBAL_APP_CONFIGS

logger = logging.getLogger(__name__)


class TiingoClient(BaseAPIClient):
    """Tiingo API client for financial data"""

    def __init__(self):
        super().__init__()
        self.base_url = "https://api.tiingo.com"
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
        # 경로 정규화: 잘못된 "/api/tiingo"가 포함된 경우 교정
        normalized_path = path
        if normalized_path.startswith("/api/tiingo"):
            normalized_path = normalized_path.replace("/api/tiingo", "/tiingo", 1)
        url = f"{self.base_url}{normalized_path}"
        
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
            # 하드코딩된 미래 날짜 대신 어제 날짜를 사용하도록 수정
            yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
            data = await self._request("/tiingo/daily/aapl/prices", {"startDate": yesterday, "endDate": yesterday})
            return isinstance(data, list)
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
        """
        try:
            # 오늘 날짜 기준으로 최근 5일 데이터를 요청하여 휴일 등에도 데이터 공백 방지
            end_date = datetime.now().strftime('%Y-%m-%d')
            start_date = (datetime.now() - timedelta(days=5)).strftime('%Y-%m-%d')
            
            data = await self.get_historical_prices(symbol, start_date, end_date)
            
            if not data:
                logger.warning(f"No data returned for symbol: {symbol}")
                return {}
            
            # 가장 최신 데이터 반환
            latest = data[-1]
            
            open_price = latest.get("open_price")
            close_price = latest.get("close_price")

            return {
                "symbol": symbol,
                "last": close_price,
                "open": open_price,
                "high": latest.get("high_price"),
                "low": latest.get("low_price"),
                "volume": latest.get("volume"),
                "change": close_price - open_price if close_price is not None and open_price is not None else None,
                "changePercent": self._calculate_change_percent(close_price, open_price),
                "date": latest.get("timestamp_utc")
            }
            
        except Exception as e:
            logger.error(f"Failed to get quote for {symbol}: {e}")
            return {}

    async def get_batch_quotes(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Get quotes for multiple symbols in batch.
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

    async def get_historical_prices(
        self,
        symbol: str,
        start_date: str,
        end_date: str,
        interval: Optional[str] = None,
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Get historical price data for a symbol.
        """
        try:
            params: Dict[str, Any] = {}
            if start_date:
                params["startDate"] = start_date
            if end_date:
                params["endDate"] = end_date
            data = await self._request(f"/tiingo/daily/{symbol.lower()}/prices", params)
            
            if not isinstance(data, list) or not data:
                return None
            
            # 다른 API 클라이언트와 데이터 형식을 통일
            result = []
            for item in data:
                # 디버깅: 원본 데이터 확인
                if len(result) < 3:  # 처음 3개만 로깅
                    logger.info(f"Tiingo raw item for {symbol}: {item}")
                
                timestamp = self._safe_date_parse(item.get("date"))
                if timestamp is None:
                    logger.warning(f"Tiingo: Invalid date format for {symbol}: {item.get('date')}")
                    continue
                
                record = {
                    "timestamp_utc": timestamp,
                    "open_price": self._safe_float(item.get("open")),
                    "high_price": self._safe_float(item.get("high")),
                    "low_price": self._safe_float(item.get("low")),
                    "close_price": self._safe_float(item.get("close")),
                    "volume": self._safe_float(item.get("volume"), 0.0),
                }
                result.append(record)
            
            logger.info(f"Tiingo processed {len(result)} records for {symbol}")
            return result
            
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                logger.warning(f"Tiingo API returned 404 Not Found for {symbol}. Ticker may be invalid or data unavailable for the dates.")
            else:
                logger.error(f"Tiingo API error for {symbol}: {e.response.status_code} - {e.response.text}")
            return None
        except Exception as e:
            logger.error(f"Failed to get historical prices for {symbol}: {e}")
            return None

    async def get_metadata(self, symbol: str) -> Dict[str, Any]:
        """
        Get metadata for a symbol.
        """
        try:
            data = await self._request(f"/tiingo/daily/{symbol.upper()}")
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
        """
        try:
            metadata = await self.get_metadata(symbol)
            return metadata.get("marketCap")
        except Exception as e:
            logger.warning(f"Failed to get market cap for {symbol}: {e}")
            return None


# 전역 인스턴스 생성
tiingo_client = TiingoClient()
