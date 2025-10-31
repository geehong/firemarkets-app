"""
Collector for Macrotrends fundamentals scraping → enqueue for DataProcessor → DB write.
"""
import asyncio
import logging
from datetime import datetime
import time
from typing import Dict, Any, List

from sqlalchemy.orm import Session

from .base_collector import BaseCollector
from app.core.config_manager import ConfigManager
from app.services.api_strategy_manager import ApiStrategyManager
from app.utils.redis_queue_manager import RedisQueueManager
from app.models.asset import Asset, AssetType
from app.external_apis.implementations.macrotrends_client import MacrotrendsClient

logger = logging.getLogger(__name__)


class MacrotrendsFinancialsCollector(BaseCollector):
    """Scrape Macrotrends fundamentals and enqueue normalized rows for processing."""

    def __init__(
        self,
        db: Session,
        config_manager: ConfigManager,
        api_manager: ApiStrategyManager,
        redis_queue_manager: RedisQueueManager,
    ):
        super().__init__(db, config_manager, api_manager, redis_queue_manager)
        self.client = MacrotrendsClient()
        # Global rate limiter (1 request per second across all tasks)
        self._rate_lock = asyncio.Lock()
        self._last_request_monotonic = 0.0

    async def _fetch_with_rate_limit(self, coro):
        """Ensure at most 1 request/2sec globally for this collector instance."""
        async with self._rate_lock:
            now = time.monotonic()
            elapsed = now - self._last_request_monotonic
            wait_seconds = 2.0 - elapsed
            if wait_seconds > 0:
                await asyncio.sleep(wait_seconds)
            try:
                return await coro
            finally:
                self._last_request_monotonic = time.monotonic()

    async def _collect_data(self) -> Dict[str, Any]:
        # 대상 자산: 활성 + 주식(type_name에 'stock' 포함) + collect_financials=true
        asset_rows = (
            self.db.query(Asset)
            .join(AssetType)
            .filter(
                Asset.is_active == True,
                Asset.asset_type.has(AssetType.type_name.ilike('%stock%')),
                Asset.collection_settings.op('->>')('collect_financials') == 'true'
            )
            .all()
        )
        if not asset_rows:
            self.logging_helper.log_info("No active stock assets found for Macrotrends collector")
            return {"success": True, "assets_processed": 0, "data_points_added": 0}

        total_enqueued = 0
        async def process_asset(asset: Asset) -> int:
            try:
                ticker = asset.ticker
                if not ticker:
                    return 0
                # Fetch sections (rate-limited to 1 rps globally)
                income = await self._fetch_with_rate_limit(
                    self.client.get_income_statement(ticker.upper(), ticker.lower())
                ) or []
                balance = await self._fetch_with_rate_limit(
                    self.client.get_balance_sheet(ticker.upper(), ticker.lower())
                ) or []
                cash = await self._fetch_with_rate_limit(
                    self.client.get_cash_flow(ticker.upper(), ticker.lower())
                ) or []
                ratios = await self._fetch_with_rate_limit(
                    self.client.get_financial_ratios(ticker.upper(), ticker.lower())
                ) or []

                # Normalize to queue payload rows
                def rows_to_items(section_name: str, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
                    items: List[Dict[str, Any]] = []
                    for r in rows:
                        field_name = str(r.get("field_name", "")).strip()
                        for k, v in r.items():
                            if len(k) == 10 and k[4] == '-' and k[7] == '-':
                                snapshot_date = k
                                value_numeric = None
                                value_text = None
                                if v is None or v == "":
                                    value_numeric = None
                                    value_text = None if v is None else ""
                                else:
                                    try:
                                        value_numeric = float(v)
                                        value_text = None
                                    except Exception:
                                        value_numeric = None
                                        value_text = str(v)
                                # Skip empty
                                if value_numeric is None and (value_text is None or value_text == ""):
                                    continue
                                items.append({
                                    "assetId": asset.asset_id,
                                    "section": section_name,
                                    "fieldName": field_name,
                                    "snapshotDate": snapshot_date,
                                    "valueNumeric": value_numeric,
                                    "valueText": value_text,
                                    "unit": None,
                                    "currency": None,
                                    "sourceUrl": None,
                                })
                    return items

                items: List[Dict[str, Any]] = []
                items += rows_to_items("income", income)
                items += rows_to_items("balance", balance)
                items += rows_to_items("cash-flow", cash)
                items += rows_to_items("ratios", ratios)
                if not items:
                    return 0

                # Use standard batch queue wrapper via RedisQueueManager
                await self.redis_queue_manager.push_batch_task(
                    "macrotrends_financials",
                    {"items": items, "metadata": {"asset_id": asset.asset_id, "source": "macrotrends"}}
                )
                return len(items)
            except Exception as e:
                self.logging_helper.log_asset_error(asset.asset_id, e)
                return 0

        sem_tasks = [self.process_with_semaphore(process_asset(a)) for a in asset_rows]
        results = await asyncio.gather(*sem_tasks, return_exceptions=True)
        for r in results:
            if isinstance(r, int):
                total_enqueued += r
        return {"success": True, "assets_processed": len(asset_rows), "data_points_added": total_enqueued}


