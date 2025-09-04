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
    
    def _convert_symbol_for_coinbase(self, symbol: str) -> str:
        """Coinbase API용 심볼 변환 (BTCUSDT -> BTC-USD)"""
        # 일반적인 변환 규칙
        if symbol.endswith('USDT'):
            return symbol[:-4] + '-USD'
        elif symbol.endswith('USDC'):
            return symbol[:-4] + '-USD'
        elif symbol.endswith('BTC'):
            return symbol + '-USD'
        else:
            # 기타 경우는 그대로 반환
            return symbol
    
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
