"""
Stock data collector for fetching and storing company information, financials, and estimates.
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
        self.scheduled_data_types = None  # 스케줄에서 지정된 데이터 타입
        self.client_priority = None  # 스케줄에서 지정된 클라이언트 우선순위

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
        """수집할 주식 자산 ID 목록을 반환합니다."""
        try:
            assets = (
                self.db.query(Asset.asset_id)
                .join(AssetType)
                .filter(
                    Asset.is_active == True,
                    AssetType.type_name.ilike('%Stock%'),
                    or_(
                        Asset.collection_settings.op('->>')('collect_financials') == 'true',
                        Asset.collection_settings.op('->>')('collect_estimates') == 'true',
                        Asset.collection_settings.op('->>')('collect_assets_info') == 'true'
                    )
                )
                .all()
            )
            return [asset.asset_id for asset in assets]
        except Exception as e:
            self.logging_helper.log_error(f"Error getting target asset IDs: {e}")
            return []

    def set_schedule_config(self, scheduled_data_types: List[str] = None, client_priority: List[str] = None):
        """스케줄에서 지정된 데이터 타입과 클라이언트 우선순위를 설정"""
        self.scheduled_data_types = scheduled_data_types
        self.client_priority = client_priority
        self.logging_helper.log_info(f"Schedule config set: data_types={scheduled_data_types}, client_priority={client_priority}")

    async def _fetch_and_enqueue_for_asset(self, asset_id: int) -> Dict[str, Any]:
        """
        Fetches relevant stock data for a single asset based on schedule and collection_settings.
        """
        enqueued_count = 0
        try:
            # Get asset's collection settings
            asset = self.db.query(Asset).filter(Asset.asset_id == asset_id).first()
            if not asset:
                self.logging_helper.log_error(f"Asset {asset_id} not found")
                return {"success": False, "error": f"Asset {asset_id} not found", "enqueued_count": 0}
            
            collection_settings = asset.collection_settings or {}
            
            # 스케줄에서 지정된 데이터 타입과 자산별 설정을 조합하여 수집 여부 결정
            collect_profile = self._should_collect_profile(collection_settings)
            collect_financials = self._should_collect_financials(collection_settings)
            collect_estimates = self._should_collect_estimates(collection_settings)
            
            self.logging_helper.log_debug(f"Asset {asset_id} ({asset.ticker}) collection decision: profile={collect_profile}, financials={collect_financials}, estimates={collect_estimates}")
            
            # Prepare tasks based on combined settings
            tasks = []
            task_types = []
            
            if collect_profile:
                tasks.append(self.api_manager.get_company_profile(asset_id=asset_id))
                task_types.append("profile")
            
            if collect_financials:
                tasks.append(self.api_manager.get_stock_financials(asset_id=asset_id))
                task_types.append("financials")
            
            if collect_estimates:
                tasks.append(self.api_manager.get_analyst_estimates(asset_id=asset_id))
                task_types.append("estimates")
            
            if not tasks:
                self.logging_helper.log_debug(f"No data collection enabled for asset {asset_id} ({asset.ticker})")
                return {"success": True, "enqueued_count": 0}
            
            # Execute only the required tasks
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results based on what was requested
            result_index = 0
            
            if collect_profile:
                profile_data = results[result_index]
                result_index += 1
                if isinstance(profile_data, schemas.CompanyProfileData):
                    payload = {"asset_id": asset_id, "data": profile_data.model_dump(mode='json')}
                    await self.redis_queue_manager.push_batch_task("stock_profile", payload)
                    enqueued_count += 1
                elif isinstance(profile_data, dict):
                    # API Strategy Manager가 Dict를 반환하는 경우 CompanyProfileData로 변환
                    try:
                        company_profile = schemas.CompanyProfileData(**profile_data)
                        payload = {"asset_id": asset_id, "data": company_profile.model_dump(mode='json')}
                        await self.redis_queue_manager.push_batch_task("stock_profile", payload)
                        enqueued_count += 1
                        self.logging_helper.log_info(f"Successfully converted and enqueued profile data for asset_id {asset_id}")
                    except Exception as e:
                        self.logging_helper.log_error(f"Failed to convert profile data to CompanyProfileData for asset_id {asset_id}: {e}")
                elif isinstance(profile_data, Exception):
                    self.logging_helper.log_asset_error(asset_id, profile_data, context="fetching profile")

            if collect_financials:
                financials_data = results[result_index]
                result_index += 1
                if isinstance(financials_data, schemas.StockFinancialsData):
                    payload = {"asset_id": asset_id, "data": financials_data.model_dump(mode='json')}
                    await self.redis_queue_manager.push_batch_task("stock_financials", payload)
                    enqueued_count += 1
                elif isinstance(financials_data, Exception):
                    self.logging_helper.log_asset_error(asset_id, financials_data, context="fetching financials")

            if collect_estimates:
                estimates_data = results[result_index]
                result_index += 1
                if isinstance(estimates_data, list) and estimates_data:
                    # Estimates can be a list of multiple periods
                    for estimate in estimates_data:
                        payload = {"asset_id": asset_id, "data": estimate.model_dump(mode='json')}
                        await self.redis_queue_manager.push_batch_task("stock_estimate", payload)
                        enqueued_count += 1
                elif isinstance(estimates_data, Exception):
                    self.logging_helper.log_asset_error(asset_id, estimates_data, context="fetching estimates")

            self.logging_helper.log_debug(f"Enqueued {enqueued_count} tasks for asset_id {asset_id} ({asset.ticker}).")
            return {"success": True, "enqueued_count": enqueued_count}

        except Exception as e:
            self.logging_helper.log_asset_error(asset_id, e)
            return {"success": False, "error": str(e), "enqueued_count": 0}
    
    def _should_collect_profile(self, collection_settings: Dict) -> bool:
        """프로필 수집 여부 결정 (스케줄 + 자산 설정)"""
        # 스케줄에서 프로필이 지정되지 않았으면 수집하지 않음
        if self.scheduled_data_types and "profile" not in self.scheduled_data_types:
            return False
        # 자산별 설정에서 프로필 수집이 비활성화되어 있으면 수집하지 않음
        return collection_settings.get("collect_assets_info", False)
    
    def _should_collect_financials(self, collection_settings: Dict) -> bool:
        """재무 수집 여부 결정 (스케줄 + 자산 설정)"""
        # 스케줄에서 재무가 지정되지 않았으면 수집하지 않음
        if self.scheduled_data_types and "financials" not in self.scheduled_data_types:
            return False
        # 자산별 설정에서 재무 수집이 비활성화되어 있으면 수집하지 않음
        return collection_settings.get("collect_financials", False)
    
    def _should_collect_estimates(self, collection_settings: Dict) -> bool:
        """추정치 수집 여부 결정 (스케줄 + 자산 설정)"""
        # 스케줄에서 추정치가 지정되지 않았으면 수집하지 않음
        if self.scheduled_data_types and "estimates" not in self.scheduled_data_types:
            return False
        # 자산별 설정에서 추정치 수집이 비활성화되어 있으면 수집하지 않음
        return collection_settings.get("collect_estimates", False)
