"""
Twelve Data API client for real-time market prices.
"""
import logging
from typing import Dict, List, Optional, Any
import httpx

from .base_client import BaseAPIClient
from ..core.config import GLOBAL_APP_CONFIGS

logger = logging.getLogger(__name__)


class TwelveDataClient(BaseAPIClient):
    """Twelve Data API client"""

    def __init__(self):
        super().__init__()
        self.base_url = "https://api.twelvedata.com"
        self.api_key = GLOBAL_APP_CONFIGS.get("TWELVEDATA_API_KEY", "")
        if not self.api_key:
            logger.warning("TWELVEDATA_API_KEY is not configured.")

    async def _request(self, path: str, params: Dict[str, Any]) -> Any:
        """Internal helper to perform GET requests with api key injected."""
        query = {"apikey": self.api_key, **params}
        url = f"{self.base_url}{path}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=query, timeout=self.api_timeout)
            resp.raise_for_status()
            data = resp.json()
            # Twelve Data error format handling
            if isinstance(data, dict) and data.get("code") and data.get("message"):
                raise httpx.HTTPStatusError(message=data.get("message"), request=resp.request, response=resp)
            return data

    async def test_connection(self) -> bool:
        """Test connectivity to Twelve Data"""
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"{self.base_url}/time_series", params={"symbol": "AAPL", "interval": "1min", "outputsize": 1, "apikey": self.api_key}, timeout=self.api_timeout)
                return resp.status_code == 200
        except Exception as e:
            logger.error(f"TwelveData connection test failed: {e}")
            return False

    def get_rate_limit_info(self) -> Dict[str, Any]:
        """Return known public rate limits for Twelve Data free plan"""
        return {
            "free_tier": {
                "requests_per_minute": 8,
                "requests_per_day": 800
            }
        }

    async def get_realtime_prices(self, symbols: List[str], exchange: Optional[str] = None) -> Dict[str, float]:
        """
        Fetch realtime price for multiple stock symbols.
        Uses /price endpoint (single symbol) batched due to free plan constraints.
        """
        if not symbols:
            return {}
        prices: Dict[str, float] = {}
        for symbol in symbols:
            try:
                params = {"symbol": symbol}
                if exchange:
                    params["exchange"] = exchange
                data = await self._request("/price", params)
                # Normalized: {symbol: "AAPL", price: "189.22"} OR {"price":"..."}
                value = data.get("price") if isinstance(data, dict) else None
                if value is not None:
                    prices[symbol.upper()] = float(value)
            except Exception as e:
                logger.warning(f"TwelveData price fetch failed for {symbol}: {e}")
                continue
        return prices

    async def get_realtime_quotes(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Fetch realtime quote (price, change, volume, etc.) for multiple symbols using /quote (batched sequentially).
        """
        if not symbols:
            return {}
        quotes: Dict[str, Dict[str, Any]] = {}
        for symbol in symbols:
            try:
                data = await self._request("/quote", {"symbol": symbol})
                if isinstance(data, dict) and data.get("symbol"):
                    quotes[symbol.upper()] = data
            except Exception as e:
                logger.warning(f"TwelveData quote fetch failed for {symbol}: {e}")
                continue
        return quotes
