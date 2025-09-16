"""
Twelve Data API client for real-time market prices.
"""
import logging
from typing import Dict, List, Optional, Any
import httpx
import asyncio
import time
from collections import deque
from datetime import datetime, timedelta

from app.external_apis.base.tradfi_client import TradFiAPIClient
from app.external_apis.base.schemas import (
    OhlcvDataPoint, RealtimeQuoteData, CompanyProfileData,
    StockFinancialsData, TechnicalIndicatorsData
)
from app.external_apis.utils.helpers import safe_float, safe_date_parse

logger = logging.getLogger(__name__)


class TwelveDataClient(TradFiAPIClient):
    """Twelve Data API client"""

    def __init__(self):
        super().__init__()
        self.base_url = "https://api.twelvedata.com"
        # 직접 환경 변수에서 API 키를 읽도록 수정
        import os
        self.api_key = os.getenv("TWELVEDATA_API_KEY", "")
        if not self.api_key:
            logger.warning("TWELVEDATA_API_KEY is not configured.")

        # Simple per-process rate limiter: 8 requests per 60 seconds
        if not hasattr(TwelveDataClient, "_rl_times"):
            TwelveDataClient._rl_times = deque(maxlen=16)
        self._rl_lock = asyncio.Lock()

    async def _rate_limit(self):
        # Ensure <=8 calls in last 60 seconds
        async with self._rl_lock:
            now = time.monotonic()
            # Remove old entries
            while TwelveDataClient._rl_times and (now - TwelveDataClient._rl_times[0]) > 60:
                TwelveDataClient._rl_times.popleft()
            if len(TwelveDataClient._rl_times) >= 8:
                wait_for = 60 - (now - TwelveDataClient._rl_times[0])
                await asyncio.sleep(max(0.05, wait_for))
            TwelveDataClient._rl_times.append(time.monotonic())

    async def _request(self, path: str, params: Dict[str, Any]) -> Any:
        """Internal helper to perform GET requests with api key injected."""
        query = {"apikey": self.api_key, **params}
        url = f"{self.base_url}{path}"
        await self._rate_limit()
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=query, timeout=self.api_timeout)
            resp.raise_for_status()
            data = resp.json()
            # Twelve Data error format handling
            if isinstance(data, dict) and data.get("code") and data.get("message"):
                raise httpx.HTTPStatusError(message=data.get("message"), request=resp.request, response=resp)
            return data

    async def test_connection(self) -> bool:
        """Test connectivity to Twelve Data"""
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"{self.base_url}/time_series", params={"symbol": "AAPL", "interval": "1min", "outputsize": 1, "apikey": self.api_key}, timeout=self.api_timeout)
                return resp.status_code == 200
        except Exception as e:
            logger.error(f"TwelveData connection test failed: {e}")
            return False

    def get_rate_limit_info(self) -> Dict[str, Any]:
        """Return known public rate limits for Twelve Data free plan"""
        return {
            "free_tier": {
                "calls_per_minute": 8,
                "calls_per_day": 800
            }
        }

    def _normalize_symbol_for_twelvedata(self, symbol: str) -> str:
        """TwelveData API용 심볼 정규화"""
        # 특수 문자가 포함된 심볼들을 TwelveData 형식에 맞게 변환
        symbol_mapping = {
            "BRK-B": "BRK.B",  # Berkshire Hathaway Class B
            "2222.SR": "2222.SR",  # Saudi Aramco (이미 올바른 형식)
        }
        
        # 매핑이 있으면 사용, 없으면 원본 반환
        return symbol_mapping.get(symbol, symbol)

    async def get_ohlcv_data(
        self, 
        symbol: str, 
        interval: str = "1d",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[OhlcvDataPoint]:
        """Get OHLCV data from Twelve Data"""
        try:
            # 휴일 감지 및 날짜 범위 최적화
            from ...utils.trading_calendar import is_trading_day, get_last_trading_day, format_trading_status_message
            
            # Normalize interval: 1d -> 1day, 1w -> 1week
            interval_map = {"1d": "1day", "1w": "1week"}
            norm_interval = interval_map.get(interval, interval)
            
            # TwelveData API용 심볼 정규화
            normalized_symbol = self._normalize_symbol_for_twelvedata(symbol)

            # 종료일이 휴일인지 확인
            if end_date:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
                if not is_trading_day(end_date_obj):
                    logger.info(f"TwelveData: {format_trading_status_message(end_date_obj)} - 데이터 요청 스킵")
                    return []

            params: Dict[str, Any] = {
                "symbol": normalized_symbol,
                "interval": norm_interval,
                "format": "JSON",
            }
            if start_date:
                params["start_date"] = start_date
            if end_date:
                params["end_date"] = end_date
            if limit:
                params["outputsize"] = limit

            data = await self._request("/time_series", params)

            # Normalize response
            if isinstance(data, dict) and isinstance(data.get("values"), list):
                values = data["values"]
            elif isinstance(data, list):
                values = data
            else:
                return []
            
            if not values:
                return []
            
            result = []
            for item in values:
                if isinstance(item, dict):
                    timestamp = safe_date_parse(item.get("datetime"))
                    if timestamp is None:
                        continue
                    
                    point = OhlcvDataPoint(
                        timestamp_utc=timestamp,
                        open_price=safe_float(item.get("open")),
                        high_price=safe_float(item.get("high")),
                        low_price=safe_float(item.get("low")),
                        close_price=safe_float(item.get("close")),
                        volume=safe_float(item.get("volume"), 0.0),
                        change_percent=self._calculate_change_percent(
                            safe_float(item.get("close")),
                            safe_float(item.get("open"))
                        )
                    )
                    result.append(point)
                    
                    # Limit 적용
                    if limit and len(result) >= limit:
                        break
            
            return result
            
        except Exception as e:
            logger.error(f"TwelveData OHLCV fetch failed for {symbol}: {e}")
            return []

    async def get_company_profile(self, symbol: str) -> Optional[CompanyProfileData]:
        """Get company profile from Twelve Data"""
        try:
            # Twelve Data는 기본적으로 회사 프로필을 제공하지 않으므로 기본값 반환
            profile = CompanyProfileData(
                symbol=symbol,
                name=symbol,
                timestamp_utc=datetime.now()
            )
            return profile
            
        except Exception as e:
            logger.error(f"TwelveData Profile fetch failed for {symbol}: {e}")
        
        return None

    async def get_market_cap(self, symbol: str) -> Optional[float]:
        """Get market cap from Twelve Data"""
        try:
            # Twelve Data는 기본적으로 시가총액을 제공하지 않음
            return None
        except Exception as e:
            logger.warning(f"Failed to get market cap for {symbol}: {e}")
            return None

    async def get_realtime_quote(self, symbol: str) -> Optional[RealtimeQuoteData]:
        """Get real-time quote from Twelve Data"""
        try:
            normalized_symbol = self._normalize_symbol_for_twelvedata(symbol)
            data = await self._request("/quote", {"symbol": normalized_symbol})
            
            if isinstance(data, dict) and data.get("symbol"):
                quote = RealtimeQuoteData(
                    symbol=symbol,
                    price=safe_float(data.get("close")),
                    change_percent=safe_float(data.get("percent_change")),
                    timestamp_utc=datetime.now()
                )
                return quote
                
        except Exception as e:
            logger.error(f"TwelveData Quote fetch failed for {symbol}: {e}")
        
        return None

    async def get_technical_indicators(self, symbol: str) -> Optional[TechnicalIndicatorsData]:
        """Get technical indicators from Twelve Data"""
        try:
            # Twelve Data는 기술적 지표를 제공하지만 별도 엔드포인트 필요
            indicators = TechnicalIndicatorsData(
                symbol=symbol,
                timestamp_utc=datetime.now()
            )
            return indicators
            
        except Exception as e:
            logger.error(f"TwelveData Technical Indicators fetch failed for {symbol}: {e}")
        
        return None

    async def get_stock_financials(self, symbol: str) -> Optional[StockFinancialsData]:
        """Get stock financial data from Twelve Data"""
        try:
            # Twelve Data의 Quote API에서 기본 재무 정보 가져오기
            normalized_symbol = self._normalize_symbol_for_twelvedata(symbol)
            data = await self._request("/quote", {"symbol": normalized_symbol})
            
            if isinstance(data, dict) and data.get("symbol"):
                financials = StockFinancialsData(
                    symbol=symbol,
                    market_cap=safe_float(data.get("market_cap")),
                    currency=data.get("currency", "USD"),
                    timestamp_utc=datetime.now()
                )
                return financials
                
        except Exception as e:
            logger.error(f"TwelveData Stock Financials fetch failed for {symbol}: {e}")
        
        return None

    async def get_etf_sector_exposure(self, symbol: str) -> Optional[List[Dict[str, Any]]]:
        """Get ETF sector exposure from Twelve Data (Not supported)"""
        raise NotImplementedError(f"Twelve Data API는 ETF 섹터 노출 데이터를 제공하지 않습니다. {symbol}의 섹터 정보는 다른 API(FMP, Alpha Vantage)를 사용하세요.")

    def _calculate_change_percent(self, close: float, open_price: float) -> Optional[float]:
        """Calculate percentage change"""
        if close is None or open_price is None or open_price == 0:
            return None
        
        return ((close - open_price) / open_price) * 100
