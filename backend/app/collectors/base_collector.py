"""
Base collector class providing common functionality for all data collectors.
"""
import logging
import asyncio
import json
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.config import GLOBAL_APP_CONFIGS
from ..models.system import SchedulerLog

logger = logging.getLogger(__name__)


class BaseCollector(ABC):
    """Base class for all data collectors"""
    
    def __init__(self, db: Session = None):
        self.db = db
        self.collector_name = self.__class__.__name__
        
        # 세마포어 기능 설정 기반 활성화
        self.enable_semaphore = GLOBAL_APP_CONFIGS.get("ENABLE_SEMAPHORE", True)
        if self.enable_semaphore:
            # Use a more balanced default and clamp to a sane range
            raw_limit = GLOBAL_APP_CONFIGS.get("SEMAPHORE_LIMIT", 8)
            try:
                semaphore_limit = int(raw_limit) if raw_limit is not None else 8
            except (TypeError, ValueError):
                semaphore_limit = 8
            semaphore_limit = max(1, min(16, semaphore_limit))
            self.semaphore = asyncio.Semaphore(semaphore_limit)
            logger.info(f"{self.collector_name}: Semaphore enabled with limit {semaphore_limit}")
        else:
            self.semaphore = None
            logger.info(f"{self.collector_name}: Semaphore disabled")
    
    async def collect(self) -> Dict[str, Any]:
        """Main collection method with error handling and logging"""
        start_time = datetime.now()
        logger.info(f"Starting {self.collector_name} collection")
        
        # Create scheduler log entry
        db = self.get_db_session()
        scheduler_log = SchedulerLog(
            job_name=f"{self.collector_name.lower()}_collection",
            start_time=start_time,
            status="running",
            current_task="Initializing collection",
            strategy_used="standard",
            checkpoint_data="{}"
        )
        db.add(scheduler_log)
        db.commit()
        
        # Store scheduler log ID for updates
        self.current_scheduler_log_id = scheduler_log.log_id
        
        try:
            result = await self._collect_data()
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            # Update scheduler log with success
            scheduler_log.end_time = end_time
            scheduler_log.duration_seconds = int(duration)
            scheduler_log.status = "completed"
            scheduler_log.current_task = "Collection completed"
            scheduler_log.assets_processed = result.get("processed_assets", 0)
            scheduler_log.data_points_added = result.get("total_added_records", 0)
            scheduler_log.checkpoint_data = json.dumps({
                "final_status": "success",
                "processed_assets": result.get("processed_assets", 0),
                "total_added_records": result.get("total_added_records", 0),
                "duration_seconds": duration,
                "collection_details": result.get("details", {})
            })
            db.commit()
            
            logger.info(f"{self.collector_name} collection completed in {duration:.2f}s")
            return {
                "success": True,
                "collector": self.collector_name,
                "duration": duration,
                "data": result
            }
            
        except Exception as e:
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            # Update scheduler log with error
            scheduler_log.end_time = end_time
            scheduler_log.duration_seconds = int(duration)
            scheduler_log.status = "failed"
            scheduler_log.current_task = "Collection failed"
            scheduler_log.error_message = f"Error: {str(e)}"
            scheduler_log.checkpoint_data = json.dumps({
                "final_status": "failed",
                "error_type": type(e).__name__,
                "error_message": str(e),
                "duration_seconds": duration,
                "last_checkpoint": getattr(self, 'last_checkpoint', 'unknown')
            })
            db.commit()
            
            logger.error(f"{self.collector_name} collection failed after {duration:.2f}s: {e}")
            
            return {
                "success": False,
                "collector": self.collector_name,
                "duration": duration,
                "error": str(e)
            }
    
    async def process_with_semaphore(self, coro):
        """세마포어가 활성화된 경우에만 동시성 제어 적용"""
        if self.enable_semaphore and self.semaphore:
            async with self.semaphore:
                return await coro
        else:
            return await coro
    
    @abstractmethod
    async def _collect_data(self) -> Dict[str, Any]:
        """Abstract method that must be implemented by subclasses"""
        pass
    
    def get_db_session(self) -> Session:
        """Get database session if not already provided"""
        if not self.db:
            self.db = next(get_db())
        return self.db
    
    async def safe_emit(self, event: str, data: Dict[str, Any]):
        """Safely emit websocket events"""
        try:
            from ..core.websocket import safe_emit
            await safe_emit(event, data)
        except Exception as e:
            logger.warning(f"Failed to emit {event}: {e}")
    
    def log_progress(self, message: str, level: str = "info"):
        """Log progress with consistent formatting"""
        log_message = f"[{self.collector_name}] {message}"
        if level == "info":
            logger.info(log_message)
        elif level == "warning":
            logger.warning(log_message)
        elif level == "error":
            logger.error(log_message)
        elif level == "debug":
            logger.debug(log_message)
    
    def update_scheduler_log(self, 
                           current_task: str = None, 
                           strategy_used: str = None,
                           checkpoint_data: Dict = None,
                           assets_processed: int = None,
                           data_points_added: int = None,
                           error_message: str = None):
        """스케줄러 로그를 상세하게 업데이트합니다."""
        if not hasattr(self, 'current_scheduler_log_id') or not self.current_scheduler_log_id:
            return
        
        try:
            db = self.get_db_session()
            scheduler_log = db.query(SchedulerLog).filter(
                SchedulerLog.log_id == self.current_scheduler_log_id
            ).first()
            
            if not scheduler_log:
                return
            
            if current_task:
                scheduler_log.current_task = current_task
                self.last_checkpoint = current_task
            
            if strategy_used:
                scheduler_log.strategy_used = strategy_used
            
            if checkpoint_data:
                scheduler_log.checkpoint_data = json.dumps(checkpoint_data)
            
            if assets_processed is not None:
                scheduler_log.assets_processed = assets_processed
            
            if data_points_added is not None:
                scheduler_log.data_points_added = data_points_added
            
            if error_message:
                scheduler_log.error_message = error_message
            
            db.commit()
            
        except Exception as e:
            logger.error(f"Error updating scheduler log: {e}")
    
    def log_task_progress(self, task_name: str, progress_info: Dict = None):
        """작업 진행 상황을 로그에 기록합니다."""
        checkpoint_data = {
            "current_task": task_name,
            "timestamp": datetime.now().isoformat(),
            "progress_info": progress_info or {}
        }
        
        self.update_scheduler_log(
            current_task=task_name,
            checkpoint_data=checkpoint_data
        )
        
        # 일반 로그에도 기록
        progress_msg = f"Task: {task_name}"
        if progress_info:
            progress_msg += f" - {json.dumps(progress_info)}"
        self.log_progress(progress_msg, "info")
    
    def log_api_call(self, api_name: str, endpoint: str, success: bool, details: Dict = None):
        """API 호출 결과를 로그에 기록합니다."""
        checkpoint_data = {
            "last_api_call": {
                "api_name": api_name,
                "endpoint": endpoint,
                "success": success,
                "timestamp": datetime.now().isoformat(),
                "details": details or {}
            }
        }
        
        self.update_scheduler_log(
            current_task=f"API Call: {api_name}",
            checkpoint_data=checkpoint_data
        )
        
        # 일반 로그에도 기록
        status = "SUCCESS" if success else "FAILED"
        self.log_progress(f"API {api_name} ({endpoint}): {status}", "info" if success else "warning")
    
    def log_error_with_context(self, error: Exception, context: str = None):
        """에러를 컨텍스트와 함께 로그에 기록합니다."""
        error_data = {
            "error_type": type(error).__name__,
            "error_message": str(error),
            "context": context or "unknown",
            "timestamp": datetime.now().isoformat(),
            "last_checkpoint": getattr(self, 'last_checkpoint', 'unknown')
        }
        
        self.update_scheduler_log(
            current_task=f"Error in {context or 'unknown context'}",
            error_message=f"{type(error).__name__}: {str(error)}",
            checkpoint_data=error_data
        )
        
        # 일반 로그에도 기록
        self.log_progress(f"Error in {context}: {str(error)}", "error")



