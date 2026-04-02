"""
Coinbase API client for cryptocurrency data.
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta, timezone

import httpx

from app.external_apis.base.crypto_client import CryptoAPIClient
from app.external_apis.base.schemas import OhlcvDataPoint, RealtimeQuoteData, CryptoData
from app.external_apis.utils.helpers import safe_float, safe_date_parse

logger = logging.getLogger(__name__)


class CoinbaseClient(CryptoAPIClient):
    """Coinbase API client"""
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://api.exchange.coinbase.com"
    
    def _convert_symbol_for_coinbase(self, symbol: str) -> Optional[str]:
        """Coinbase API용 심볼 변환 (BTCUSDT -> BTC-USD)"""
        if not symbol:
            return None
            
        # 이미 변환된 형식인 경우 그대로 반환
        if symbol.endswith('-USD'):
            return symbol

        # Coinbase에서 지원하는 심볼 매핑
        coinbase_symbols = {
            'BTC': 'BTC-USD',
            'ETH': 'ETH-USD',
            'ADA': 'ADA-USD',
            'DOT': 'DOT-USD',
            'LINK': 'LINK-USD',
            'LTC': 'LTC-USD',
            'XRP': 'XRP-USD',
            'DOGE': 'DOGE-USD',
            'BCH': 'BCH-USD',
            'EOS': 'EOS-USD',
            'ATOM': 'ATOM-USD',
            'VET': 'VET-USD',
            'FIL': 'FIL-USD',
            'THETA': 'THETA-USD',
            'AAVE': 'AAVE-USD',
            'SUSHI': 'SUSHI-USD',
            'COMP': 'COMP-USD',
            'YFI': 'YFI-USD',
            'SNX': 'SNX-USD',
            'MKR': 'MKR-USD',
            'CRV': 'CRV-USD',
            '1INCH': '1INCH-USD',
            'ALPHA': 'ALPHA-USD',
            'ZEN': 'ZEN-USD',
            'SKL': 'SKL-USD',
            'GRT': 'GRT-USD',
            'BAND': 'BAND-USD',
            'NMR': 'NMR-USD',
            'OCEAN': 'OCEAN-USD',
            'REEF': 'REEF-USD',
            'ALICE': 'ALICE-USD',
            'TLM': 'TLM-USD',
            'ICP': 'ICP-USD',
            # 추가된 심볼들 (Binance에서 지원하지 않는 심볼 포함)
            'CRO': 'CRO-USD',      # Crypto.com Coin - Coinbase에서 지원
            'AVAX': 'AVAX-USD',
            'INJ': 'INJ-USD',
            'JASMY': 'JASMY-USD',
            'HBAR': 'HBAR-USD',
            'STX': 'STX-USD',
            'RNDR': 'RENDER-USD',  # RNDR -> RENDER
            'HNT': 'HNT-USD',      # Helium - Coinbase에서 지원
            'RSR': 'RSR-USD',      # Reserve Rights
            # Coinbase에서 지원하지 않는 심볼들
            'XLM': None,  # Coinbase에서 지원하지 않음
            'TRX': None,  # Coinbase에서 지원하지 않음
            'UNI': None,  # Coinbase에서 지원하지 않음
            'SHIB': None,  # Coinbase에서 지원하지 않음
            'TON': None,  # Coinbase에서 지원하지 않음
            'USDC': None,  # USDC는 스테이블코인으로 거래 페어가 아님
            'USDT': None,  # USDT는 스테이블코인으로 거래 페어가 아님
            'FTT': None,   # FTX Token - 상장폐지됨
            'LUNA': None,  # Terra Luna Classic - 제한됨
            'FTM': None,   # Fantom - Coinbase에서 404 에러 (Sonic으로 전환)
            'MSOL': None,  # Marinade Staked SOL - Coinbase에서 지원하지 않음
        }
        
        # 매핑 테이블에서 찾기
        if symbol in coinbase_symbols:
            return coinbase_symbols[symbol]
        
        # 일반적인 변환 규칙 (fallback)
        if symbol.endswith('USDT') and len(symbol) > 4:
            return symbol[:-4] + '-USD'
        elif symbol.endswith('USDC') and len(symbol) > 4:
            # USDCUSDT 같은 경우는 앞부분만 추출
            return symbol[:-4] + '-USD'
        elif symbol.endswith('BTC') and len(symbol) > 3:
            return symbol + '-USD'
        elif symbol == 'USDC' or symbol == 'USDT':
            # 스테이블코인 자체는 거래 페어가 아님
            return None
        else:
            # 기본적으로 -USD 추가
            return f"{symbol}-USD"
    
    async def test_connection(self) -> bool:
        """Test Coinbase API connection"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/time"
                response = await client.get(url, timeout=self.api_timeout)
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Coinbase connection test failed: {e}")
            return False
    
    def get_rate_limit_info(self) -> Dict[str, Any]:
        """Get Coinbase rate limit information"""
        return {
            "free_tier": {
                "calls_per_minute": 180,
                "calls_per_second": 3
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
        """Get OHLCV data from Coinbase"""
        try:
            # Coinbase API용 심볼 변환
            coinbase_symbol = self._convert_symbol_for_coinbase(symbol)
            
            # Coinbase에서 지원하지 않는 심볼인 경우 빈 리스트 반환
            if coinbase_symbol is None:
                logger.warning(f"Coinbase does not support symbol: {symbol}")
                return []
            
            async with httpx.AsyncClient() as client:
                # Coinbase는 granularity를 초 단위로 받음 (86400 = 1일)
                granularity_val = int(86400)
                if interval == "1m":
                    granularity_val = 60
                elif interval == "5m":
                    granularity_val = 300
                elif interval == "1h":
                    granularity_val = 3600
                elif interval == "4h":
                    granularity_val = 14400
                
                granularity = str(granularity_val)
                result = []
                target_limit = limit or 300
                
                # Parse dates to datetime objects for easy calculation
                # end_date가 없으면 현재 시간 사용
                if end_date:
                    current_end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                    if current_end_dt.tzinfo is None:
                        current_end_dt = current_end_dt.replace(tzinfo=timezone.utc)
                else:
                    current_end_dt = datetime.now(timezone.utc)

                # start_dt 도달 시 종료
                if start_date:
                    start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                    if start_dt.tzinfo is None:
                        start_dt = start_dt.replace(tzinfo=timezone.utc)
                else:
                    start_dt = current_end_dt - timedelta(days=3650)
                
                logger.info(f"[{symbol}] Paging loop range: {start_dt.isoformat()} to {current_end_dt.isoformat()} (limit: {target_limit})")
                
                # Paging loop
                while len(result) < target_limit:
                    # Coinbase는 최대 300개까지만 리턴함. 
                    # 한 번의 호출에서 윈도우가 너무 크면 에러(400)가 발생하므로, current_end 기준 최신 300개 윈도우 계산
                    page_start_dt = current_end_dt - timedelta(seconds=granularity_val * 299)
                    
                    # 요청할 윈도우의 시작점 (start_dt 보다는 커야 함)
                    actual_start_dt = max(page_start_dt, start_dt)
                    actual_start = actual_start_dt.strftime('%Y-%m-%dT%H:%M:%SZ')
                    actual_end = current_end_dt.strftime('%Y-%m-%dT%H:%M:%SZ')
                    
                    base = f"{self.base_url}/products/{coinbase_symbol}/candles?granularity={granularity}"
                    url = f"{base}&start={actual_start}&end={actual_end}"
                    
                    logger.info(f"[{symbol}] Coinbase API 호출 시도: {url}")
                    
                    data = await self._fetch_async(client, url, "Coinbase", symbol)
                    
                    if not isinstance(data, list) or not data:
                        # 더 이상 데이터가 없거나 윈도우 상 데이터가 없는 경우
                        break
                    
                    page_result = []
                    for candle in data:
                        point = OhlcvDataPoint(
                            timestamp_utc=datetime.fromtimestamp(candle[0], tz=timezone.utc),
                            low_price=safe_float(candle[1]),
                            high_price=safe_float(candle[2]),
                            open_price=safe_float(candle[3]),
                            close_price=safe_float(candle[4]),
                            volume=safe_float(candle[5], 0.0),
                            change_percent=self._calculate_change_percent(
                                safe_float(candle[4]),
                                safe_float(candle[3])
                            )
                        )
                        page_result.append(point)
                    
                    # Coinbase는 최신 데이터부터 [0]에 줌 (역순)
                    result.extend(page_result)
                    
                    # Limit 도달 시 종료
                    if len(result) >= target_limit:
                        result = result[:target_limit]
                        break
                    
                    # 다음 페이지를 위해 current_end_dt 업데이트
                    # 가장 오래된 데이터의 시간보다 1 granularity 이전으로 설정
                    last_ts = data[-1][0]
                    current_end_dt = datetime.fromtimestamp(last_ts - granularity_val, tz=timezone.utc)
                    
                    # start_dt 도달 시 종료
                    if current_end_dt < start_dt:
                        break
                        
                return result
        except Exception as e:
            logger.error(f"Coinbase OHLCV fetch failed for {symbol}: {e}")
        
        return []
    
    async def get_realtime_quote(self, symbol: str) -> Optional[RealtimeQuoteData]:
        """Get real-time quote from Coinbase"""
        try:
            # Coinbase API용 심볼 변환
            coinbase_symbol = self._convert_symbol_for_coinbase(symbol)
            
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/products/{coinbase_symbol}/ticker"
                data = await self._fetch_async(client, url, "Coinbase Ticker", symbol)
                
                if isinstance(data, dict):
                    quote = RealtimeQuoteData(
                        symbol=symbol,
                        price=safe_float(data.get("price")),
                        change_percent=None,  # Coinbase는 24시간 변화율을 제공하지 않음
                        timestamp_utc=datetime.fromisoformat(data.get("time", "").replace('Z', '+00:00')) if data.get("time") else datetime.now()
                    )
                    return quote
        except Exception as e:
            logger.error(f"Coinbase Ticker fetch failed for {symbol}: {e}")
        
        return None
    
    async def get_exchange_info(self) -> Optional[Dict[str, Any]]:
        """Get exchange information from Coinbase"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/products"
                data = await self._fetch_async(client, url, "Coinbase Products")
                
                if isinstance(data, list):
                    return {
                        "products_count": len(data),
                        "products": [
                            {
                                "id": product.get("id"),
                                "base_currency": product.get("base_currency"),
                                "quote_currency": product.get("quote_currency"),
                                "status": product.get("status")
                            }
                            for product in data[:10]  # 처음 10개만 반환
                        ]
                    }
        except Exception as e:
            logger.error(f"Coinbase Exchange Info fetch failed: {e}")
        
        return None
    
    async def get_global_metrics(self) -> Optional[Dict[str, Any]]:
        """Get global cryptocurrency market metrics - Not supported by Coinbase"""
        raise NotImplementedError("Coinbase API는 거래소별 API이므로 글로벌 암호화폐 시장 메트릭을 제공하지 않습니다. 글로벌 메트릭은 CoinGecko, CoinMarketCap API를 사용하세요.")
    
    async def get_crypto_data(self, symbol: str) -> Optional[CryptoData]:
        """Get comprehensive cryptocurrency data from Coinbase"""
        try:
            # Coinbase API용 심볼 변환
            coinbase_symbol = self._convert_symbol_for_coinbase(symbol)
            
            # Coinbase에서 지원하지 않는 심볼인 경우 None 반환
            if coinbase_symbol is None:
                logger.warning(f"Coinbase does not support symbol: {symbol}")
                return None
            
            async with httpx.AsyncClient() as client:
                # Get product stats
                url = f"{self.base_url}/products/{coinbase_symbol}/stats"
                data = await self._fetch_async(client, url, "Coinbase Stats", symbol)
                
                if isinstance(data, dict):
                    crypto_data = CryptoData(
                        symbol=symbol,
                        price=safe_float(data.get("last")),
                        market_cap=None,  # Coinbase API는 market cap을 제공하지 않음
                        volume_24h=safe_float(data.get("volume")),
                        change_24h=None,  # Coinbase API는 24시간 변화율을 제공하지 않음
                        circulating_supply=None,  # Coinbase API는 supply 정보를 제공하지 않음
                        total_supply=None,
                        max_supply=None,
                        rank=None,  # Coinbase API는 rank를 제공하지 않음
                        timestamp_utc=datetime.now()
                    )
                    return crypto_data
                    
        except Exception as e:
            logger.error(f"Coinbase crypto data fetch failed for {symbol}: {e}")
        
        return None
    
    def _calculate_change_percent(self, close: float, open_price: float) -> Optional[float]:
        """Calculate percentage change"""
        if close is None or open_price is None or open_price == 0:
            return None
        
        return ((close - open_price) / open_price) * 100
