"""
CoinGecko API client for cryptocurrency data.
"""
import logging
import asyncio
import time
from typing import Optional, Dict, Any, List
from datetime import datetime
import httpx

from app.external_apis.base.crypto_client import CryptoAPIClient
from app.external_apis.base.schemas import OhlcvDataPoint, RealtimeQuoteData, CryptoData
from app.external_apis.utils.helpers import safe_float, safe_date_parse

logger = logging.getLogger(__name__)


class CoinGeckoClient(CryptoAPIClient):
    """CoinGecko API client"""
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://api.coingecko.com/api/v3"
        # Rate limiting for free tier: 30 requests per minute
        # 매우 보수적으로 설정하여 여러 인스턴스가 동시 실행되어도 안전하게
        self.requests_per_minute = 5  # 20에서 5로 줄임 (여러 인스턴스 고려)
        self.request_times = []
        self.min_delay_between_requests = 5.0  # 3초에서 5초로 늘림
    
    async def _enforce_rate_limit(self):
        """Enforce rate limiting for CoinGecko API"""
        current_time = time.time()
        
        # Remove requests older than 1 minute
        self.request_times = [t for t in self.request_times if current_time - t < 60]
        
        # If we've made 30 requests in the last minute, wait
        if len(self.request_times) >= self.requests_per_minute:
            wait_time = 60 - (current_time - self.request_times[0]) + 1
            if wait_time > 0:
                logger.info(f"CoinGecko rate limit reached, waiting {wait_time:.1f} seconds")
                await asyncio.sleep(wait_time)
                # Clean up old requests after waiting
                current_time = time.time()
                self.request_times = [t for t in self.request_times if current_time - t < 60]
        
        # Ensure minimum delay between requests
        if self.request_times:
            time_since_last = current_time - self.request_times[-1]
            if time_since_last < self.min_delay_between_requests:
                wait_time = self.min_delay_between_requests - time_since_last
                logger.debug(f"CoinGecko minimum delay: waiting {wait_time:.1f} seconds")
                await asyncio.sleep(wait_time)
        
        # Record this request
        self.request_times.append(time.time())
    
    async def test_connection(self) -> bool:
        """Test CoinGecko API connection"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/ping"
                response = await client.get(url, timeout=self.api_timeout)
                return response.status_code == 200
        except Exception as e:
            logger.error(f"CoinGecko connection test failed: {e}")
            return False
    
    def get_rate_limit_info(self) -> Dict[str, Any]:
        """Get CoinGecko rate limit information"""
        return {
            "free_tier": {
                "requests_per_minute": 30,
                "requests_per_day": 10000
            },
            "pro_tier": {
                "requests_per_minute": 1000,
                "requests_per_day": 100000
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
        """Get OHLCV data from CoinGecko"""
        try:
            # Enforce rate limiting
            await self._enforce_rate_limit()
            
            async with httpx.AsyncClient() as client:
                # CoinGecko는 일간 데이터를 기본으로 제공
                if interval != "1d":
                    logger.warning(f"CoinGecko only supports daily data, requested interval: {interval}")
                
                # CoinGecko는 coin ID를 사용 (예: bitcoin, ethereum)
                coin_id = self._normalize_symbol_for_coingecko(symbol)
                
                # 날짜 범위 설정
                days = 30  # 기본값
                if start_date and end_date:
                    start_dt = datetime.strptime(start_date, '%Y-%m-%d')
                    end_dt = datetime.strptime(end_date, '%Y-%m-%d')
                    days = (end_dt - start_dt).days
                
                url = f"{self.base_url}/coins/{coin_id}/ohlc?vs_currency=usd&days={days}"
                data = await self._fetch_async(client, url, "CoinGecko", symbol)
                
                if isinstance(data, list):
                    result = []
                    for candle in data:
                        # CoinGecko OHLCV 데이터: [timestamp, open, high, low, close]
                        timestamp = datetime.fromtimestamp(candle[0] / 1000)
                        
                        point = OhlcvDataPoint(
                            timestamp_utc=timestamp,
                            open_price=safe_float(candle[1]),
                            high_price=safe_float(candle[2]),
                            low_price=safe_float(candle[3]),
                            close_price=safe_float(candle[4]),
                            volume=None,  # CoinGecko OHLCV에는 volume이 없음
                            change_percent=self._calculate_change_percent(
                                safe_float(candle[4]),
                                safe_float(candle[1])
                            )
                        )
                        result.append(point)
                        
                        # Limit 적용
                        if limit and len(result) >= limit:
                            break
                    
                    return result
        except Exception as e:
            logger.error(f"CoinGecko OHLCV fetch failed for {symbol}: {e}")
        
        return []
    
    async def get_realtime_quote(self, symbol: str) -> Optional[RealtimeQuoteData]:
        """Get real-time quote from CoinGecko"""
        try:
            async with httpx.AsyncClient() as client:
                # CoinGecko는 coin ID를 사용
                coin_id = self._normalize_symbol_for_coingecko(symbol)
                url = f"{self.base_url}/simple/price?ids={coin_id}&vs_currencies=usd&include_24hr_change=true"
                
                data = await self._fetch_async(client, url, "CoinGecko", symbol)
                
                if isinstance(data, dict) and coin_id in data:
                    coin_data = data[coin_id]
                    quote = RealtimeQuoteData(
                        symbol=symbol,
                        price=safe_float(coin_data.get("usd")),
                        change_percent=safe_float(coin_data.get("usd_24h_change")),
                        timestamp_utc=datetime.now()
                    )
                    return quote
        except Exception as e:
            logger.error(f"CoinGecko Quote fetch failed for {symbol}: {e}")
        
        return None
    
    async def get_exchange_info(self) -> Optional[Dict[str, Any]]:
        """Get exchange information from CoinGecko"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/exchanges"
                data = await self._fetch_async(client, url, "CoinGecko Exchanges")
                
                if isinstance(data, list):
                    return {
                        "exchanges_count": len(data),
                        "top_exchanges": [
                            {
                                "id": exchange.get("id"),
                                "name": exchange.get("name"),
                                "trust_score": exchange.get("trust_score"),
                                "trust_score_rank": exchange.get("trust_score_rank"),
                                "trade_volume_24h_btc": exchange.get("trade_volume_24h_btc")
                            }
                            for exchange in data[:10]  # 상위 10개 거래소
                        ]
                    }
        except Exception as e:
            logger.error(f"CoinGecko Exchange Info fetch failed: {e}")
        
        return None
    
    async def get_global_metrics(self) -> Optional[Dict[str, Any]]:
        """Get global cryptocurrency market metrics from CoinGecko"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/global"
                data = await self._fetch_async(client, url, "CoinGecko Global")
                
                if isinstance(data, dict) and "data" in data:
                    global_data = data["data"]
                    return {
                        "total_market_cap": safe_float(global_data.get("total_market_cap", {}).get("usd")),
                        "total_volume": safe_float(global_data.get("total_volume", {}).get("usd")),
                        "market_cap_percentage": global_data.get("market_cap_percentage"),
                        "active_cryptocurrencies": global_data.get("active_cryptocurrencies"),
                        "active_exchanges": global_data.get("active_exchanges"),
                        "btc_dominance": safe_float(global_data.get("market_cap_percentage", {}).get("btc")),
                        "eth_dominance": safe_float(global_data.get("market_cap_percentage", {}).get("eth"))
                    }
        except Exception as e:
            logger.error(f"CoinGecko Global Metrics fetch failed: {e}")
        
        return None
    
    def _normalize_symbol_for_coingecko(self, symbol: str) -> str:
        """CoinGecko API용 심볼 정규화 (USDT 페어를 CoinGecko ID로 변환)"""
        # USDT 페어를 CoinGecko ID로 매핑
        symbol_mapping = {
            "BTCUSDT": "bitcoin",
            "ETHUSDT": "ethereum", 
            "XRPUSDT": "ripple",
            "ADAUSDT": "cardano",
            "DOTUSDT": "polkadot",
            "LTCUSDT": "litecoin",
            "BCHUSDT": "bitcoin-cash",
            "DOGEUSDT": "dogecoin",
            "FTMUSDT": "fantom",
            "FTM": "fantom",
            "LINKUSDT": "chainlink",
            "UNIUSDT": "uniswap",
            "AAVEUSDT": "aave",
            "SUSHIUSDT": "sushi",
            "COMPUSDT": "compound-governance-token",
            "YFIUSDT": "yearn-finance",
            "SNXUSDT": "havven",
            "MKRUSDT": "maker",
            "CRVUSDT": "curve-dao-token",
            "1INCHUSDT": "1inch",
            "ALPHAUSDT": "alpha-finance",
            "ZENUSDT": "horizen",
            "SKLUSDT": "skale",
            "GRTUSDT": "the-graph",
            "BANDUSDT": "band-protocol",
            "NMRUSDT": "numeraire",
            "OCEANUSDT": "ocean-protocol",
            "REEFUSDT": "reef",
            "ALICEUSDT": "my-neighbor-alice",
            "TLMUSDT": "alien-worlds",
            "ICPUSDT": "internet-computer",
            "XLMUSDT": "stellar",
            "TRXUSDT": "tron",
            "SHIBUSDT": "shiba-inu",
            "TONUSDT": "the-open-network",
            "INJUSDT": "injective-protocol",
            "JASMYUSDT": "jasmycoin",
            "LDOUSDT": "lido-dao",
            "DYDXUSDT": "dydx",
            "APEUSDT": "apecoin",
            "ARUSDT": "arweave",
            "ATOMUSDT": "cosmos",
            "ETCUSDT": "ethereum-classic",
            "DEXEUSDT": "dexe",
            "ALGOUSDT": "algorand",
            "FLOWUSDT": "flow",
            "WBTCUSDT": "wrapped-bitcoin",
            # 추가된 심볼 매핑 (에러 방지)
            "CROUSDT": "crypto-com-chain",
            "CRO": "crypto-com-chain",
            "HNTUSDT": "helium",
            "HNT": "helium",
            "AVAXUSDT": "avalanche-2",
            "AVAX": "avalanche-2",
            "HBARUSDT": "hedera-hashgraph",
            "HBAR": "hedera-hashgraph",
            "STXUSDT": "blockstack",
            "STX": "blockstack",
            "RNDRUSDT": "render-token",
            "RNDR": "render-token",
            "RSRUSDT": "reserve-rights-token",
            "RSR": "reserve-rights-token",
            "THETAUSDT": "theta-token",
            "THETA": "theta-token",
            "FILUSDT": "filecoin",
            "FIL": "filecoin",
            "LUNAUSDT": "terra-luna-2",
            "LUNA": "terra-luna-2",
            "FTTUSDT": "ftx-token",
            "FTT": "ftx-token",
        }
        
        # 매핑이 있으면 사용, 없으면 USDT 제거 후 소문자로 변환
        if symbol in symbol_mapping:
            return symbol_mapping[symbol]
        elif symbol.endswith('USDT'):
            # USDT만 있는 경우 처리 (USDT -> tether)
            if symbol == 'USDT':
                return 'tether'
            normalized = symbol[:-4].lower()  # USDT 제거 후 소문자
            # 빈 문자열이 되지 않도록 체크
            if not normalized:
                return 'tether'  # 기본값으로 tether 반환
            return normalized
        else:
            return symbol.lower()

    async def get_crypto_data(self, symbol: str) -> Optional[CryptoData]:
        """Get comprehensive cryptocurrency data from CoinGecko"""
        try:
            # Enforce rate limiting
            await self._enforce_rate_limit()
            
            async with httpx.AsyncClient() as client:
                # CoinGecko는 coin ID를 사용
                coin_id = self._normalize_symbol_for_coingecko(symbol)
                url = f"{self.base_url}/coins/{coin_id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false"
                
                data = await self._fetch_async(client, url, "CoinGecko", symbol)
                
                if "market_data" in data:
                    market_data = data["market_data"]
                    crypto_data = CryptoData(
                        symbol=symbol,
                        price=safe_float(market_data.get("current_price", {}).get("usd")),
                        market_cap=safe_float(market_data.get("market_cap", {}).get("usd")),
                        volume_24h=safe_float(market_data.get("total_volume", {}).get("usd")),
                        change_24h=safe_float(market_data.get("price_change_percentage_24h")),
                        circulating_supply=safe_float(market_data.get("circulating_supply")),
                        total_supply=safe_float(market_data.get("total_supply")),
                        max_supply=safe_float(market_data.get("max_supply")),
                        rank=market_data.get("market_cap_rank"),
                        timestamp_utc=datetime.now()
                    )
                    return crypto_data
                    
        except Exception as e:
            logger.error(f"CoinGecko crypto data fetch failed for {symbol}: {e}")
        
        return None
    
    def _calculate_change_percent(self, close: float, open_price: float) -> Optional[float]:
        """Calculate percentage change"""
        if close is None or open_price is None or open_price == 0:
            return None
        
        return ((close - open_price) / open_price) * 100




