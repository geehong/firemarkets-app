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
    StockAnalystEstimatesData,
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
            # 휴일 감지 및 날짜 범위 최적화
            from ...utils.trading_calendar import is_trading_day, get_last_trading_day, format_trading_status_message
            
            # 종료일이 휴일인지 확인
            if end_date:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
                if not is_trading_day(end_date_obj):
                    logger.info(f"FMP: {format_trading_status_message(end_date_obj)} - 데이터 요청 스킵")
                    return []
            
            async with httpx.AsyncClient() as client:
                # interval에 따라 다른 엔드포인트 사용
                if interval in ["4h", "1h", "30m", "15m", "5m", "1m"]:
                    # 인트라데이 데이터용 엔드포인트
                    base = f"{self.base_url}/historical-chart/{interval}/{symbol}?apikey={self.api_key}"
                else:
                    # 일봉 데이터용 엔드포인트 (기본값)
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
                
                try:
                    data = await self._fetch_async(client, url, "FMP Profile", symbol)
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 402:
                        logger.info(f"FMP: Free plan does not support company profile (무료플랜은 지원하지 않습니다): {symbol}")
                        return None
                    raise
                
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
                    # 주소 정보
                    address=raw_data.get("address"),
                    city=raw_data.get("city"),
                    state=raw_data.get("state"),  # CA, NY 등
                    zip_code=raw_data.get("zip"),  # 우편번호
                    # 기업 정보
                    ceo=raw_data.get("ceo"),
                    phone=raw_data.get("phone"),
                    logo_image_url=raw_data.get("image"),
                    ipo_date=safe_date_parse(raw_data.get("ipoDate")),
                    # 거래소 및 식별자 정보
                    exchange=raw_data.get("exchange"),  # NASDAQ, NYSE 등
                    exchange_full_name=raw_data.get("exchange"),  # FMP는 exchange에 전체 명칭 제공
                    cik=raw_data.get("cik"),
                    isin=raw_data.get("isin"),
                    cusip=raw_data.get("cusip"),
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
                
                try:
                    data = await self._fetch_async(client, url, "FMP Technical Indicators", symbol)
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 402:
                        logger.info(f"FMP: Free plan does not support technical indicators (무료플랜은 지원하지 않습니다): {symbol}")
                        return None
                    raise
                
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
        """Get stock financial data from FMP (profile + quote APIs)."""
        if not self.api_key:
            raise ValueError("No FMP API key configured")

        try:
            async with httpx.AsyncClient() as client:
                # Profile API에서 기본 재무 데이터 가져오기
                profile_url = f"{self.base_url}/profile/{symbol}?apikey={self.api_key}"
                
                try:
                    profile_data = await self._fetch_async(client, profile_url, "FMP Profile", symbol)
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 402:
                        logger.info(f"FMP: Free plan does not support stock financials (무료플랜은 지원하지 않습니다): {symbol}")
                        return None
                    raise

                if isinstance(profile_data, list) and len(profile_data) > 0:
                    profile_raw = profile_data[0]
                elif isinstance(profile_data, dict) and profile_data.get('symbol'):
                    profile_raw = profile_data
                else:
                    return None

                # Quote API에서 52주 고저점과 이동평균 데이터 가져오기
                quote_url = f"{self.base_url}/quote/{symbol}?apikey={self.api_key}"
                quote_data = await self._fetch_async(client, quote_url, "FMP Quote", symbol)
                
                quote_raw = {}
                if isinstance(quote_data, list) and len(quote_data) > 0:
                    quote_raw = quote_data[0]
                    logger.info(f"Quote data extracted: yearHigh={quote_raw.get('yearHigh')}, yearLow={quote_raw.get('yearLow')}")
                elif isinstance(quote_data, dict) and quote_data.get('symbol'):
                    quote_raw = quote_data
                    logger.info(f"Quote data extracted from dict: yearHigh={quote_raw.get('yearHigh')}, yearLow={quote_raw.get('yearLow')}")
                else:
                    logger.warning(f"Quote data not in expected format: {type(quote_data)}")

                # Profile과 Quote 데이터를 병합하여 사용
                # 일부 키는 프로필 응답에서 대체 키로 제공됨(mktCap 등)
                logger.info(f"Creating StockFinancialsData with quote_raw: {quote_raw}")
                financials = StockFinancialsData(
                    symbol=symbol,
                    market_cap=safe_float(profile_raw.get("marketCap", profile_raw.get("mktCap")) or quote_raw.get("marketCap")),
                    pe_ratio=safe_float(profile_raw.get("pe") or quote_raw.get("pe")),
                    eps=safe_float(profile_raw.get("eps") or quote_raw.get("eps")),
                    dividend_yield=safe_float(profile_raw.get("dividendYield")),
                    dividend_per_share=safe_float(profile_raw.get("lastDividend", profile_raw.get("lastDiv"))),
                    beta=safe_float(profile_raw.get("beta")),
                    peg_ratio=safe_float(profile_raw.get("pegRatio", profile_raw.get("peg"))),
                    price_to_book_ratio=safe_float(profile_raw.get("priceToBookRatio")),
                    profit_margin_ttm=safe_float(profile_raw.get("profitMargin")),
                    return_on_equity_ttm=safe_float(profile_raw.get("returnOnEquity")),
                    revenue_ttm=safe_float(profile_raw.get("revenueTTM")),
                    ebitda=safe_float(profile_raw.get("ebitda")),
                    shares_outstanding=safe_float(profile_raw.get("sharesOutstanding") or quote_raw.get("sharesOutstanding")),
                    currency=profile_raw.get("currency", "USD"),
                    # 52주 고저점 및 이동평균 (Quote API에서 가져옴)
                    week_52_high=safe_float(quote_raw.get("yearHigh")),
                    week_52_low=safe_float(quote_raw.get("yearLow")),
                    day_50_moving_avg=safe_float(quote_raw.get("priceAvg50")),
                    day_200_moving_avg=safe_float(quote_raw.get("priceAvg200")),
                    # FMP에서 제공하지 않는 추가 필드들은 None으로 설정
                    book_value=None,
                    revenue_per_share_ttm=None,
                    operating_margin_ttm=None,
                    return_on_assets_ttm=None,
                    gross_profit_ttm=None,
                    quarterly_earnings_growth_yoy=None,
                    quarterly_revenue_growth_yoy=None,
                    analyst_target_price=None,
                    trailing_pe=None,
                    forward_pe=None,
                    price_to_sales_ratio_ttm=None,
                    ev_to_revenue=None,
                    ev_to_ebitda=None,
                    snapshot_date=datetime.now(),
                    timestamp_utc=datetime.now(),
                )

                return financials

        except Exception as e:
            logger.error(f"FMP Stock Financials fetch failed for {symbol}: {e}")
            return None

    async def get_analyst_estimates(self, symbol: str) -> Optional[List[StockAnalystEstimatesData]]:
        """Get analyst estimates from FMP and map to DB schema fields.

        Returns a list of StockAnalystEstimatesData with fields:
        - revenue_low/high/avg, ebitda_avg, eps_avg/high/low,
          revenue_analysts_count, eps_analysts_count, fiscal_date
        """
        if not self.api_key:
            raise ValueError("No FMP API key configured")

        try:
            async with httpx.AsyncClient() as client:
                # Use the stable analyst-estimates endpoint per FMP docs
                url = f"https://financialmodelingprep.com/stable/analyst-estimates?symbol={symbol}&period=annual&limit=10&apikey={self.api_key}"
                
                try:
                    data = await self._fetch_async(client, url, "FMP Analyst Estimates", symbol)
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 402:
                        logger.info(f"FMP: Free plan does not support analyst estimates (무료플랜은 지원하지 않습니다): {symbol}")
                        return None
                    raise

                if not isinstance(data, list) or not data:
                    return None

                results: List[StockAnalystEstimatesData] = []
                from app.external_apis.base.schemas import StockAnalystEstimatesData as Est
                from datetime import datetime

                for row in data:
                    if not isinstance(row, dict):
                        continue
                    # Parse fiscal date
                    fd = row.get("date") or row.get("fiscalDate")
                    fiscal_date = None
                    if isinstance(fd, str) and fd:
                        try:
                            fiscal_date = datetime.strptime(fd.split("T")[0], "%Y-%m-%d").date()
                        except Exception:
                            fiscal_date = None

                    est = Est(
                        symbol=symbol,
                        revenue_low=row.get("revenueLow"),
                        revenue_high=row.get("revenueHigh"),
                        revenue_avg=row.get("revenueAvg"),
                        ebitda_avg=row.get("ebitdaAvg"),
                        ebitda_low=row.get("ebitdaLow"),
                        ebitda_high=row.get("ebitdaHigh"),
                        ebit_avg=row.get("ebitAvg"),
                        ebit_low=row.get("ebitLow"),
                        ebit_high=row.get("ebitHigh"),
                        net_income_avg=row.get("netIncomeAvg"),
                        net_income_low=row.get("netIncomeLow"),
                        net_income_high=row.get("netIncomeHigh"),
                        sga_expense_avg=row.get("sgaExpenseAvg"),
                        sga_expense_low=row.get("sgaExpenseLow"),
                        sga_expense_high=row.get("sgaExpenseHigh"),
                        eps_avg=row.get("epsAvg"),
                        eps_high=row.get("epsHigh"),
                        eps_low=row.get("epsLow"),
                        revenue_analysts_count=row.get("numAnalystsRevenue"),
                        eps_analysts_count=row.get("numAnalystsEps"),
                        fiscal_date=fiscal_date,
                        timestamp_utc=datetime.utcnow(),
                    )
                    results.append(est)

                return results or None

        except Exception as e:
            logger.error(f"FMP Analyst Estimates fetch failed for {symbol}: {e}")
            return None
