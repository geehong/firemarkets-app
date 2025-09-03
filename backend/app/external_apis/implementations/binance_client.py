"""
Binance API client for cryptocurrency data.
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

import httpx

from ..base.crypto_client import CryptoAPIClient
from ..utils.helpers import safe_float, safe_timestamp_parse

logger = logging.getLogger(__name__)


class BinanceClient(CryptoAPIClient):
    """Binance API client"""
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://api.binance.com/api/v3"
    
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
            "public_endpoints": {
                "requests_per_minute": 1200,
                "requests_per_second": 10
            },
            "private_endpoints": {
                "requests_per_minute": 1000,
                "requests_per_second": 10
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
        try:
            async with httpx.AsyncClient() as client:
                # Build query parameters
                query = f"symbol={symbol}&interval={interval}"
                
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
                data = await self._fetch_async(client, url, "Binance", symbol)
                
                if isinstance(data, list) and data:  # 데이터가 비어있지 않은지 확인
                    return [
                        {
                            "timestamp_utc": datetime.fromtimestamp(kline[0] / 1000),
                            "open_price": safe_float(kline[1]),
                            "high_price": safe_float(kline[2]),
                            "low_price": safe_float(kline[3]),
                            "close_price": safe_float(kline[4]),
                            "volume": safe_float(kline[5], 0.0),
                        }
                        for kline in data
                    ]
        except Exception as e:
            logger.error(f"Binance OHLCV fetch failed for {symbol}: {e}")
        
        return []
    
    async def get_realtime_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get real-time quote for a symbol"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/ticker/24hr?symbol={symbol}"
                data = await self._fetch_async(client, url, "Binance 24hr Ticker", symbol)
                
                if isinstance(data, dict):
                    return {
                        "symbol": data.get("symbol"),
                        "price_change": safe_float(data.get("priceChange")),
                        "price_change_percent": safe_float(data.get("priceChangePercent")),
                        "weighted_avg_price": safe_float(data.get("weightedAvgPrice")),
                        "prev_close_price": safe_float(data.get("prevClosePrice")),
                        "last_price": safe_float(data.get("lastPrice")),
                        "last_qty": safe_float(data.get("lastQty")),
                        "bid_price": safe_float(data.get("bidPrice")),
                        "ask_price": safe_float(data.get("askPrice")),
                        "open_price": safe_float(data.get("openPrice")),
                        "high_price": safe_float(data.get("highPrice")),
                        "low_price": safe_float(data.get("lowPrice")),
                        "volume": safe_float(data.get("volume")),
                        "quote_volume": safe_float(data.get("quoteVolume")),
                        "open_time": datetime.fromtimestamp(data.get("openTime", 0) / 1000),
                        "close_time": datetime.fromtimestamp(data.get("closeTime", 0) / 1000),
                        "count": data.get("count")
                    }
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
        raise NotImplementedError("Binance API does not support global market metrics")
    
    def _create_signature(self, query_string: str, secret_key: str) -> str:
        """Create signature for Binance API authentication - Private method"""
        import hmac
        import hashlib
        return hmac.new(secret_key.encode('utf-8'), query_string.encode('utf-8'), hashlib.sha256).hexdigest()
