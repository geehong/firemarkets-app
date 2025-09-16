"""
Index data collector for fetching and storing index information.
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


class IndexCollector(BaseCollector):
    """
    Orchestrates the collection of market index data. It determines which assets
    to collect for, delegates fetching to the ApiStrategyManager, and enqueues
    the results for the DataProcessor.
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
        The main business logic for the IndexCollector.
        """
        if not self.config_manager.is_index_collection_enabled():
            self.logging_helper.log_info("Index data collection is disabled via configuration.")
            return {"processed_assets": 0, "total_added_records": 0}

        asset_ids = self._get_target_asset_ids()
        if not asset_ids:
            self.logging_helper.log_warning("No index assets configured for data collection.")
            return {"processed_assets": 0, "total_added_records": 0}

        self.logging_helper.log_info(f"Starting index data collection for {len(asset_ids)} assets.")

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
        """Fetches the IDs of index assets that are configured for collection."""
        try:
            query = (
                self.db.query(Asset.asset_id)
                .join(AssetType)
                .filter(
                    Asset.is_active == True,
                    AssetType.type_name.ilike('Index') # Case-insensitive
                )
            )
            asset_id_tuples = query.all()
            return [asset_id for (asset_id,) in asset_id_tuples]
        except Exception as e:
            self.logging_helper.log_error(f"Failed to fetch target index asset IDs: {e}")
            return []

    async def _fetch_and_enqueue_for_asset(self, asset_id: int) -> Dict[str, Any]:
        """
        Fetches data for a single index asset and enqueues it.
        """
        try:
            # ApiStrategyManager에게 지수 정보 요청
            index_data: schemas.IndexInfoData = await self.api_manager.get_index_info(asset_id=asset_id)

            if not index_data:
                self.logging_helper.log_debug(f"No new index info returned for asset_id {asset_id}.")
                return {"success": True, "enqueued_count": 0}

            # Redis 큐에 작업 추가
            payload = {
                "asset_id": asset_id,
                "data": index_data.model_dump()
            }
            await self.redis_queue_manager.push_batch_task("index_info", payload)
            
            self.logging_helper.log_debug(f"Successfully enqueued index info for asset_id {asset_id}.")
            return {"success": True, "enqueued_count": 1}

        except Exception as e:
            self.logging_helper.log_asset_error(asset_id, e)
            return {"success": False, "error": str(e), "enqueued_count": 0}
