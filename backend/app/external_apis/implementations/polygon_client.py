"""
Polygon.io API client for financial data.
"""
import logging
import time
from typing import Dict, List, Optional, Any
import httpx
import asyncio
from datetime import datetime, timedelta, timezone

from app.external_apis.base.tradfi_client import TradFiAPIClient
from app.external_apis.base.schemas import (
    OhlcvDataPoint, RealtimeQuoteData, CompanyProfileData,
    StockFinancialsData, StockAnalystEstimatesData, TechnicalIndicatorsData
)
from app.external_apis.utils.helpers import safe_float, safe_date_parse

logger = logging.getLogger(__name__)


class PolygonClient(TradFiAPIClient):
    """Polygon.io API client for financial data"""

    def __init__(self):
        super().__init__()
        self.name = "Polygon"
        self.base_url = "https://api.polygon.io"
        self.api_key_env = "POLYGON_API_KEY"
        
        # Rate limiting 설정 (무료 플랜: 분당 5회 제한, 안전을 위해 4회로 제한)
        self.calls_per_minute = 4
        self.calls_per_day = 500
        self.min_delay_between_requests = 15.0  # 분당 4회 = 15초 간격 (안전 마진 포함)
        
        # 직접 환경 변수에서 읽기
        import os
        self.api_key = os.getenv(self.api_key_env, "tUWX3e7_Z_ppi90QUsiogmxTbwuWnpa_")
        if not self.api_key:
            logger.warning(f"{self.api_key_env} is not configured.")
        
        # Rate limiting을 위한 변수
        self.request_times = []
    
    async def _enforce_rate_limit(self):
        """Enforce rate limiting for Polygon API (무료 플랜: 분당 5회 제한)"""
        current_time = time.time()
        
        # 1분 이전의 요청 기록 제거
        self.request_times = [t for t in self.request_times if current_time - t < 60]
        
        # 분당 제한 체크
        if len(self.request_times) >= self.calls_per_minute:
            wait_time = 60 - (current_time - self.request_times[0]) + 2  # 2초 여유 추가
            if wait_time > 0:
                logger.info(f"⏳ Polygon rate limit reached ({len(self.request_times)}/{self.calls_per_minute}), waiting {wait_time:.1f}s")
                await asyncio.sleep(wait_time)
                # 대기 후 다시 정리
                current_time = time.time()
                self.request_times = [t for t in self.request_times if current_time - t < 60]
        
        # 최소 요청 간격 보장
        if self.request_times:
            time_since_last = current_time - self.request_times[-1]
            if time_since_last < self.min_delay_between_requests:
                wait_time = self.min_delay_between_requests - time_since_last
                logger.debug(f"Polygon minimum delay: waiting {wait_time:.1f}s")
                await asyncio.sleep(wait_time)
        
        # 현재 요청 시간 기록
        self.request_times.append(time.time())

    async def _request(self, path: str, params: Dict[str, Any] = None) -> Any:
        """Internal helper to perform GET requests with api key injected."""
        # Rate limiting 적용
        await self._enforce_rate_limit()
        
        if params is None:
            params = {}
        
        # API 키 추가
        params["apiKey"] = self.api_key
        url = f"{self.base_url}{path}"
        
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, params=params, timeout=self.api_timeout)
                
                # 404 에러 처리: 지원하지 않는 심볼
                if resp.status_code == 404:
                    logger.info(f"Polygon: Symbol not supported (미지원 티커): {path}")
                    return None
                
                # 429 에러 처리: Rate limit 초과
                if resp.status_code == 429:
                    error_data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                    error_msg = error_data.get("error", "Rate limit exceeded")
                    logger.warning(f"Polygon API rate limit exceeded (429). Waiting 60s before retry. Error: {error_msg}")
                    await asyncio.sleep(60)  # 1분 대기
                    # 재시도 (한 번만)
                    await self._enforce_rate_limit()
                    resp = await client.get(url, params=params, timeout=self.api_timeout)
                
                # 403 에러 처리: 인증 실패 또는 권한 없음
                if resp.status_code == 403:
                    error_data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                    error_msg = error_data.get("error", "Forbidden")
                    logger.error(f"Polygon API 403 Forbidden: {error_msg}. Check API key and subscription plan.")
                    return None
                
                resp.raise_for_status()
                return resp.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                logger.info(f"Polygon: Symbol not supported (미지원 티커): {path}")
                return None
            if e.response.status_code == 429:
                logger.warning(f"Polygon API rate limit exceeded (429) after retry. Skipping this request.")
                return None
            if e.response.status_code == 403:
                logger.error(f"Polygon API 403 Forbidden. Check API key and subscription plan.")
                return None
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
                "calls_per_minute": self.calls_per_minute,
                "calls_per_day": self.calls_per_day,
                "real_time_quotes": False
            }
        }

    def _normalize_symbol(self, symbol: str) -> str:
        """Normalize symbols for Polygon (e.g., BRK-B -> BRK.B)."""
        if not symbol:
            return symbol
        # Common US dash class shares to dot format used by Polygon
        return symbol.replace('-', '.')

    async def get_ohlcv_data(
        self, 
        symbol: str, 
        interval: str = "1d",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[OhlcvDataPoint]:
        """Get OHLCV data from Polygon"""
        try:
            # 휴일 감지 및 날짜 범위 최적화
            from ...utils.trading_calendar import is_trading_day, get_last_trading_day, format_trading_status_message
            
            # Polygon API는 일간 데이터를 기본으로 제공
            if interval is None:
                interval = "1"  # 1 day
            
            # 날짜 형식 변환 (YYYY-MM-DD -> YYYY-MM-DD)
            if not start_date:
                start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
            if not end_date:
                end_date = datetime.now().strftime('%Y-%m-%d')
            
            # 종료일이 휴일인지 확인 (1m/5m 같은 실시간 간격은 휴일 체크 건너뛰기)
            # 1m, 5m은 실시간 데이터이므로 휴일에도 수집 가능
            if interval not in ["1m", "5m"]:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
                if not is_trading_day(end_date_obj):
                    logger.info(f"Polygon: {format_trading_status_message(end_date_obj)} - 데이터 요청 스킵")
                    return []
            
            params = {
                "from": start_date,
                "to": end_date,
                "adjusted": "true"  # 분할 조정된 가격 사용
            }
            
            # Polygon API는 interval을 분 단위 숫자로 받음
            # 1m -> 1, 5m -> 5, 15m -> 15, 30m -> 30, 1h -> 60, 4h -> 240, 1d -> 1 (day 단위)
            interval_map = {
                "1m": "1",
                "5m": "5",
                "15m": "15",
                "30m": "30",
                "1h": "60",
                "4h": "240",
                "1d": "1"
            }
            interval_num = interval_map.get(interval, interval.replace('d', '').replace('h', '').replace('m', ''))
            
            # 일봉 데이터는 /day/ 엔드포인트 사용, 인트라데이 데이터는 /minute/ 엔드포인트 사용
            if interval in ["1d"]:
                endpoint = f"/v2/aggs/ticker/{symbol.upper()}/range/{interval_num}/day/{start_date}/{end_date}"
            else:
                # 인트라데이 데이터는 /minute/ 엔드포인트 사용
                endpoint = f"/v2/aggs/ticker/{symbol.upper()}/range/{interval_num}/minute/{start_date}/{end_date}"
            
            data = await self._request(endpoint, params)
            
            # 404 에러로 None이 반환된 경우
            if data is None:
                logger.warning(f"Polygon: No data returned for {symbol} (interval: {interval}) - Symbol may not be supported or endpoint returned 404")
                return []
            
            # Polygon API는 "OK" 또는 "DELAYED" 상태를 반환할 수 있음
            status = data.get("status") if isinstance(data, dict) else None
            results = data.get("results") if isinstance(data, dict) else None
            
            if status not in ["OK", "DELAYED"] or not results:
                logger.warning(f"Polygon: No data returned for {symbol} (interval: {interval}), status: {status}, results_count: {len(results) if results else 0}")
                # API 응답의 상세 정보 로깅
                if isinstance(data, dict):
                    logger.debug(f"Polygon API response for {symbol}: {data}")
                return []
            
            result = []
            for item in data["results"]:
                # Polygon API는 Unix timestamp (밀리초)를 반환
                timestamp_ms = item.get("t")
                if timestamp_ms is None:
                    continue
                
                # Unix timestamp를 datetime으로 변환
                try:
                    timestamp = datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc)
                except (ValueError, TypeError):
                    continue
                
                point = OhlcvDataPoint(
                    timestamp_utc=timestamp,
                    open_price=safe_float(item.get("o")),
                    high_price=safe_float(item.get("h")),
                    low_price=safe_float(item.get("l")),
                    close_price=safe_float(item.get("c")),
                    volume=safe_float(item.get("v"), 0.0),
                    change_percent=self._calculate_change_percent(
                        safe_float(item.get("c")),
                        safe_float(item.get("o"))
                    )
                )
                result.append(point)
                
                # Limit 적용
                if limit and len(result) >= limit:
                    break
            
            return result
            
        except Exception as e:
            logger.error(f"Polygon OHLCV fetch failed for {symbol}: {e}")
            return []

    async def get_company_profile(self, symbol: str) -> Optional[CompanyProfileData]:
        """Get company profile from Polygon"""
        try:
            symbol_norm = self._normalize_symbol(symbol)
            data = await self._request(f"/v3/reference/tickers/{symbol_norm.upper()}")
            ticker_data = data.get("results", {})
            
            if ticker_data:
                address_info = (ticker_data.get("address") or {})
                branding = (ticker_data.get("branding") or {})
                profile = CompanyProfileData(
                    symbol=symbol,
                    name=ticker_data.get("name", ""),
                    description_en=ticker_data.get("description") or None,
                    sector=ticker_data.get("sector"),
                    industry=ticker_data.get("sic_description") or ticker_data.get("market"),
                    country=ticker_data.get("locale"),
                    website=ticker_data.get("homepage_url"),
                    employees=ticker_data.get("total_employees"),
                    currency=ticker_data.get("currency_name", "USD"),
                    market_cap=safe_float(ticker_data.get("market_cap")),
                    address=address_info.get("address1") or None,
                    city=address_info.get("city") or None,
                    state=address_info.get("state") or None,
                    zip_code=address_info.get("postal_code") or None,
                    phone=ticker_data.get("phone_number") or None,
                    logo_image_url=branding.get("logo_url") or None,
                    ipo_date=safe_date_parse(ticker_data.get("list_date")),
                    exchange=ticker_data.get("primary_exchange") or None,
                    exchange_full_name=None,
                    cik=ticker_data.get("cik") or None,
                    timestamp_utc=datetime.now()
                )
                return profile
                
        except Exception as e:
            logger.error(f"Polygon Profile fetch failed for {symbol}: {e}")
        
        return None

    async def get_market_cap(self, symbol: str) -> Optional[float]:
        """Get market cap from Polygon"""
        try:
            metadata = await self._request(f"/v3/reference/tickers/{symbol.upper()}")
            ticker_data = metadata.get("results", {})
            return safe_float(ticker_data.get("market_cap"))
        except Exception as e:
            logger.warning(f"Failed to get market cap for {symbol}: {e}")
            return None

    async def get_realtime_quote(self, symbol: str) -> Optional[RealtimeQuoteData]:
        """Get real-time quote from Polygon"""
        try:
            # 최근 일간 데이터를 요청하여 최신 가격 정보 얻기
            end_date = datetime.now().strftime('%Y-%m-%d')
            start_date = (datetime.now() - timedelta(days=5)).strftime('%Y-%m-%d')
            
            data = await self.get_ohlcv_data(symbol, "1d", start_date, end_date, limit=1)
            
            if data:
                latest = data[0]
                quote = RealtimeQuoteData(
                    symbol=symbol,
                    price=latest.close_price,
                    change_percent=latest.change_percent,
                    timestamp_utc=latest.timestamp_utc
                )
                return quote
                
        except Exception as e:
            logger.error(f"Polygon Quote fetch failed for {symbol}: {e}")
        
        return None

    async def get_technical_indicators(self, symbol: str) -> Optional[TechnicalIndicatorsData]:
        """Get technical indicators from Polygon"""
        try:
            # Polygon은 기본적으로 기술적 지표를 제공하지 않으므로 기본값 반환
            indicators = TechnicalIndicatorsData(
                symbol=symbol,
                timestamp_utc=datetime.now()
            )
            return indicators
            
        except Exception as e:
            logger.error(f"Polygon Technical Indicators fetch failed for {symbol}: {e}")
        
        return None

    async def get_stock_financials(self, symbol: str) -> Optional[StockFinancialsData]:
        """Get stock financial data from Polygon"""
        try:
            # Polygon의 Ticker Details API에서 기본 재무 정보 가져오기
            data = await self._request(f"/v3/reference/tickers/{symbol.upper()}")
            ticker_data = data.get("results", {})
            
            if ticker_data:
                financials = StockFinancialsData(
                    symbol=symbol,
                    market_cap=safe_float(ticker_data.get("market_cap")),
                    currency=ticker_data.get("currency_name", "USD"),
                    timestamp_utc=datetime.now()
                )
                return financials
                
        except Exception as e:
            logger.error(f"Polygon Stock Financials fetch failed for {symbol}: {e}")
        
        return None

    async def get_analyst_estimates(self, symbol: str) -> Optional[List[StockAnalystEstimatesData]]:
        """Polygon does not provide analyst estimates; return None."""
        logger.warning("PolygonClient has no analyst estimates method")
        return None

    async def get_etf_sector_exposure(self, symbol: str) -> Optional[List[Dict[str, Any]]]:
        """Get ETF sector exposure from Polygon (Not supported)"""
        raise NotImplementedError(f"Polygon API는 ETF 섹터 노출 데이터를 제공하지 않습니다. {symbol}의 섹터 정보는 다른 API(FMP, Alpha Vantage)를 사용하세요.")
    
    async def get_financial_statements(
        self, 
        symbol: str, 
        statement_type: str, 
        period: str = "annual",
        limit: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Get financial statements data from Polygon.
        Note: Polygon has limited financial statements support.
        """
        try:
            # Polygon doesn't provide comprehensive financial statements
            # Return empty list as this client doesn't support this feature
            logger.warning(f"Polygon API does not support financial statements for {symbol}")
            return []
        except Exception as e:
            logger.error(f"Error fetching financial statements for {symbol}: {e}")
            return []

    async def get_news(
        self, 
        limit: int = 20, 
        order: str = "desc", 
        sort: str = "published_utc",
        ticker: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get news from Polygon.io.
        Matches user's request: /v2/reference/news
        """
        try:
            params = {
                "limit": limit,
                "order": order,
                "sort": sort
            }
            if ticker:
                params["ticker"] = ticker
            
            # The endpoint is /v2/reference/news
            data = await self._request("/v2/reference/news", params)
            
            if not data:
                return []
                
            # Polygon returns {"results": [...], "status": "OK", ...}
            if isinstance(data, dict):
                return data.get("results", [])
            
            return []
            
        except Exception as e:
            logger.error(f"Polygon news fetch failed: {e}")
            return []

    def _calculate_change_percent(self, close: float, open_price: float) -> Optional[float]:
        """Calculate percentage change"""
        if close is None or open_price is None or open_price == 0:
            return None
        
        return ((close - open_price) / open_price) * 100
