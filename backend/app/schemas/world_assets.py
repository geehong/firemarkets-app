"""
World assets-related Pydantic schemas.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from decimal import Decimal
from pydantic import BaseModel, Field


class WorldAssetBase(BaseModel):
    """Base world asset model"""
    ticker: str = Field(..., description="Asset ticker symbol")
    name: str = Field(..., description="Asset name")
    category: str = Field(..., description="Asset category")
    subcategory: Optional[str] = Field(None, description="Asset subcategory")
    market_cap: Optional[Decimal] = Field(None, description="Market capitalization")
    price: Optional[Decimal] = Field(..., description="Current price")
    price_change_24h: Optional[Decimal] = Field(None, description="24-hour price change")
    price_change_percent_24h: Optional[Decimal] = Field(None, description="24-hour price change percentage")
    volume_24h: Optional[Decimal] = Field(None, description="24-hour trading volume")
    country: Optional[str] = Field(None, description="Asset country")
    sector: Optional[str] = Field(None, description="Asset sector")
    industry: Optional[str] = Field(None, description="Asset industry")
    description: Optional[str] = Field(None, description="Asset description")
    is_active: bool = Field(default=True, description="Whether the asset is active")


class WorldAssetCreate(WorldAssetBase):
    """World asset creation model"""
    pass


class WorldAssetUpdate(BaseModel):
    """World asset update model"""
    name: Optional[str] = Field(None, description="Asset name")
    category: Optional[str] = Field(None, description="Asset category")
    subcategory: Optional[str] = Field(None, description="Asset subcategory")
    market_cap: Optional[Decimal] = Field(None, description="Market capitalization")
    price: Optional[Decimal] = Field(None, description="Current price")
    price_change_24h: Optional[Decimal] = Field(None, description="24-hour price change")
    price_change_percent_24h: Optional[Decimal] = Field(None, description="24-hour price change percentage")
    volume_24h: Optional[Decimal] = Field(None, description="24-hour trading volume")
    country: Optional[str] = Field(None, description="Asset country")
    sector: Optional[str] = Field(None, description="Asset sector")
    industry: Optional[str] = Field(None, description="Asset industry")
    description: Optional[str] = Field(None, description="Asset description")
    is_active: Optional[bool] = Field(None, description="Whether the asset is active")


class WorldAssetResponse(WorldAssetBase):
    """World asset response model"""
    world_asset_id: int = Field(..., description="Unique world asset ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    class Config:
        from_attributes = True


class WorldAssetListResponse(BaseModel):
    """World asset list response model"""
    world_assets: List[WorldAssetResponse] = Field(..., description="List of world assets")
    total: int = Field(..., description="Total number of world assets")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Number of assets per page")
    pages: int = Field(..., description="Total number of pages")


class WorldAssetRanking(BaseModel):
    """World asset ranking model"""
    ranking_id: int = Field(..., description="Unique ranking ID")
    ticker: str = Field(..., description="Asset ticker")
    name: str = Field(..., description="Asset name")
    category: str = Field(..., description="Asset category")
    subcategory: Optional[str] = Field(None, description="Asset subcategory")
    market_cap: Optional[Decimal] = Field(None, description="Market capitalization")
    market_cap_rank: Optional[int] = Field(None, description="Market cap rank")
    price: Optional[Decimal] = Field(None, description="Current price")
    price_change_24h: Optional[Decimal] = Field(None, description="24-hour price change")
    price_change_percent_24h: Optional[Decimal] = Field(None, description="24-hour price change percentage")
    volume_24h: Optional[Decimal] = Field(None, description="24-hour trading volume")
    volume_rank: Optional[int] = Field(None, description="Volume rank")
    country: Optional[str] = Field(None, description="Asset country")
    sector: Optional[str] = Field(None, description="Asset sector")
    industry: Optional[str] = Field(None, description="Asset industry")
    performance_score: Optional[Decimal] = Field(None, description="Performance score")
    risk_score: Optional[Decimal] = Field(None, description="Risk score")
    updated_at: datetime = Field(..., description="Last update timestamp")


class WorldAssetRankingResponse(BaseModel):
    """World asset ranking response model"""
    rankings: List[WorldAssetRanking] = Field(..., description="List of asset rankings")
    total: int = Field(..., description="Total number of rankings")
    categories: List[str] = Field(..., description="Available categories")
    countries: List[str] = Field(..., description="Available countries")
    sectors: List[str] = Field(..., description="Available sectors")
    last_updated: datetime = Field(..., description="Last update timestamp")


class WorldAssetFilter(BaseModel):
    """World asset filter model"""
    category: Optional[str] = Field(None, description="Category filter")
    subcategory: Optional[str] = Field(None, description="Subcategory filter")
    country: Optional[str] = Field(None, description="Country filter")
    sector: Optional[str] = Field(None, description="Sector filter")
    industry: Optional[str] = Field(None, description="Industry filter")
    market_cap_min: Optional[Decimal] = Field(None, description="Minimum market cap")
    market_cap_max: Optional[Decimal] = Field(None, description="Maximum market cap")
    price_change_min: Optional[Decimal] = Field(None, description="Minimum price change")
    price_change_max: Optional[Decimal] = Field(None, description="Maximum price change")
    volume_min: Optional[Decimal] = Field(None, description="Minimum volume")
    volume_max: Optional[Decimal] = Field(None, description="Maximum volume")
    sort_by: Optional[str] = Field(None, description="Sort field")
    sort_order: str = Field(default="desc", description="Sort order")
    page: int = Field(default=1, description="Page number")
    size: int = Field(default=20, description="Page size")


class WorldAssetMetrics(BaseModel):
    """World asset metrics model"""
    total_assets: int = Field(..., description="Total number of assets")
    total_market_cap: Optional[Decimal] = Field(None, description="Total market capitalization")
    total_volume_24h: Optional[Decimal] = Field(None, description="Total 24-hour volume")
    category_distribution: Dict[str, int] = Field(default={}, description="Category distribution")
    country_distribution: Dict[str, int] = Field(default={}, description="Country distribution")
    sector_distribution: Dict[str, int] = Field(default={}, description="Sector distribution")
    top_performers: List[Dict[str, Any]] = Field(default=[], description="Top performing assets")
    worst_performers: List[Dict[str, Any]] = Field(default=[], description="Worst performing assets")
    most_volatile: List[Dict[str, Any]] = Field(default=[], description="Most volatile assets")
    updated_at: datetime = Field(..., description="Last update timestamp")


class WorldAssetComparison(BaseModel):
    """World asset comparison model"""
    comparison_id: int = Field(..., description="Unique comparison ID")
    assets: List[str] = Field(..., description="Asset tickers to compare")
    metrics: List[str] = Field(..., description="Metrics to compare")
    time_period: str = Field(..., description="Time period for comparison")
    comparison_data: List[Dict[str, Any]] = Field(..., description="Comparison data")
    created_at: datetime = Field(..., description="Creation timestamp")


# New schemas for actual API responses
class TreemapDataItem(BaseModel):
    """Individual treemap data item"""
    id: str = Field(..., description="Asset identifier (ticker or name)")
    name: str = Field(..., description="Asset name")
    value: float = Field(..., description="Market cap value for treemap")
    rank: int = Field(..., description="Asset rank")
    price: float = Field(..., description="Current price")
    change: float = Field(..., description="Daily change percentage")
    country: Optional[str] = Field(None, description="Asset country")


class TreemapResponse(BaseModel):
    """Response model for /world-assets/treemap endpoint"""
    success: bool = Field(..., description="Request success status")
    data: List[TreemapDataItem] = Field(..., description="Treemap data")


class AssetRankingItem(BaseModel):
    """Individual asset ranking item"""
    rank: int = Field(..., description="Asset rank")
    name: str = Field(..., description="Asset name")
    ticker: str = Field(..., description="Asset ticker")
    market_cap_usd: float = Field(..., description="Market capitalization in USD")
    price_usd: float = Field(..., description="Current price in USD")
    daily_change_percent: float = Field(..., description="Daily change percentage")
    category: str = Field(..., description="Asset category")
    country: str = Field(..., description="Asset country")
    sector: Optional[str] = Field(None, description="Asset sector")


class AssetsRankingResponse(BaseModel):
    """Response model for /world-assets/ranking endpoint"""
    data: List[AssetRankingItem] = Field(..., description="List of asset rankings")


class BondMarketDataItem(BaseModel):
    """Individual bond market data item"""
    country: str = Field(..., description="Country name")
    yield_10y: Optional[float] = Field(None, description="10-year bond yield")
    yield_2y: Optional[float] = Field(None, description="2-year bond yield")
    spread: Optional[float] = Field(None, description="Yield spread")
    updated_at: datetime = Field(..., description="Last update timestamp")


class BondMarketResponse(BaseModel):
    """Response model for /world-assets/bond-market endpoint"""
    data: List[BondMarketDataItem] = Field(..., description="Bond market data")


class ScrapingLogItem(BaseModel):
    """Individual scraping log item"""
    log_id: int = Field(..., description="Log ID")
    timestamp: datetime = Field(..., description="Log timestamp")
    status: str = Field(..., description="Scraping status")
    message: str = Field(..., description="Log message")
    data_count: Optional[int] = Field(None, description="Number of records scraped")


class ScrapingLogsResponse(BaseModel):
    """Response model for /world-assets/scraping-logs endpoint"""
    data: List[ScrapingLogItem] = Field(..., description="Scraping logs")


class WorldAssetsStats(BaseModel):
    """Response model for /world-assets/stats endpoint"""
    total_assets: int = Field(..., description="Total number of assets")
    total_market_cap: float = Field(..., description="Total market capitalization")
    categories: Dict[str, int] = Field(..., description="Category distribution")
    countries: Dict[str, int] = Field(..., description="Country distribution")
    last_updated: datetime = Field(..., description="Last update timestamp")


class MarketCapByCategory(BaseModel):
    """Response model for /world-assets/market-cap-by-category endpoint"""
    categories: List[str] = Field(..., description="Category names")
    market_caps: List[float] = Field(..., description="Market cap values")
    data: List[Dict[str, Any]] = Field(..., description="Detailed data")


class CollectionStatus(BaseModel):
    """Response model for collection status endpoints"""
    status: str = Field(..., description="Collection status")
    last_run: Optional[datetime] = Field(None, description="Last collection run")
    next_run: Optional[datetime] = Field(None, description="Next scheduled run")
    total_assets: int = Field(..., description="Total assets to collect")
    collected_assets: int = Field(..., description="Number of collected assets")
    failed_assets: int = Field(..., description="Number of failed collections")
    progress_percentage: float = Field(..., description="Collection progress percentage")


class TopAssetsResponse(BaseModel):
    """Response model for /world-assets/top-assets endpoint"""
    data: List[AssetRankingItem] = Field(..., description="Top assets list")
    total_count: int = Field(..., description="Total number of assets")


class MarketCapTrends(BaseModel):
    """Response model for /world-assets/market-cap-trends endpoint"""
    dates: List[str] = Field(..., description="Date labels")
    values: List[float] = Field(..., description="Market cap values")
    data: List[Dict[str, Any]] = Field(..., description="Detailed trend data")


class AssetHistory(BaseModel):
    """Response model for /world-assets/asset-history/{ticker} endpoint"""
    ticker: str = Field(..., description="Asset ticker")
    dates: List[str] = Field(..., description="Date labels")
    prices: List[float] = Field(..., description="Price values")
    market_caps: List[float] = Field(..., description="Market cap values")
    volumes: List[float] = Field(..., description="Volume values")


class CategoryTrends(BaseModel):
    """Response model for /world-assets/category-trends endpoint"""
    categories: List[str] = Field(..., description="Category names")
    dates: List[str] = Field(..., description="Date labels")
    data: List[Dict[str, Any]] = Field(..., description="Trend data by category")


class TopAssetsByCategory(BaseModel):
    """Response model for /world-assets/top-assets-by-category endpoint"""
    categories: Dict[str, List[AssetRankingItem]] = Field(..., description="Top assets by category")


class PerformanceTreemapResponse(BaseModel):
    """Response model for /world-assets/performance-treemap endpoint"""
    success: bool = Field(..., description="Request success status")
    data: List[Dict[str, Any]] = Field(..., description="Performance treemap data")






