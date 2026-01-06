"""
Binance API client for cryptocurrency data.
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

import httpx

from app.external_apis.base.crypto_client import CryptoAPIClient
from app.external_apis.base.schemas import CryptoData
from app.external_apis.utils.helpers import safe_float, safe_timestamp_parse

logger = logging.getLogger(__name__)


class BinanceClient(CryptoAPIClient):
    """Binance API client"""
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://api.binance.com/api/v3"
        
        # Binance에서 USDT 페어로 지원하지 않는 심볼 목록
        # 이 심볼들은 API 호출 시 건너뜀 (400 Bad Request 방지)
        self.unsupported_symbols = {
            'CRO',      # Crypto.com Coin - Binance에서 USDT 페어 없음
            'HNT',      # Helium - Binance에서 거래 중단됨
            'RSR',      # Reserve Rights - USDT 페어 제한적
            # 'FTT',    # FTT - 거래 가능
            # 'LUNA',   # LUNC로 거래 가능
            'USTC',     # TerraClassicUSD
            'USDT',     # 스테이블코인 - USDT 페어 없음 (자기자신)
            'USDC',     # 스테이블코인
            # 'FTM',    # FTM - 거래 가능
            'MSOL',     # Marinade Staked SOL - Binance에서 USDT 페어 없음
        }
        
        # Binance에서 지원하는 심볼 매핑
        self.symbol_mapping = {
            'BTC': 'BTCUSDT',
            'ETH': 'ETHUSDT',
            'ADA': 'ADAUSDT',
            'DOT': 'DOTUSDT',
            'LINK': 'LINKUSDT',
            'LTC': 'LTCUSDT',
            'XRP': 'XRPUSDT',
            'DOGE': 'DOGEUSDT',
            'BCH': 'BCHUSDT',
            'EOS': 'EOSUSDT',
            'XLM': 'XLMUSDT',
            'TRX': 'TRXUSDT',
            'UNI': 'UNIUSDT',
            'ATOM': 'ATOMUSDT',
            'VET': 'VETUSDT',
            'FIL': 'FILUSDT',
            'THETA': 'THETAUSDT',
            'AAVE': 'AAVEUSDT',
            'SUSHI': 'SUSHIUSDT',
            'COMP': 'COMPUSDT',
            'YFI': 'YFIUSDT',
            'SNX': 'SNXUSDT',
            'MKR': 'MKRUSDT',
            'CRV': 'CRVUSDT',
            '1INCH': '1INCHUSDT',
            'ALPHA': 'ALPHAUSDT',
            'ZEN': 'ZENUSDT',
            'SKL': 'SKLUSDT',
            'GRT': 'GRTUSDT',
            'BAND': 'BANDUSDT',
            'NMR': 'NMRUSDT',
            'OCEAN': 'OCEANUSDT',
            'REEF': 'REEFUSDT',
            'ALICE': 'ALICEUSDT',
            'TLM': 'TLMUSDT',
            'ICP': 'ICPUSDT',
            'SHIB': 'SHIBUSDT',
            'TON': 'TONUSDT',
            'INJ': 'INJUSDT',
            'JASMY': 'JASMYUSDT',
            'AVAX': 'AVAXUSDT',
            'HBAR': 'HBARUSDT',
            'STX': 'STXUSDT',
            'RNDR': 'RENDERUSDT',  # RNDR -> RENDER
            'FTM': 'FTMUSDT',
            'FTT': 'FTTUSDT',
            'LUNA': 'LUNCUSDT',    # LUNA -> LUNC
        }
    
    def _normalize_symbol_for_binance(self, symbol: str) -> str:
        """Binance API용 심볼 정규화"""
        # 이미 USDT가 붙어있으면 그대로 반환
        if symbol.endswith('USDT'):
            return symbol
        
        # 매핑 테이블에서 찾기
        if symbol in self.symbol_mapping:
            return self.symbol_mapping[symbol]
        
        # 기본적으로 USDT 추가
        return f"{symbol}USDT"
    
    async def test_connection(self) -> bool:
        """Test Binance API connection"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/ping"
                response = await client.get(url, timeout=self.api_timeout)
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Binance connection test failed: {e}")
            return False
    
    def get_rate_limit_info(self) -> Dict[str, Any]:
        """Get Binance rate limit information"""
        return {
            "free_tier": {
                "calls_per_minute": 1200,
                "calls_per_second": 10
            }
        }
    
    async def get_ohlcv_data(
        self, 
        symbol: str, 
        interval: str = "1d",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Get OHLCV data from Binance.
        Supports optional startTime/endTime (milliseconds) to fetch a specific window.
        """
        # 지원하지 않는 심볼 체크
        base_symbol = symbol.replace('USDT', '') if symbol.endswith('USDT') else symbol
        if base_symbol in self.unsupported_symbols:
            logger.info(f"Binance: Skipping unsupported symbol {symbol} (no USDT pair)")
            return []
        
        try:
            # 심볼 정규화
            normalized_symbol = self._normalize_symbol_for_binance(symbol)
            
            async with httpx.AsyncClient() as client:
                # Build query parameters
                query = f"symbol={normalized_symbol}&interval={interval}"
                
                # Convert date strings to milliseconds if provided
                start_time_ms = None
                end_time_ms = None
                if start_date:
                    start_time_ms = int(datetime.strptime(start_date, '%Y-%m-%d').timestamp() * 1000)
                if end_date:
                    end_time_ms = int(datetime.strptime(end_date, '%Y-%m-%d').timestamp() * 1000)
                
                if start_time_ms is not None:
                    query += f"&startTime={start_time_ms}"
                if end_time_ms is not None:
                    query += f"&endTime={end_time_ms}"
                # Always include a limit as a safety cap
                if limit is not None:
                    query += f"&limit={limit}"
                
                url = f"{self.base_url}/klines?{query}"
                data = await self._fetch_async(client, url, "Binance", normalized_symbol)
                
                if isinstance(data, list) and data:  # 데이터가 비어있지 않은지 확인
                    from app.external_apis.base.schemas import OhlcvDataPoint
                    return [
                        OhlcvDataPoint(
                            timestamp_utc=datetime.fromtimestamp(kline[0] / 1000),
                            open_price=safe_float(kline[1]),
                            high_price=safe_float(kline[2]),
                            low_price=safe_float(kline[3]),
                            close_price=safe_float(kline[4]),
                            volume=safe_float(kline[5], 0.0),
                            change_percent=None  # Binance klines API는 change_percent를 제공하지 않음
                        )
                        for kline in data
                    ]
        except Exception as e:
            logger.error(f"Binance OHLCV fetch failed for {symbol}: {e}")
        
        return []
    
    async def get_realtime_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get real-time quote for a symbol"""
        # 지원하지 않는 심볼 체크
        base_symbol = symbol.replace('USDT', '') if symbol.endswith('USDT') else symbol
        if base_symbol in self.unsupported_symbols:
            logger.info(f"Binance: Skipping unsupported symbol {symbol} (no USDT pair)")
            return None
        
        try:
            # 심볼 정규화
            normalized_symbol = self._normalize_symbol_for_binance(symbol)
            
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/ticker/24hr?symbol={normalized_symbol}"
                data = await self._fetch_async(client, url, "Binance 24hr Ticker", normalized_symbol)
                
                if isinstance(data, dict):
                    from app.external_apis.base.schemas import RealtimeQuoteData
                    quote = RealtimeQuoteData(
                        symbol=data.get("symbol"),
                        price=safe_float(data.get("lastPrice")),
                        change_percent=safe_float(data.get("priceChangePercent")),
                        timestamp_utc=datetime.now()  # Binance는 실시간 데이터를 제공하므로 현재 시간 사용
                    )
                    return quote
        except Exception as e:
            logger.error(f"Binance 24hr Ticker fetch failed for {symbol}: {e}")
        
        return None
    
    async def get_exchange_info(self) -> Optional[Dict[str, Any]]:
        """Get exchange information"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/exchangeInfo"
                data = await self._fetch_async(client, url, "Binance Exchange Info")
                
                if isinstance(data, dict):
                    return {
                        "timezone": data.get("timezone"),
                        "server_time": datetime.fromtimestamp(data.get("serverTime", 0) / 1000),
                        "rate_limits": data.get("rateLimits", []),
                        "symbols": data.get("symbols", [])
                    }
        except Exception as e:
            logger.error(f"Binance Exchange Info fetch failed: {e}")
        
        return None
    
    async def get_global_metrics(self) -> Optional[Dict[str, Any]]:
        """Get global cryptocurrency market metrics - Not supported by Binance"""
        raise NotImplementedError("Binance API는 거래소별 API이므로 글로벌 암호화폐 시장 메트릭을 제공하지 않습니다. 글로벌 메트릭은 CoinGecko, CoinMarketCap API를 사용하세요.")
    
    async def get_crypto_data(self, symbol: str) -> Optional[CryptoData]:
        """Get comprehensive cryptocurrency data from Binance"""
        # 지원하지 않는 심볼 체크
        base_symbol = symbol.replace('USDT', '') if symbol.endswith('USDT') else symbol
        if base_symbol in self.unsupported_symbols:
            logger.info(f"Binance: Skipping unsupported symbol {symbol} (no USDT pair)")
            return None
        
        try:
            # 심볼 정규화
            normalized_symbol = self._normalize_symbol_for_binance(symbol)
            
            async with httpx.AsyncClient() as client:
                # Get 24hr ticker data
                url = f"{self.base_url}/ticker/24hr?symbol={normalized_symbol}"
                data = await self._fetch_async(client, url, "Binance 24hr Ticker", normalized_symbol)
                
                if isinstance(data, dict):
                    crypto_data = CryptoData(
                        symbol=data.get("symbol"),
                        price=safe_float(data.get("lastPrice")),
                        market_cap=None,  # Binance API는 market cap을 제공하지 않음
                        volume_24h=safe_float(data.get("volume")),
                        change_24h=safe_float(data.get("priceChangePercent")),
                        circulating_supply=None,  # Binance API는 supply 정보를 제공하지 않음
                        total_supply=None,
                        max_supply=None,
                        rank=None,  # Binance API는 rank를 제공하지 않음
                        timestamp_utc=datetime.now()
                    )
                    return crypto_data
                    
        except Exception as e:
            logger.error(f"Binance crypto data fetch failed for {symbol}: {e}")
        
        return None
    
    def _create_signature(self, query_string: str, secret_key: str) -> str:
        """Create signature for Binance API authentication - Private method"""
        import hmac
        import hashlib
        return hmac.new(secret_key.encode('utf-8'), query_string.encode('utf-8'), hashlib.sha256).hexdigest()
