"""
Common Pydantic schemas used across the application.
"""
from datetime import datetime
from typing import Optional, Any, List, Dict
from pydantic import BaseModel, Field


class BaseResponse(BaseModel):
    """Base response model for all API responses"""
    success: bool = Field(description="Whether the request was successful")
    message: str = Field(description="Response message")
    timestamp: datetime = Field(default_factory=datetime.now, description="Response timestamp")


class ErrorResponse(BaseResponse):
    """Error response model"""
    success: bool = Field(default=False, description="Always false for error responses")
    error_code: Optional[str] = Field(None, description="Error code")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")


class SuccessResponse(BaseResponse):
    """Success response model"""
    success: bool = Field(default=True, description="Always true for success responses")
    data: Optional[Any] = Field(None, description="Response data")


class PaginatedResponse(BaseModel):
    """Paginated response model"""
    items: List[Any] = Field(description="List of items")
    total: int = Field(description="Total number of items")
    page: int = Field(description="Current page number")
    size: int = Field(description="Number of items per page")
    pages: int = Field(description="Total number of pages")
    has_next: bool = Field(description="Whether there is a next page")
    has_prev: bool = Field(description="Whether there is a previous page")


class TimeRangeFilter(BaseModel):
    """Time range filter for queries"""
    start_date: Optional[datetime] = Field(None, description="Start date for filtering")
    end_date: Optional[datetime] = Field(None, description="End date for filtering")


class PaginationParams(BaseModel):
    """Pagination parameters"""
    page: int = Field(default=1, ge=1, description="Page number (1-based)")
    size: int = Field(default=20, ge=1, le=100, description="Number of items per page")


class SortParams(BaseModel):
    """Sorting parameters"""
    sort_by: Optional[str] = Field(None, description="Field to sort by")
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$", description="Sort order (asc or desc)")


class SearchParams(BaseModel):
    """Search parameters"""
    query: Optional[str] = Field(None, description="Search query")
    category: Optional[str] = Field(None, description="Category filter")
    asset_type: Optional[str] = Field(None, description="Asset type filter")


class HealthCheckResponse(BaseModel):
    """Health check response model"""
    status: str = Field(description="Service status")
    timestamp: datetime = Field(default_factory=datetime.now, description="Health check timestamp")
    version: str = Field(description="API version")
    uptime: Optional[float] = Field(None, description="Service uptime in seconds")
    database: Optional[str] = Field(None, description="Database connection status")
    external_apis: Optional[Dict[str, str]] = Field(None, description="External API status")


class ApiV1RootResponse(BaseModel):
    """API v1 root endpoint response model"""
    message: str = Field(..., description="API message")
    version: str = Field(..., description="API version")
    endpoints: Dict[str, str] = Field(..., description="Available endpoints")


# Additional schemas for remaining endpoints
class CollectionStatusResponse(BaseModel):
    """Response model for collection status endpoints"""
    status: str = Field(..., description="Collection status")
    message: str = Field(..., description="Status message")
    timestamp: datetime = Field(..., description="Timestamp")


class CollectionSettingsResponse(BaseModel):
    """Response model for collection settings endpoints"""
    asset_id: int = Field(..., description="Asset ID")
    settings: Dict[str, Any] = Field(..., description="Collection settings")
    updated_at: datetime = Field(..., description="Last update timestamp")


class LastCollectionsResponse(BaseModel):
    """Response model for last collections endpoints"""
    asset_id: int = Field(..., description="Asset ID")
    last_collections: Dict[str, Any] = Field(..., description="Last collection timestamps")
    updated_at: datetime = Field(..., description="Last update timestamp")


class ConfigurationResponse(BaseModel):
    """Response model for configuration endpoints"""
    key: str = Field(..., description="Configuration key")
    value: Any = Field(..., description="Configuration value")
    category: str = Field(..., description="Configuration category")
    description: Optional[str] = Field(None, description="Configuration description")
    updated_at: datetime = Field(..., description="Last update timestamp")


class ConfigurationCategoriesResponse(BaseModel):
    """Response model for configuration categories endpoint"""
    categories: List[str] = Field(..., description="Available configuration categories")


class GlobalConfigurationResponse(BaseModel):
    """Response model for global configuration endpoint"""
    configurations: Dict[str, Any] = Field(..., description="Global configurations")
    last_updated: datetime = Field(..., description="Last update timestamp")


class ReloadResponse(BaseModel):
    """Response model for reload endpoints"""
    success: bool = Field(..., description="Reload success status")
    message: str = Field(..., description="Reload message")
    timestamp: datetime = Field(..., description="Reload timestamp")


