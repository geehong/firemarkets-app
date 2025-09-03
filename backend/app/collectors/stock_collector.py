"""
Stock data collector for fetching and storing company information, financials, and estimates.
This version is fully refactored to align with the v2 architecture.
"""
import logging
import asyncio
from typing import List, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import or_, text

from .base_collector import BaseCollector
from app.models.asset import Asset, AssetType
from app.core.config_manager import ConfigManager
from app.services.api_strategy_manager import ApiStrategyManager
from app.utils.redis_queue_manager import RedisQueueManager
from app.external_apis.base import schemas

logger = logging.getLogger(__name__)


class StockCollector(BaseCollector):
    """
    Orchestrates the collection of stock data (profile, financials, estimates).
    It determines which assets to collect for, delegates fetching to the
    ApiStrategyManager, and enqueues the results for the DataProcessor.
    """

    def __init__(
        self,
        db: Session,
        config_manager: ConfigManager,
        api_manager: ApiStrategyManager,
        redis_queue_manager: RedisQueueManager,
    ):
        super().__init__(db, config_manager, api_manager, redis_queue_manager)

    async def _collect_data(self) -> Dict[str, Any]:
        """
        The main business logic for the StockCollector.
        """
        if not self.config_manager.is_stock_collection_enabled():
            self.logging_helper.log_info("Stock data collection is disabled via configuration.")
            return {"processed_assets": 0, "total_added_records": 0}

        asset_ids = self._get_target_asset_ids()
        if not asset_ids:
            self.logging_helper.log_warning("No stock assets configured for data collection.")
            return {"processed_assets": 0, "total_added_records": 0}

        self.logging_helper.log_info(f"Starting stock data collection for {len(asset_ids)} assets.")

        tasks = [
            self.process_with_semaphore(
                self._fetch_and_enqueue_for_asset(asset_id)
            )
            for asset_id in asset_ids
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        processed_count = len(results)
        enqueued_count = sum(r.get("enqueued_count", 0) for r in results if isinstance(r, dict))

        return {
            "processed_assets": processed_count,
            "total_added_records": enqueued_count,
        }

    def _get_target_asset_ids(self) -> List[int]:
        """Fetches the IDs of stock assets that are configured for collection."""
        try:
            query = (
                self.db.query(Asset.asset_id)
                .join(AssetType)
                .filter(
                    Asset.is_active == True,
                    AssetType.type_name.ilike('Stock'), # Case-insensitive
                    or_(
                        Asset.collection_settings.contains({"collect_assets_info": True}),
                        text("JSON_EXTRACT(collection_settings, '$.collect_assets_info') = true")
                    )
                )
            )
            asset_id_tuples = query.all()
            return [asset_id for (asset_id,) in asset_id_tuples]
        except Exception as e:
            self.logging_helper.log_error(f"Failed to fetch target stock asset IDs: {e}")
            return []

    async def _fetch_and_enqueue_for_asset(self, asset_id: int) -> Dict[str, Any]:
        """
        Fetches all relevant stock data for a single asset and enqueues it.
        """
        enqueued_count = 0
        try:
            # Fetch all data types concurrently for efficiency
            profile_task = self.api_manager.get_company_profile(asset_id=asset_id)
            financials_task = self.api_manager.get_stock_financials(asset_id=asset_id)
            estimates_task = self.api_manager.get_analyst_estimates(asset_id=asset_id)

            results = await asyncio.gather(profile_task, financials_task, estimates_task, return_exceptions=True)

            profile_data, financials_data, estimates_data = results
            
            # Process and enqueue profile data (standard payload: {"items": [...]})
            if isinstance(profile_data, schemas.CompanyProfileData):
                await self.redis_queue_manager.push_batch_task(
                    "stock_profile",
                    {"items": [profile_data.model_dump()]}
                )
                enqueued_count += 1
            elif isinstance(profile_data, Exception):
                self.logging_helper.log_asset_error(asset_id, profile_data, context="fetching profile")

            # Process and enqueue financials data
            if isinstance(financials_data, schemas.StockFinancialsData):
                await self.redis_queue_manager.push_batch_task(
                    "stock_financials",
                    {"items": [financials_data.model_dump()]}
                )
                enqueued_count += 1
            elif isinstance(financials_data, Exception):
                 self.logging_helper.log_asset_error(asset_id, financials_data, context="fetching financials")

            # Process and enqueue estimates data (batch items)
            if isinstance(estimates_data, list) and estimates_data:
                items = [estimate.model_dump() for estimate in estimates_data]
                await self.redis_queue_manager.push_batch_task(
                    "stock_estimate",
                    {"items": items}
                )
                enqueued_count += len(items)
            elif isinstance(estimates_data, Exception):
                 self.logging_helper.log_asset_error(asset_id, estimates_data, context="fetching estimates")

            self.logging_helper.log_debug(f"Enqueued {enqueued_count} tasks for asset_id {asset_id}.")
            return {"success": True, "enqueued_count": enqueued_count}

        except Exception as e:
            self.logging_helper.log_asset_error(asset_id, e)
            return {"success": False, "error": str(e), "enqueued_count": 0}
