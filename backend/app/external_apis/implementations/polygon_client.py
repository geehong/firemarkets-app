"""
Polygon.io API client for financial data.
"""
import logging
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
        self.base_url = "https://api.polygon.io"
        # 직접 환경 변수에서 읽기
        import os
        self.api_key = os.getenv("POLYGON_API_KEY", "tUWX3e7_Z_ppi90QUsiogmxTbwuWnpa_")
        if not self.api_key:
            logger.warning("POLYGON_API_KEY is not configured.")

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
                
                # 404 에러 처리: 지원하지 않는 심볼
                if resp.status_code == 404:
                    logger.info(f"Polygon: Symbol not supported (미지원 티커): {path}")
                    return None
                
                resp.raise_for_status()
                return resp.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                logger.info(f"Polygon: Symbol not supported (미지원 티커): {path}")
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
                "calls_per_minute": 4,
                "calls_per_day": 100,
                "real_time_quotes": False
            }
        }

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
            
            # 종료일이 휴일인지 확인
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
            if not is_trading_day(end_date_obj):
                logger.info(f"Polygon: {format_trading_status_message(end_date_obj)} - 데이터 요청 스킵")
                return []
            
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
            data = await self._request(f"/v3/reference/tickers/{symbol.upper()}")
            ticker_data = data.get("results", {})
            
            if ticker_data:
                profile = CompanyProfileData(
                    symbol=symbol,
                    name=ticker_data.get("name", ""),
                    description=ticker_data.get("description"),
                    sector=ticker_data.get("sector"),
                    industry=ticker_data.get("market"),
                    country=ticker_data.get("locale"),
                    website=ticker_data.get("homepage_url"),
                    employees=None,  # Polygon에서 제공하지 않음
                    currency=ticker_data.get("currency_name", "USD"),
                    market_cap=safe_float(ticker_data.get("market_cap")),
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

    def _calculate_change_percent(self, close: float, open_price: float) -> Optional[float]:
        """Calculate percentage change"""
        if close is None or open_price is None or open_price == 0:
            return None
        
        return ((close - open_price) / open_price) * 100
