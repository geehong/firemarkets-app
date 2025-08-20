# backend_temp/app/models/crypto.py
from sqlalchemy import (BIGINT, DECIMAL, TIMESTAMP, Boolean, Column, Date,
                        DateTime, ForeignKey, Integer, String, Text, func, JSON)
from sqlalchemy.orm import relationship

from ..core.database import Base


class CryptoMetric(Base):
    __tablename__ = "crypto_metrics"
    metric_id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(
        Integer,
        ForeignKey("assets.asset_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    timestamp_utc = Column(Date, nullable=False, index=True)
    mvrv_z_score = Column(DECIMAL(18, 10))
    realized_price = Column(DECIMAL(24, 10))
    hashrate = Column(DECIMAL(30, 10))
    difficulty = Column(DECIMAL(30, 10))
    miner_reserves = Column(DECIMAL(24, 10))
    etf_btc_total = Column(DECIMAL(24, 10))
    sopr = Column(DECIMAL(18, 10))
    nupl = Column(DECIMAL(18, 10))
    open_interest_futures = Column(JSON)  # JSON 형식으로 저장 (거래소별 데이터 포함)
    realized_cap = Column(DECIMAL(30, 2))
    cdd_90dma = Column(DECIMAL(18, 10))
    true_market_mean = Column(DECIMAL(24, 10))
    nrpl_btc = Column(DECIMAL(24, 10))
    aviv = Column(DECIMAL(18, 10))
    thermo_cap = Column(DECIMAL(30, 2))
    hodl_waves_supply = Column(DECIMAL(18, 10))
    etf_btc_flow = Column(DECIMAL(24, 10))
    
    # HODL Waves Supply - 연령대별 컬럼들
    hodl_age_0d_1d = Column(DECIMAL(18, 10))
    hodl_age_1d_1w = Column(DECIMAL(18, 10))
    hodl_age_1w_1m = Column(DECIMAL(18, 10))
    hodl_age_1m_3m = Column(DECIMAL(18, 10))
    hodl_age_3m_6m = Column(DECIMAL(18, 10))
    hodl_age_6m_1y = Column(DECIMAL(18, 10))
    hodl_age_1y_2y = Column(DECIMAL(18, 10))
    hodl_age_2y_3y = Column(DECIMAL(18, 10))
    hodl_age_3y_4y = Column(DECIMAL(18, 10))
    hodl_age_4y_5y = Column(DECIMAL(18, 10))
    hodl_age_5y_7y = Column(DECIMAL(18, 10))
    hodl_age_7y_10y = Column(DECIMAL(18, 10))
    hodl_age_10y = Column(DECIMAL(18, 10))
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class CryptoData(Base):
    __tablename__ = "crypto_data"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.asset_id"), nullable=False, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    
    # Market cap and supply data
    market_cap = Column(DECIMAL(30, 2), nullable=True)
    circulating_supply = Column(DECIMAL(30, 10), nullable=True)
    total_supply = Column(DECIMAL(30, 10), nullable=True)
    max_supply = Column(DECIMAL(30, 10), nullable=True)
    
    # Price and volume data
    current_price = Column(DECIMAL(24, 10), nullable=True)
    volume_24h = Column(DECIMAL(30, 10), nullable=True)
    
    # Price change percentages
    percent_change_1h = Column(DECIMAL(10, 4), nullable=True)
    percent_change_24h = Column(DECIMAL(10, 4), nullable=True)
    percent_change_7d = Column(DECIMAL(10, 4), nullable=True)
    percent_change_30d = Column(DECIMAL(10, 4), nullable=True)
    
    # Metadata
    cmc_rank = Column(Integer, nullable=True)
    category = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    logo_url = Column(String(500), nullable=True)
    website_url = Column(String(500), nullable=True)
    
    # Additional fields for CoinMarketCap API
    price = Column(DECIMAL(24, 10), nullable=True)  # Alternative price field
    slug = Column(String(100), nullable=True)
    date_added = Column(Date, nullable=True)
    platform = Column(String(100), nullable=True)
    explorer = Column(Text, nullable=True)  # JSON string
    source_code = Column(Text, nullable=True)  # JSON string
    
    # Tags and status
    tags = Column(Text, nullable=True)  # JSON string
    is_active = Column(Boolean, default=True)
    last_updated = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    created_at = Column(TIMESTAMP, server_default=func.now())

    def __repr__(self):
        return f"<CryptoData(id={self.id}, symbol='{self.symbol}', name='{self.name}')>"



