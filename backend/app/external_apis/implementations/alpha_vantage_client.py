"""
Alpha Vantage API client for financial data.
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

import httpx

from app.external_apis.base.tradfi_client import TradFiAPIClient
from app.external_apis.base.schemas import (
    OhlcvDataPoint, RealtimeQuoteData, CompanyProfileData,
    StockFinancialsData, StockAnalystEstimatesData,
    TechnicalIndicatorsData, EtfSectorExposureData,
    EtfInfoData, EtfSectorData, EtfHoldingData
)
from app.core.config import (
    ALPHA_VANTAGE_API_KEY_1,
    ALPHA_VANTAGE_API_KEY_2,
    ALPHA_VANTAGE_API_KEY_3,
    API_REQUEST_TIMEOUT_SECONDS,
    MAX_API_RETRY_ATTEMPTS
)
from app.external_apis.utils.helpers import safe_float, safe_date_parse

logger = logging.getLogger(__name__)


class AlphaVantageClient(TradFiAPIClient):
    """Alpha Vantage API client"""
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://www.alphavantage.co/query"
        self.api_keys = self._get_api_keys()
    
    def _get_api_keys(self) -> List[str]:
        """Get Alpha Vantage API keys from settings"""
        keys = []
        if ALPHA_VANTAGE_API_KEY_1:
            keys.append(ALPHA_VANTAGE_API_KEY_1)
        if ALPHA_VANTAGE_API_KEY_2:
            keys.append(ALPHA_VANTAGE_API_KEY_2)
        if ALPHA_VANTAGE_API_KEY_3:
            keys.append(ALPHA_VANTAGE_API_KEY_3)
        return keys
    
    async def test_connection(self) -> bool:
        """Test Alpha Vantage API connection"""
        if not self.api_keys:
            logger.error("No Alpha Vantage API keys configured")
            return False
        
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}?function=TIME_SERIES_INTRADAY&symbol=AAPL&interval=1min&apikey={self.api_keys[0]}"
                data = await self._fetch_async(client, url, "Alpha Vantage", "AAPL")
                return "Time Series (1min)" in data or "Note" in data
        except Exception as e:
            logger.error(f"Alpha Vantage connection test failed: {e}")
            return False
    
    def get_rate_limit_info(self) -> Dict[str, Any]:
        """Get Alpha Vantage rate limit information"""
        return {
            "free_tier": {
                "calls_per_minute": 5,
                "calls_per_day": 25
            },
            "premium_tier": {
                "calls_per_minute": 600,
                "calls_per_day": 50000
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
        """Get OHLCV data from Alpha Vantage"""
        if not self.api_keys:
            raise ValueError("No Alpha Vantage API keys configured")
        
        # 휴일 감지 및 날짜 범위 최적화
        from ...utils.trading_calendar import is_trading_day, get_last_trading_day, format_trading_status_message
        
        # 종료일이 휴일인지 확인
        if end_date:
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
            if not is_trading_day(end_date_obj):
                logger.info(f"Alpha Vantage: {format_trading_status_message(end_date_obj)} - 데이터 요청 스킵")
                return []
        
        for api_key in self.api_keys:
            try:
                async with httpx.AsyncClient() as client:
                    # 4h 인터벌의 경우 TIME_SERIES_INTRADAY 사용
                    if interval == "4h":
                        url = f"{self.base_url}?function=TIME_SERIES_INTRADAY&symbol={symbol}&interval=60min&apikey={api_key}&outputsize=full"
                        data = await self._fetch_async(client, url, "Alpha Vantage 4h", symbol)
                        
                        if "Time Series (60min)" in data:
                            result = []
                            for timestamp_str, intraday_data in data["Time Series (60min)"].items():
                                # 4시간 간격으로 필터링 (00:00, 04:00, 08:00, 12:00, 16:00, 20:00)
                                timestamp = safe_date_parse(timestamp_str)
                                if timestamp is None:
                                    continue
                                
                                # 4시간 간격이 아닌 경우 스킵
                                if timestamp.hour % 4 != 0:
                                    continue
                                
                                point = OhlcvDataPoint(
                                    timestamp_utc=timestamp,
                                    open_price=safe_float(intraday_data.get("1. open")),
                                    high_price=safe_float(intraday_data.get("2. high")),
                                    low_price=safe_float(intraday_data.get("3. low")),
                                    close_price=safe_float(intraday_data.get("4. close")),
                                    volume=safe_float(intraday_data.get("5. volume"), 0.0),
                                    change_percent=self._calculate_change_percent(
                                        safe_float(intraday_data.get("4. close")),
                                        safe_float(intraday_data.get("1. open"))
                                    )
                                )
                                result.append(point)
                                
                                # Limit 적용
                                if limit and len(result) >= limit:
                                    break
                            
                            return result
                    else:
                        # 1d 인터벌의 경우 기존 로직 사용
                        url = f"{self.base_url}?function=TIME_SERIES_DAILY_ADJUSTED&symbol={symbol}&apikey={api_key}&outputsize=full"
                        data = await self._fetch_async(client, url, "Alpha Vantage", symbol)
                        
                        if "Time Series (Daily)" in data:
                            result = []
                            for date_str, daily_data in data["Time Series (Daily)"].items():
                                timestamp = safe_date_parse(date_str)
                                if timestamp is None:
                                    continue
                                
                                point = OhlcvDataPoint(
                                    timestamp_utc=timestamp,
                                    open_price=safe_float(daily_data.get("1. open")),
                                    high_price=safe_float(daily_data.get("2. high")),
                                    low_price=safe_float(daily_data.get("3. low")),
                                    close_price=safe_float(daily_data.get("4. close")),
                                    volume=safe_float(daily_data.get("5. volume"), 0.0),
                                    change_percent=self._calculate_change_percent(
                                        safe_float(daily_data.get("4. close")),
                                        safe_float(daily_data.get("1. open"))
                                    )
                                )
                                result.append(point)
                                
                                # Limit 적용
                                if limit and len(result) >= limit:
                                    break
                            
                            return result
                    
                    # 에러 처리 (4h와 1d 모두에 적용)
                    if "Error Message" in data:
                        logger.warning(f"Alpha Vantage API 오류 ({symbol}): {data['Error Message']}")
                        if "API call frequency" in data.get("Error Message", ""):
                            continue  # Try next API key
                    elif "Note" in data and "API call frequency" in data["Note"]:
                        logger.warning(f"Alpha Vantage API 주의사항 ({symbol}): {data['Note']}")
                        continue  # Try next API key
                    else:
                        logger.warning(f"Alpha Vantage: 예상치 못한 응답 형식 ({symbol}) - 응답 키: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
                        return None  # 빈 리스트 대신 None을 반환하여 상위에서 처리하도록 함
                        
            except Exception as e:
                logger.error(f"Alpha Vantage OHLCV fetch failed for {symbol} with key {api_key[:8]}...: {e}")
                continue
        
        return None
    
    async def get_company_profile(self, symbol: str) -> Optional[CompanyProfileData]:
        """Get company profile from Alpha Vantage"""
        if not self.api_keys:
            raise ValueError("No Alpha Vantage API keys configured")
        
        for api_key in self.api_keys:
            try:
                async with httpx.AsyncClient() as client:
                    url = f"{self.base_url}?function=OVERVIEW&symbol={symbol}&apikey={api_key}"
                    data = await self._fetch_async(client, url, "Alpha Vantage Overview", symbol)
                    
                    if isinstance(data, dict) and data.get('Symbol'):
                        profile = CompanyProfileData(
                            symbol=symbol,
                            name=data.get('Name', ''),
                            description=data.get('Description'),
                            sector=data.get('Sector'),
                            industry=data.get('Industry'),
                            country=data.get('Country'),
                            website=data.get('Website'),
                            employees=safe_float(data.get('FullTimeEmployees')),
                            currency=data.get('Currency', 'USD'),
                            market_cap=safe_float(data.get('MarketCapitalization')),
                            timestamp_utc=datetime.now()
                        )
                        return profile
                    elif "Error Message" in data:
                        logger.warning(f"Alpha Vantage Overview API 오류 ({symbol}): {data['Error Message']}")
                        if "API call frequency" in data.get("Error Message", ""):
                            continue
                    elif "Note" in data and "API call frequency" in data["Note"]:
                        logger.warning(f"Alpha Vantage Overview API 주의사항 ({symbol}): {data['Note']}")
                        continue
                        
            except Exception as e:
                logger.error(f"Alpha Vantage Overview fetch failed for {symbol} with key {api_key[:8]}...: {e}")
                continue
        
        return None
    
    async def get_market_cap(self, symbol: str) -> Optional[float]:
        """Get market cap from Alpha Vantage"""
        try:
            profile = await self.get_company_profile(symbol)
            if profile:
                return profile.market_cap
        except Exception as e:
            logger.error(f"Alpha Vantage Market Cap fetch failed for {symbol}: {e}")
        
        return None
    
    async def get_realtime_quote(self, symbol: str) -> Optional[RealtimeQuoteData]:
        """Get real-time quote from Alpha Vantage"""
        try:
            # Alpha Vantage는 실시간 데이터를 제공하지 않으므로 최신 일간 데이터 사용
            data = await self.get_ohlcv_data(symbol, "1d", limit=1)
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
            logger.error(f"Alpha Vantage Quote fetch failed for {symbol}: {e}")
        
        return None
    
    async def get_technical_indicators(self, symbol: str) -> Optional[TechnicalIndicatorsData]:
        """Get technical indicators from Alpha Vantage"""
        try:
            # Alpha Vantage는 기술적 지표를 제공하지만 별도 엔드포인트 필요
            indicators = TechnicalIndicatorsData(
                symbol=symbol,
                timestamp_utc=datetime.now()
            )
            return indicators
        except Exception as e:
            logger.error(f"Alpha Vantage Technical Indicators fetch failed for {symbol}: {e}")
        
        return None
    
    async def get_stock_financials(self, symbol: str) -> Optional[StockFinancialsData]:
        """Get stock financial data from Alpha Vantage"""
        try:
            # Overview 엔드포인트에서 재무 정보 컬럼 발췌
            if not self.api_keys:
                raise ValueError("No Alpha Vantage API keys configured")
            for api_key in self.api_keys:
                try:
                    async with httpx.AsyncClient() as client:
                        url = f"{self.base_url}?function=OVERVIEW&symbol={symbol}&apikey={api_key}"
                        data = await self._fetch_async(client, url, "Alpha Vantage Overview", symbol)

                        if isinstance(data, dict) and data.get('Symbol'):
                            financials = StockFinancialsData(
                                symbol=symbol,
                                market_cap=safe_float(data.get('MarketCapitalization')),
                                pe_ratio=safe_float(data.get('PERatio')),
                                eps=safe_float(data.get('EPS')),
                                dividend_yield=safe_float(data.get('DividendYield')),
                                dividend_per_share=safe_float(data.get('DividendPerShare')),
                                beta=safe_float(data.get('Beta')),
                                peg_ratio=safe_float(data.get('PEGRatio')),
                                price_to_book_ratio=safe_float(data.get('PriceToBookRatio')),
                                profit_margin_ttm=safe_float(data.get('ProfitMargin')),
                                return_on_equity_ttm=safe_float(data.get('ReturnOnEquityTTM')),
                                revenue_ttm=safe_float(data.get('RevenueTTM')),
                                ebitda=safe_float(data.get('EBITDA')),
                                shares_outstanding=safe_float(data.get('SharesOutstanding')),
                                currency=data.get('Currency', 'USD'),
                                # 52주 고저점 및 이동평균
                                week_52_high=safe_float(data.get('52WeekHigh')),
                                week_52_low=safe_float(data.get('52WeekLow')),
                                day_50_moving_avg=safe_float(data.get('50DayMovingAverage')),
                                day_200_moving_avg=safe_float(data.get('200DayMovingAverage')),
                                # 추가 재무 지표
                                book_value=safe_float(data.get('BookValue')),
                                revenue_per_share_ttm=safe_float(data.get('RevenuePerShareTTM')),
                                operating_margin_ttm=safe_float(data.get('OperatingMarginTTM')),
                                return_on_assets_ttm=safe_float(data.get('ReturnOnAssetsTTM')),
                                gross_profit_ttm=safe_float(data.get('GrossProfitTTM')),
                                quarterly_earnings_growth_yoy=safe_float(data.get('QuarterlyEarningsGrowthYOY')),
                                quarterly_revenue_growth_yoy=safe_float(data.get('QuarterlyRevenueGrowthYOY')),
                                analyst_target_price=safe_float(data.get('AnalystTargetPrice')),
                                trailing_pe=safe_float(data.get('TrailingPE')),
                                forward_pe=safe_float(data.get('ForwardPE')),
                                price_to_sales_ratio_ttm=safe_float(data.get('PriceToSalesRatioTTM')),
                                ev_to_revenue=safe_float(data.get('EVToRevenue')),
                                ev_to_ebitda=safe_float(data.get('EVToEBITDA')),
                                snapshot_date=datetime.now(),
                                timestamp_utc=datetime.now(),
                            )
                            return financials
                        elif isinstance(data, dict) and ("Note" in data or "Error Message" in data):
                            # 레이트 리밋이면 다음 키 시도
                            continue
                        else:
                            return None
                except Exception as ie:
                    logger.warning(f"Alpha Vantage Overview fetch issue for {symbol} with key {api_key[:8]}...: {ie}")
                    continue
        except Exception as e:
            logger.error(f"Alpha Vantage Stock Financials fetch failed for {symbol}: {e}")
        return None

    async def get_analyst_estimates(self, symbol: str) -> Optional[List[StockAnalystEstimatesData]]:
        """Alpha Vantage free endpoints do not provide analyst estimates; return None."""
        logger.warning("AlphaVantageClient has no analyst estimates method")
        return None
    
    async def get_etf_info(self, symbol: str) -> Optional[EtfInfoData]:
        """Get ETF profile information from Alpha Vantage ETF_PROFILE endpoint"""
        try:
            for api_key in self.api_keys:
                try:
                    url = f"https://www.alphavantage.co/query"
                    params = {
                        "function": "ETF_PROFILE",
                        "symbol": symbol,
                        "apikey": api_key
                    }
                    
                    async with httpx.AsyncClient() as client:
                        response = await client.get(url, params=params, timeout=self.api_timeout)
                        if response.status_code == 200:
                            data = response.json()
                            
                            if isinstance(data, dict) and ("Note" in data or "Information" in data):
                                logger.warning(f"Alpha Vantage API rate limit reached for ETF profile {symbol}")
                                continue
                            elif isinstance(data, dict) and "Error Message" in data:
                                logger.warning(f"Alpha Vantage API error for ETF profile {symbol}: {data['Error Message']}")
                                continue
                            elif isinstance(data, dict) and ("net_assets" in data or "profile" in data):
                                # ETF_PROFILE API는 직접 ETF 데이터를 반환하거나 "profile" 키 안에 데이터를 반환할 수 있음
                                profile = data.get("profile", data)
                                
                                # Parse sectors data
                                sectors = []
                                if "sectors" in profile and isinstance(profile["sectors"], list):
                                    for sector in profile["sectors"]:
                                        sectors.append(EtfSectorData(
                                            sector=sector.get("sector", ""),
                                            weight=safe_float(sector.get("weight", 0))
                                        ))
                                
                                # Parse holdings data
                                holdings = []
                                if "holdings" in profile and isinstance(profile["holdings"], list):
                                    for holding in profile["holdings"]:
                                        holdings.append(EtfHoldingData(
                                            symbol=holding.get("symbol", ""),
                                            description=holding.get("description", ""),
                                            weight=safe_float(holding.get("weight", 0))
                                        ))
                                
                                # Parse inception date
                                inception_date = None
                                if "inception_date" in profile and profile["inception_date"]:
                                    try:
                                        inception_date = datetime.strptime(profile["inception_date"], "%Y-%m-%d").date()
                                    except ValueError:
                                        pass
                                
                                # Parse leveraged field
                                leveraged = None
                                if "leveraged" in profile:
                                    leveraged_str = profile["leveraged"].upper()
                                    if leveraged_str == "YES":
                                        leveraged = True
                                    elif leveraged_str == "NO":
                                        leveraged = False
                                
                                etf_info = EtfInfoData(
                                    symbol=symbol,
                                    net_assets=safe_float(profile.get("net_assets")),
                                    net_expense_ratio=safe_float(profile.get("net_expense_ratio")),
                                    portfolio_turnover=safe_float(profile.get("portfolio_turnover")),
                                    dividend_yield=safe_float(profile.get("dividend_yield")),
                                    inception_date=inception_date,
                                    leveraged=leveraged,
                                    sectors=sectors if sectors else None,
                                    holdings=holdings if holdings else None,
                                    timestamp_utc=datetime.utcnow()
                                )
                                return etf_info
                            else:
                                logger.warning(f"Unexpected response format for ETF profile {symbol}")
                                continue
                        else:
                            logger.warning(f"Alpha Vantage ETF profile API returned status {response.status} for {symbol}")
                            continue
                except Exception as ie:
                    logger.warning(f"Alpha Vantage ETF profile fetch issue for {symbol} with key {api_key[:8]}...: {ie}")
                    continue
        except Exception as e:
            logger.error(f"Alpha Vantage ETF profile fetch failed for {symbol}: {e}")
        return None

    async def get_etf_sector_exposure(self, symbol: str) -> Optional[List[EtfSectorExposureData]]:
        """Get ETF sector exposure from Alpha Vantage (Not supported)"""
        raise NotImplementedError(f"Alpha Vantage API는 ETF 섹터 노출 데이터를 제공하지 않습니다. {symbol}의 섹터 정보는 FMP API를 사용하세요.")
    
    def _calculate_change_percent(self, close: float, open_price: float) -> Optional[float]:
        """Calculate percentage change"""
        if close is None or open_price is None or open_price == 0:
            return None
        
        return ((close - open_price) / open_price) * 100
