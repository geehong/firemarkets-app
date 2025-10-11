"""
Tiingo API client for financial data.
"""
import logging
from typing import Dict, List, Optional, Any
import httpx
import asyncio
import pandas as pd
from datetime import datetime, timedelta

from app.external_apis.base.tradfi_client import TradFiAPIClient
from app.external_apis.base.schemas import (
    OhlcvDataPoint, RealtimeQuoteData, CompanyProfileData,
    StockFinancialsData, TechnicalIndicatorsData,
    StockAnalystEstimatesData
)
from app.external_apis.utils.helpers import safe_float, safe_date_parse

logger = logging.getLogger(__name__)


class TiingoClient(TradFiAPIClient):
    """Tiingo API client for financial data"""

    def __init__(self):
        super().__init__()
        self.base_url = "https://api.tiingo.com"
        # API 키 fallback 로직
        import os
        self.api_keys = [
            os.getenv("TIINGO_API_KEY_1", ""),
            os.getenv("TIINGO_API_KEY_2", ""),
            os.getenv("TIINGO_API_KEY", "")  # 기존 키도 fallback으로 유지
        ]
        # 빈 키 제거
        self.api_keys = [key for key in self.api_keys if key]
        self.current_key_index = 0
        self.api_key = self.api_keys[0] if self.api_keys else ""
        
        if not self.api_key:
            logger.warning("No TIINGO API keys are configured.")
        else:
            logger.info(f"Tiingo client initialized with {len(self.api_keys)} API keys")

    async def _request(self, path: str, params: Dict[str, Any] = None) -> Any:
        """Internal helper to perform GET requests with api key injected."""
        if params is None:
            params = {}
        
        # 경로 정규화: 잘못된 "/api/tiingo"가 포함된 경우 교정
        normalized_path = path
        if normalized_path.startswith("/api/tiingo"):
            normalized_path = normalized_path.replace("/api/tiingo", "/tiingo", 1)
        
        # API 키 fallback 로직
        for attempt in range(len(self.api_keys)):
            current_key = self.api_keys[self.current_key_index]
            params["token"] = current_key
            url = f"{self.base_url}{normalized_path}"
            
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(url, params=params, timeout=self.api_timeout)
                    
                    # 404 에러 처리: 지원하지 않는 심볼
                    if resp.status_code == 404:
                        logger.info(f"Tiingo: Symbol not supported (미지원 티커): {path}")
                        return None
                    
                    resp.raise_for_status()
                    return resp.json()
                    
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    logger.info(f"Tiingo: Symbol not supported (미지원 티커): {path}")
                    return None
                elif e.response.status_code in [401, 403, 429]:  # API 키 관련 오류
                    logger.warning(f"Tiingo API key failed (attempt {attempt + 1}): {e.response.status_code}")
                    if attempt < len(self.api_keys) - 1:
                        # 다음 키로 전환
                        self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
                        logger.info(f"Switching to next Tiingo API key (index: {self.current_key_index})")
                        continue
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

    async def get_ohlcv_data(self, symbol: str, interval: str = "1d", 
                           start_date: str = None, end_date: str = None, 
                           limit: int = None) -> Optional[List[OhlcvDataPoint]]:
        """Get OHLCV data from Tiingo"""
        if interval != "1d":
            logger.warning(f"Tiingo only supports daily data, requested interval: {interval}")
            return None  # None을 반환하여 다음 클라이언트로 넘어가도록 함
            
        try:
            # 휴일 감지 및 날짜 범위 최적화
            from ...utils.trading_calendar import is_trading_day, get_last_trading_day, format_trading_status_message
            
            params = {}
            if start_date:
                params["startDate"] = start_date
            if end_date:
                # 종료일이 휴일인지 확인
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
                if not is_trading_day(end_date_obj):
                    logger.info(f"Tiingo: {format_trading_status_message(end_date_obj)} - 데이터 요청 스킵")
                    return None
                params["endDate"] = end_date
            
            # Use httpx directly to get the raw response content
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/tiingo/daily/{symbol.lower()}/prices"
                params["token"] = self.api_key
                resp = await client.get(url, params=params, timeout=self.api_timeout)
                
                # 404 에러 처리: 지원하지 않는 심볼
                if resp.status_code == 404:
                    logger.info(f"Tiingo: Symbol not supported (미지원 티커): {symbol}")
                    return None
                
                resp.raise_for_status()
                
                # JSON 응답을 파싱
                json_data = resp.json()
                
                if not json_data or not isinstance(json_data, list):
                    logger.warning(f"Tiingo returned empty or invalid data for {symbol}")
                    return None
            
            result = []
            for item in json_data:
                # 날짜 문자열을 datetime으로 변환
                date_str = item.get("date")
                if not date_str:
                    continue
                    
                try:
                    # ISO 형식 날짜 문자열을 파싱
                    timestamp = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                except (ValueError, TypeError):
                    logger.warning(f"Invalid date format in Tiingo response: {date_str}")
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
            return None

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

    async def get_analyst_estimates(self, symbol: str) -> Optional[List[StockAnalystEstimatesData]]:
        """Tiingo does not provide analyst estimates; return None."""
        logger.warning("TiingoClient does not support analyst estimates")
        return None

    async def get_etf_sector_exposure(self, symbol: str) -> Optional[List[Dict[str, Any]]]:
        """Get ETF sector exposure from Tiingo (Not supported)"""
        raise NotImplementedError(f"Tiingo API는 ETF 섹터 노출 데이터를 제공하지 않습니다. {symbol}의 섹터 정보는 다른 API(FMP, Alpha Vantage)를 사용하세요.")

    def _calculate_change_percent(self, close: float, open_price: float) -> Optional[float]:
        """Calculate percentage change"""
        if close is None or open_price is None or open_price == 0:
            return None
        
        return ((close - open_price) / open_price) * 100
