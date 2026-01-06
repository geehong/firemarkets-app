"""
Base collector class providing common functionality for all data collectors.
This class relies on dependency injection for its core components.
"""
import logging
import asyncio
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, Any, Optional

from sqlalchemy.orm import Session

# --- 의존성 주입을 위한 타입 임포트 ---
# 실제 런타임에서는 순환 참조를 피하기 위해 TYPE_CHECKING 블록을 사용할 수 있습니다.
from app.core.config_manager import ConfigManager
from app.services.api_strategy_manager import ApiStrategyManager
from app.utils.redis_queue_manager import RedisQueueManager
from app.core.database import SessionLocal
# ---

from app.models.asset import SchedulerLog
from app.utils.logging_helper import CollectorLoggingHelper


logger = logging.getLogger(__name__)


class BaseCollector(ABC):
    """
    Base class for all data collectors, designed for dependency injection.
    It handles boilerplate logic like logging, timing, and error handling.
    """
    
    def __init__(
        self,
        db: Session,
        config_manager: ConfigManager,
        api_manager: ApiStrategyManager,
        redis_queue_manager: RedisQueueManager,
    ):
        """
        Initializes the collector with all necessary dependencies.
        No more fallbacks to global configs.
        """
        # --- 의존성 명확화 ---
        self.db = db
        self.config_manager = config_manager
        self.api_manager = api_manager
        self.redis_queue_manager = redis_queue_manager
        
        self.collector_name = self.__class__.__name__
        self.logging_helper = CollectorLoggingHelper(self.collector_name, self)

        # --- 설정 초기화 (오직 ConfigManager만 사용) ---
        self.enable_semaphore = self.config_manager.is_semaphore_enabled()
        self.semaphore_limit = self.config_manager.get_semaphore_limit() if self.enable_semaphore else None
        self.semaphore = None  # 지연 초기화
        if self.enable_semaphore:
            logger.info(f"[{self.collector_name}] Semaphore enabled with limit {self.semaphore_limit}")
        else:
            logger.info(f"[{self.collector_name}] Semaphore disabled")

    async def collect_with_settings(self) -> Dict[str, Any]:
        """
        Main collection method with error handling, logging, and timing.
        This is the primary entry point called by the SchedulerService.
        """
        start_time = datetime.now()
        logger.info(f"[{self.collector_name}] Collection job started")
        
        try:
            # 핵심 비즈니스 로직은 _collect_data에 위임
            result = await self._collect_data()
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            logger.info(f"[{self.collector_name}] Collection job completed successfully in {duration:.2f} seconds")
            return {
                "success": True, "collector": self.collector_name, "duration": duration, "data": result
            }
            
        except Exception as e:
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            error_message = str(e)
            
            logger.error(f"[{self.collector_name}] Collection job failed after {duration:.2f} seconds: {error_message}")
            return {
                "success": False, "collector": self.collector_name, "duration": duration, "error": error_message
            }

    @abstractmethod
    async def _collect_data(self) -> Dict[str, Any]:
        """
        Abstract method where the actual data collection logic resides.
        Must be implemented by subclasses.
        Should return a dictionary with summary statistics.
        e.g., {"processed_assets": 100, "total_added_records": 5000}
        """
        pass

    async def process_with_semaphore(self, coro: Any) -> Any:
        """Applies concurrency control using the semaphore if it's enabled."""
        if not self.enable_semaphore:
            return await coro
        
        # 코루틴이 아닌 경우 그대로 반환
        if not asyncio.iscoroutine(coro):
            return coro
        
        # 현재 이벤트 루프 확인
        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            # 이벤트 루프가 없으면 semaphore 없이 실행
            logger.warning(f"[{self.collector_name}] No event loop available for semaphore, running without concurrency control")
            return await coro
        
        # Semaphore 지연 초기화 및 재사용 (Lazy Initialization)
        if self.semaphore is None:
            try:
                self.semaphore = asyncio.Semaphore(self.semaphore_limit)
                logger.info(f"[{self.collector_name}] Semaphore initialized with limit {self.semaphore_limit}")
            except Exception as e:
                 logger.warning(f"[{self.collector_name}] Failed to create semaphore: {e}, running without concurrency control")
                 return await coro

        try:
            async with self.semaphore:
                # 코루틴을 현재 루프에서 실행
                return await coro
        except Exception as e:
            # 예상치 못한 오류 발생 시 로깅하고 재발생
            logger.error(f"[{self.collector_name}] Unexpected error in process_with_semaphore: {e}")
            raise
