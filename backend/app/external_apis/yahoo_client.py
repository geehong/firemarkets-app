"""
Yahoo Finance API client for fetching financial data.
"""
import logging
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
import httpx
import backoff

logger = logging.getLogger(__name__)


class YahooFinanceClient:
    """Yahoo Finance API client"""
    
    def __init__(self):
        self.base_url = "https://query1.finance.yahoo.com"
        self.timeout = 30
        self.max_retries = 3
    
    @backoff.on_exception(
        backoff.expo,
        (httpx.RequestError, httpx.HTTPStatusError),
        max_tries=5,  # 3에서 5로 증가
        max_time=120  # 60에서 120초로 증가
    )
    async def _fetch_async(self, client: httpx.AsyncClient, url: str, ticker: str):
        """Fetch data from Yahoo Finance API with retry logic"""
        logger.info(f"[{ticker}] Yahoo Finance API 호출: {url}")
        
        response = await client.get(url, timeout=self.timeout)
        
        if response.status_code == 429:  # Too Many Requests
            logger.warning(f"[{ticker}] Yahoo Finance API 호출 제한 도달. 30초 후 재시도합니다.")
            await asyncio.sleep(30)  # 30초 대기
            response.raise_for_status()
        
        response.raise_for_status()
        return response.json()
    
    async def get_historical_data(self, ticker: str, period: str = "1y", interval: str = "1d") -> List[Dict]:
        """
        Get historical OHLCV data from Yahoo Finance
        
        Args:
            ticker: Stock symbol (e.g., 'AAPL', 'MSFT')
            period: Time period ('1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max')
            interval: Data interval ('1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo')
        
        Returns:
            List of OHLCV data dictionaries
        """
        async with httpx.AsyncClient() as client:
            try:
                # Yahoo Finance API URL
                url = f"{self.base_url}/v8/finance/chart/{ticker}?period={period}&interval={interval}&includePrePost=false&events=div%2Csplit"
                
                data = await self._fetch_async(client, url, ticker)
                
                if "chart" not in data or "result" not in data["chart"] or not data["chart"]["result"]:
                    logger.warning(f"[{ticker}] Yahoo Finance: 유효하지 않은 응답")
                    return []
                
                result = data["chart"]["result"][0]
                
                if "timestamp" not in result or "indicators" not in result:
                    logger.warning(f"[{ticker}] Yahoo Finance: 타임스탬프 또는 지표 데이터 없음")
                    return []
                
                timestamps = result["timestamp"]
                quote = result["indicators"]["quote"][0] if result["indicators"]["quote"] else {}
                
                ohlcv_data = []
                for i, timestamp in enumerate(timestamps):
                    # Unix timestamp를 datetime으로 변환
                    dt = datetime.fromtimestamp(timestamp)
                    
                    # OHLCV 데이터 추출
                    ohlcv_point = {
                        "timestamp_utc": dt,
                        "open_price": self._safe_float(quote.get("open", [None])[i] if quote.get("open") else None),
                        "high_price": self._safe_float(quote.get("high", [None])[i] if quote.get("high") else None),
                        "low_price": self._safe_float(quote.get("low", [None])[i] if quote.get("low") else None),
                        "close_price": self._safe_float(quote.get("close", [None])[i] if quote.get("close") else None),
                        "volume": self._safe_float(quote.get("volume", [0])[i] if quote.get("volume") else 0),
                    }
                    
                    # None 값이 아닌 경우만 추가
                    if all(v is not None for v in [ohlcv_point["open_price"], ohlcv_point["high_price"], 
                                                   ohlcv_point["low_price"], ohlcv_point["close_price"]]):
                        ohlcv_data.append(ohlcv_point)
                
                logger.info(f"[{ticker}] Yahoo Finance에서 {len(ohlcv_data)}개 데이터 포인트 수집 완료")
                return ohlcv_data
                
            except Exception as e:
                logger.error(f"[{ticker}] Yahoo Finance 데이터 수집 오류: {e}")
                return []
    
    async def get_quote(self, ticker: str) -> Optional[Dict]:
        """
        Get current quote data from Yahoo Finance
        
        Args:
            ticker: Stock symbol
            
        Returns:
            Quote data dictionary or None
        """
        async with httpx.AsyncClient() as client:
            try:
                url = f"{self.base_url}/v7/finance/quote?symbols={ticker}"
                
                data = await self._fetch_async(client, url, ticker)
                
                if "quoteResponse" not in data or "result" not in data["quoteResponse"]:
                    return None
                
                result = data["quoteResponse"]["result"][0]
                
                quote_data = {
                    "symbol": result.get("symbol"),
                    "regularMarketPrice": self._safe_float(result.get("regularMarketPrice")),
                    "regularMarketChange": self._safe_float(result.get("regularMarketChange")),
                    "regularMarketChangePercent": self._safe_float(result.get("regularMarketChangePercent")),
                    "regularMarketVolume": self._safe_float(result.get("regularMarketVolume")),
                    "marketCap": self._safe_float(result.get("marketCap")),
                    "regularMarketOpen": self._safe_float(result.get("regularMarketOpen")),
                    "regularMarketDayHigh": self._safe_float(result.get("regularMarketDayHigh")),
                    "regularMarketDayLow": self._safe_float(result.get("regularMarketDayLow")),
                    "regularMarketPreviousClose": self._safe_float(result.get("regularMarketPreviousClose")),
                    "timestamp": datetime.now()
                }
                
                return quote_data
                
            except Exception as e:
                logger.error(f"[{ticker}] Yahoo Finance quote 수집 오류: {e}")
                return None

    async def get_current_prices(self, symbols: List[str]) -> Dict[str, float]:
        """
        여러 주식 심볼의 현재 가격을 조회합니다.
        
        Args:
            symbols: 주식 심볼 리스트 (예: ['AAPL', 'GOOGL', 'MSFT'])
            
        Returns:
            {symbol: price} 형태의 딕셔너리
        """
        if not symbols:
            return {}
            
        async with httpx.AsyncClient() as client:
            try:
                # Yahoo Finance API는 여러 심볼을 쉼표로 구분하여 받습니다
                symbols_str = ','.join(symbols)
                url = f"{self.base_url}/v7/finance/quote?symbols={symbols_str}"
                
                data = await self._fetch_async(client, url, "multiple")
                
                if "quoteResponse" not in data or "result" not in data["quoteResponse"]:
                    logger.error("Yahoo Finance API 응답 형식 오류")
                    return {}
                
                results = data["quoteResponse"]["result"]
                prices = {}
                
                for result in results:
                    symbol = result.get("symbol")
                    price = self._safe_float(result.get("regularMarketPrice"))
                    
                    if symbol and price is not None:
                        prices[symbol] = price
                    else:
                        logger.warning(f"심볼 {symbol}의 가격 데이터 누락")
                
                logger.info(f"Yahoo Finance에서 {len(prices)}개 심볼의 가격 조회 완료")
                return prices
                
            except Exception as e:
                logger.error(f"Yahoo Finance 다중 가격 조회 오류: {e}")
                return {}
    
    def _safe_float(self, value: Any) -> Optional[float]:
        """Safely convert value to float, treating 0 values as invalid"""
        if value is None:
            return None
        
        # 0, "0", 0.0 등은 None으로 처리 (가격 데이터에서 0은 유효하지 않음)
        if value == 0 or value == "0" or value == 0.0:
            return None
            
        try:
            result = float(value)
            # 변환된 결과가 0이면 None 반환
            if result == 0:
                return None
            return result
        except (ValueError, TypeError):
            return None

