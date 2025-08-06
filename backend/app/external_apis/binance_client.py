"""
Binance API client for cryptocurrency data.
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

import httpx

from .base_client import BaseAPIClient

logger = logging.getLogger(__name__)


class BinanceClient(BaseAPIClient):
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
    
    async def get_ohlcv_data(self, symbol: str, interval: str = "1d", limit: int = 1000) -> List[Dict[str, Any]]:
        """Get OHLCV data from Binance"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/klines?symbol={symbol}&interval={interval}&limit={limit}"
                data = await self._fetch_async(client, url, "Binance", symbol)
                
                if isinstance(data, list):
                    return [
                        {
                            "timestamp_utc": datetime.fromtimestamp(kline[0] / 1000),
                            "open_price": self._safe_float(kline[1]),
                            "high_price": self._safe_float(kline[2]),
                            "low_price": self._safe_float(kline[3]),
                            "close_price": self._safe_float(kline[4]),
                            "volume": self._safe_float(kline[5], 0.0),
                        }
                        for kline in data
                    ]
        except Exception as e:
            logger.error(f"Binance OHLCV fetch failed for {symbol}: {e}")
        
        return []
    
    async def get_ticker_price(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get current price for a symbol"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/ticker/price?symbol={symbol}"
                data = await self._fetch_async(client, url, "Binance Ticker", symbol)
                
                if isinstance(data, dict):
                    return {
                        "symbol": data.get("symbol"),
                        "price": self._safe_float(data.get("price")),
                        "timestamp": datetime.now()
                    }
        except Exception as e:
            logger.error(f"Binance Ticker fetch failed for {symbol}: {e}")
        
        return None
    
    async def get_24hr_ticker(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get 24hr ticker statistics"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/ticker/24hr?symbol={symbol}"
                data = await self._fetch_async(client, url, "Binance 24hr Ticker", symbol)
                
                if isinstance(data, dict):
                    return {
                        "symbol": data.get("symbol"),
                        "price_change": self._safe_float(data.get("priceChange")),
                        "price_change_percent": self._safe_float(data.get("priceChangePercent")),
                        "weighted_avg_price": self._safe_float(data.get("weightedAvgPrice")),
                        "prev_close_price": self._safe_float(data.get("prevClosePrice")),
                        "last_price": self._safe_float(data.get("lastPrice")),
                        "last_qty": self._safe_float(data.get("lastQty")),
                        "bid_price": self._safe_float(data.get("bidPrice")),
                        "ask_price": self._safe_float(data.get("askPrice")),
                        "open_price": self._safe_float(data.get("openPrice")),
                        "high_price": self._safe_float(data.get("highPrice")),
                        "low_price": self._safe_float(data.get("lowPrice")),
                        "volume": self._safe_float(data.get("volume")),
                        "quote_volume": self._safe_float(data.get("quoteVolume")),
                        "open_time": datetime.fromtimestamp(data.get("openTime", 0) / 1000),
                        "close_time": datetime.fromtimestamp(data.get("closeTime", 0) / 1000),
                        "count": self._safe_int(data.get("count"))
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






