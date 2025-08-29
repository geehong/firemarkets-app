"""
Real-time data models for storing current prices and market data.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Index, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class RealtimeQuote(Base):
    """실시간 가격 및 시장 데이터 저장 테이블"""
    __tablename__ = "realtime_quotes"
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(20), nullable=False, index=True, comment="자산 티커")
    asset_type = Column(String(20), nullable=False, index=True, comment="자산 유형 (stock, crypto, etf)")
    
    # 가격 데이터
    price = Column(Float, nullable=True, comment="현재 가격")
    change_percent_today = Column(Float, nullable=True, comment="오늘 변화율 (%)")
    change_amount_today = Column(Float, nullable=True, comment="오늘 변화액")
    
    # 시장 데이터
    market_cap = Column(Float, nullable=True, comment="시가총액")
    volume_today = Column(Float, nullable=True, comment="오늘 거래량")
    volume_24h = Column(Float, nullable=True, comment="24시간 거래량")
    
    # 52주 데이터
    high_52w = Column(Float, nullable=True, comment="52주 최고가")
    low_52w = Column(Float, nullable=True, comment="52주 최저가")
    change_52w_percent = Column(Float, nullable=True, comment="52주 변화율 (%)")
    
    # 추가 데이터
    pe_ratio = Column(Float, nullable=True, comment="P/E 비율")
    pb_ratio = Column(Float, nullable=True, comment="P/B 비율")
    dividend_yield = Column(Float, nullable=True, comment="배당 수익률")
    
    # 메타데이터
    data_source = Column(String(50), nullable=False, comment="데이터 소스 (twelvedata, binance, coingecko, yahoo)")
    currency = Column(String(10), default="USD", comment="통화")
    exchange = Column(String(50), nullable=True, comment="거래소")
    
    # 타임스탬프
    fetched_at = Column(DateTime(timezone=True), server_default=func.now(), comment="데이터 수집 시간")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="생성 시간")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), comment="수정 시간")
    
    # 인덱스
    __table_args__ = (
        Index('idx_ticker_asset_type', 'ticker', 'asset_type'),
        Index('idx_fetched_at', 'fetched_at'),
        Index('idx_data_source', 'data_source'),
        UniqueConstraint('ticker', 'asset_type', name='uq_ticker_asset_type'),
    )


class SparklineData(Base):
    """스파크라인 차트용 30일 가격 데이터 저장 테이블"""
    __tablename__ = "sparkline_data"
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(20), nullable=False, index=True, comment="자산 티커")
    asset_type = Column(String(20), nullable=False, index=True, comment="자산 유형")
    
    # 30일 가격 데이터 (JSON 형태로 저장)
    price_data = Column(Text, nullable=False, comment="30일 가격 데이터 (JSON 배열)")
    
    # 메타데이터
    data_source = Column(String(50), nullable=False, comment="데이터 소스")
    currency = Column(String(10), default="USD", comment="통화")
    
    # 타임스탬프
    fetched_at = Column(DateTime(timezone=True), server_default=func.now(), comment="데이터 수집 시간")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="생성 시간")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), comment="수정 시간")
    
    # 인덱스
    __table_args__ = (
        Index('idx_ticker_asset_type_sparkline', 'ticker', 'asset_type'),
        Index('idx_fetched_at_sparkline', 'fetched_at'),
        UniqueConstraint('ticker', 'asset_type', name='uq_ticker_asset_type_sparkline'),
    )







