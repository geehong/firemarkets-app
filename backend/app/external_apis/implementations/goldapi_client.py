"""
GoldAPI.io client for precious metals data (Gold, Silver, Platinum, Palladium).
https://www.goldapi.io/
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from decimal import Decimal

import httpx

from app.external_apis.base.schemas import OhlcvDataPoint, RealtimeQuoteData
from app.external_apis.utils.helpers import safe_float

logger = logging.getLogger(__name__)


class GoldAPIClient:
    """GoldAPI.io client for precious metals prices"""
    
    def __init__(self, api_key: str = None):
        self.base_url = "https://www.goldapi.io/api"
        self.api_key = api_key or "goldapi-34gytsmiww8l8x-io"
        self.api_timeout = 30
        
        # 지원하는 금속 심볼
        self.supported_metals = {
            'XAU': 'Gold',
            'XAG': 'Silver', 
            'XPT': 'Platinum',
            'XPD': 'Palladium'
        }
        
        # 내부 티커 -> GoldAPI 심볼 매핑
        self.symbol_mapping = {
            'GOLD': 'XAU',
            'SILVER': 'XAG',
            'PLATINUM': 'XPT',
            'PALLADIUM': 'XPD',
            'GC': 'XAU',
            'SI': 'XAG',
            'GCUSD': 'XAU',
            'SIUSD': 'XAG',
            'XAU': 'XAU',
            'XAG': 'XAG',
            'XPT': 'XPT',
            'XPD': 'XPD'
        }
    
    def _get_headers(self) -> Dict[str, str]:
        """API 요청 헤더 생성"""
        return {
            'x-access-token': self.api_key,
            'Content-Type': 'application/json'
        }
    
    def _normalize_symbol(self, symbol: str) -> str:
        """내부 티커를 GoldAPI 심볼로 변환"""
        symbol_upper = symbol.upper().strip()
        return self.symbol_mapping.get(symbol_upper, symbol_upper)
    
    async def test_connection(self) -> bool:
        """API 연결 테스트"""
        try:
            async with httpx.AsyncClient(timeout=self.api_timeout) as client:
                url = f"{self.base_url}/XAU/USD"
                response = await client.get(url, headers=self._get_headers())
                return response.status_code == 200
        except Exception as e:
            logger.error(f"GoldAPI connection test failed: {e}")
            return False
    
    def get_rate_limit_info(self) -> Dict[str, Any]:
        """Rate limit 정보"""
        return {
            "plan": "Professional ($99/month)",
            "features": [
                "Unlimited API calls",
                "Real-time prices",
                "Historical data since 1968"
            ]
        }
    
    async def get_realtime_quote(
        self, 
        symbol: str, 
        currency: str = "USD"
    ) -> Optional[Dict[str, Any]]:
        """실시간 금속 가격 조회
        
        Args:
            symbol: 금속 심볼 (XAU, XAG, XPT, XPD 또는 GCUSD, SIUSD 등)
            currency: 통화 코드 (기본: USD)
            
        Returns:
            실시간 견적 데이터
        """
        try:
            metal_symbol = self._normalize_symbol(symbol)
            
            if metal_symbol not in self.supported_metals:
                logger.warning(f"Unsupported metal symbol: {symbol} -> {metal_symbol}")
                return None
            
            async with httpx.AsyncClient(timeout=self.api_timeout) as client:
                url = f"{self.base_url}/{metal_symbol}/{currency}"
                logger.info(f"GoldAPI request: {url}")
                
                response = await client.get(url, headers=self._get_headers())
                response.raise_for_status()
                data = response.json()
                
                if 'error' in data:
                    logger.error(f"GoldAPI error: {data['error']}")
                    return None
                
                # 응답 데이터 파싱
                result = {
                    'symbol': symbol,
                    'metal': data.get('metal'),
                    'currency': data.get('currency'),
                    'exchange': data.get('exchange'),
                    'timestamp': data.get('timestamp'),
                    'timestamp_utc': datetime.fromtimestamp(data.get('timestamp', 0)) if data.get('timestamp') else None,
                    'price': safe_float(data.get('price')),
                    'open_price': safe_float(data.get('open_price')),
                    'high_price': safe_float(data.get('high_price')),
                    'low_price': safe_float(data.get('low_price')),
                    'prev_close_price': safe_float(data.get('prev_close_price')),
                    'change': safe_float(data.get('ch')),
                    'change_percent': safe_float(data.get('chp')),
                    'bid': safe_float(data.get('bid')),
                    'ask': safe_float(data.get('ask')),
                    # 그램당 가격
                    'price_gram_24k': safe_float(data.get('price_gram_24k')),
                    'price_gram_22k': safe_float(data.get('price_gram_22k')),
                    'price_gram_18k': safe_float(data.get('price_gram_18k')),
                    'provider': 'goldapi'
                }
                
                logger.info(f"GoldAPI {symbol}: ${result['price']:.2f} (Change: {result['change_percent']:.2f}%)")
                return result
                
        except httpx.HTTPStatusError as e:
            logger.error(f"GoldAPI HTTP error for {symbol}: {e.response.status_code} - {e.response.text}")
        except Exception as e:
            logger.error(f"GoldAPI fetch failed for {symbol}: {e}")
        
        return None
    
    async def get_historical_price(
        self, 
        symbol: str, 
        date: str,
        currency: str = "USD"
    ) -> Optional[Dict[str, Any]]:
        """과거 일자 금속 가격 조회
        
        Args:
            symbol: 금속 심볼
            date: 조회 일자 (YYYYMMDD 형식)
            currency: 통화 코드
            
        Returns:
            해당 일자 가격 데이터
        """
        try:
            metal_symbol = self._normalize_symbol(symbol)
            
            if metal_symbol not in self.supported_metals:
                logger.warning(f"Unsupported metal symbol: {symbol}")
                return None
            
            async with httpx.AsyncClient(timeout=self.api_timeout) as client:
                url = f"{self.base_url}/{metal_symbol}/{currency}/{date}"
                logger.info(f"GoldAPI historical request: {url}")
                
                response = await client.get(url, headers=self._get_headers())
                response.raise_for_status()
                data = response.json()
                
                if 'error' in data:
                    logger.error(f"GoldAPI error: {data['error']}")
                    return None
                
                return {
                    'symbol': symbol,
                    'date': date,
                    'metal': data.get('metal'),
                    'currency': data.get('currency'),
                    'price': safe_float(data.get('price')),
                    'open_price': safe_float(data.get('open_price')),
                    'high_price': safe_float(data.get('high_price')),
                    'low_price': safe_float(data.get('low_price')),
                    'prev_close_price': safe_float(data.get('prev_close_price')),
                    'provider': 'goldapi'
                }
                
        except httpx.HTTPStatusError as e:
            logger.error(f"GoldAPI HTTP error for {symbol}/{date}: {e.response.status_code}")
        except Exception as e:
            logger.error(f"GoldAPI historical fetch failed for {symbol}/{date}: {e}")
        
        return None
    
    async def get_ohlcv_data(
        self,
        symbol: str,
        interval: str = "1d",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """OHLCV 형식으로 일봉 데이터 반환
        
        GoldAPI는 1일 1데이터 포인트를 제공하므로:
        - start_date/end_date가 있으면 해당 기간 데이터 수집 (각 날짜별 API 호출)
        - 없으면 어제 데이터 1개 반환
        
        Args:
            symbol: 티커 (GCUSD, SIUSD 등)
            interval: 데이터 간격 (GoldAPI는 1d만 지원)
            start_date: 시작일 (YYYY-MM-DD)
            end_date: 종료일 (YYYY-MM-DD)
            limit: 최대 데이터 수
        
        Returns:
            List[OhlcvDataPoint]: OHLCV 데이터 리스트
        """
        from datetime import timedelta
        from app.external_apis.base.schemas import OhlcvDataPoint
        
        # GoldAPI는 1d만 지원
        if interval not in ["1d", "1day"]:
            logger.warning(f"GoldAPI only supports 1d interval, got: {interval}")
            return []
        
        # 지원하는 티커인지 확인
        metal_symbol = self._normalize_symbol(symbol)
        if metal_symbol not in self.supported_metals:
            logger.debug(f"GoldAPI does not support symbol: {symbol}")
            return []
        
        results = []
        
        try:
            if start_date and end_date:
                # 날짜 범위 요청 - 각 날짜별로 API 호출
                start = datetime.strptime(start_date, '%Y-%m-%d')
                end = datetime.strptime(end_date, '%Y-%m-%d')
                current = start
                
                while current <= end:
                    if limit and len(results) >= limit:
                        break
                    
                    date_str = current.strftime('%Y%m%d')
                    data = await self.get_historical_price(symbol, date_str, 'USD')
                    
                    if data and data.get('price'):
                        price = data.get('price')
                        # Historical API는 OHLC를 제공하지 않으므로 price로 대체
                        ohlcv = OhlcvDataPoint(
                            timestamp_utc=current.replace(hour=0, minute=0, second=0, microsecond=0),
                            open_price=data.get('open_price') or price,
                            high_price=data.get('high_price') or price,
                            low_price=data.get('low_price') or price,
                            close_price=price,
                            volume=0,  # GoldAPI는 볼륨 미제공
                            change_percent=data.get('chp')
                        )
                        results.append(ohlcv)
                    
                    current += timedelta(days=1)
            else:
                # 기본: 어제 데이터 1개
                yesterday = datetime.utcnow() - timedelta(days=1)
                date_str = yesterday.strftime('%Y%m%d')
                
                data = await self.get_historical_price(symbol, date_str, 'USD')
                
                if data and data.get('price'):
                    price = data.get('price')
                    # Historical API는 OHLC를 제공하지 않으므로 price로 대체
                    ohlcv = OhlcvDataPoint(
                        timestamp_utc=yesterday.replace(hour=0, minute=0, second=0, microsecond=0),
                        open_price=data.get('open_price') or price,
                        high_price=data.get('high_price') or price,
                        low_price=data.get('low_price') or price,
                        close_price=price,
                        volume=0,
                        change_percent=data.get('chp')
                    )
                    results.append(ohlcv)
            
            if results:
                logger.info(f"GoldAPI returned {len(results)} OHLCV points for {symbol}")
            
            return results
            
        except Exception as e:
            logger.error(f"GoldAPI OHLCV fetch failed for {symbol}: {e}")
            return []
    
    async def get_gold_silver_ratio(self) -> Optional[Dict[str, Any]]:
        """금/은 비율 조회 (XAU/XAG)"""
        try:
            async with httpx.AsyncClient(timeout=self.api_timeout) as client:
                url = f"{self.base_url}/XAU/XAG"
                response = await client.get(url, headers=self._get_headers())
                response.raise_for_status()
                data = response.json()
                
                return {
                    'ratio': safe_float(data.get('price')),
                    'timestamp': data.get('timestamp'),
                    'change': safe_float(data.get('ch')),
                    'change_percent': safe_float(data.get('chp'))
                }
                
        except Exception as e:
            logger.error(f"GoldAPI gold/silver ratio failed: {e}")
            return None


# 테스트 함수
async def test_goldapi():
    """GoldAPI 클라이언트 테스트"""
    client = GoldAPIClient()
    
    print("=" * 60)
    print("GoldAPI.io Client Test")
    print("=" * 60)
    
    # 연결 테스트
    print("\n1. Connection Test:")
    connected = await client.test_connection()
    print(f"   Connected: {connected}")
    
    # 실시간 금 가격
    print("\n2. Gold (XAU/USD) Real-time Quote:")
    gold = await client.get_realtime_quote('XAU', 'USD')
    if gold:
        print(f"   Price: ${gold['price']:.2f}")
        print(f"   Open: ${gold['open_price']:.2f}")
        print(f"   High: ${gold['high_price']:.2f}")
        print(f"   Low: ${gold['low_price']:.2f}")
        print(f"   Change: {gold['change_percent']:.2f}%")
        print(f"   Bid/Ask: ${gold['bid']:.2f} / ${gold['ask']:.2f}")
    
    # 실시간 은 가격
    print("\n3. Silver (XAG/USD) Real-time Quote:")
    silver = await client.get_realtime_quote('XAG', 'USD')
    if silver:
        print(f"   Price: ${silver['price']:.2f}")
        print(f"   Change: {silver['change_percent']:.2f}%")
    
    # GCUSD 티커로 테스트 (내부 매핑)
    print("\n4. GCUSD (Internal Ticker) Test:")
    gcusd = await client.get_realtime_quote('GCUSD', 'USD')
    if gcusd:
        print(f"   Mapped to: {gcusd['metal']}")
        print(f"   Price: ${gcusd['price']:.2f}")
    
    # 금/은 비율
    print("\n5. Gold/Silver Ratio:")
    ratio = await client.get_gold_silver_ratio()
    if ratio:
        print(f"   Ratio: {ratio['ratio']:.2f}")
        print(f"   (1 oz Gold = {ratio['ratio']:.2f} oz Silver)")
    
    print("\n" + "=" * 60)
    print("Test completed!")
    print("=" * 60)


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_goldapi())
