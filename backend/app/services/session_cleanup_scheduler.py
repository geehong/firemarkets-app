"""
세션 정리 스케줄러
"""
import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.core.database import get_postgres_db
from app.services.session_service import session_service

logger = logging.getLogger(__name__)


class SessionCleanupScheduler:
    """세션 정리 스케줄러"""
    
    def __init__(self):
        self.cleanup_interval_hours = 1  # 1시간마다 정리
        self.is_running = False
    
    async def start(self):
        """스케줄러 시작"""
        if self.is_running:
            logger.warning("Session cleanup scheduler is already running")
            return
        
        self.is_running = True
        logger.info("Session cleanup scheduler started")
        
        while self.is_running:
            try:
                await self._cleanup_sessions()
                await asyncio.sleep(self.cleanup_interval_hours * 3600)  # 시간을 초로 변환
            except Exception as e:
                logger.error(f"Session cleanup scheduler error: {e}")
                await asyncio.sleep(300)  # 5분 후 재시도
    
    def stop(self):
        """스케줄러 중지"""
        self.is_running = False
        logger.info("Session cleanup scheduler stopped")
    
    async def _cleanup_sessions(self):
        """세션 정리 실행"""
        try:
            db = next(get_postgres_db())
            cleaned_count = session_service.cleanup_expired_sessions(db)
            
            if cleaned_count > 0:
                logger.info(f"Cleaned up {cleaned_count} expired sessions")
            else:
                logger.debug("No expired sessions to clean up")
                
        except Exception as e:
            logger.error(f"Failed to cleanup sessions: {e}")
        finally:
            if 'db' in locals():
                db.close()


# 전역 인스턴스
session_cleanup_scheduler = SessionCleanupScheduler()








