"""
Coinbase API client for cryptocurrency data.
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

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
            'RNDR': 'RNDR-USD',
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
                granularity = "86400"  # 1일
                if interval == "1h":
                    granularity = "3600"
                elif interval == "4h":
                    granularity = "14400"
                
                base = f"{self.base_url}/products/{coinbase_symbol}/candles?granularity={granularity}"
                if start_date and end_date:
                    url = f"{base}&start={start_date}&end={end_date}"
                else:
                    url = base
                
                data = await self._fetch_async(client, url, "Coinbase", symbol)
                
                if isinstance(data, list):
                    result = []
                    for candle in data:
                        point = OhlcvDataPoint(
                            timestamp_utc=datetime.fromtimestamp(candle[0]),
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
                        result.append(point)
                        
                        # Limit 적용
                        if limit and len(result) >= limit:
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
