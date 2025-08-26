"""
Simple in-process async scheduler stubs per asset-type refresh.
"""
import asyncio
import logging
from typing import Dict, Optional, List

from .assets_table_service import AssetsTableService
from .tiingo_ws_consumer import get_consumer
from ..core.database import SessionLocal


logger = logging.getLogger(__name__)


class AssetRefreshScheduler:
    def __init__(self):
        self._tasks: Dict[str, asyncio.Task] = {}
        # seconds
        self.intervals: Dict[str, int] = {
            "Crypto": 5 * 60,
            "Stocks": 15 * 60,
            "ETFs": 30 * 60,
            "Funds": 30 * 60,
            "Commodities": 4 * 60 * 60,
        }

    def status(self) -> Dict[str, Dict[str, Optional[float]]]:
        return {
            k: {
                "alive": (not t.done()) if t else False,
            }
            for k, t in self._tasks.items()
        }

    async def start(self, asset_types: Optional[List[str]] = None):
        targets = asset_types or list(self.intervals.keys())
        for atype in targets:
            if atype in self._tasks and not self._tasks[atype].done():
                continue
            self._tasks[atype] = asyncio.create_task(self._loop(atype))
            logger.info(f"Scheduler started for {atype}")

    async def stop(self, asset_types: Optional[List[str]] = None):
        targets = asset_types or list(self._tasks.keys())
        for atype in targets:
            task = self._tasks.get(atype)
            if task and not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
            self._tasks.pop(atype, None)
            logger.info(f"Scheduler stopped for {atype}")

    async def _loop(self, asset_type: str):
        interval = self.intervals.get(asset_type, 15 * 60)
        while True:
            try:
                await self._tick(asset_type)
            except Exception as e:
                logger.error(f"Scheduler tick error for {asset_type}: {e}")
            await asyncio.sleep(interval)

    async def _tick(self, asset_type: str):
        # Fetch tickers to refresh
        tickers: List[str] = []
        if asset_type == "Stocks":
            # Prefer WS subscription list if present
            tickers = get_consumer().list_subscriptions() or ["AAPL", "MSFT", "GOOGL"]
        elif asset_type == "Crypto":
            tickers = ["BTCUSDT", "ETHUSDT", "SOLUSDT"]
        else:
            tickers = []

        if not tickers:
            return

        db = SessionLocal()
        try:
            # Map to service keys: "stock" | "crypto"
            service_key = {
                "Stocks": "stock",
                "Crypto": "crypto",
                "ETFs": "stock",
                "Funds": "stock",
                "Commodities": "stock",
            }.get(asset_type, asset_type.lower())
            await AssetsTableService.update_realtime_quotes(db, tickers=tickers, asset_type=service_key)
        finally:
            db.close()


_scheduler: Optional[AssetRefreshScheduler] = None


def get_scheduler() -> AssetRefreshScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = AssetRefreshScheduler()
    return _scheduler


