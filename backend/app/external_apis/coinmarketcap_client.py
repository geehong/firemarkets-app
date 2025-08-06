"""
CoinMarketCap API client for cryptocurrency market data.
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

import httpx

from .base_client import BaseAPIClient
from ..core.config import COINMARKETCAP_API_KEY

logger = logging.getLogger(__name__)


class CoinMarketCapClient(BaseAPIClient):
    """CoinMarketCap API client"""
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://pro-api.coinmarketcap.com/v1"
        self.api_key = COINMARKETCAP_API_KEY
        self.headers = {
            'X-CMC_PRO_API_KEY': self.api_key,
            'Accept': 'application/json'
        } if self.api_key else {}
    
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
    
    async def get_cryptocurrency_listings(self, limit: int = 100, convert: str = "USD") -> List[Dict[str, Any]]:
        """Get cryptocurrency listings with market data"""
        if not self.api_key:
            raise ValueError("No CoinMarketCap API key configured")
        
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/cryptocurrency/listings/latest?limit={limit}&convert={convert}"
                data = await self._fetch_async_with_headers(client, url, "CoinMarketCap Listings")
                
                if isinstance(data, dict) and "data" in data:
                    return [
                        {
                            "id": coin.get("id"),
                            "name": coin.get("name"),
                            "symbol": coin.get("symbol"),
                            "slug": coin.get("slug"),
                            "cmc_rank": coin.get("cmc_rank"),
                            "market_cap": self._safe_float(coin.get("quote", {}).get(convert, {}).get("market_cap")),
                            "price": self._safe_float(coin.get("quote", {}).get(convert, {}).get("price")),
                            "volume_24h": self._safe_float(coin.get("quote", {}).get(convert, {}).get("volume_24h")),
                            "percent_change_1h": self._safe_float(coin.get("quote", {}).get(convert, {}).get("percent_change_1h")),
                            "percent_change_24h": self._safe_float(coin.get("quote", {}).get(convert, {}).get("percent_change_24h")),
                            "percent_change_7d": self._safe_float(coin.get("quote", {}).get(convert, {}).get("percent_change_7d")),
                            "circulating_supply": self._safe_float(coin.get("circulating_supply")),
                            "total_supply": self._safe_float(coin.get("total_supply")),
                            "max_supply": self._safe_float(coin.get("max_supply")),
                            "last_updated": coin.get("last_updated")
                        }
                        for coin in data["data"]
                    ]
        except Exception as e:
            logger.error(f"CoinMarketCap Listings fetch failed: {e}")
        
        return []
    
    async def get_cryptocurrency_quotes(self, symbol: str, convert: str = "USD") -> Optional[Dict[str, Any]]:
        """Get cryptocurrency quotes by symbol"""
        if not self.api_key:
            raise ValueError("No CoinMarketCap API key configured")
        
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/cryptocurrency/quotes/latest?symbol={symbol}&convert={convert}"
                data = await self._fetch_async_with_headers(client, url, "CoinMarketCap Quotes", self.headers, symbol)
                
                if isinstance(data, dict) and "data" in data and symbol in data["data"]:
                    coin = data["data"][symbol]
                    return {
                        "id": coin.get("id"),
                        "name": coin.get("name"),
                        "symbol": coin.get("symbol"),
                        "slug": coin.get("slug"),
                        "cmc_rank": coin.get("cmc_rank"),
                        "market_cap": self._safe_float(coin.get("quote", {}).get(convert, {}).get("market_cap")),
                        "price": self._safe_float(coin.get("quote", {}).get(convert, {}).get("price")),
                        "volume_24h": self._safe_float(coin.get("quote", {}).get(convert, {}).get("volume_24h")),
                        "percent_change_1h": self._safe_float(coin.get("quote", {}).get(convert, {}).get("percent_change_1h")),
                        "percent_change_24h": self._safe_float(coin.get("quote", {}).get(convert, {}).get("percent_change_24h")),
                        "percent_change_7d": self._safe_float(coin.get("quote", {}).get(convert, {}).get("percent_change_7d")),
                        "circulating_supply": self._safe_float(coin.get("circulating_supply")),
                        "total_supply": self._safe_float(coin.get("total_supply")),
                        "max_supply": self._safe_float(coin.get("max_supply")),
                        "last_updated": coin.get("last_updated")
                    }
        except Exception as e:
            logger.error(f"CoinMarketCap Quotes fetch failed for {symbol}: {e}")
        
        return None
    
    async def get_global_metrics(self, convert: str = "USD") -> Optional[Dict[str, Any]]:
        """Get global cryptocurrency market metrics"""
        if not self.api_key:
            raise ValueError("No CoinMarketCap API key configured")
        
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/global-metrics/quotes/latest?convert={convert}"
                data = await self._fetch_async_with_headers(client, url, "CoinMarketCap Global Metrics", self.headers)
                
                if isinstance(data, dict) and "data" in data:
                    global_data = data["data"]
                    quote = global_data.get("quote", {}).get(convert, {})
                    
                    return {
                        "total_market_cap": self._safe_float(quote.get("total_market_cap")),
                        "total_volume_24h": self._safe_float(quote.get("total_volume_24h")),
                        "total_market_cap_yesterday": self._safe_float(quote.get("total_market_cap_yesterday")),
                        "total_volume_24h_yesterday": self._safe_float(quote.get("total_volume_24h_yesterday")),
                        "total_market_cap_change_24h": self._safe_float(quote.get("total_market_cap_change_24h")),
                        "total_volume_24h_change_24h": self._safe_float(quote.get("total_volume_24h_change_24h")),
                        "active_cryptocurrencies": global_data.get("active_cryptocurrencies"),
                        "active_exchanges": global_data.get("active_exchanges"),
                        "btc_dominance": self._safe_float(global_data.get("btc_dominance")),
                        "eth_dominance": self._safe_float(global_data.get("eth_dominance")),
                        "last_updated": global_data.get("last_updated")
                    }
        except Exception as e:
            logger.error(f"CoinMarketCap Global Metrics fetch failed: {e}")
        
        return None
    
    async def get_cryptocurrency_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get cryptocurrency metadata and info"""
        if not self.api_key:
            raise ValueError("No CoinMarketCap API key configured")
        
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/cryptocurrency/info?symbol={symbol}"
                data = await self._fetch_async_with_headers(client, url, "CoinMarketCap Info", self.headers, symbol)
                
                if isinstance(data, dict) and "data" in data and symbol in data["data"]:
                    coin = data["data"][symbol]
                    return {
                        "id": coin.get("id"),
                        "name": coin.get("name"),
                        "symbol": coin.get("symbol"),
                        "category": coin.get("category"),
                        "description": coin.get("description"),
                        "slug": coin.get("slug"),
                        "logo": coin.get("logo"),
                        "urls": coin.get("urls"),
                        "date_added": coin.get("date_added"),
                        "tags": coin.get("tags"),
                        "platform": coin.get("platform")
                    }
        except Exception as e:
            logger.error(f"CoinMarketCap Info fetch failed for {symbol}: {e}")
        
        return None
