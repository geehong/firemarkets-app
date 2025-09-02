"""
Polygon.io API client for financial data.
"""
import logging
from typing import Dict, List, Optional, Any
import httpx
import asyncio
from datetime import datetime, timedelta

from .base_client import BaseAPIClient
from ..core.config import GLOBAL_APP_CONFIGS

logger = logging.getLogger(__name__)


class PolygonClient(BaseAPIClient):
    """Polygon.io API client for financial data"""

    def __init__(self):
        super().__init__()
        self.base_url = "https://api.polygon.io"
        # 직접 환경 변수에서 읽기
        import os
        self.api_key = os.getenv("POLYGON_API_KEY", "tUWX3e7_Z_ppi90QUsiogmxTbwuWnpa_")
        if not self.api_key:
            logger.warning("POLYGON_API_KEY is not configured.")
        
        # Polygon API 제한 (무료 플랜 기준)
        self.requests_per_minute = 5
        self.requests_per_day = 100

    async def _request(self, path: str, params: Dict[str, Any] = None) -> Any:
        """Internal helper to perform GET requests with api key injected."""
        if params is None:
            params = {}
        
        # API 키 추가
        params["apiKey"] = self.api_key
        url = f"{self.base_url}{path}"
        
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, params=params, timeout=self.api_timeout)
                resp.raise_for_status()
                return resp.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Polygon API error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Polygon request failed: {e}")
            raise

    async def test_connection(self) -> bool:
        """Test connectivity to Polygon API"""
        try:
            # 간단한 API 호출로 연결 테스트
            data = await self._request("/v2/aggs/ticker/AAPL/range/1/day/2024-01-01/2024-01-01")
            return data.get("status") in ["OK", "DELAYED"]
        except Exception as e:
            logger.error(f"Polygon connection test failed: {e}")
            return False

    def get_rate_limit_info(self) -> Dict[str, Any]:
        """Return known public rate limits for Polygon free plan"""
        return {
            "free_tier": {
                "requests_per_minute": 5,
                "requests_per_day": 100,
                "real_time_quotes": False
            }
        }

    async def get_quote(self, symbol: str) -> Dict[str, Any]:
        """
        Get real-time quote for a single symbol.
        """
        try:
            # 최근 일간 데이터를 요청하여 최신 가격 정보 얻기
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
                await asyncio.sleep(0.2)  # 5 requests per minute = 12초 간격
                
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
            # Polygon API는 일간 데이터를 기본으로 제공
            if interval is None:
                interval = "1"  # 1 day
            
            # 날짜 형식 변환 (YYYY-MM-DD -> YYYY-MM-DD)
            params = {
                "from": start_date,
                "to": end_date,
                "adjusted": "true"  # 분할 조정된 가격 사용
            }
            
            # Polygon API는 interval을 숫자로 받음 (1d -> 1, 4h -> 4 등)
            interval_num = interval.replace('d', '').replace('h', '')
            data = await self._request(f"/v2/aggs/ticker/{symbol.upper()}/range/{interval_num}/day/{start_date}/{end_date}", params)
            
            # Polygon API는 "OK" 또는 "DELAYED" 상태를 반환할 수 있음
            if data.get("status") not in ["OK", "DELAYED"] or not data.get("results"):
                logger.warning(f"No data returned for {symbol}, status: {data.get('status')}")
                return None
            
            # 다른 API 클라이언트와 데이터 형식을 통일
            result = []
            for item in data["results"]:
                # 디버깅: 원본 데이터 확인
                if len(result) < 3:  # 처음 3개만 로깅
                    logger.info(f"Polygon raw item for {symbol}: {item}")
                
                timestamp = self._safe_date_parse(item.get("t"))  # Unix timestamp
                if timestamp is None:
                    logger.warning(f"Polygon: Invalid timestamp for {symbol}: {item.get('t')}")
                    continue
                
                record = {
                    "timestamp_utc": timestamp,
                    "open_price": self._safe_float(item.get("o")),
                    "high_price": self._safe_float(item.get("h")),
                    "low_price": self._safe_float(item.get("l")),
                    "close_price": self._safe_float(item.get("c")),
                    "volume": self._safe_float(item.get("v"), 0.0),
                }
                result.append(record)
            
            logger.info(f"Polygon processed {len(result)} records for {symbol}")
            return result
            
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                logger.warning(f"Polygon API returned 404 Not Found for {symbol}. Ticker may be invalid or data unavailable for the dates.")
            else:
                logger.error(f"Polygon API error for {symbol}: {e.response.status_code} - {e.response.text}")
            return None
        except Exception as e:
            logger.error(f"Failed to get historical prices for {symbol}: {e}")
            return None

    async def get_metadata(self, symbol: str) -> Dict[str, Any]:
        """
        Get metadata for a symbol.
        """
        try:
            data = await self._request(f"/v3/reference/tickers/{symbol.upper()}")
            return data.get("results", {})
            
        except Exception as e:
            logger.error(f"Failed to get metadata for {symbol}: {e}")
            return {}

    def _calculate_change_percent(self, close: float, open_price: float) -> Optional[float]:
        """Calculate percentage change"""
        if close is None or open_price is None or open_price == 0:
            return None
        
        return ((close - open_price) / open_price) * 100

    def _safe_float(self, value: Any, default: float = None) -> Optional[float]:
        """Safely convert value to float"""
        if value is None:
            return default
        try:
            result = float(value)
            return result if result != 0 else default
        except (ValueError, TypeError):
            return default

    def _safe_date_parse(self, timestamp_ms: int) -> Optional[datetime]:
        """Safely parse Unix timestamp (milliseconds) to datetime"""
        if not timestamp_ms:
            return None
        try:
            # Polygon API는 밀리초 단위 Unix timestamp를 사용
            return datetime.fromtimestamp(timestamp_ms / 1000)
        except (ValueError, TypeError):
            return None

    async def get_market_cap(self, symbol: str) -> Optional[float]:
        """
        Get market cap for a symbol (if available).
        """
        try:
            metadata = await self.get_metadata(symbol)
            return metadata.get("market_cap")
        except Exception as e:
            logger.warning(f"Failed to get market cap for {symbol}: {e}")
            return None


# 전역 인스턴스 생성
polygon_client = PolygonClient()
