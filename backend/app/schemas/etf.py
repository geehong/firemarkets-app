"""
ETF-related Pydantic schemas.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from decimal import Decimal
from pydantic import BaseModel, Field


class ETFBase(BaseModel):
    """Base ETF model"""
    ticker: str = Field(..., description="ETF ticker symbol")
    name: str = Field(..., description="ETF name")
    issuer: Optional[str] = Field(None, description="ETF issuer")
    asset_class: Optional[str] = Field(None, description="Asset class")
    category: Optional[str] = Field(None, description="ETF category")
    expense_ratio: Optional[Decimal] = Field(None, description="Expense ratio")
    aum: Optional[Decimal] = Field(None, description="Assets under management")
    inception_date: Optional[datetime] = Field(None, description="Inception date")
    description: Optional[str] = Field(None, description="ETF description")
    is_active: bool = Field(default=True, description="Whether the ETF is active")


class ETFCreate(ETFBase):
    """ETF creation model"""
    pass


class ETFUpdate(BaseModel):
    """ETF update model"""
    name: Optional[str] = Field(None, description="ETF name")
    issuer: Optional[str] = Field(None, description="ETF issuer")
    asset_class: Optional[str] = Field(None, description="Asset class")
    category: Optional[str] = Field(None, description="ETF category")
    expense_ratio: Optional[Decimal] = Field(None, description="Expense ratio")
    aum: Optional[Decimal] = Field(None, description="Assets under management")
    inception_date: Optional[datetime] = Field(None, description="Inception date")
    description: Optional[str] = Field(None, description="ETF description")
    is_active: Optional[bool] = Field(None, description="Whether the ETF is active")


class ETFResponse(ETFBase):
    """ETF response model"""
    etf_id: int = Field(..., description="Unique ETF ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    class Config:
        from_attributes = True


class ETFListResponse(BaseModel):
    """ETF list response model"""
    etfs: List[ETFResponse] = Field(..., description="List of ETFs")
    total: int = Field(..., description="Total number of ETFs")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Number of ETFs per page")
    pages: int = Field(..., description="Total number of pages")


class ETFHoldings(BaseModel):
    """ETF holdings model"""
    etf_id: int = Field(..., description="ETF ID")
    ticker: str = Field(..., description="ETF ticker")
    holdings: List[Dict[str, Any]] = Field(..., description="Holdings data")
    top_holdings: List[Dict[str, Any]] = Field(default=[], description="Top holdings")
    sector_allocation: Dict[str, Decimal] = Field(default={}, description="Sector allocation")
    country_allocation: Dict[str, Decimal] = Field(default={}, description="Country allocation")
    updated_at: datetime = Field(..., description="Last update timestamp")


class ETFPerformance(BaseModel):
    """ETF performance model"""
    etf_id: int = Field(..., description="ETF ID")
    ticker: str = Field(..., description="ETF ticker")
    price: Optional[Decimal] = Field(None, description="Current price")
    price_change: Optional[Decimal] = Field(None, description="Price change")
    price_change_percent: Optional[Decimal] = Field(None, description="Price change percentage")
    volume: Optional[Decimal] = Field(None, description="Trading volume")
    market_cap: Optional[Decimal] = Field(None, description="Market capitalization")
    pe_ratio: Optional[Decimal] = Field(None, description="Price-to-Earnings ratio")
    pb_ratio: Optional[Decimal] = Field(None, description="Price-to-Book ratio")
    dividend_yield: Optional[Decimal] = Field(None, description="Dividend yield")
    beta: Optional[Decimal] = Field(None, description="Beta coefficient")
    sharpe_ratio: Optional[Decimal] = Field(None, description="Sharpe ratio")
    tracking_error: Optional[Decimal] = Field(None, description="Tracking error")
    updated_at: datetime = Field(..., description="Last update timestamp")


class ETFScreener(BaseModel):
    """ETF screener model"""
    asset_class: Optional[str] = Field(None, description="Asset class filter")
    category: Optional[str] = Field(None, description="Category filter")
    expense_ratio_min: Optional[Decimal] = Field(None, description="Minimum expense ratio")
    expense_ratio_max: Optional[Decimal] = Field(None, description="Maximum expense ratio")
    aum_min: Optional[Decimal] = Field(None, description="Minimum AUM")
    aum_max: Optional[Decimal] = Field(None, description="Maximum AUM")
    dividend_yield_min: Optional[Decimal] = Field(None, description="Minimum dividend yield")
    dividend_yield_max: Optional[Decimal] = Field(None, description="Maximum dividend yield")
    beta_min: Optional[Decimal] = Field(None, description="Minimum beta")
    beta_max: Optional[Decimal] = Field(None, description="Maximum beta")
    sort_by: Optional[str] = Field(None, description="Sort field")
    sort_order: str = Field(default="desc", description="Sort order")
    page: int = Field(default=1, description="Page number")
    size: int = Field(default=20, description="Page size")






