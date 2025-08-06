"""
Base collector class providing common functionality for all data collectors.
"""
import logging
import asyncio
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
    
    async def collect(self) -> Dict[str, Any]:
        """Main collection method with error handling and logging"""
        start_time = datetime.now()
        logger.info(f"Starting {self.collector_name} collection")
        
        # Create scheduler log entry
        db = self.get_db_session()
        scheduler_log = SchedulerLog(
            job_name=f"{self.collector_name.lower()}_collection",
            start_time=start_time,
            status="running"
        )
        db.add(scheduler_log)
        db.commit()
        
        try:
            result = await self._collect_data()
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            # Update scheduler log with success
            scheduler_log.end_time = end_time
            scheduler_log.duration_seconds = int(duration)
            scheduler_log.status = "completed"
            scheduler_log.assets_processed = result.get("processed_assets", 0)
            scheduler_log.data_points_added = result.get("total_added_records", 0)
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
            scheduler_log.error_message = str(e)
            db.commit()
            
            logger.error(f"{self.collector_name} collection failed after {duration:.2f}s: {e}")
            
            return {
                "success": False,
                "collector": self.collector_name,
                "duration": duration,
                "error": str(e)
            }
    
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



