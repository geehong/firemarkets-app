"""
Pydantic schemas for financial statements data.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class FinancialStatementBase(BaseModel):
    """Base schema for financial statement data"""
    statement_type: str = Field(..., description="Type of financial statement")
    period: str = Field(..., description="Period type (annual/quarterly)")
    concept: str = Field(..., description="XBRL concept name")
    value: Optional[float] = Field(None, description="Financial value")
    unit: str = Field("USD", description="Currency unit")
    end_date: Optional[datetime] = Field(None, description="Period end date")
    start_date: Optional[datetime] = Field(None, description="Period start date")
    filed_date: Optional[datetime] = Field(None, description="SEC filing date")
    form_type: Optional[str] = Field(None, description="SEC form type")
    frame: Optional[str] = Field(None, description="SEC frame identifier")


class FinancialStatementCreate(FinancialStatementBase):
    """Schema for creating financial statement records"""
    asset_id: int = Field(..., description="Asset ID")
    data_source: str = Field("SEC EDGAR", description="Data source")
    raw_data: Optional[Dict[str, Any]] = Field(None, description="Original EDGAR data")


class FinancialStatementResponse(FinancialStatementBase):
    """Schema for financial statement API responses"""
    id: int
    asset_id: int
    data_source: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class FinancialMetricsBase(BaseModel):
    """Base schema for financial metrics"""
    metric_name: str = Field(..., description="Name of the financial metric")
    metric_value: float = Field(..., description="Metric value")
    metric_unit: Optional[str] = Field(None, description="Unit of measurement")
    period_end_date: datetime = Field(..., description="Period end date")
    period_type: str = Field(..., description="Period type (annual/quarterly)")
    calculation_method: Optional[str] = Field(None, description="Calculation method")
    data_sources: Optional[Dict[str, Any]] = Field(None, description="Data sources used")


class FinancialMetricsCreate(FinancialMetricsBase):
    """Schema for creating financial metrics records"""
    asset_id: int = Field(..., description="Asset ID")


class FinancialMetricsResponse(FinancialMetricsBase):
    """Schema for financial metrics API responses"""
    id: int
    asset_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CompanyFinancialsBase(BaseModel):
    """Base schema for company financial data"""
    revenue_ttm: Optional[float] = Field(None, description="Trailing twelve months revenue")
    net_income_ttm: Optional[float] = Field(None, description="Trailing twelve months net income")
    total_assets: Optional[float] = Field(None, description="Total assets")
    total_liabilities: Optional[float] = Field(None, description="Total liabilities")
    shareholders_equity: Optional[float] = Field(None, description="Shareholders equity")
    debt_to_equity_ratio: Optional[float] = Field(None, description="Debt to equity ratio")
    return_on_equity: Optional[float] = Field(None, description="Return on equity")
    return_on_assets: Optional[float] = Field(None, description="Return on assets")
    profit_margin: Optional[float] = Field(None, description="Profit margin")
    last_updated: Optional[datetime] = Field(None, description="Last update timestamp")


class CompanyFinancialsCreate(CompanyFinancialsBase):
    """Schema for creating company financials records"""
    asset_id: int = Field(..., description="Asset ID")
    data_source: str = Field("SEC EDGAR", description="Data source")


class CompanyFinancialsResponse(CompanyFinancialsBase):
    """Schema for company financials API responses"""
    id: int
    asset_id: int
    data_source: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class FinancialDataSummary(BaseModel):
    """Summary schema for financial data overview"""
    asset_id: int
    ticker: str
    latest_revenue: Optional[float] = None
    latest_net_income: Optional[float] = None
    latest_total_assets: Optional[float] = None
    debt_to_equity_ratio: Optional[float] = None
    return_on_equity: Optional[float] = None
    last_updated: Optional[datetime] = None
    data_source: str = "SEC EDGAR"


class FinancialStatementRequest(BaseModel):
    """Schema for financial statement API requests"""
    ticker: str = Field(..., description="Stock ticker symbol")
    statement_type: str = Field(..., description="Statement type (balance-sheet, income-statement, cash-flow)")
    period: str = Field("annual", description="Period type (annual/quarterly)")
    limit: int = Field(4, ge=1, le=10, description="Number of periods to fetch")


class FinancialStatementAPIResponse(BaseModel):
    """Schema for financial statement API responses"""
    ticker: str
    statement_type: str
    period: str
    data: List[Dict[str, Any]]
    source: str = "SEC EDGAR"
    total_records: int






