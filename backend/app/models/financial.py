"""
Financial statements data models for SEC EDGAR data.
"""
from sqlalchemy import (
    BigInteger, Column, DateTime, Float, ForeignKey, Integer, 
    String, Text, TIMESTAMP, func, JSON, Boolean
)
from sqlalchemy.orm import relationship
from ..core.database import Base


class FinancialStatement(Base):
    """Model for storing financial statements data from SEC EDGAR"""
    __tablename__ = "financial_statements"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.asset_id"), nullable=False, index=True)
    
    # Statement metadata
    statement_type = Column(String(50), nullable=False, index=True)  # balance-sheet, income-statement, cash-flow
    period = Column(String(20), nullable=False, index=True)  # annual, quarterly
    concept = Column(String(100), nullable=False, index=True)  # XBRL concept name (e.g., Assets, Revenues)
    
    # Financial data
    value = Column(Float, nullable=True)  # The actual financial value
    unit = Column(String(10), default="USD")  # Currency unit
    
    # Dates
    end_date = Column(DateTime, nullable=True, index=True)  # Period end date
    start_date = Column(DateTime, nullable=True)  # Period start date
    filed_date = Column(DateTime, nullable=True)  # SEC filing date
    
    # SEC filing information
    form_type = Column(String(20))  # 10-K, 10-Q, etc.
    frame = Column(String(50))  # SEC frame identifier (e.g., CY2023Q1)
    
    # Data source and metadata
    data_source = Column(String(50), default="SEC EDGAR")
    raw_data = Column(JSON)  # Store original EDGAR response data
    
    # Timestamps
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    asset = relationship("Asset", back_populates="financial_statements")


class FinancialMetrics(Base):
    """Model for storing calculated financial metrics and ratios"""
    __tablename__ = "financial_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.asset_id"), nullable=False, index=True)
    
    # Metric information
    metric_name = Column(String(100), nullable=False, index=True)  # e.g., "debt_to_equity_ratio"
    metric_value = Column(Float, nullable=False)
    metric_unit = Column(String(20))  # ratio, percentage, etc.
    
    # Calculation period
    period_end_date = Column(DateTime, nullable=False, index=True)
    period_type = Column(String(20), nullable=False)  # annual, quarterly
    
    # Calculation metadata
    calculation_method = Column(String(100))  # How the metric was calculated
    data_sources = Column(JSON)  # Which financial statements were used
    
    # Timestamps
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    asset = relationship("Asset", back_populates="financial_metrics")


class CompanyFinancials(Base):
    """Model for storing aggregated company financial data"""
    __tablename__ = "company_financials"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.asset_id"), nullable=False, index=True)
    
    # Financial data (latest available)
    revenue_ttm = Column(Float, nullable=True)  # Trailing Twelve Months revenue
    net_income_ttm = Column(Float, nullable=True)
    total_assets = Column(Float, nullable=True)
    total_liabilities = Column(Float, nullable=True)
    shareholders_equity = Column(Float, nullable=True)
    
    # Key ratios
    debt_to_equity_ratio = Column(Float, nullable=True)
    return_on_equity = Column(Float, nullable=True)
    return_on_assets = Column(Float, nullable=True)
    profit_margin = Column(Float, nullable=True)
    
    # Data freshness
    last_updated = Column(DateTime, nullable=True)
    data_source = Column(String(50), default="SEC EDGAR")
    
    # Timestamps
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    asset = relationship("Asset", back_populates="company_financials")


