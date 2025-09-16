"""
WebSocket 로그 데이터베이스 저장 서비스
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, func
from app.core.database import get_session_local
from app.models.websocket_log import WebSocketOrchestratorLog

logger = logging.getLogger(__name__)

class WebSocketLogService:
    """WebSocket 로그 데이터베이스 저장 서비스"""
    
    def __init__(self):
        self.log_queue = asyncio.Queue()
        self.batch_size = 100
        self.batch_timeout = 30  # 30초마다 배치 저장
    
    async def log_event(
        self,
        log_level: str,
        event_type: str,
        message: str,
        consumer_name: Optional[str] = None,
        ticker_count: Optional[int] = None,
        consumer_count: Optional[int] = None,
        error_type: Optional[str] = None,
        log_metadata: Optional[Dict[str, Any]] = None
    ):
        """로그 이벤트를 큐에 추가"""
        logger.debug(f"Creating log entry: event_type={event_type}, consumer_name={consumer_name}, log_level={log_level}")
        
        log_entry = {
            'timestamp_utc': datetime.utcnow(),
            'log_level': log_level,
            'consumer_name': consumer_name,
            'event_type': event_type,
            'message': message,
            'ticker_count': ticker_count,
            'consumer_count': consumer_count,
            'error_type': error_type,
            'log_metadata': log_metadata
        }
        
        logger.debug(f"Log entry created: {log_entry}")
        logger.debug(f"Current queue size: {self.log_queue.qsize()}")
        
        try:
            await self.log_queue.put(log_entry)
            logger.debug(f"Successfully added log entry to queue: {event_type}")
        except Exception as e:
            logger.error(f"Failed to add log entry to queue: {e}")
            logger.error(f"Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            logger.error(f"Log entry that failed: {log_entry}")
    
    async def start_batch_processor(self):
        """배치 로그 처리기 시작"""
        logger.info("Starting WebSocket log batch processor")
        logger.info(f"Batch processor settings: batch_size={self.batch_size}, batch_timeout={self.batch_timeout}s")
        
        while True:
            try:
                # 배치 수집
                batch = []
                start_time = datetime.utcnow()
                logger.debug(f"Starting batch collection at {start_time}")
                
                while len(batch) < self.batch_size:
                    try:
                        # 타임아웃으로 대기
                        remaining_time = self.batch_timeout - (datetime.utcnow() - start_time).total_seconds()
                        if remaining_time <= 0:
                            logger.debug(f"Batch timeout reached, collected {len(batch)} entries")
                            break
                        
                        logger.debug(f"Waiting for log entry (remaining time: {remaining_time:.2f}s)")
                        log_entry = await asyncio.wait_for(
                            self.log_queue.get(),
                            timeout=remaining_time
                        )
                        batch.append(log_entry)
                        logger.debug(f"Added log entry to batch: {log_entry.get('event_type', 'unknown')} (batch size: {len(batch)})")
                        
                    except asyncio.TimeoutError:
                        logger.debug(f"Timeout waiting for log entry, batch size: {len(batch)}")
                        break
                
                # 배치가 있으면 저장
                if batch:
                    logger.info(f"Processing batch of {len(batch)} log entries")
                    self._save_batch(batch)
                    logger.info(f"Successfully saved {len(batch)} log entries to database")
                else:
                    logger.debug("No log entries to process in this batch")
                
            except Exception as e:
                logger.error(f"Error in log batch processor: {e}")
                logger.error(f"Exception type: {type(e).__name__}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                await asyncio.sleep(5)  # 오류 시 5초 대기
    
    def _save_batch(self, batch: list):
        """배치 로그를 데이터베이스에 저장"""
        logger.debug(f"Starting to save batch of {len(batch)} log entries to database")
        
        try:
            logger.debug("Getting session local")
            session_local = get_session_local()
            logger.debug("Session local obtained successfully")
            
            with session_local() as session:
                logger.debug("Database session created successfully")
                log_entries = []
                
                for i, entry in enumerate(batch):
                    logger.debug(f"Processing log entry {i+1}/{len(batch)}: {entry.get('event_type', 'unknown')}")
                    
                    log_entry = WebSocketOrchestratorLog(
                        timestamp_utc=entry['timestamp_utc'],
                        log_level=entry['log_level'],
                        consumer_name=entry['consumer_name'],
                        event_type=entry['event_type'],
                        message=entry['message'],
                        ticker_count=entry['ticker_count'],
                        consumer_count=entry['consumer_count'],
                        error_type=entry['error_type'],
                        log_metadata=entry['log_metadata']
                    )
                    log_entries.append(log_entry)
                    logger.debug(f"Created WebSocketOrchestratorLog object for entry {i+1}")
                
                logger.debug(f"Adding {len(log_entries)} log entries to session")
                session.add_all(log_entries)
                
                logger.debug("Committing transaction to database")
                session.commit()
                logger.info(f"Successfully committed {len(log_entries)} log entries to database")
                
        except Exception as e:
            logger.error(f"Failed to save log batch to database: {e}")
            logger.error(f"Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            logger.error(f"Batch size: {len(batch)}")
            if batch:
                logger.error(f"First entry sample: {batch[0]}")
    
    def get_recent_logs(
        self,
        limit: int = 100,
        consumer_name: Optional[str] = None,
        event_type: Optional[str] = None,
        log_level: Optional[str] = None
    ) -> list:
        """최근 로그 조회"""
        try:
            session_local = get_session_local()
            with session_local() as session:
                query = select(WebSocketOrchestratorLog)
                
                if consumer_name:
                    query = query.where(WebSocketOrchestratorLog.consumer_name == consumer_name)
                if event_type:
                    query = query.where(WebSocketOrchestratorLog.event_type == event_type)
                if log_level:
                    query = query.where(WebSocketOrchestratorLog.log_level == log_level)
                
                query = query.order_by(desc(WebSocketOrchestratorLog.timestamp_utc)).limit(limit)
                
                result = session.execute(query)
                logs = result.scalars().all()
                
                return [log.to_dict() for log in logs]
                
        except Exception as e:
            logger.error(f"Failed to get recent logs: {e}")
            return []
    
    def get_consumer_stats(self, hours: int = 24) -> Dict[str, Any]:
        """Consumer 통계 조회"""
        try:
            session_local = get_session_local()
            with session_local() as session:
                # 최근 N시간 동안의 로그 통계
                cutoff_time = datetime.utcnow() - timedelta(hours=hours)
                
                # Consumer별 이벤트 통계
                query = select(
                    WebSocketOrchestratorLog.consumer_name,
                    WebSocketOrchestratorLog.event_type,
                    func.count(WebSocketOrchestratorLog.id).label('count')
                ).where(
                    WebSocketOrchestratorLog.timestamp_utc >= cutoff_time
                ).group_by(
                    WebSocketOrchestratorLog.consumer_name,
                    WebSocketOrchestratorLog.event_type
                )
                
                result = session.execute(query)
                stats = result.fetchall()
                
                # 통계 데이터 정리
                consumer_stats = {}
                for stat in stats:
                    consumer = stat.consumer_name or 'orchestrator'
                    if consumer not in consumer_stats:
                        consumer_stats[consumer] = {}
                    consumer_stats[consumer][stat.event_type] = stat.count
                
                return consumer_stats
                
        except Exception as e:
            logger.error(f"Failed to get consumer stats: {e}")
            return {}

# 전역 로그 서비스 인스턴스
websocket_log_service = WebSocketLogService()
