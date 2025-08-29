# backend_temp/app/models/system.py
from sqlalchemy import (BIGINT, DECIMAL, TIMESTAMP, Boolean, Column, Date,
                        DateTime, ForeignKey, Integer, String, Text, func, JSON)
from sqlalchemy.orm import relationship

from ..core.database import Base


class AppConfiguration(Base):
    __tablename__ = "app_configurations"
    config_id = Column(Integer, primary_key=True, index=True)
    config_key = Column(String(100), unique=True, nullable=False, index=True)
    config_value = Column(Text, nullable=True)
    data_type = Column(String(20), nullable=False, default="string")
    description = Column(Text, nullable=True)
    is_sensitive = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    category = Column(String(50), default="general", index=True)
    created_at = Column(TIMESTAMP, default=func.now())
    updated_at = Column(TIMESTAMP, default=func.now(), onupdate=func.now())


class SchedulerLog(Base):
    __tablename__ = "scheduler_logs"
    log_id = Column(BIGINT, primary_key=True, autoincrement=True)
    job_name = Column(String(100), index=True)
    start_time = Column(TIMESTAMP, server_default=func.now(), index=True)
    end_time = Column(TIMESTAMP, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    status = Column(String(50), index=True, default="pending", nullable=False)
    current_task = Column(String(255), nullable=True)
    strategy_used = Column(String(100), nullable=True)
    checkpoint_data = Column(Text, nullable=True)  # JSON as text
    retry_count = Column(Integer, default=0)
    assets_processed = Column(Integer, nullable=True, default=0)
    data_points_added = Column(Integer, nullable=True, default=0)
    error_message = Column(Text, nullable=True)
    # 상세 로그 정보를 저장할 JSON 컬럼 추가
    details = Column(JSON, nullable=True)  # 구조화된 상세 정보
    created_at = Column(TIMESTAMP, server_default=func.now())


class ApiCallLog(Base):
    __tablename__ = "api_call_logs"
    log_id = Column(BIGINT, primary_key=True, index=True)
    api_name = Column(String(100), nullable=False, index=True)
    endpoint = Column(String(500), nullable=False)
    asset_ticker = Column(String(50), nullable=True, index=True)
    status_code = Column(Integer, nullable=False)
    response_time_ms = Column(Integer, nullable=False)
    success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())


class TechnicalIndicator(Base):
    __tablename__ = "technical_indicators"
    indicator_data_id = Column(BIGINT, primary_key=True, index=True)
    asset_id = Column(
        Integer,
        ForeignKey("assets.asset_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    data_interval = Column(String(10), nullable=False, default="1d")
    indicator_type = Column(String(50), nullable=False)
    indicator_period = Column(Integer)
    timestamp_utc = Column(DateTime, nullable=False, index=True)
    value = Column(DECIMAL(24, 10), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())


class EconomicIndicator(Base):
    __tablename__ = "economic_indicators"
    indicator_id = Column(Integer, primary_key=True, index=True)
    indicator_name = Column(String(100), nullable=False)
    indicator_code = Column(String(50), unique=True, nullable=False)
    timestamp = Column(Date, nullable=False)
    value = Column(DECIMAL(20, 10), nullable=False)
    unit = Column(String(20))
    description = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())



