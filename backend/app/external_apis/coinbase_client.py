"""
Coinbase API client for cryptocurrency data.
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

import httpx

from .base_client import BaseAPIClient

logger = logging.getLogger(__name__)


class CoinbaseClient(BaseAPIClient):
    """Coinbase API client"""
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://api.exchange.coinbase.com"
    
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
            "public_endpoints": {
                "requests_per_second": 3,
                "requests_per_minute": 180
            },
            "private_endpoints": {
                "requests_per_second": 5,
                "requests_per_minute": 300
            }
        }
    
    async def get_ohlcv_data(self, product_id: str, granularity: str = '86400', start_iso: Optional[str] = None, end_iso: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get OHLCV data from Coinbase. Supports start/end (ISO8601)."""
        try:
            async with httpx.AsyncClient() as client:
                base = f"{self.base_url}/products/{product_id}/candles?granularity={granularity}"
                if start_iso and end_iso:
                    url = f"{base}&start={start_iso}&end={end_iso}"
                else:
                    url = base
                data = await self._fetch_async(client, url, "Coinbase", product_id)
                
                if isinstance(data, list):
                    return [
                        {
                            "timestamp_utc": datetime.fromtimestamp(candle[0]),
                            "low_price": self._safe_float(candle[1]),
                            "high_price": self._safe_float(candle[2]),
                            "open_price": self._safe_float(candle[3]),
                            "close_price": self._safe_float(candle[4]),
                            "volume": self._safe_float(candle[5], 0.0),
                        }
                        for candle in data
                    ]
        except Exception as e:
            logger.error(f"Coinbase OHLCV fetch failed for {product_id}: {e}")
        
        return []
    
    async def get_product_ticker(self, product_id: str) -> Optional[Dict[str, Any]]:
        """Get product ticker from Coinbase"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/products/{product_id}/ticker"
                data = await self._fetch_async(client, url, "Coinbase Ticker", product_id)
                
                if isinstance(data, dict):
                    return {
                        "product_id": data.get("product_id"),
                        "price": self._safe_float(data.get("price")),
                        "size": self._safe_float(data.get("size")),
                        "bid": self._safe_float(data.get("bid")),
                        "ask": self._safe_float(data.get("ask")),
                        "volume": self._safe_float(data.get("volume")),
                        "trade_id": self._safe_int(data.get("trade_id")),
                        "time": datetime.fromisoformat(data.get("time", "").replace('Z', '+00:00')) if data.get("time") else None
                    }
        except Exception as e:
            logger.error(f"Coinbase Ticker fetch failed for {product_id}: {e}")
        
        return None
    
    async def get_products(self) -> List[Dict[str, Any]]:
        """Get all available products"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/products"
                data = await self._fetch_async(client, url, "Coinbase Products")
                
                if isinstance(data, list):
                    return [
                        {
                            "id": product.get("id"),
                            "base_currency": product.get("base_currency"),
                            "quote_currency": product.get("quote_currency"),
                            "base_min_size": self._safe_float(product.get("base_min_size")),
                            "base_max_size": self._safe_float(product.get("base_max_size")),
                            "quote_increment": self._safe_float(product.get("quote_increment")),
                            "display_name": product.get("display_name"),
                            "status": product.get("status"),
                            "margin_enabled": product.get("margin_enabled", False),
                            "status_message": product.get("status_message"),
                            "min_market_funds": self._safe_float(product.get("min_market_funds")),
                            "max_market_funds": self._safe_float(product.get("max_market_funds")),
                            "post_only": product.get("post_only", False),
                            "limit_only": product.get("limit_only", False),
                            "cancel_only": product.get("cancel_only", False)
                        }
                        for product in data
                    ]
        except Exception as e:
            logger.error(f"Coinbase Products fetch failed: {e}")
        
        return []
    
    async def get_product_stats(self, product_id: str) -> Optional[Dict[str, Any]]:
        """Get product statistics"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/products/{product_id}/stats"
                data = await self._fetch_async(client, url, "Coinbase Stats", product_id)
                
                if isinstance(data, dict):
                    return {
                        "product_id": data.get("product_id"),
                        "low": self._safe_float(data.get("low")),
                        "high": self._safe_float(data.get("high")),
                        "open": self._safe_float(data.get("open")),
                        "volume": self._safe_float(data.get("volume")),
                        "last": self._safe_float(data.get("last")),
                        "volume_30day": self._safe_float(data.get("volume_30day"))
                    }
        except Exception as e:
            logger.error(f"Coinbase Stats fetch failed for {product_id}: {e}")
        
        return None






