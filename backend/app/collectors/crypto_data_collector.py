"""
Crypto Data Collector for collecting detailed cryptocurrency information.
This version is fully refactored to align with the v2 architecture.
"""
import logging
import asyncio
from typing import List, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import or_

from .base_collector import BaseCollector
from app.models.asset import Asset, AssetType
from app.core.config_manager import ConfigManager
from app.services.api_strategy_manager import ApiStrategyManager
from app.utils.redis_queue_manager import RedisQueueManager
from app.external_apis.base.schemas import CryptoData # 표준 스키마 임포트

logger = logging.getLogger(__name__)


class CryptoDataCollector(BaseCollector):
    """
    Orchestrates the collection of crypto asset information. It determines which assets
    to collect for, delegates fetching to the ApiStrategyManager, and enqueues the
    results for the DataProcessor.
    """

    def __init__(
        self,
        db: Session,
        config_manager: ConfigManager,
        api_manager: ApiStrategyManager,
        redis_queue_manager: RedisQueueManager,
    ):
        # BaseCollector가 모든 의존성을 설정합니다.
        super().__init__(db, config_manager, api_manager, redis_queue_manager)

    async def _collect_data(self) -> Dict[str, Any]:
        """
        The main business logic for the CryptoData collector.
        """
        # 1. 설정 조회
        if not self.config_manager.is_crypto_collection_enabled():
            self.logging_helper.log_info("Crypto data collection is disabled via configuration.")
            return {"processed_assets": 0, "total_added_records": 0}

        # 2. 수집 대상 자산 조회
        asset_ids = self._get_target_asset_ids()
        if not asset_ids:
            self.logging_helper.log_warning("No crypto assets configured for data collection.")
            return {"processed_assets": 0, "total_added_records": 0}

        self.logging_helper.log_info(f"Starting crypto data collection for {len(asset_ids)} assets.")

        # 3. 데이터 수집 실행 및 결과 집계
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
        """Fetches the IDs of crypto assets that are configured for collection."""
        try:
            query = (
                self.db.query(Asset.asset_id)
                .join(AssetType)
                .filter(
                    Asset.is_active == True,
                    AssetType.type_name.ilike('%Crypto%'), # 'Crypto' 또는 'Cryptocurrency' 포함
                    Asset.collection_settings.op('->>')('collect_crypto_data') == 'true'
                )
            )
            asset_id_tuples = query.all()
            return [asset_id for (asset_id,) in asset_id_tuples]
        except Exception as e:
            self.logging_helper.log_error(f"Failed to fetch target crypto asset IDs: {e}")
            return []

    async def _fetch_and_enqueue_for_asset(self, asset_id: int) -> Dict[str, Any]:
        """
        Fetches data for a single crypto asset and enqueues it.
        """
        try:
            # 3. 데이터 가져오라고 시키기 (ApiStrategyManager 사용)
            crypto_data: CryptoData = await self.api_manager.get_crypto_info(asset_id=asset_id)

            if not crypto_data:
                self.logging_helper.log_debug(f"No new crypto data returned for asset_id {asset_id}.")
                return {"success": True, "enqueued_count": 0}

            # 4. 작업 큐에 넘겨주기 (RedisQueueManager 사용)
            # 표준 큐 페이로드: {"items": [...]}로 통일
            # datetime 객체를 JSON 직렬화 가능한 형태로 변환
            # asset_id를 포함하여 전달
            crypto_data_dict = crypto_data.model_dump(mode='json')
            crypto_data_dict['asset_id'] = asset_id
            
            await self.redis_queue_manager.push_batch_task(
                "crypto_info",
                {"items": [crypto_data_dict]}
            )
            
            self.logging_helper.log_debug(f"Successfully enqueued crypto info for asset_id {asset_id}.")
            return {"success": True, "enqueued_count": 1}

        except Exception as e:
            self.logging_helper.log_asset_error(asset_id, e)
            return {"success": False, "error": str(e), "enqueued_count": 0}
