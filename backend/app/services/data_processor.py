"""
Data Processor Service - 중앙화된 데이터 처리 서비스
Redis Stream과 Queue에서 데이터를 읽어 검증하고 PostgreSQL DB에 저장
Refactored to use Validator, Adapter, Repository, and Consumer components.
"""
import asyncio
import json
import logging
import time
import datetime
from typing import Dict, List, Any, Optional
from datetime import timezone

import redis.asyncio as redis

from ..core.config import GLOBAL_APP_CONFIGS
from ..models.asset import Asset
from ..core.database import get_postgres_db
from ..utils.logger import logger
from ..utils.redis_queue_manager import RedisQueueManager

# New components
from .processor.validator import DataValidator
from .processor.adapters import AdapterFactory
from .processor.repository import DataRepository
from .processor.consumer import StreamConsumer

class DataProcessor:
    """
    중앙화된 데이터 처리 서비스
    - Redis Stream에서 실시간 데이터 처리 (StreamConsumer 위임)
    - Redis Queue에서 배치 데이터 처리
    - 데이터 검증 및 변환 (DataValidator 위임)
    - PostgreSQL DB 저장 (DataRepository 위임)
    """

    def __init__(self, config_manager=None, redis_queue_manager=None):
        self.config_manager = config_manager
        self.queue_manager = redis_queue_manager
        self.running = False
        self.task = None
        
        # 설정 로드
        self._load_initial_configs()
        
        # 컴포넌트 초기화
        self.validator = DataValidator()
        self.adapter_factory = AdapterFactory(self.validator)
        self.repository = DataRepository(self.validator)
        
        # Redis 설정
        self.redis_host = GLOBAL_APP_CONFIGS.get("REDIS_HOST", "redis")
        self.redis_port = GLOBAL_APP_CONFIGS.get("REDIS_PORT", 6379)
        self.redis_db = GLOBAL_APP_CONFIGS.get("REDIS_DB", 0)
        self.redis_password = GLOBAL_APP_CONFIGS.get("REDIS_PASSWORD")
        self.redis_url = f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"
        
        # StreamConsumer 초기화
        self.stream_consumer = StreamConsumer(
            redis_url=self.redis_url,
            adapter_factory=self.adapter_factory,
            repository=self.repository,
            batch_size=GLOBAL_APP_CONFIGS.get("BATCH_SIZE", 100)
        )
        
        self.redis_client = None # 직접 사용 최소화, Consumer가 관리
        
        # 배치 큐 설정
        self.batch_queue = "batch_data_queue"
        self.max_retries = 3
        self.retry_delay = 1.0

        # 통계
        self.stats = {
            "processed_count": 0,
            "errors": 0,
            "start_time": time.time()
        }
        
        # Failover 관련 (기존 로직 유지)
        self.backup_sources = ["api_fallback"]
        self.current_source_index = 0
        self.source_failures = {}
        self.max_failures_per_source = 5

        logger.info("DataProcessor (Refactored) 인스턴스 생성 완료")

    def _load_initial_configs(self):
        """초기 설정을 로드합니다."""
        try:
            from ..core.config import load_and_set_global_configs
            load_and_set_global_configs()
            logger.info("✅ 초기 설정 로드 완료")
        except Exception as e:
            logger.error(f"❌ 초기 설정 로드 실패: {e}")

    async def start(self):
        """서비스 시작"""
        self.running = True
        logger.info("🚀 DataProcessor 서비스 시작")
        
        # Redis 연결 (Consumer 내부에서 처리하지만, 배치 처리를 위해 여기서도 필요할 수 있음)
        # 배치 처리는 queue_manager를 사용하거나 직접 연결
        if not self.queue_manager:
             self.redis_client = await redis.from_url(self.redis_url)

        # StreamConsumer 연결
        await self.stream_consumer.connect()
        
        # 자산 맵 로드 및 주입
        await self._refresh_asset_map()

        # 메인 루프
        while self.running:
            try:
                # 1. 실시간 스트림 처리
                stream_count = await self.stream_consumer.process_streams()
                
                # 2. 배치 큐 처리
                batch_count = await self._process_batch_queue()
                
                total_processed = stream_count + batch_count
                self.stats["processed_count"] += total_processed
                
                if total_processed == 0:
                    await asyncio.sleep(0.1) # Idle 대기
                    
            except Exception as e:
                logger.error(f"DataProcessor 메인 루프 오류: {e}")
                self.stats["errors"] += 1
                await asyncio.sleep(1)

    async def stop(self):
        """서비스 종료"""
        self.running = False
        logger.info("🛑 DataProcessor 서비스 종료 중...")
        if self.redis_client:
            await self.redis_client.close()

    async def _refresh_asset_map(self):
        """자산 ID 매핑 갱신"""
        try:
            pg_db = next(get_postgres_db())
            try:
                assets = pg_db.query(Asset.ticker, Asset.asset_id).all()
                asset_map = {ticker: asset_id for ticker, asset_id in assets}
                self.stream_consumer.set_asset_map(asset_map)
                logger.info(f"자산 맵 갱신 완료: {len(asset_map)}개")
            finally:
                pg_db.close()
        except Exception as e:
            logger.error(f"자산 맵 갱신 실패: {e}")

    async def _process_batch_queue(self) -> int:
        """배치 큐 데이터 처리"""
        processed_count = 0
        try:
            # 큐에서 데이터 가져오기 (최대 100개씩)
            for _ in range(100):
                task_wrapper = None
                if self.queue_manager:
                    task_wrapper = await self.queue_manager.pop_batch_task(timeout_seconds=0.1)
                elif self.redis_client:
                    result = await self.redis_client.blpop(self.batch_queue, timeout=0.1)
                    if result:
                        _, task_data = result
                        try:
                            task_wrapper = json.loads(task_data)
                        except json.JSONDecodeError:
                            pass

                if not task_wrapper:
                    break
                
                # 태스크 처리
                success = await self._process_batch_task(task_wrapper)
                if success:
                    processed_count += 1
                else:
                    # 실패 시 DLQ 등 처리 (여기서는 로그만)
                    logger.warning(f"배치 태스크 처리 실패: {task_wrapper.get('type')}")
                    
        except Exception as e:
            logger.error(f"배치 큐 처리 중 오류: {e}")
            self.stats["errors"] += 1
            
        return processed_count

    async def _process_batch_task(self, task: Dict[str, Any]) -> bool:
        """배치 태스크 처리"""
        try:
            task_type = task.get("type")
            payload = task.get("payload")
            
            if not task_type or not payload:
                return False
                
            items = payload.get("items") if isinstance(payload, dict) else None
            if items is None:
                items = payload if isinstance(payload, list) else [payload]

            # Repository로 위임
            if task_type == "stock_profile":
                return await self.repository.save_stock_profile(items)
            elif task_type == "stock_financials":
                return await self.repository.save_stock_financials(items)
            elif task_type == "stock_estimate":
                return await self.repository.save_stock_estimate(items)
            elif task_type == "etf_info":
                return await self.repository.save_etf_info(items)
            elif task_type in ("crypto_info", "crypto_data"):
                return await self.repository.save_crypto_data(items)
            elif task_type in ("ohlcv_data", "ohlcv_day_data", "ohlcv_intraday_data"):
                meta = {}
                if isinstance(payload, dict):
                    meta = payload.get("metadata") or payload.get("meta") or {}
                if not meta:
                    meta = task.get("meta") or {}
                return await self.repository.save_ohlcv_data(items, meta)
            elif task_type == "world_assets_ranking":
                return await self.repository.save_world_assets_ranking(items, task.get("meta", {}))
            elif task_type == "macrotrends_financials":
                return await self.repository.save_macrotrends_financials(items)
            else:
                logger.warning(f"알 수 없는 태스크 타입: {task_type}")
                return False
                
        except Exception as e:
            logger.error(f"배치 태스크 실행 오류: {e}")
            return False

    # Failover methods (kept for compatibility if needed, though usage should be checked)
    def get_current_source(self):
        return self.backup_sources[self.current_source_index]
    
    def mark_source_failure(self, source):
        if source not in self.source_failures:
            self.source_failures[source] = 0
        self.source_failures[source] += 1
        if self.source_failures[source] >= self.max_failures_per_source:
            self.switch_to_next_source()
            
    def switch_to_next_source(self):
        self.current_source_index = (self.current_source_index + 1) % len(self.backup_sources)
