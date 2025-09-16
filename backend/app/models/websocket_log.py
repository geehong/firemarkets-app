"""
WebSocket Orchestrator 로그 모델
"""
from sqlalchemy import Column, BigInteger, String, Text, Integer, DateTime, JSON, Enum
from sqlalchemy.sql import func
from app.core.database import Base

class WebSocketOrchestratorLog(Base):
    """WebSocket Orchestrator 로그 모델"""
    
    __tablename__ = "websocket_orchestrator_logs"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    timestamp_utc = Column(DateTime, default=func.now(), nullable=False)
    log_level = Column(Enum('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'), nullable=False)
    consumer_name = Column(String(50), nullable=True)
    event_type = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    ticker_count = Column(Integer, nullable=True)
    consumer_count = Column(Integer, nullable=True)
    error_type = Column(String(100), nullable=True)
    log_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<WebSocketOrchestratorLog(id={self.id}, consumer={self.consumer_name}, event={self.event_type})>"
    
    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            'id': self.id,
            'timestamp_utc': self.timestamp_utc.isoformat() if self.timestamp_utc else None,
            'log_level': self.log_level,
            'consumer_name': self.consumer_name,
            'event_type': self.event_type,
            'message': self.message,
            'ticker_count': self.ticker_count,
            'consumer_count': self.consumer_count,
            'error_type': self.error_type,
            'log_metadata': self.log_metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
