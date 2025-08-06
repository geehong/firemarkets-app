# backend_temp/app/models/onchain.py
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, JSON
from sqlalchemy.sql import func
from ..core.database import Base

class OnchainMetricsInfo(Base):
    __tablename__ = "onchain_metrics_info"
    
    metric_id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    category = Column(String(50), nullable=False)
    
    # 차트 표출 정보 (JSON 형태로 저장)
    interpretations = Column(JSON, nullable=True)
    chart_title = Column(String(200), nullable=True)
    loading_text = Column(String(100), nullable=True)
    
    # 상태 및 데이터 정보
    status = Column(String(20), nullable=False, default='active')
    data_count = Column(Integer, default=0)
    current_range = Column(String(100), nullable=True)
    last_update = Column(DateTime, nullable=True)
    is_enabled = Column(Boolean, default=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())






