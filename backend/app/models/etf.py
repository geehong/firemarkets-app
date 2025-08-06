# backend_temp/app/models/etf.py
from sqlalchemy import (BIGINT, DECIMAL, TIMESTAMP, Boolean, Column, Date,
                        DateTime, ForeignKey, Integer, String, Text, func)
from sqlalchemy.orm import relationship

from ..core.database import Base


class EtfInfo(Base):
    __tablename__ = "etf_info"
    etf_info_id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(
        Integer,
        ForeignKey("assets.asset_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    snapshot_date = Column(Date, nullable=False, index=True)
    net_assets = Column(DECIMAL(22, 0))
    net_expense_ratio = Column(DECIMAL(10, 4))
    portfolio_turnover = Column(DECIMAL(10, 4))
    dividend_yield = Column(DECIMAL(10, 4))
    inception_date = Column(Date)
    leveraged = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class EtfSectorExposure(Base):
    __tablename__ = "etf_sector_exposure"
    sector_exposure_id = Column(Integer, primary_key=True, index=True)
    etf_info_id = Column(
        Integer, ForeignKey("etf_info.etf_info_id", ondelete="CASCADE"), nullable=False
    )
    sector_name = Column(String(100), nullable=False)
    weight = Column(DECIMAL(10, 4), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class EtfHolding(Base):
    __tablename__ = "etf_holdings"
    holding_id = Column(Integer, primary_key=True, index=True)
    etf_info_id = Column(
        Integer, ForeignKey("etf_info.etf_info_id", ondelete="CASCADE"), nullable=False
    )
    holding_symbol = Column(String(50), nullable=False)
    description = Column(String(255))
    weight = Column(DECIMAL(10, 4), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())






