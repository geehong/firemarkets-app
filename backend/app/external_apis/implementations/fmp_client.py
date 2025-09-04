"""
Financial Modeling Prep (FMP) API client for financial data.
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

import httpx

from app.external_apis.base.tradfi_client import TradFiAPIClient
from app.external_apis.base.schemas import (
    OhlcvDataPoint,
    CompanyProfileData,
    StockFinancialsData,
    RealtimeQuoteData,
    TechnicalIndicatorsData,
    EtfSectorExposureData
)
from app.core.config import FMP_API_KEY
from app.external_apis.utils.helpers import safe_float, safe_date_parse

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
                "calls_per_minute": 5,
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
    ) -> List[OhlcvDataPoint]:
        """Get OHLCV data from FMP for both stocks and commodities.
        Supports date range via from/to when provided.
        """
        if not self.api_key:
            raise ValueError("No FMP API key configured")
        
        try:
            async with httpx.AsyncClient() as client:
                base = f"{self.base_url}/historical-price-full/{symbol}?apikey={self.api_key}"
                if start_date and end_date:
                    url = f"{base}&from={start_date}&to={end_date}"
                else:
                    url = f"{base}&limit={limit or 1000}"
                
                logger.info(f"[{symbol}] FMP API 호출 시도: {url}")
                
                response = await client.get(url, timeout=self.api_timeout)
                response.raise_for_status()
                data = response.json()
                
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
                    result: List[OhlcvDataPoint] = []
                    for d in historical_data:
                        date_str = d.get("date")
                        if not date_str or date_str in ["0", 0]:
                            continue
                        
                        timestamp = safe_date_parse(date_str)
                        if timestamp is not None:
                            # FMP의 고유 필드 이름을 표준 필드 이름으로 매핑
                            point = OhlcvDataPoint(
                                timestamp_utc=timestamp,
                                open_price=safe_float(d.get("open")),
                                high_price=safe_float(d.get("high")),
                                low_price=safe_float(d.get("low")),
                                close_price=safe_float(d.get("adjClose", d.get("close"))),  # adjClose 우선, 없으면 close
                                volume=safe_float(d.get("unadjustedVolume", d.get("volume")), 0.0),  # unadjustedVolume 우선
                                change_percent=safe_float(d.get("changePercent"))
                            )
                            result.append(point)
                            
                            # Limit 적용
                            if limit and len(result) >= limit:
                                break
                    return result
                    
        except Exception as e:
            logger.error(f"FMP OHLCV fetch failed for {symbol}: {e}")
        
        return []
    
    async def get_company_profile(self, symbol: str) -> Optional[CompanyProfileData]:
        """Get company profile from FMP"""
        if not self.api_key:
            raise ValueError("No FMP API key configured")
        
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/profile/{symbol}?apikey={self.api_key}"
                data = await self._fetch_async(client, url, "FMP Profile", symbol)
                
                if isinstance(data, list) and len(data) > 0:
                    raw_data = data[0]
                elif isinstance(data, dict) and data.get('success', False):
                    raw_data = data.get('data', [{}])[0] if data.get('data') else {}
                else:
                    return None
                
                # FMP 데이터를 표준 구조로 변환
                profile = CompanyProfileData(
                    symbol=symbol,
                    name=raw_data.get("companyName", ""),
                    description=raw_data.get("description"),
                    sector=raw_data.get("sector"),
                    industry=raw_data.get("industry"),
                    country=raw_data.get("country"),
                    website=raw_data.get("website"),
                    employees=safe_float(raw_data.get("fullTimeEmployees")),
                    currency=raw_data.get("currency"),
                    market_cap=safe_float(raw_data.get("mktCap")),
                    timestamp_utc=datetime.now()
                )
                return profile
                
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
    
    async def get_realtime_quote(self, symbol: str) -> Optional[RealtimeQuoteData]:
        """Get real-time quote from FMP"""
        if not self.api_key:
            raise ValueError("No FMP API key configured")
        
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/quote/{symbol}?apikey={self.api_key}"
                data = await self._fetch_async(client, url, "FMP Quote", symbol)
                
                if isinstance(data, list) and len(data) > 0:
                    raw_data = data[0]
                elif isinstance(data, dict) and data.get('success', False):
                    raw_data = data.get('data', [{}])[0] if data.get('data') else {}
                else:
                    return None
                
                # FMP 데이터를 표준 구조로 변환
                quote = RealtimeQuoteData(
                    symbol=symbol,
                    price=safe_float(raw_data.get("price")),
                    change_percent=safe_float(raw_data.get("changesPercentage")),
                    timestamp_utc=datetime.now()  # FMP는 실시간 데이터를 제공하므로 현재 시간 사용
                )
                return quote
                
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
    
    async def get_etf_sector_exposure(self, symbol: str) -> Optional[List[Dict[str, Any]]]:
        """Get ETF sector exposure from FMP (Premium feature only)"""
        if not self.api_key:
            raise ValueError("No FMP API key configured")
        
        try:
            # FMP ETF sector exposure is a premium feature
            logger.warning(f"ETF sector exposure for {symbol} is not available in FMP free tier")
            return None
            
        except Exception as e:
            logger.error(f"FMP ETF Sector Exposure fetch failed for {symbol}: {e}")
        
        return None
    
    async def get_stock_financials(self, symbol: str) -> Optional[StockFinancialsData]:
        """Get stock financial data from FMP"""
        if not self.api_key:
            raise ValueError("No FMP API key configured")
        
        try:
            async with httpx.AsyncClient() as client:
                # FMP Quote API for financial metrics
                url = f"{self.base_url}/quote/{symbol}?apikey={self.api_key}"
                quote_data = await self._fetch_async(client, url, "FMP Quote", symbol)
                
                # FMP Profile API for additional financial data
                profile_url = f"{self.base_url}/profile/{symbol}?apikey={self.api_key}"
                profile_data = await self._fetch_async(client, profile_url, "FMP Profile", symbol)
                
                # Process quote data
                quote = None
                if isinstance(quote_data, list) and len(quote_data) > 0:
                    quote = quote_data[0]
                elif isinstance(quote_data, dict):
                    quote = quote_data
                
                # Process profile data
                profile = None
                if isinstance(profile_data, list) and len(profile_data) > 0:
                    profile = profile_data[0]
                elif isinstance(profile_data, dict):
                    profile = profile_data
                
                # FMP 데이터를 표준 구조로 변환
                financials = StockFinancialsData(
                    symbol=symbol,
                    market_cap=safe_float(quote.get("marketCap")) if quote else None,
                    pe_ratio=safe_float(quote.get("pe")) if quote else None,
                    eps=safe_float(quote.get("eps")) if quote else None,
                    dividend_yield=safe_float(quote.get("dividendYield")) if quote else None,
                    dividend_per_share=safe_float(quote.get("lastDiv")) if quote else None,
                    beta=safe_float(profile.get("beta")) if profile else None,
                    peg_ratio=safe_float(profile.get("peg")) if profile else None,
                    price_to_book_ratio=safe_float(profile.get("priceToBookRatio")) if profile else None,
                    profit_margin_ttm=safe_float(profile.get("profitMargin")) if profile else None,
                    return_on_equity_ttm=safe_float(profile.get("returnOnEquity")) if profile else None,
                    revenue_ttm=safe_float(profile.get("revenueTTM")) if profile else None,
                    ebitda=None,  # FMP에서 제공하지 않음
                    shares_outstanding=safe_float(profile.get("sharesOutstanding")) if profile else None,
                    currency=quote.get("currency", "USD") if quote else "USD",
                    snapshot_date=datetime.now(),
                    timestamp_utc=datetime.now()
                )
                
                return financials
                
        except Exception as e:
            logger.error(f"FMP Stock Financials fetch failed for {symbol}: {e}")
        
        return None
