"""
OHLCV data collector for fetching and storing price data.
This version is fully refactored to align with the v2 architecture,
relying on dependency injection for all external interactions.
"""
import logging
import asyncio
import json
from typing import List, Dict, Any

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, text

from .base_collector import BaseCollector
from app.models.asset import Asset, AssetType
from app.core.config_manager import ConfigManager
from app.services.api_strategy_manager import ApiStrategyManager
from app.utils.redis_queue_manager import RedisQueueManager
from app.external_apis.base.schemas import OhlcvDataPoint # 표준 스키마 임포트

logger = logging.getLogger(__name__)


class OHLCVCollector(BaseCollector):
    """
    Orchestrates the collection of OHLCV data. It determines which assets
    and intervals to collect for, delegates fetching to the ApiStrategyManager,
    and enqueues the results using the RedisQueueManager.
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
        The main business logic for the OHLCV collector.
        """
        # 1. 설정 조회 (무엇을 할지 묻기)
        if not self.config_manager.is_ohlcv_collection_enabled():
            self.logging_helper.log_info("OHLCV collection is disabled via configuration.")
            return {"processed_assets": 0, "total_added_records": 0}

        intervals = self.config_manager.get_ohlcv_intervals()
        
        # 2. 수집 대상 자산 조회 (누구를 할지 묻기)
        asset_ids = self._get_target_asset_ids()
        if not asset_ids:
            self.logging_helper.log_warning("No assets with OHLCV collection enabled were found.")
            return {"processed_assets": 0, "total_added_records": 0}

        self.logging_helper.log_info(f"Starting OHLCV collection for {len(asset_ids)} assets across {len(intervals)} intervals: {intervals}")

        # 3. 각 간격별로 데이터 수집 실행
        tasks = []
        for interval in intervals:
            tasks.append(self._collect_for_interval(asset_ids, interval))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # 4. 결과 집계
        total_processed = 0
        total_added_to_queue = 0
        for result in results:
            if isinstance(result, Exception):
                self.logging_helper.log_error(f"An error occurred during interval processing: {result}")
            elif isinstance(result, dict):
                total_processed += result.get("processed_assets", 0)
                total_added_to_queue += result.get("enqueued_records", 0)

        return {
            "processed_assets": total_processed,
            "total_added_records": total_added_to_queue,
        }

    def _get_target_asset_ids(self) -> List[int]:
        """Fetches the IDs of assets that are configured for OHLCV collection."""
        try:
            # SQLAlchemy 2.0+ 스타일의 쿼리로 가독성 향상
            query = (
                self.db.query(Asset.asset_id)
                .join(AssetType)
                .filter(
                    Asset.is_active == True,
                    text("collection_settings->>'collect_price' = 'true'")
                )
            )
            asset_id_tuples = query.all()
            return [asset_id for (asset_id,) in asset_id_tuples]
        except Exception as e:
            self.logging_helper.log_error(f"Failed to fetch target asset IDs: {e}")
            return []

    async def _collect_for_interval(self, asset_ids: List[int], interval: str) -> Dict[str, int]:
        """Handles the collection logic for a single interval."""
        self.logging_helper.log_info(f"Processing interval '{interval}' for {len(asset_ids)} assets.")
        
        tasks = [
            self.process_with_semaphore(
                self._fetch_and_enqueue_for_asset(asset_id, interval)
            )
            for asset_id in asset_ids
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        processed_count = sum(1 for r in results if isinstance(r, dict) and r.get("success"))
        enqueued_count = sum(r.get("enqueued_count", 0) for r in results if isinstance(r, dict))

        self.logging_helper.log_info(f"Interval '{interval}' complete. Processed: {processed_count}, Enqueued: {enqueued_count}")
        return {"processed_assets": processed_count, "enqueued_records": enqueued_count}

    async def _fetch_and_enqueue_for_asset(self, asset_id: int, interval: str) -> Dict[str, Any]:
        """
        Fetches data for a single asset and enqueues it.
        This is the core unit of work.
        """
        try:
            # 3. 데이터 가져오라고 시키기 (ApiStrategyManager 사용)
            # ApiStrategyManager는 내부적으로 백필 여부, API fallback 등을 모두 처리합니다.
            ohlcv_data: List[OhlcvDataPoint] = await self.api_manager.get_ohlcv_data(
                asset_id=asset_id,
                interval=interval
            )
            
            # 백필 여부 확인 (ApiStrategyManager에서 가져온 정보 사용)
            is_backfill = getattr(self.api_manager, '_last_fetch_was_backfill', False)

            if not ohlcv_data:
                self.logging_helper.log_debug(f"No new OHLCV data returned for asset_id {asset_id}, interval {interval}.")
                return {"success": True, "enqueued_count": 0}

            # 4. 작업 큐에 넘겨주기 (RedisQueueManager 사용)
            if ohlcv_data:
                # 표준 큐 페이로드 형식: {"items": [...], "metadata": {...}}로 통일
                # JSON 직렬화를 위해 model_dump_json을 사용하거나, 직접 변환
                items = [
                    json.loads(item.model_dump_json()) for item in ohlcv_data
                ]

                # interval에 따라 적절한 태스크 타입 선택
                task_type = "ohlcv_day_data" if interval in ["1d", "daily", "1w", "1m"] else "ohlcv_intraday_data"
                
                await self.redis_queue_manager.push_batch_task(
                    task_type,
                    {
                        "items": items,
                        "metadata": {
                            "asset_id": asset_id,
                            "interval": interval,
                            "data_type": "ohlcv",
                            "is_backfill": is_backfill
                        }
                    }
                )
                self.logging_helper.log_debug(f"Successfully enqueued {len(ohlcv_data)} OHLCV records for asset_id {asset_id}.")
                return {"success": True, "enqueued_count": len(ohlcv_data)}
            
            return {"success": True, "enqueued_count": 0}

        except Exception as e:
            self.logging_helper.log_asset_error(asset_id, e)
            return {"success": False, "error": str(e)}
