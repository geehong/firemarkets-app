"""
CoinMarketCap API client for cryptocurrency market data.
"""
import logging
import asyncio
import time
from typing import Optional, Dict, Any, List
from datetime import datetime

import httpx

from app.external_apis.base.crypto_client import CryptoAPIClient
from app.external_apis.base.schemas import OhlcvDataPoint, RealtimeQuoteData, CryptoData
from app.core.config import COINMARKETCAP_API_KEY
from app.external_apis.utils.helpers import safe_float, safe_date_parse

logger = logging.getLogger(__name__)


class CoinMarketCapClient(CryptoAPIClient):
    """CoinMarketCap API client"""
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://pro-api.coinmarketcap.com/v1"
        self.api_key = COINMARKETCAP_API_KEY
        self.headers = {
            'X-CMC_PRO_API_KEY': self.api_key,
            'Accept': 'application/json'
        } if self.api_key else {}
        
        # Rate limiting for free tier: 30 requests per minute
        # 매우 보수적으로 설정하여 여러 인스턴스가 동시 실행되어도 안전하게
        self.requests_per_minute = 10  # 30에서 10으로 줄임 (여러 인스턴스 고려)
        self.request_times = []
        self.min_delay_between_requests = 5.0  # 5초 지연
    
    async def _enforce_rate_limit(self):
        """Enforce rate limiting for CoinMarketCap API"""
        current_time = time.time()
        
        # Remove requests older than 1 minute
        self.request_times = [t for t in self.request_times if current_time - t < 60]
        
        # If we've made 10 requests in the last minute, wait
        if len(self.request_times) >= self.requests_per_minute:
            wait_time = 60 - (current_time - self.request_times[0]) + 1
            if wait_time > 0:
                logger.info(f"CoinMarketCap rate limit reached, waiting {wait_time:.1f} seconds")
                await asyncio.sleep(wait_time)
                # Clean up old requests after waiting
                current_time = time.time()
                self.request_times = [t for t in self.request_times if current_time - t < 60]
        
        # Ensure minimum delay between requests
        if self.request_times:
            time_since_last = current_time - self.request_times[-1]
            if time_since_last < self.min_delay_between_requests:
                wait_time = self.min_delay_between_requests - time_since_last
                logger.debug(f"CoinMarketCap minimum delay: waiting {wait_time:.1f} seconds")
                await asyncio.sleep(wait_time)
        
        # Record this request
        self.request_times.append(time.time())
    
    async def test_connection(self) -> bool:
        """Test CoinMarketCap API connection"""
        if not self.api_key:
            logger.error("No CoinMarketCap API key configured")
            return False
        
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/cryptocurrency/map?limit=1"
                response = await client.get(url, headers=self.headers, timeout=self.api_timeout)
                return response.status_code == 200
        except Exception as e:
            logger.error(f"CoinMarketCap connection test failed: {e}")
            return False
    
    def get_rate_limit_info(self) -> Dict[str, Any]:
        """Get CoinMarketCap rate limit information"""
        return {
            "free_tier": {
                "requests_per_minute": 30,
                "requests_per_day": 10000
            },
            "basic_tier": {
                "requests_per_minute": 60,
                "requests_per_day": 50000
            },
            "professional_tier": {
                "requests_per_minute": 120,
                "requests_per_day": 100000
            }
        }
    
    def _normalize_symbol_for_coinmarketcap(self, symbol: str) -> str:
        """CoinMarketCap API용 심볼 정규화 (USDT 페어를 기본 심볼로 변환)"""
        symbol_mapping = {
            "BTCUSDT": "BTC",
            "ETHUSDT": "ETH", 
            "XRPUSDT": "XRP",
            "ADAUSDT": "ADA",
            "DOTUSDT": "DOT",
            "LTCUSDT": "LTC",
            "BCHUSDT": "BCH",
            "DOGEUSDT": "DOGE",
            "BNBUSDT": "BNB",
            "SOLUSDT": "SOL",
            "MATICUSDT": "MATIC",
            "AVAXUSDT": "AVAX",
            "LINKUSDT": "LINK",
            "UNIUSDT": "UNI",
            "ATOMUSDT": "ATOM",
            "FTMUSDT": "FTM",
            "NEARUSDT": "NEAR",
            "ALGOUSDT": "ALGO",
            "VETUSDT": "VET",
            "ICPUSDT": "ICP",
        }
        
        # USDT 페어인 경우 기본 심볼로 변환
        if symbol in symbol_mapping:
            return symbol_mapping[symbol]
        elif symbol.endswith('USDT'):
            # 일반적인 USDT 페어의 경우 USDT 제거
            return symbol[:-4]
        else:
            # 이미 기본 심볼인 경우 그대로 반환
            return symbol
    
    async def get_ohlcv_data(
        self, 
        symbol: str, 
        interval: str = "1d",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[OhlcvDataPoint]:
        """Get OHLCV data from CoinMarketCap"""
        raise NotImplementedError("CoinMarketCap API는 OHLCV 데이터를 제공하지 않습니다. 대신 실시간 시세와 글로벌 메트릭을 사용하세요.")
    
    async def get_realtime_quote(self, symbol: str) -> Optional[RealtimeQuoteData]:
        """Get real-time quote from CoinMarketCap"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/cryptocurrency/quotes/latest?symbol={symbol}&convert=USD"
                data = await self._fetch_async_with_headers(client, url, "CoinMarketCap Quotes", symbol)
                
                if isinstance(data, dict) and "data" in data and symbol in data["data"]:
                    coin = data["data"][symbol]
                    quote_data = coin.get("quote", {}).get("USD", {})
                    
                    quote = RealtimeQuoteData(
                        symbol=symbol,
                        price=safe_float(quote_data.get("price")),
                        change_percent=safe_float(quote_data.get("percent_change_24h")),
                        timestamp_utc=datetime.now()
                    )
                    return quote
        except Exception as e:
            logger.error(f"CoinMarketCap Quote fetch failed for {symbol}: {e}")
        
        return None
    
    async def get_exchange_info(self) -> Optional[Dict[str, Any]]:
        """Get exchange information from CoinMarketCap"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/exchange/map?limit=10"
                data = await self._fetch_async_with_headers(client, url, "CoinMarketCap Exchanges")
                
                if isinstance(data, dict) and "data" in data:
                    return {
                        "exchanges_count": len(data["data"]),
                        "exchanges": [
                            {
                                "id": exchange.get("id"),
                                "name": exchange.get("name"),
                                "slug": exchange.get("slug"),
                                "is_active": exchange.get("is_active"),
                                "first_historical_data": exchange.get("first_historical_data"),
                                "last_historical_data": exchange.get("last_historical_data")
                            }
                            for exchange in data["data"]
                        ]
                    }
        except Exception as e:
            logger.error(f"CoinMarketCap Exchange Info fetch failed: {e}")
        
        return None
    
    async def get_global_metrics(self) -> Optional[Dict[str, Any]]:
        """Get global cryptocurrency market metrics from CoinMarketCap"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/global-metrics/quotes/latest?convert=USD"
                data = await self._fetch_async_with_headers(client, url, "CoinMarketCap Global Metrics")
                
                if isinstance(data, dict) and "data" in data:
                    global_data = data["data"]
                    quote = global_data.get("quote", {}).get("USD", {})
                    
                    return {
                        "total_market_cap": safe_float(quote.get("total_market_cap")),
                        "total_volume_24h": safe_float(quote.get("total_volume_24h")),
                        "total_market_cap_change_24h": safe_float(quote.get("total_market_cap_change_24h")),
                        "total_volume_24h_change_24h": safe_float(quote.get("total_volume_24h_change_24h")),
                        "active_cryptocurrencies": global_data.get("active_cryptocurrencies"),
                        "active_exchanges": global_data.get("active_exchanges"),
                        "btc_dominance": safe_float(global_data.get("btc_dominance")),
                        "eth_dominance": safe_float(global_data.get("eth_dominance")),
                        "last_updated": global_data.get("last_updated")
                    }
        except Exception as e:
            logger.error(f"CoinMarketCap Global Metrics fetch failed: {e}")
        
        return None
    
    async def get_crypto_data(self, symbol: str) -> Optional[CryptoData]:
        """Get comprehensive cryptocurrency data from CoinMarketCap"""
        try:
            # Rate limiting 적용
            await self._enforce_rate_limit()
            
            # 심볼 정규화 (USDT 페어를 기본 심볼로 변환)
            normalized_symbol = self._normalize_symbol_for_coinmarketcap(symbol)
            logger.info(f"[{symbol}] CoinMarketCap API 호출 시도 (정규화: {normalized_symbol}): {self.base_url}/cryptocurrency/quotes/latest?symbol={normalized_symbol}&convert=USD")
            
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/cryptocurrency/quotes/latest?symbol={normalized_symbol}&convert=USD"
                data = await self._fetch_async_with_headers(client, url, "CoinMarketCap Quotes", normalized_symbol)
                
                if isinstance(data, dict) and "data" in data and normalized_symbol in data["data"]:
                    coin = data["data"][normalized_symbol]
                    quote = coin.get("quote", {}).get("USD", {})
                    
                    # 안전한 데이터 검증 및 변환
                    try:
                        crypto_data = CryptoData(
                            symbol=symbol,
                            price=safe_float(quote.get("price")),
                            market_cap=safe_float(quote.get("market_cap")),
                            volume_24h=safe_float(quote.get("volume_24h")),
                            change_24h=safe_float(quote.get("percent_change_24h")),
                            circulating_supply=safe_float(coin.get("circulating_supply")),
                            total_supply=safe_float(coin.get("total_supply")),
                            max_supply=safe_float(coin.get("max_supply")),
                            rank=coin.get("cmc_rank") if coin.get("cmc_rank") is not None else None,
                            timestamp_utc=datetime.now()
                        )
                    except Exception as validation_error:
                        logger.error(f"CoinMarketCap data validation failed for {symbol}: {validation_error}")
                        logger.error(f"Raw data: {data}")
                        return None
                    return crypto_data
                    
        except Exception as e:
            logger.error(f"CoinMarketCap crypto data fetch failed for {symbol}: {e}")
        
        return None
    
    async def _fetch_async_with_headers(self, client: httpx.AsyncClient, url: str, api_name: str, symbol: str = "unknown") -> Any:
        """Fetch data with custom headers for CoinMarketCap"""
        try:
            response = await client.get(url, headers=self.headers, timeout=self.api_timeout)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"{api_name} API error for {symbol}: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"{api_name} request failed for {symbol}: {e}")
            raise
