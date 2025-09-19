"""
Onchain data collector for fetching and storing Bitcoin metrics.
This version is fully refactored to align with the v2 architecture.
"""
import logging
import asyncio
from typing import List, Dict, Any

from sqlalchemy.orm import Session

from .base_collector import BaseCollector
from ..models.asset import Asset
from ..core.config_manager import ConfigManager
from ..utils.redis_queue_manager import RedisQueueManager
from ..services.api_strategy_manager import ApiStrategyManager
from ..external_apis.base.schemas import OnchainMetricDataPoint # 표준 스키마 임포트

logger = logging.getLogger(__name__)


class OnchainCollector(BaseCollector):
    """
    Orchestrates the collection of onchain metrics for Bitcoin. It determines
    which metrics to collect, delegates fetching to the ApiStrategyManager,
    and enqueues the results for the DataProcessor.
    """

    def __init__(
        self,
        db: Session,
        config_manager: ConfigManager,
        api_manager: ApiStrategyManager,
        redis_queue_manager: RedisQueueManager,
    ):
        super().__init__(db, config_manager, api_manager, redis_queue_manager)
        self.bitcoin_asset_id = self._get_bitcoin_asset_id()

    async def _collect_data(self) -> Dict[str, Any]:
        """
        The main business logic for the OnchainCollector.
        """
        # 1. 설정 조회
        if not self.config_manager.is_onchain_collection_enabled():
            self.logging_helper.log_info("Onchain collection is disabled via configuration.")
            return {"processed_assets": 0, "total_added_records": 0}

        if not self.bitcoin_asset_id:
            self.logging_helper.log_error("Bitcoin asset (BTC or BTCUSDT) not found in DB. Cannot collect onchain data.")
            return {"processed_assets": 0, "total_added_records": 0}
            
        enabled_metrics = self.config_manager.get_enabled_onchain_metrics()
        if not enabled_metrics:
            self.logging_helper.log_warning("No onchain metrics are enabled for collection in configuration.")
            return {"processed_assets": 0, "total_added_records": 0}

        self.logging_helper.log_info(f"Starting onchain collection for {len(enabled_metrics)} metrics for asset_id {self.bitcoin_asset_id}.")

        # 3. 데이터 수집 실행 및 결과 집계
        tasks = [
            self.process_with_semaphore(
                self._fetch_and_enqueue_for_metric(metric_name)
            )
            for metric_name in enabled_metrics
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 온체인 컬렉터는 자산 1개(비트코인)에 대해 여러 메트릭을 처리합니다.
        # 따라서 processed_assets는 1 또는 0 입니다.
        successful_metrics = [r for r in results if isinstance(r, dict) and r.get("success")]
        processed_assets = 1 if successful_metrics else 0
        enqueued_count = sum(r.get("enqueued_count", 0) for r in successful_metrics)
        
        return {
            "processed_assets": processed_assets,
            "total_added_records": enqueued_count,
        }

    def _get_bitcoin_asset_id(self) -> int | None:
        """Dynamically finds the asset ID for Bitcoin (BTC or BTCUSDT)."""
        try:
            btc_asset = self.db.query(Asset.asset_id).filter(Asset.ticker.in_(['BTC', 'BTCUSDT'])).first()
            return btc_asset.asset_id if btc_asset else None
        except Exception as e:
            self.logging_helper.log_error(f"Error finding Bitcoin asset ID: {e}")
            return None

    async def _fetch_and_enqueue_for_metric(self, metric_name: str) -> Dict[str, Any]:
        """
        Fetches data for a single onchain metric and enqueues it.
        """
        try:
            self.logging_helper.log_info(f"[OnchainCollector] 메트릭 '{metric_name}' 수집 시작 (asset_id: {self.bitcoin_asset_id})")
            
            # 3. 데이터 가져오라고 시키기 (ApiStrategyManager 사용)
            # 동적 Limit 시스템 사용 (다른 클라이언트들과 동일)
            metric_data: List[OnchainMetricDataPoint] = await self.api_manager.get_onchain_metric(
                metric_name=metric_name,
                asset_id=self.bitcoin_asset_id,
                days=None  # ApiStrategyManager에서 동적으로 계산
            )

            if not metric_data:
                self.logging_helper.log_warning(f"[OnchainCollector] 메트릭 '{metric_name}'에 대한 데이터가 없습니다.")
                return {"success": True, "enqueued_count": 0}
            
            self.logging_helper.log_info(f"[OnchainCollector] 메트릭 '{metric_name}' 데이터 수집 완료: {len(metric_data)}개 포인트")

            # 4. 작업 큐에 넘겨주기 (RedisQueueManager 사용)
            payload = {
                "asset_id": self.bitcoin_asset_id,
                "metric_name": metric_name,
                "data": []
            }
            
            # 데이터 변환 및 검증
            valid_items = 0
            invalid_items = 0
            
            # metric_data가 리스트인지 확인하고 각 항목을 처리
            if isinstance(metric_data, list):
                for i, item in enumerate(metric_data):
                    try:
                        if hasattr(item, 'model_dump'):
                            # Pydantic 모델인 경우
                            converted_item = item.model_dump(mode='json')
                            payload["data"].append(converted_item)
                            valid_items += 1
                            
                            # 첫 번째와 마지막 아이템 로그
                            if i == 0 or i == len(metric_data) - 1:
                                self.logging_helper.log_debug(f"[OnchainCollector] 메트릭 '{metric_name}' 아이템 {i+1}: "
                                                           f"timestamp={converted_item.get('timestamp_utc')}, "
                                                           f"mvrv_z_score={converted_item.get('mvrv_z_score')}")
                            
                        elif isinstance(item, dict):
                            # 딕셔너리인 경우
                            payload["data"].append(item)
                            valid_items += 1
                            
                            # 첫 번째와 마지막 아이템 로그
                            if i == 0 or i == len(metric_data) - 1:
                                self.logging_helper.log_debug(f"[OnchainCollector] 메트릭 '{metric_name}' 아이템 {i+1}: "
                                                           f"timestamp={item.get('timestamp_utc')}, "
                                                           f"mvrv_z_score={item.get('mvrv_z_score')}")
                        else:
                            # 문자열이나 다른 타입인 경우 건너뛰기
                            invalid_items += 1
                            self.logging_helper.log_warning(f"[OnchainCollector] 메트릭 '{metric_name}' 아이템 {i+1} 건너뛰기: "
                                                          f"지원하지 않는 타입 {type(item)}")
                            continue
                    except Exception as e:
                        invalid_items += 1
                        self.logging_helper.log_error(f"[OnchainCollector] 메트릭 '{metric_name}' 아이템 {i+1} 변환 실패: {e}")
                        continue
            else:
                self.logging_helper.log_error(f"[OnchainCollector] 메트릭 '{metric_name}' 예상치 못한 데이터 타입: {type(metric_data)}")
                return {"success": False, "error": f"Unexpected data type: {type(metric_data)}", "enqueued_count": 0}
            
            # 변환 결과 로그
            self.logging_helper.log_info(f"[OnchainCollector] 메트릭 '{metric_name}' 데이터 변환 완료:")
            self.logging_helper.log_info(f"  - 총 아이템: {len(metric_data)}개")
            self.logging_helper.log_info(f"  - 유효한 아이템: {valid_items}개")
            self.logging_helper.log_info(f"  - 무효한 아이템: {invalid_items}개")
            
            if payload["data"]:
                await self.redis_queue_manager.push_batch_task("onchain_metric", payload)
                self.logging_helper.log_info(f"[OnchainCollector] 메트릭 '{metric_name}' 큐 전송 완료: {len(payload['data'])}개 레코드")
                return {"success": True, "enqueued_count": len(payload["data"])}
            else:
                self.logging_helper.log_warning(f"[OnchainCollector] 메트릭 '{metric_name}' 큐에 전송할 유효한 데이터가 없습니다.")
                return {"success": True, "enqueued_count": 0}

        except Exception as e:
            self.logging_helper.log_error(f"Failed to process onchain metric '{metric_name}' for asset_id {self.bitcoin_asset_id}: {e}")
            return {"success": False, "error": str(e), "enqueued_count": 0}
