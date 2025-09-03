"""
Tiingo API client for financial data.
"""
import logging
from typing import Dict, List, Optional, Any
import httpx
import asyncio
from datetime import datetime, timedelta

from app.external_apis.base.tradfi_client import TradFiAPIClient
from app.external_apis.base.schemas import (
    OhlcvDataPoint, RealtimeQuoteData, CompanyProfileData,
    StockFinancialsData, TechnicalIndicatorsData
)
from app.external_apis.utils.helpers import safe_float, safe_date_parse

logger = logging.getLogger(__name__)


class TiingoClient(TradFiAPIClient):
    """Tiingo API client for financial data"""

    def __init__(self):
        super().__init__()
        self.base_url = "https://api.tiingo.com"
        # 직접 환경 변수에서 읽기
        import os
        self.api_key = os.getenv("TIINGO_API_KEY", "")
        if not self.api_key:
            logger.warning("TIINGO_API_KEY is not configured.")

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
                "requests_per_day": 800,
                "symbols_per_month": 500
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
        """Get OHLCV data from Tiingo"""
        try:
            # Tiingo는 일간 데이터를 기본으로 제공
            if interval != "1d":
                logger.warning(f"Tiingo only supports daily data, requested interval: {interval}")
            
            params: Dict[str, Any] = {}
            if start_date:
                params["startDate"] = start_date
            if end_date:
                params["endDate"] = end_date
            
            data = await self._request(f"/tiingo/daily/{symbol.lower()}/prices", params)
            
            if not isinstance(data, list) or not data:
                return []
            
            result = []
            for item in data:
                timestamp = safe_date_parse(item.get("date"))
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
            logger.error(f"Tiingo OHLCV fetch failed for {symbol}: {e}")
            return []

    async def get_company_profile(self, symbol: str) -> Optional[CompanyProfileData]:
        """Get company profile from Tiingo"""
        try:
            data = await self._request(f"/tiingo/daily/{symbol.upper()}")
            
            if isinstance(data, dict):
                profile = CompanyProfileData(
                    symbol=symbol,
                    name=data.get("name", ""),
                    description=data.get("description"),
                    sector=data.get("sector"),
                    industry=data.get("industry"),
                    country=data.get("country"),
                    website=data.get("website"),
                    employees=safe_float(data.get("employees")),
                    currency=data.get("currency", "USD"),
                    market_cap=safe_float(data.get("marketCap")),
                    timestamp_utc=datetime.now()
                )
                return profile
                
        except Exception as e:
            logger.error(f"Tiingo Profile fetch failed for {symbol}: {e}")
        
        return None

    async def get_market_cap(self, symbol: str) -> Optional[float]:
        """Get market cap from Tiingo"""
        try:
            metadata = await self._request(f"/tiingo/daily/{symbol.upper()}")
            return safe_float(metadata.get("marketCap"))
        except Exception as e:
            logger.warning(f"Failed to get market cap for {symbol}: {e}")
            return None

    async def get_realtime_quote(self, symbol: str) -> Optional[RealtimeQuoteData]:
        """Get real-time quote from Tiingo"""
        try:
            # 오늘 날짜 기준으로 최근 5일 데이터를 요청하여 휴일 등에도 데이터 공백 방지
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
            logger.error(f"Tiingo Quote fetch failed for {symbol}: {e}")
        
        return None

    async def get_technical_indicators(self, symbol: str) -> Optional[TechnicalIndicatorsData]:
        """Get technical indicators from Tiingo"""
        try:
            # Tiingo는 기본적으로 기술적 지표를 제공하지 않으므로 기본값 반환
            indicators = TechnicalIndicatorsData(
                symbol=symbol,
                timestamp_utc=datetime.now()
            )
            return indicators
            
        except Exception as e:
            logger.error(f"Tiingo Technical Indicators fetch failed for {symbol}: {e}")
        
        return None

    async def get_stock_financials(self, symbol: str) -> Optional[StockFinancialsData]:
        """Get stock financial data from Tiingo"""
        try:
            # Tiingo는 기본적으로 재무 데이터를 제공하지 않으므로 기본값 반환
            financials = StockFinancialsData(
                symbol=symbol,
                timestamp_utc=datetime.now()
            )
            return financials
            
        except Exception as e:
            logger.error(f"Tiingo Stock Financials fetch failed for {symbol}: {e}")
        
        return None

    async def get_etf_sector_exposure(self, symbol: str) -> Optional[List[Dict[str, Any]]]:
        """Get ETF sector exposure from Tiingo (Not supported)"""
        raise NotImplementedError(f"Tiingo API는 ETF 섹터 노출 데이터를 제공하지 않습니다. {symbol}의 섹터 정보는 다른 API(FMP, Alpha Vantage)를 사용하세요.")

    def _calculate_change_percent(self, close: float, open_price: float) -> Optional[float]:
        """Calculate percentage change"""
        if close is None or open_price is None or open_price == 0:
            return None
        
        return ((close - open_price) / open_price) * 100