class ETFInfoItem(BaseModel):
    """ETF info item"""
    etf_info_id: int = Field(..., description="ETF info ID")
    ticker: str = Field(..., description="ETF ticker")
    name: str = Field(..., description="ETF name")
    description: Optional[str] = Field(None, description="Description")
    issuer: Optional[str] = Field(None, description="Issuer")
    expense_ratio: Optional[float] = Field(None, description="Expense ratio")
    aum: Optional[int] = Field(None, description="Assets under management")
    category: Optional[str] = Field(None, description="Category")
    updated_at: datetime = Field(..., description="Last update timestamp")


class ETFInfoListResponse(BaseModel):
    """Response model for /etf/info endpoint"""
    data: List[ETFInfoItem] = Field(..., description="List of ETF information")
    total_count: int = Field(..., description="Total number of ETFs")


class MarketDataResponse(BaseModel):
    """Response model for market data endpoints"""
    ticker: str = Field(..., description="Asset ticker")
    price: Optional[float] = Field(None, description="Current price")
    change: Optional[float] = Field(None, description="Price change")
    change_percent: Optional[float] = Field(None, description="Price change percentage")
    volume: Optional[float] = Field(None, description="Trading volume")
    market_cap: Optional[float] = Field(None, description="Market capitalization")
    timestamp: datetime = Field(..., description="Data timestamp")


# class GlobalCryptoMetricsResponse(BaseModel):
#     """Response model for global crypto metrics endpoint"""
#     total_market_cap: float = Field(..., description="Total market capitalization")
#     total_volume_24h: float = Field(..., description="Total 24-hour volume")
#     bitcoin_dominance: float = Field(..., description="Bitcoin market dominance")
#     ethereum_dominance: float = Field(..., description="Ethereum market dominance")
#     total_cryptocurrencies: int = Field(..., description="Total number of cryptocurrencies")
#     active_cryptocurrencies: int = Field(..., description="Number of active cryptocurrencies")
#     market_cap_change_24h: float = Field(..., description="24-hour market cap change")
#     volume_change_24h: float = Field(..., description="24-hour volume change")
#     last_updated: datetime = Field(..., description="Last update timestamp")


class ExternalAPITestResponse(BaseModel):
    """Response model for external API test endpoints"""
    api_name: str = Field(..., description="API name")
    status: str = Field(..., description="Test status")
    message: str = Field(..., description="Test message")
    response_time: Optional[float] = Field(None, description="Response time in seconds")
    timestamp: datetime = Field(..., description="Test timestamp")


class OnchainMetricCategoryResponse(BaseModel):
    """Response model for onchain metric categories endpoint"""
    categories: List[str] = Field(..., description="Available metric categories")


class OnchainMetricToggleResponse(BaseModel):
    """Response model for onchain metric toggle endpoint"""
    metric_id: int = Field(..., description="Metric ID")
    status: str = Field(..., description="Toggle status")
    message: str = Field(..., description="Toggle message")
    timestamp: datetime = Field(..., description="Toggle timestamp")


class OnchainMetricRunResponse(BaseModel):
    """Response model for onchain metric run endpoints"""
    success: bool = Field(..., description="Run success status")
    message: str = Field(..., description="Run message")
    metric_id: str = Field(..., description="Metric ID")
    data_points_added: int = Field(..., description="Number of data points added")
    collection_type: str = Field(..., description="Collection type (recent or all)")
    force_update: bool = Field(..., description="Whether force update was used")


class OnchainMetricStatusResponse(BaseModel):
    """Response model for onchain metric status endpoint"""
    metric_id: int = Field(..., description="Metric ID")
    status: str = Field(..., description="Metric status")
    last_run: Optional[datetime] = Field(None, description="Last run timestamp")
    next_run: Optional[datetime] = Field(None, description="Next scheduled run")
    is_active: bool = Field(..., description="Whether metric is active")
    updated_at: datetime = Field(..., description="Last update timestamp")


class LogDeleteResponse(BaseModel):
    """Response model for log deletion endpoints"""
    success: bool = Field(..., description="Deletion success status")
    message: str = Field(..., description="Deletion message")
    deleted_count: int = Field(..., description="Number of deleted records")
    timestamp: datetime = Field(..., description="Deletion timestamp")


class TickerSummaryItem(BaseModel):
    """Ticker summary item for dashboard widgets"""
    ticker: str = Field(..., description="Asset ticker")
    name: str = Field(..., description="Asset name")
    current_price: Optional[float] = Field(None, description="Current price")
    change_percent_7m: Optional[float] = Field(None, description="7-month price change percentage")
    monthly_prices_7m: List[Optional[float]] = Field(..., description="7-month monthly prices")
    error: bool = Field(..., description="Whether there was an error fetching data")


class TickerSummaryResponse(BaseModel):
    """Response model for ticker summary endpoint"""
    data: List[TickerSummaryItem] = Field(..., description="List of ticker summaries")






