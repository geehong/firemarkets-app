# backend/app/models/world_assets.py
from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, Text, Index, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class WorldAssetsRanking(Base):
    __tablename__ = 'world_assets_ranking'
    
    id = Column(Integer, primary_key=True)
    rank = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    ticker = Column(String(50))
    market_cap_usd = Column(Numeric(20, 2))
    price_usd = Column(Numeric(10, 2))
    daily_change_percent = Column(Numeric(5, 2))
    country = Column(String(100))
    asset_type_id = Column(Integer, ForeignKey('asset_types.asset_type_id'))
    asset_id = Column(Integer, ForeignKey('assets.asset_id'))
    ranking_date = Column(Date, nullable=False, default=func.current_date())
    data_source = Column(String(100))
    last_updated = Column(DateTime, default=func.now(), onupdate=func.now())

    # 관계 설정
    asset_type = relationship("AssetType")
    asset = relationship("Asset")

    # 시가총액 추이 분석을 위한 인덱스
    __table_args__ = (
        # 날짜별 조회 최적화
        Index('idx_ranking_date', 'ranking_date'),
        # 티커별 시가총액 추이 조회 최적화
        Index('idx_ticker_date', 'ticker', 'ranking_date'),
        # 국가별 시가총액 추이 조회 최적화
        Index('idx_country_date', 'country', 'ranking_date'),
        # 자산 타입별 시가총액 추이 조회 최적화
        Index('idx_asset_type_date', 'asset_type_id', 'ranking_date'),
        # 특정 날짜의 순위 조회 최적화
        Index('idx_date_rank', 'ranking_date', 'rank'),
        # 시가총액 범위 조회 최적화
        Index('idx_market_cap_date', 'market_cap_usd', 'ranking_date'),
        # asset_id별 조회 최적화
        Index('idx_asset_id_date', 'asset_id', 'ranking_date'),
    )

    def __repr__(self):
        return f"<WorldAssetsRanking(id={self.id}, name='{self.name}', rank={self.rank})>"


class BondMarketData(Base):
    __tablename__ = 'bond_market_data'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)
    asset_type_id = Column(Integer, ForeignKey('asset_types.asset_type_id'), default=6)
    market_size_usd = Column(Numeric(20, 2))
    quarter = Column(String(10))
    data_source = Column(String(100), default='BIS')
    collection_date = Column(Date, nullable=False, default=func.current_date())
    last_updated = Column(DateTime, default=func.now(), onupdate=func.now())

    # 관계 설정
    asset_type = relationship("AssetType")

    def __repr__(self):
        return f"<BondMarketData(id={self.id}, name='{self.name}', market_size={self.market_size_usd})>"


class ScrapingLogs(Base):
    __tablename__ = 'scraping_logs'
    
    id = Column(Integer, primary_key=True)
    source = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False)  # 'success', 'failed', 'partial'
    records_processed = Column(Integer, default=0)
    records_successful = Column(Integer, default=0)
    error_message = Column(Text)
    execution_time_seconds = Column(Numeric(10, 2))
    started_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime)

    def __repr__(self):
        return f"<ScrapingLogs(id={self.id}, source='{self.source}', status='{self.status}')>" 