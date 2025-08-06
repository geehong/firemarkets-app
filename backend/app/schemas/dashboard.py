"""
Dashboard-related Pydantic schemas.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from decimal import Decimal
from pydantic import BaseModel, Field


class DashboardMetrics(BaseModel):
    """Dashboard metrics model"""
    total_assets: int = Field(..., description="Total number of assets")
    total_cryptocurrencies: int = Field(..., description="Total number of cryptocurrencies")
    total_etfs: int = Field(..., description="Total number of ETFs")
    total_market_cap: Optional[Decimal] = Field(None, description="Total market capitalization")
    total_volume_24h: Optional[Decimal] = Field(None, description="Total 24-hour volume")
    market_sentiment: Optional[str] = Field(None, description="Market sentiment (bullish, bearish, neutral)")
    top_gainers: List[Dict[str, Any]] = Field(default=[], description="Top gaining assets")
    top_losers: List[Dict[str, Any]] = Field(default=[], description="Top losing assets")
    most_active: List[Dict[str, Any]] = Field(default=[], description="Most active assets")
    sector_performance: List[Dict[str, Any]] = Field(default=[], description="Sector performance data")
    market_trends: List[Dict[str, Any]] = Field(default=[], description="Market trend data")
    last_updated: datetime = Field(..., description="Last update timestamp")


class DashboardResponse(BaseModel):
    """Dashboard response model"""
    metrics: DashboardMetrics = Field(..., description="Dashboard metrics")
    charts: Dict[str, Any] = Field(default={}, description="Chart data")
    alerts: List[Dict[str, Any]] = Field(default=[], description="System alerts")
    news: List[Dict[str, Any]] = Field(default=[], description="Market news")


class MarketOverview(BaseModel):
    """Market overview model"""
    total_market_cap: Optional[Decimal] = Field(None, description="Total market capitalization")
    market_cap_change_24h: Optional[Decimal] = Field(None, description="24-hour market cap change")
    total_volume_24h: Optional[Decimal] = Field(None, description="Total 24-hour volume")
    volume_change_24h: Optional[Decimal] = Field(None, description="24-hour volume change")
    fear_greed_index: Optional[int] = Field(None, description="Fear & Greed Index")
    volatility_index: Optional[Decimal] = Field(None, description="Market volatility index")
    market_trend: Optional[str] = Field(None, description="Market trend direction")
    timestamp: datetime = Field(..., description="Overview timestamp")


class PortfolioSummary(BaseModel):
    """Portfolio summary model"""
    total_value: Optional[Decimal] = Field(None, description="Total portfolio value")
    total_return: Optional[Decimal] = Field(None, description="Total return")
    total_return_percent: Optional[Decimal] = Field(None, description="Total return percentage")
    daily_return: Optional[Decimal] = Field(None, description="Daily return")
    daily_return_percent: Optional[Decimal] = Field(None, description="Daily return percentage")
    allocation: Dict[str, Decimal] = Field(default={}, description="Asset allocation")
    risk_metrics: Dict[str, Any] = Field(default={}, description="Risk metrics")
    performance_history: List[Dict[str, Any]] = Field(default=[], description="Performance history")
    timestamp: datetime = Field(..., description="Summary timestamp")


class Alert(BaseModel):
    """Alert model"""
    alert_id: int = Field(..., description="Unique alert ID")
    type: str = Field(..., description="Alert type")
    severity: str = Field(..., description="Alert severity (low, medium, high, critical)")
    title: str = Field(..., description="Alert title")
    message: str = Field(..., description="Alert message")
    asset_ticker: Optional[str] = Field(None, description="Related asset ticker")
    threshold: Optional[Decimal] = Field(None, description="Alert threshold")
    current_value: Optional[Decimal] = Field(None, description="Current value")
    is_active: bool = Field(default=True, description="Whether alert is active")
    created_at: datetime = Field(..., description="Alert creation timestamp")
    triggered_at: Optional[datetime] = Field(None, description="Alert trigger timestamp")


class NewsItem(BaseModel):
    """News item model"""
    news_id: int = Field(..., description="Unique news ID")
    title: str = Field(..., description="News title")
    summary: str = Field(..., description="News summary")
    content: Optional[str] = Field(None, description="News content")
    source: str = Field(..., description="News source")
    url: Optional[str] = Field(None, description="News URL")
    published_at: datetime = Field(..., description="Publication timestamp")
    sentiment: Optional[str] = Field(None, description="News sentiment")
    related_assets: List[str] = Field(default=[], description="Related asset tickers")
    impact_score: Optional[Decimal] = Field(None, description="Market impact score")


class ChartData(BaseModel):
    """Chart data model"""
    chart_type: str = Field(..., description="Chart type")
    title: str = Field(..., description="Chart title")
    data: List[Dict[str, Any]] = Field(..., description="Chart data points")
    options: Dict[str, Any] = Field(default={}, description="Chart options")
    last_updated: datetime = Field(..., description="Last update timestamp")






