# backend_temp/app/models/asset.py
from sqlalchemy import (BIGINT, DECIMAL, TIMESTAMP, Boolean, Column, Date,
                        DateTime, ForeignKey, Integer, String, Text, func, JSON)
from sqlalchemy.orm import relationship

from ..core.database import Base


class AssetType(Base):
    __tablename__ = "asset_types"
    asset_type_id = Column(Integer, primary_key=True, index=True)
    type_name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    assets = relationship("Asset", back_populates="asset_type")


class Asset(Base):
    __tablename__ = "assets"
    asset_id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(50), unique=True, nullable=False, index=True)
    asset_type_id = Column(
        Integer, ForeignKey("asset_types.asset_type_id"), nullable=False
    )
    name = Column(String(255), nullable=False)
    exchange = Column(String(100))
    currency = Column(String(10))
    is_active = Column(Boolean, default=True)
    description = Column(Text)
    collection_settings = Column(JSON)  # 수집 설정
    last_collections = Column(JSON)     # 마지막 수집 시간
    data_source = Column(String(50), default="fmp")
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    asset_type = relationship("AssetType", back_populates="assets")

    # JSON 설정에 대한 편의 메서드들
    def get_setting(self, key: str, default=None):
        """JSON 설정에서 값을 가져옵니다."""
        if not self.collection_settings:
            return default
        return self.collection_settings.get(key, default)
    
    def set_setting(self, key: str, value):
        """JSON 설정에 값을 설정합니다."""
        if not self.collection_settings:
            self.collection_settings = {}
        self.collection_settings[key] = value
    
    def get_last_collection(self, collection_type: str):
        """마지막 수집 시간을 가져옵니다."""
        if not self.last_collections:
            return None
        return self.last_collections.get(collection_type)
    
    def set_last_collection(self, collection_type: str, timestamp):
        """마지막 수집 시간을 설정합니다."""
        if not self.last_collections:
            self.last_collections = {}
        self.last_collections[collection_type] = timestamp
    
    # 편의 메서드들
    def get_collect_price(self):
        return self.get_setting('collect_price', True)
    
    def get_collect_company_info(self):
        return self.get_setting('collect_company_info', True)
    
    def get_collect_financials(self):
        return self.get_setting('collect_financials', True)
    
    def get_collect_estimates(self):
        return self.get_setting('collect_estimates', True)
    
    def get_collect_onchain(self):
        return self.get_setting('collect_onchain', False)
    
    def get_collect_technical_indicators(self):
        return self.get_setting('collect_technical_indicators', False)


class OHLCVData(Base):
    __tablename__ = "ohlcv_data"
    ohlcv_id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(
        Integer,
        ForeignKey("assets.asset_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    timestamp_utc = Column(DateTime, nullable=False, index=True)
    data_interval = Column(String(10), default="1d")
    open_price = Column(DECIMAL(24, 10), nullable=False)
    high_price = Column(DECIMAL(24, 10), nullable=False)
    low_price = Column(DECIMAL(24, 10), nullable=False)
    close_price = Column(DECIMAL(24, 10), nullable=False)
    volume = Column(DECIMAL(30, 10), nullable=False)
    change_percent = Column(DECIMAL(10, 4))  # 일일 변동률
    created_at = Column(TIMESTAMP, server_default=func.now())


class StockProfile(Base):
    __tablename__ = "stock_profiles"
    profile_id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(
        Integer, ForeignKey("assets.asset_id"), nullable=False, unique=True
    )
    company_name = Column(String(255), nullable=False)
    description = Column(Text)
    sector = Column(String(100))
    industry = Column(String(100))
    country = Column(String(50))
    city = Column(String(100))
    address = Column(String(255))
    phone = Column(String(50))
    website = Column(String(255))
    ceo = Column(String(100))
    employees_count = Column(Integer)
    ipo_date = Column(Date)
    logo_image_url = Column(String(255))
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class StockFinancial(Base):
    __tablename__ = "stock_financials"
    financial_id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.asset_id"), nullable=False)
    snapshot_date = Column(Date, nullable=False)
    currency = Column(String(10))
    market_cap = Column(BIGINT)
    ebitda = Column(BIGINT)
    shares_outstanding = Column(BIGINT)
    pe_ratio = Column(DECIMAL(10, 4))
    peg_ratio = Column(DECIMAL(10, 4))
    beta = Column(DECIMAL(10, 4))
    eps = Column(DECIMAL(10, 4))
    dividend_yield = Column(DECIMAL(10, 4))
    dividend_per_share = Column(DECIMAL(10, 4))
    profit_margin_ttm = Column(DECIMAL(10, 4))
    return_on_equity_ttm = Column(DECIMAL(10, 4))
    revenue_ttm = Column(BIGINT)
    price_to_book_ratio = Column(DECIMAL(10, 4))
    _52_week_high = Column(DECIMAL(18, 4), name="_52_week_high")
    _52_week_low = Column(DECIMAL(18, 4), name="_52_week_low")
    _50_day_moving_avg = Column(DECIMAL(18, 4), name="_50_day_moving_avg")
    _200_day_moving_avg = Column(DECIMAL(18, 4), name="_200_day_moving_avg")
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class StockAnalystEstimate(Base):
    __tablename__ = "stock_analyst_estimates"
    estimate_id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.asset_id"), nullable=False)
    fiscal_date = Column(Date, nullable=False)
    revenue_avg = Column(BIGINT)
    revenue_low = Column(BIGINT)
    revenue_high = Column(BIGINT)
    revenue_analysts_count = Column(Integer)
    eps_avg = Column(DECIMAL(10, 4))
    eps_low = Column(DECIMAL(10, 4))
    eps_high = Column(DECIMAL(10, 4))
    eps_analysts_count = Column(Integer)
    ebitda_avg = Column(BIGINT)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class IndexInfo(Base):
    __tablename__ = "index_infos"
    index_info_id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.asset_id"), nullable=False)
    snapshot_date = Column(Date, nullable=False)
    price = Column(DECIMAL(20, 4))
    change_percentage = Column(DECIMAL(10, 4))
    volume = Column(BIGINT)
    day_low = Column(DECIMAL(20, 4))
    day_high = Column(DECIMAL(20, 4))
    year_low = Column(DECIMAL(20, 4))
    year_high = Column(DECIMAL(20, 4))
    price_avg_50 = Column(DECIMAL(20, 4))
    price_avg_200 = Column(DECIMAL(20, 4))
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())




