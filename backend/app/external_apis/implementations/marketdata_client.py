"""
MarketData.app client for stocks, options, and indices data.
https://www.marketdata.app/docs/api
"""
import logging
import os
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from decimal import Decimal

import httpx

from app.external_apis.base.schemas import OhlcvDataPoint, RealtimeQuoteData
from app.external_apis.utils.helpers import safe_float

logger = logging.getLogger(__name__)


class MarketDataClient:
    """MarketData.app client for stocks, options, and indices"""
    
    def __init__(self, api_token: str = None):
        self.base_url = "https://api.marketdata.app/v1"
        self.api_token = api_token or os.getenv("MARKETDATA_API_TOKEN", "")
        self.api_timeout = 30
        
        # 지원하는 데이터 타입
        self.supported_endpoints = {
            
            'stocks': '/stocks',
            'options': '/options',
            'indices': '/indices'
        }
        
        # Resolution 매핑 (interval -> MarketData resolution)
        self.resolution_mapping = {
            '1m': '1',
            '5m': '5',
            '15m': '15',
            '30m': '30',
            '1h': '60',
            '4h': '4H',
            '1d': 'D',
            '1D': 'D',
            '1day': 'D',
            '1w': 'W',
            '1W': 'W',
            '1week': 'W',
            '1M': 'M',
            '1month': 'M'
        }
    
    def _get_headers(self) -> Dict[str, str]:
        """API 요청 헤더 생성"""
        return {
            'Authorization': f'Token {self.api_token}',
            'Accept': 'application/json'
        }
    
    def _normalize_resolution(self, interval: str) -> str:
        """내부 interval을 MarketData resolution으로 변환"""
        return self.resolution_mapping.get(interval, interval)
    
    async def test_connection(self) -> bool:
        """API 연결 테스트 (AAPL은 인증 없이 테스트 가능)"""
        try:
            async with httpx.AsyncClient(timeout=self.api_timeout) as client:
                url = f"{self.base_url}/stocks/quotes/AAPL/"
                response = await client.get(url, headers=self._get_headers())
                return response.status_code == 200
        except Exception as e:
            logger.error(f"MarketData connection test failed: {e}")
            return False
    
    def get_rate_limit_info(self) -> Dict[str, Any]:
        """Rate limit 정보"""
        return {
            "plan": "Starter (Free)",
            "features": [
                "100 API requests/day for free",
                "Real-time and historical data",
                "Stocks, Options, Indices"
            ]
        }
    
    async def get_realtime_quote(
        self, 
        symbol: str,
        asset_type: str = "stocks"
    ) -> Optional[Dict[str, Any]]:
        """실시간 시세 조회
        
        Args:
            symbol: 티커 심볼 (AAPL, TSLA 등)
            asset_type: 자산 유형 (stocks, options, indices)
            
        Returns:
            실시간 시세 데이터
        """
        try:
            endpoint = self.supported_endpoints.get(asset_type, '/stocks')
            
            async with httpx.AsyncClient(timeout=self.api_timeout) as client:
                url = f"{self.base_url}{endpoint}/quotes/{symbol}/"
                logger.info(f"MarketData request: {url}")
                
                response = await client.get(url, headers=self._get_headers())
                response.raise_for_status()
                data = response.json()
                
                if data.get('s') == 'error':
                    logger.error(f"MarketData error: {data.get('errmsg')}")
                    return None
                
                # 응답 데이터 파싱
                result = {
                    'symbol': symbol,
                    'ask': safe_float(data.get('ask', [None])[0]) if data.get('ask') else None,
                    'ask_size': data.get('askSize', [None])[0] if data.get('askSize') else None,
                    'bid': safe_float(data.get('bid', [None])[0]) if data.get('bid') else None,
                    'bid_size': data.get('bidSize', [None])[0] if data.get('bidSize') else None,
                    'mid': safe_float(data.get('mid', [None])[0]) if data.get('mid') else None,
                    'last': safe_float(data.get('last', [None])[0]) if data.get('last') else None,
                    'change': safe_float(data.get('change', [None])[0]) if data.get('change') else None,
                    'change_percent': safe_float(data.get('changepct', [None])[0]) if data.get('changepct') else None,
                    'volume': data.get('volume', [None])[0] if data.get('volume') else None,
                    'timestamp': data.get('updated', [None])[0] if data.get('updated') else None,
                    'provider': 'marketdata'
                }
                
                # 가격 결정 (last 우선, 없으면 mid)
                result['price'] = result['last'] or result['mid'] or 0
                
                logger.info(f"MarketData {symbol}: ${result['price']:.2f} (Change: {result['change_percent']:.2f}%)")
                return result
                
        except httpx.HTTPStatusError as e:
            logger.error(f"MarketData HTTP error for {symbol}: {e.response.status_code} - {e.response.text}")
        except Exception as e:
            logger.error(f"MarketData fetch failed for {symbol}: {e}")
        
        return None
    
    async def get_historical_candles(
        self, 
        symbol: str,
        resolution: str = "D",
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        limit: Optional[int] = None,
        asset_type: str = "stocks"
    ) -> Optional[Dict[str, Any]]:
        """과거 캔들(OHLCV) 데이터 조회
        
        Args:
            symbol: 티커 심볼
            resolution: 데이터 간격 (1, 5, 15, 30, 60, D, W, M)
            from_date: 시작일 (YYYY-MM-DD)
            to_date: 종료일 (YYYY-MM-DD)
            limit: 최대 데이터 수
            asset_type: 자산 유형
            
        Returns:
            캔들 데이터
        """
        try:
            endpoint = self.supported_endpoints.get(asset_type, '/stocks')
            
            async with httpx.AsyncClient(timeout=self.api_timeout) as client:
                url = f"{self.base_url}{endpoint}/candles/{resolution}/{symbol}/"
                params = {}
                
                if from_date:
                    params['from'] = from_date
                if to_date:
                    params['to'] = to_date
                if limit:
                    params['limit'] = limit
                
                logger.info(f"MarketData candles request: {url} with params: {params}")
                
                response = await client.get(url, headers=self._get_headers(), params=params)
                response.raise_for_status()
                data = response.json()
                
                if data.get('s') == 'error':
                    logger.error(f"MarketData error: {data.get('errmsg')}")
                    return None
                
                return data
                
        except httpx.HTTPStatusError as e:
            logger.error(f"MarketData HTTP error for {symbol}: {e.response.status_code}")
        except Exception as e:
            logger.error(f"MarketData candles fetch failed for {symbol}: {e}")
        
        return None
    
    async def get_ohlcv_data(
        self,
        symbol: str,
        interval: str = "1d",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[OhlcvDataPoint]:
        """OHLCV 형식으로 데이터 반환 (다른 클라이언트와 호환)
        
        Args:
            symbol: 티커 (AAPL, TSLA 등)
            interval: 데이터 간격 (1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M)
            start_date: 시작일 (YYYY-MM-DD)
            end_date: 종료일 (YYYY-MM-DD)
            limit: 최대 데이터 수
        
        Returns:
            List[OhlcvDataPoint]: OHLCV 데이터 리스트
        """
        results = []
        
        try:
            resolution = self._normalize_resolution(interval)
            
            data = await self.get_historical_candles(
                symbol=symbol,
                resolution=resolution,
                from_date=start_date,
                to_date=end_date,
                limit=limit
            )
            
            if not data or data.get('s') == 'no_data':
                logger.debug(f"No data from MarketData for {symbol}")
                return []
            
            # 배열 데이터 파싱
            timestamps = data.get('t', [])
            opens = data.get('o', [])
            highs = data.get('h', [])
            lows = data.get('l', [])
            closes = data.get('c', [])
            volumes = data.get('v', [])
            
            for i in range(len(timestamps)):
                try:
                    # Unix timestamp를 datetime으로 변환
                    ts = timestamps[i]
                    if ts:
                        timestamp_utc = datetime.utcfromtimestamp(ts)
                    else:
                        continue
                    
                    ohlcv = OhlcvDataPoint(
                        timestamp_utc=timestamp_utc,
                        open_price=safe_float(opens[i]) if i < len(opens) else 0,
                        high_price=safe_float(highs[i]) if i < len(highs) else 0,
                        low_price=safe_float(lows[i]) if i < len(lows) else 0,
                        close_price=safe_float(closes[i]) if i < len(closes) else 0,
                        volume=safe_float(volumes[i]) if i < len(volumes) else 0,
                        data_interval=interval
                    )
                    results.append(ohlcv)
                except Exception as e:
                    logger.warning(f"Failed to parse candle {i} for {symbol}: {e}")
                    continue
            
            if results:
                logger.info(f"MarketData returned {len(results)} OHLCV points for {symbol}")
            
            return results
            
        except Exception as e:
            logger.error(f"MarketData OHLCV fetch failed for {symbol}: {e}")
            return []
    
    async def get_bulk_quotes(
        self,
        symbols: List[str],
        asset_type: str = "stocks"
    ) -> List[Dict[str, Any]]:
        """여러 심볼의 실시간 시세 일괄 조회
        
        Args:
            symbols: 티커 심볼 리스트
            asset_type: 자산 유형
            
        Returns:
            시세 데이터 리스트
        """
        try:
            endpoint = self.supported_endpoints.get(asset_type, '/stocks')
            symbols_str = ','.join(symbols)
            
            async with httpx.AsyncClient(timeout=self.api_timeout) as client:
                url = f"{self.base_url}{endpoint}/bulkquotes/"
                params = {'symbols': symbols_str}
                
                logger.info(f"MarketData bulk quotes request for {len(symbols)} symbols")
                
                response = await client.get(url, headers=self._get_headers(), params=params)
                response.raise_for_status()
                data = response.json()
                
                if data.get('s') == 'error':
                    logger.error(f"MarketData error: {data.get('errmsg')}")
                    return []
                
                results = []
                symbol_list = data.get('symbol', [])
                
                for i, sym in enumerate(symbol_list):
                    quote = {
                        'symbol': sym,
                        'ask': safe_float(data.get('ask', [])[i]) if i < len(data.get('ask', [])) else None,
                        'bid': safe_float(data.get('bid', [])[i]) if i < len(data.get('bid', [])) else None,
                        'mid': safe_float(data.get('mid', [])[i]) if i < len(data.get('mid', [])) else None,
                        'last': safe_float(data.get('last', [])[i]) if i < len(data.get('last', [])) else None,
                        'change': safe_float(data.get('change', [])[i]) if i < len(data.get('change', [])) else None,
                        'change_percent': safe_float(data.get('changepct', [])[i]) if i < len(data.get('changepct', [])) else None,
                        'volume': data.get('volume', [])[i] if i < len(data.get('volume', [])) else None,
                        'provider': 'marketdata'
                    }
                    quote['price'] = quote['last'] or quote['mid'] or 0
                    results.append(quote)
                
                return results
                
        except Exception as e:
            logger.error(f"MarketData bulk quotes failed: {e}")
            return []
    
    async def get_earnings(
        self,
        symbol: str,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """실적 발표 데이터 조회
        
        Args:
            symbol: 티커 심볼
            from_date: 시작일
            to_date: 종료일
            
        Returns:
            실적 데이터
        """
        try:
            async with httpx.AsyncClient(timeout=self.api_timeout) as client:
                url = f"{self.base_url}/stocks/earnings/{symbol}/"
                params = {}
                
                if from_date:
                    params['from'] = from_date
                if to_date:
                    params['to'] = to_date
                
                response = await client.get(url, headers=self._get_headers(), params=params)
                response.raise_for_status()
                data = response.json()
                
                if data.get('s') == 'error':
                    return None
                
                return data
                
        except Exception as e:
            logger.error(f"MarketData earnings fetch failed for {symbol}: {e}")
            return None


# 테스트 함수
async def test_marketdata():
    """MarketData.app 클라이언트 테스트"""
    client = MarketDataClient()
    
    print("=" * 60)
    print("MarketData.app Client Test")
    print("=" * 60)
    
    # 연결 테스트
    print("\n1. Connection Test:")
    connected = await client.test_connection()
    print(f"   Connected: {connected}")
    
    # 실시간 시세 (AAPL은 무료)
    print("\n2. AAPL Real-time Quote:")
    quote = await client.get_realtime_quote('AAPL')
    if quote:
        print(f"   Price: ${quote['price']:.2f}")
        print(f"   Bid/Ask: ${quote['bid']:.2f} / ${quote['ask']:.2f}")
        print(f"   Change: {quote['change_percent']:.2f}%")
        print(f"   Volume: {quote['volume']:,}")
    
    # 과거 캔들 데이터
    print("\n3. AAPL Historical Candles (Daily, last 5 days):")
    from_date = (datetime.now() - timedelta(days=5)).strftime('%Y-%m-%d')
    ohlcv = await client.get_ohlcv_data('AAPL', '1d', start_date=from_date)
    if ohlcv:
        for candle in ohlcv[-3:]:  # 최근 3개만 출력
            print(f"   {candle.timestamp_utc.date()}: O=${candle.open_price:.2f} H=${candle.high_price:.2f} L=${candle.low_price:.2f} C=${candle.close_price:.2f}")
    
    print("\n" + "=" * 60)
    print("Test completed!")
    print("=" * 60)


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_marketdata())
