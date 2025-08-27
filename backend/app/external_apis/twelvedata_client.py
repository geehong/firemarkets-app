"""
Twelve Data API client for real-time market prices.
"""
import logging
from typing import Dict, List, Optional, Any
import httpx
import asyncio
import time
from collections import deque

from .base_client import BaseAPIClient
from ..core.config import GLOBAL_APP_CONFIGS

logger = logging.getLogger(__name__)


class TwelveDataClient(BaseAPIClient):
    """Twelve Data API client"""

    def __init__(self):
        super().__init__()
        self.base_url = "https://api.twelvedata.com"
        # 직접 환경 변수에서 API 키를 읽도록 수정
        import os
        self.api_key = os.getenv("TWELVEDATA_API_KEY") or GLOBAL_APP_CONFIGS.get("TWELVEDATA_API_KEY", "")
        if not self.api_key:
            logger.warning("TWELVEDATA_API_KEY is not configured.")
        else:
            logger.info(f"TwelveData API key configured: {self.api_key[:8]}...")

        # Simple per-process rate limiter: 8 requests per 60 seconds
        if not hasattr(TwelveDataClient, "_rl_times"):
            TwelveDataClient._rl_times = deque(maxlen=16)
        self._rl_lock = asyncio.Lock()

    async def _rate_limit(self):
        # Ensure <=8 calls in last 60 seconds
        async with self._rl_lock:
            now = time.monotonic()
            # Remove old entries
            while TwelveDataClient._rl_times and (now - TwelveDataClient._rl_times[0]) > 60:
                TwelveDataClient._rl_times.popleft()
            if len(TwelveDataClient._rl_times) >= 8:
                wait_for = 60 - (now - TwelveDataClient._rl_times[0])
                await asyncio.sleep(max(0.05, wait_for))
            TwelveDataClient._rl_times.append(time.monotonic())

    async def _request(self, path: str, params: Dict[str, Any]) -> Any:
        """Internal helper to perform GET requests with api key injected."""
        query = {"apikey": self.api_key, **params}
        url = f"{self.base_url}{path}"
        await self._rate_limit()
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

    async def get_current_prices(self, symbols: List[str], exchange: Optional[str] = None) -> Dict[str, float]:
        """
        Alias for get_realtime_prices to maintain consistency with other API clients.
        """
        return await self.get_realtime_prices(symbols, exchange)

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

    async def get_historical_prices(
        self,
        symbol: str,
        interval: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        exchange: Optional[str] = None,
        outputsize: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetch historical OHLCV data using TwelveData time_series endpoint.

        Args:
            symbol: Ticker symbol (e.g., 'AAPL')
            interval: e.g., '1day', '1h', '4h'
            start_date: 'YYYY-MM-DD' (optional)
            end_date: 'YYYY-MM-DD' (optional)
            exchange: Exchange code (optional)
            outputsize: Max number of data points (optional)

        Returns:
            List of bars in reverse-chronological order as provided by API.
        """
        try:
            # Normalize interval: 1d -> 1day, 1w -> 1week
            interval_map = {"1d": "1day", "1w": "1week"}
            norm_interval = interval_map.get(interval, interval)

            params: Dict[str, Any] = {
                "symbol": symbol,
                "interval": norm_interval,
                "format": "JSON",
            }
            if start_date:
                params["start_date"] = start_date
            if end_date:
                params["end_date"] = end_date
            if exchange:
                params["exchange"] = exchange
            if outputsize:
                params["outputsize"] = outputsize

            data = await self._request("/time_series", params)

            # Normalize response
            if isinstance(data, dict) and isinstance(data.get("values"), list):
                return data["values"]
            if isinstance(data, list):
                return data
            return []
        except Exception as e:
            logger.error(f"TwelveData historical fetch failed for {symbol} ({interval}): {e}")
            return []
