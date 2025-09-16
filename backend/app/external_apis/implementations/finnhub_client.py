"""
Finnhub API Client implementation.
Professional financial data API with real-time and historical data.
"""
import aiohttp
import logging
import asyncio
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

from ..base.tradfi_client import TradFiAPIClient
from ..base.schemas import (
    OhlcvDataPoint,
    CompanyProfileData,
    RealtimeQuoteData,
    TechnicalIndicatorsData,
    EtfSectorExposureData,
    StockFinancialsData,
    StockAnalystEstimatesData
)

logger = logging.getLogger(__name__)


class FinnhubClient(TradFiAPIClient):
    """Finnhub API Client for professional financial data"""
    
    def __init__(self):
        """Initialize Finnhub client."""
        super().__init__()
        self.name = "Finnhub"
        self.base_url = "https://finnhub.io/api/v1"
        self.session = None
        
        # 환경 변수에서 API 키 읽기
        import os
        self.api_key = os.getenv("FINNHUB_API_KEY", "")
        if not self.api_key:
            logger.warning("FINNHUB_API_KEY is not configured.")
        
        # Rate limiting
        self.requests_per_minute = 59  # Free tier limit
        self.last_request_time = 0
        
        logger.info(f"Finnhub client initialized with API key: {self.api_key[:8] if self.api_key else 'None'}...")
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(
                headers={
                    'X-Finnhub-Secret': self.api_key,
                    'User-Agent': 'FireMarkets/1.0'
                },
                timeout=aiohttp.ClientTimeout(total=30)
            )
        return self.session
    
    async def _rate_limit(self):
        """Simple rate limiting"""
        current_time = asyncio.get_event_loop().time()
        time_since_last = current_time - self.last_request_time
        min_interval = 60.0 / self.requests_per_minute  # 1 second for free tier
        
        if time_since_last < min_interval:
            await asyncio.sleep(min_interval - time_since_last)
        
        self.last_request_time = asyncio.get_event_loop().time()
    
    async def _make_request(self, endpoint: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Make authenticated request to Finnhub API"""
        await self._rate_limit()
        
        session = await self._get_session()
        url = f"{self.base_url}/{endpoint}"
        
        if params is None:
            params = {}
        
        params['token'] = self.api_key
        
        try:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return data
                elif response.status == 429:
                    logger.warning("Rate limit exceeded, waiting...")
                    await asyncio.sleep(60)  # Wait 1 minute
                    return await self._make_request(endpoint, params)
                else:
                    logger.error(f"API request failed: {response.status} - {await response.text()}")
                    return {}
        except Exception as e:
            logger.error(f"Request failed: {e}")
            return {}
    
    async def get_ohlcv_data(
        self, 
        symbol: str, 
        interval: str = "1d",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[OhlcvDataPoint]:
        """Get OHLCV data from Finnhub"""
        try:
            # Convert interval to Finnhub format
            interval_map = {
                "1m": "1",
                "5m": "5", 
                "15m": "15",
                "30m": "30",
                "1h": "60",
                "1d": "D"
            }
            finnhub_interval = interval_map.get(interval, "D")
            
            # Set default date range
            if not start_date:
                start_date = int((datetime.now() - timedelta(days=30)).timestamp())
            else:
                start_date = int(datetime.strptime(start_date, '%Y-%m-%d').timestamp())
            
            if not end_date:
                end_date = int(datetime.now().timestamp())
            else:
                end_date = int(datetime.strptime(end_date, '%Y-%m-%d').timestamp())
            
            params = {
                'symbol': symbol,
                'resolution': finnhub_interval,
                'from': start_date,
                'to': end_date
            }
            
            data = await self._make_request('stock/candle', params)
            
            if not data or data.get('s') != 'ok':
                logger.warning(f"No OHLCV data found for {symbol}")
                return []
            
            # Convert to standardized format
            data_points = []
            timestamps = data.get('t', [])
            opens = data.get('o', [])
            highs = data.get('h', [])
            lows = data.get('l', [])
            closes = data.get('c', [])
            volumes = data.get('v', [])
            
            for i in range(len(timestamps)):
                data_points.append(OhlcvDataPoint(
                    timestamp=datetime.fromtimestamp(timestamps[i]).isoformat(),
                    open=float(opens[i]),
                    high=float(highs[i]),
                    low=float(lows[i]),
                    close=float(closes[i]),
                    volume=int(volumes[i])
                ))
            
            # Apply limit if specified
            if limit:
                data_points = data_points[-limit:]
            
            logger.info(f"Retrieved {len(data_points)} OHLCV data points for {symbol}")
            return data_points
            
        except Exception as e:
            logger.error(f"Failed to get OHLCV data for {symbol}: {e}")
            return []
    
    async def get_company_profile(self, symbol: str) -> Optional[CompanyProfileData]:
        """Get company profile from Finnhub"""
        try:
            data = await self._make_request('stock/profile2', {'symbol': symbol})
            
            if not data:
                logger.warning(f"No company profile found for {symbol}")
                return None
            
            return CompanyProfileData(
                symbol=symbol,
                name=data.get('name', ''),
                description=data.get('description', ''),
                industry=data.get('finnhubIndustry', ''),
                sector=data.get('finnhubSector', ''),
                country=data.get('country', ''),
                website=data.get('weburl', ''),
                employees=data.get('employeeTotal', 0),
                market_cap=data.get('marketCapitalization', 0),
                currency=data.get('currency', 'USD')
            )
            
        except Exception as e:
            logger.error(f"Failed to get company profile for {symbol}: {e}")
            return None
    
    async def get_market_cap(self, symbol: str) -> Optional[float]:
        """Get market cap from Finnhub"""
        try:
            data = await self._make_request('stock/profile2', {'symbol': symbol})
            market_cap = data.get('marketCapitalization')
            
            if market_cap:
                logger.info(f"Market cap for {symbol}: ${market_cap:,.0f}")
                return float(market_cap)
            else:
                logger.warning(f"No market cap data for {symbol}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to get market cap for {symbol}: {e}")
            return None
    
    async def get_realtime_quote(self, symbol: str) -> Optional[RealtimeQuoteData]:
        """Get real-time quote from Finnhub"""
        try:
            data = await self._make_request('quote', {'symbol': symbol})
            
            if not data or 'c' not in data:
                logger.warning(f"No real-time quote found for {symbol}")
                return None
            
            return RealtimeQuoteData(
                symbol=symbol,
                price=float(data.get('c', 0)),  # Current price
                change=float(data.get('d', 0)),  # Change
                change_percent=float(data.get('dp', 0)),  # Change percent
                volume=int(data.get('v', 0)),  # Volume
                high=float(data.get('h', 0)),  # High
                low=float(data.get('l', 0)),  # Low
                open=float(data.get('o', 0)),  # Open
                previous_close=float(data.get('pc', 0)),  # Previous close
                timestamp=datetime.now().isoformat()
            )
            
        except Exception as e:
            logger.error(f"Failed to get real-time quote for {symbol}: {e}")
            return None
    
    async def get_technical_indicators(self, symbol: str) -> Optional[TechnicalIndicatorsData]:
        """Get technical indicators from Finnhub"""
        try:
            # Get recent price data for calculations
            end_time = int(datetime.now().timestamp())
            start_time = int((datetime.now() - timedelta(days=200)).timestamp())
            
            params = {
                'symbol': symbol,
                'resolution': 'D',
                'from': start_time,
                'to': end_time
            }
            
            data = await self._make_request('stock/candle', params)
            
            if not data or data.get('s') != 'ok':
                logger.warning(f"No technical indicators data for {symbol}")
                return None
            
            closes = data.get('c', [])
            if len(closes) < 50:
                logger.warning(f"Insufficient data for technical indicators: {symbol}")
                return None
            
            # Simple technical indicators calculation
            # RSI (simplified)
            rsi = self._calculate_rsi(closes[-14:]) if len(closes) >= 14 else 0
            
            # Moving averages
            sma_50 = sum(closes[-50:]) / 50 if len(closes) >= 50 else 0
            sma_200 = sum(closes[-200:]) / 200 if len(closes) >= 200 else 0
            
            return TechnicalIndicatorsData(
                symbol=symbol,
                rsi=rsi,
                macd=0,  # Would need more complex calculation
                bollinger_upper=0,  # Would need more complex calculation
                bollinger_lower=0,  # Would need more complex calculation
                sma_50=sma_50,
                sma_200=sma_200,
                timestamp=datetime.now().isoformat()
            )
            
        except Exception as e:
            logger.error(f"Failed to get technical indicators for {symbol}: {e}")
            return None
    
    def _calculate_rsi(self, prices: List[float], period: int = 14) -> float:
        """Calculate RSI (simplified)"""
        if len(prices) < period + 1:
            return 0
        
        gains = []
        losses = []
        
        for i in range(1, len(prices)):
            change = prices[i] - prices[i-1]
            if change > 0:
                gains.append(change)
                losses.append(0)
            else:
                gains.append(0)
                losses.append(abs(change))
        
        if len(gains) < period:
            return 0
        
        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period
        
        if avg_loss == 0:
            return 100
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
    
    async def get_etf_sector_exposure(self, symbol: str) -> Optional[List[EtfSectorExposureData]]:
        """Get ETF sector exposure from Finnhub"""
        try:
            # Finnhub doesn't have direct ETF sector exposure, but we can get company data
            data = await self._make_request('stock/profile2', {'symbol': symbol})
            
            if not data:
                return None
            
            # For ETFs, we might need to use a different approach
            # This is a simplified implementation
            return None
            
        except Exception as e:
            logger.error(f"Failed to get ETF sector exposure for {symbol}: {e}")
            return None
    
    async def get_stock_financials(self, symbol: str) -> Optional[StockFinancialsData]:
        """Get stock financials from Finnhub"""
        try:
            # Get basic financial metrics
            data = await self._make_request('stock/metric', {'symbol': symbol})
            
            if not data:
                logger.warning(f"No financial data found for {symbol}")
                return None
            
            return StockFinancialsData(
                symbol=symbol,
                revenue=data.get('revenue', 0),
                net_income=data.get('netIncome', 0),
                total_debt=data.get('totalDebt', 0),
                cash=data.get('cash', 0),
                pe_ratio=data.get('peBasicExclExtraTTM', 0),
                pb_ratio=data.get('pbQuarterly', 0),
                debt_to_equity=data.get('debtToEquityQuarterly', 0),
                return_on_equity=data.get('roeTTM', 0),
                timestamp=datetime.now().isoformat()
            )
            
        except Exception as e:
            logger.error(f"Failed to get stock financials for {symbol}: {e}")
            return None
    
    async def test_connection(self) -> bool:
        """Test Finnhub API connection"""
        try:
            # Test with a simple quote request
            data = await self._make_request('quote', {'symbol': 'AAPL'})
            return bool(data and 'c' in data)
        except Exception as e:
            logger.error(f"Finnhub connection test failed: {e}")
            return False
    
    def get_rate_limit_info(self) -> Dict[str, Any]:
        """Get Finnhub rate limit information"""
        return {
            "provider": "Finnhub",
            "rate_limit": "60 requests/minute (free tier)",
            "notes": "Professional financial data API with real-time and historical data",
            "recommended_delay": 1.0,  # 1 second between requests
            "api_key_configured": bool(self.api_key),
            "requests_per_minute": self.requests_per_minute,
            "authentication": "API key in header X-Finnhub-Secret"
        }
    
    async def close(self):
        """Close the aiohttp session"""
        if self.session and not self.session.closed:
            await self.session.close()


# Simple test function
async def test_finnhub_client():
    """Simple test function for Finnhub client"""
    print("🧪 Testing Finnhub Client...")
    
    # Use the provided API key
    api_key = "d2t3t79r01qkuv3j6p30d2t3t79r01qkuv3j6p3g"
    client = FinnhubClient(api_key)
    
    try:
        # Test connection first
        print("🔗 Testing connection...")
        is_connected = await client.test_connection()
        print(f"   {'✅' if is_connected else '❌'} Connection: {'Success' if is_connected else 'Failed'}")
        
        # Test rate limit info
        print("📊 Rate limit info:")
        rate_info = client.get_rate_limit_info()
        for key, value in rate_info.items():
            print(f"   {key}: {value}")
        
        if is_connected:
            # Test symbols
            test_symbols = ['AAPL', 'MSFT', 'GOOGL']
            
            for symbol in test_symbols:
                print(f"\n📊 Testing {symbol}:")
                
                # Test real-time quote
                quote = await client.get_realtime_quote(symbol)
                if quote:
                    print(f"  💰 Price: ${quote.price:,.2f} | Change: {quote.change_percent:+.2f}%")
                else:
                    print(f"  ❌ No quote data")
                
                # Test company profile
                profile = await client.get_company_profile(symbol)
                if profile:
                    print(f"  🏢 Company: {profile.name} | Sector: {profile.sector}")
                else:
                    print(f"  ❌ No profile data")
                
                # Test OHLCV data (last 5 days)
                ohlcv = await client.get_ohlcv_data(symbol, limit=5)
                if ohlcv:
                    print(f"  📈 OHLCV: {len(ohlcv)} data points")
                    latest = ohlcv[-1]
                    print(f"  📅 Latest: {latest.timestamp[:10]} | Close: ${latest.close:,.2f}")
                else:
                    print(f"  ❌ No OHLCV data")
        
        print("\n✅ Finnhub Client test completed!")
        
    finally:
        await client.close()


if __name__ == "__main__":
    import asyncio
    
    # Run test
    asyncio.run(test_finnhub_client())
