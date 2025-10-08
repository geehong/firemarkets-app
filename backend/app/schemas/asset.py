"""
Asset-related Pydantic schemas.
"""
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from decimal import Decimal
from pydantic import BaseModel, Field


class AssetBase(BaseModel):
    """Base asset model"""
    ticker: str = Field(..., description="Asset ticker symbol")
    name: str = Field(..., description="Asset name")
    asset_type: str = Field(..., description="Asset type (stock, crypto, etf, etc.)")
    exchange: Optional[str] = Field(None, description="Exchange where asset is traded")
    currency: str = Field(default="USD", description="Asset currency")
    sector: Optional[str] = Field(None, description="Asset sector")
    industry: Optional[str] = Field(None, description="Asset industry")
    description: Optional[str] = Field(None, description="Asset description")
    is_active: bool = Field(default=True, description="Whether the asset is active")


class AssetCreate(AssetBase):
    """Asset creation model"""
    pass


class AssetUpdate(BaseModel):
    """Asset update model"""
    name: Optional[str] = Field(None, description="Asset name")
    asset_type: Optional[str] = Field(None, description="Asset type")
    exchange: Optional[str] = Field(None, description="Exchange where asset is traded")
    currency: Optional[str] = Field(None, description="Asset currency")
    sector: Optional[str] = Field(None, description="Asset sector")
    industry: Optional[str] = Field(None, description="Asset industry")
    description: Optional[str] = Field(None, description="Asset description")
    is_active: Optional[bool] = Field(None, description="Whether the asset is active")


class AssetResponse(AssetBase):
    """Asset response model"""
    asset_id: int = Field(..., description="Unique asset ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    class Config:
        from_attributes = True


class AssetListResponse(BaseModel):
    """Asset list response model"""
    assets: List[AssetResponse] = Field(..., description="List of assets")
    total: int = Field(..., description="Total number of assets")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Number of assets per page")
    pages: int = Field(..., description="Total number of pages")


class AssetPriceData(BaseModel):
    """Asset price data model"""
    asset_id: int = Field(..., description="Asset ID")
    ticker: str = Field(..., description="Asset ticker")
    timestamp: datetime = Field(..., description="Price timestamp")
    open_price: Optional[Decimal] = Field(None, description="Opening price")
    high_price: Optional[Decimal] = Field(None, description="Highest price")
    low_price: Optional[Decimal] = Field(None, description="Lowest price")
    close_price: Optional[Decimal] = Field(None, description="Closing price")
    volume: Optional[Decimal] = Field(None, description="Trading volume")
    market_cap: Optional[Decimal] = Field(None, description="Market capitalization")
    price_change: Optional[Decimal] = Field(None, description="Price change")
    price_change_percent: Optional[Decimal] = Field(None, description="Price change percentage")


class AssetMetrics(BaseModel):
    """Asset metrics model"""
    asset_id: int = Field(..., description="Asset ID")
    ticker: str = Field(..., description="Asset ticker")
    pe_ratio: Optional[Decimal] = Field(None, description="Price-to-Earnings ratio")
    pb_ratio: Optional[Decimal] = Field(None, description="Price-to-Book ratio")
    dividend_yield: Optional[Decimal] = Field(None, description="Dividend yield")
    beta: Optional[Decimal] = Field(None, description="Beta coefficient")
    market_cap: Optional[Decimal] = Field(None, description="Market capitalization")
    enterprise_value: Optional[Decimal] = Field(None, description="Enterprise value")
    debt_to_equity: Optional[Decimal] = Field(None, description="Debt-to-Equity ratio")
    return_on_equity: Optional[Decimal] = Field(None, description="Return on Equity")
    return_on_assets: Optional[Decimal] = Field(None, description="Return on Assets")
    profit_margin: Optional[Decimal] = Field(None, description="Profit margin")
    updated_at: datetime = Field(..., description="Last update timestamp")


# New schemas for actual API responses
class AssetListItem(BaseModel):
    """Individual asset item in the assets list response"""
    asset_id: int = Field(..., description="Unique asset ID")
    ticker: str = Field(..., description="Asset ticker symbol")
    asset_type_id: int = Field(..., description="Asset type ID")
    name: str = Field(..., description="Asset name")
    exchange: Optional[str] = Field(None, description="Exchange where asset is traded")
    currency: Optional[str] = Field(None, description="Asset currency")
    is_active: bool = Field(..., description="Whether the asset is active")
    description: Optional[str] = Field(None, description="Asset description")
    data_source: str = Field(..., description="Data source for the asset")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    type_name: str = Field(..., description="Asset type name")
    collect_price: bool = Field(..., description="Whether to collect price data")
    collect_assets_info: bool = Field(..., description="Whether to collect assets info")
    collect_financials: bool = Field(..., description="Whether to collect financial data")
    collect_estimates: bool = Field(..., description="Whether to collect analyst estimates")
    collect_onchain: bool = Field(..., description="Whether to collect onchain data")
    collect_technical_indicators: bool = Field(..., description="Whether to collect technical indicators")
    collection_settings: Dict[str, Any] = Field(..., description="Collection settings")


class AssetsListResponse(BaseModel):
    """Response model for /assets endpoint"""
    data: List[AssetListItem] = Field(..., description="List of assets")
    total_count: int = Field(..., description="Total number of assets")


class AssetTypeResponse(BaseModel):
    """Response model for asset types"""
    asset_type_id: int = Field(..., description="Asset type ID")
    type_name: str = Field(..., description="Asset type name")
    description: Optional[str] = Field(None, description="Asset type description")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    class Config:
        # description 필드가 없어도 유효하도록 설정
        extra = "allow"


class AssetTypesResponse(BaseModel):
    """Response model for /asset-types endpoint"""
    data: List[AssetTypeResponse] = Field(..., description="List of asset types")


# Additional schemas for remaining endpoints
class MarketCapItem(BaseModel):
    """Individual market cap item"""
    asset_id: int = Field(..., description="Asset ID")
    ticker: str = Field(..., description="Asset ticker")
    name: str = Field(..., description="Asset name")
    type_name: str = Field(..., description="Asset type name")
    market_cap: Optional[float] = Field(None, description="Market capitalization")
    price: Optional[float] = Field(None, description="Current price")
    volume: Optional[float] = Field(None, description="Trading volume")
    change_percent: Optional[float] = Field(None, description="Price change percentage")
    daily_change_percent: Optional[float] = Field(None, description="Daily change percentage from world_assets_ranking")
    current_price: Optional[float] = Field(None, description="Current price from OHLCV or world_assets_ranking")
    performance: Optional[float] = Field(None, description="30-day performance")
    change_percent_24h: Optional[float] = Field(None, description="24-hour change percentage")
    snapshot_date: Optional[date] = Field(None, description="Snapshot date")


class MarketCapsResponse(BaseModel):
    """Response model for /assets/market-caps endpoint"""
    data: List[MarketCapItem] = Field(..., description="List of assets with market caps")
    total_count: int = Field(..., description="Total number of assets")


class AssetDetailResponse(BaseModel):
    """Response model for /assets/{asset_identifier} endpoint"""
    asset_id: int = Field(..., description="Asset ID")
    ticker: str = Field(..., description="Asset ticker")
    name: str = Field(..., description="Asset name")
    asset_type_id: int = Field(..., description="Asset type ID")
    exchange: Optional[str] = Field(None, description="Exchange")
    currency: Optional[str] = Field(None, description="Currency")
    is_active: bool = Field(..., description="Active status")
    description: Optional[str] = Field(None, description="Description")
    data_source: str = Field(..., description="Data source")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    type_name: str = Field(..., description="Asset type name")
    collection_settings: Dict[str, Any] = Field(..., description="Collection settings")


class OHLCVDataPoint(BaseModel):
    """OHLCV data point"""
    timestamp_utc: datetime = Field(..., description="Timestamp")
    data_interval: str = Field(..., description="Data interval")
    open_price: Optional[float] = Field(None, description="Opening price")
    high_price: Optional[float] = Field(None, description="Highest price")
    low_price: Optional[float] = Field(None, description="Lowest price")
    close_price: Optional[float] = Field(None, description="Closing price")
    volume: Optional[float] = Field(None, description="Trading volume")
    change_percent: Optional[float] = Field(None, description="Price change percentage")


class OHLCVResponse(BaseModel):
    """Response model for /ohlcv/{asset_identifier} endpoint"""
    asset_id: int = Field(..., description="Asset ID")
    ticker: str = Field(..., description="Asset ticker")
    data_interval: str = Field(..., description="Data interval")
    data: List[OHLCVDataPoint] = Field(..., description="OHLCV data points")
    total_count: int = Field(..., description="Total number of data points")


class PriceDataPoint(BaseModel):
    """Price data point (simplified version of OHLCV)"""
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    value: Optional[float] = Field(None, description="Closing price")
    change_percent: Optional[float] = Field(None, description="Price change percentage")


class PriceResponse(BaseModel):
    """Response model for /price/{asset_identifier} endpoint"""
    asset_id: int = Field(..., description="Asset ID")
    ticker: str = Field(..., description="Asset ticker")
    data: List[PriceDataPoint] = Field(..., description="Price data points")
    total_count: int = Field(..., description="Total number of data points")


class StockProfileResponse(BaseModel):
    """Response model for /stock-profile/asset/{asset_identifier} endpoint"""
    profile_id: int = Field(..., description="Profile ID")
    asset_id: int = Field(..., description="Asset ID")
    company_name: str = Field(..., description="Company name")
    description: Optional[str] = Field(None, description="Description")
    sector: Optional[str] = Field(None, description="Sector")
    industry: Optional[str] = Field(None, description="Industry")
    country: Optional[str] = Field(None, description="Country")
    city: Optional[str] = Field(None, description="City")
    address: Optional[str] = Field(None, description="Address")
    phone: Optional[str] = Field(None, description="Phone")
    website: Optional[str] = Field(None, description="Website")
    ceo: Optional[str] = Field(None, description="CEO")
    employees_count: Optional[int] = Field(None, description="Number of employees")
    ipo_date: Optional[date] = Field(None, description="IPO date")
    logo_image_url: Optional[str] = Field(None, description="Logo URL")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")


class StockFinancialItem(BaseModel):
    """Stock financial data item"""
    financial_id: int = Field(..., description="Financial ID")
    asset_id: int = Field(..., description="Asset ID")
    snapshot_date: date = Field(..., description="Snapshot date")
    currency: Optional[str] = Field(None, description="Currency")
    market_cap: Optional[int] = Field(None, description="Market capitalization")
    ebitda: Optional[int] = Field(None, description="EBITDA")
    shares_outstanding: Optional[int] = Field(None, description="Shares outstanding")
    pe_ratio: Optional[float] = Field(None, description="P/E ratio")
    peg_ratio: Optional[float] = Field(None, description="PEG ratio")
    beta: Optional[float] = Field(None, description="Beta")
    eps: Optional[float] = Field(None, description="EPS")
    dividend_yield: Optional[float] = Field(None, description="Dividend yield")
    dividend_per_share: Optional[float] = Field(None, description="Dividend per share")
    profit_margin_ttm: Optional[float] = Field(None, description="Profit margin TTM")
    return_on_equity_ttm: Optional[float] = Field(None, description="ROE TTM")
    revenue_ttm: Optional[int] = Field(None, description="Revenue TTM")
    price_to_book_ratio: Optional[float] = Field(None, description="Price to book ratio")
    week_52_high: Optional[float] = Field(None, description="52-week high")
    week_52_low: Optional[float] = Field(None, description="52-week low")
    day_50_moving_avg: Optional[float] = Field(None, description="50-day moving average")
    day_200_moving_avg: Optional[float] = Field(None, description="200-day moving average")
    updated_at: datetime = Field(..., description="Last update timestamp")


class StockFinancialsResponse(BaseModel):
    """Response model for /stock-financials/asset/{asset_identifier} endpoint"""
    asset_id: int = Field(..., description="Asset ID")
    ticker: str = Field(..., description="Asset ticker")
    data: List[StockFinancialItem] = Field(..., description="Financial data")
    total_count: int = Field(..., description="Total number of records")


class StockEstimateItem(BaseModel):
    """Stock analyst estimate item"""
    estimate_id: int = Field(..., description="Estimate ID")
    asset_id: int = Field(..., description="Asset ID")
    fiscal_date: date = Field(..., description="Fiscal date")
    revenue_avg: Optional[int] = Field(None, description="Average revenue estimate")
    revenue_low: Optional[int] = Field(None, description="Low revenue estimate")
    revenue_high: Optional[int] = Field(None, description="High revenue estimate")
    revenue_analysts_count: Optional[int] = Field(None, description="Number of revenue analysts")
    eps_avg: Optional[float] = Field(None, description="Average EPS estimate")
    eps_low: Optional[float] = Field(None, description="Low EPS estimate")
    eps_high: Optional[float] = Field(None, description="High EPS estimate")
    eps_analysts_count: Optional[int] = Field(None, description="Number of EPS analysts")
    ebitda_avg: Optional[int] = Field(None, description="Average EBITDA estimate")
    updated_at: datetime = Field(..., description="Last update timestamp")


class StockEstimatesResponse(BaseModel):
    """Response model for /stock-estimates/asset/{asset_identifier} endpoint"""
    asset_id: int = Field(..., description="Asset ID")
    ticker: str = Field(..., description="Asset ticker")
    data: List[StockEstimateItem] = Field(..., description="Analyst estimates")
    total_count: int = Field(..., description="Total number of records")


class IndexInfoItem(BaseModel):
    """Index information item"""
    index_info_id: int = Field(..., description="Index info ID")
    asset_id: int = Field(..., description="Asset ID")
    snapshot_date: date = Field(..., description="Snapshot date")
    price: Optional[float] = Field(None, description="Price")
    change_percentage: Optional[float] = Field(None, description="Change percentage")
    volume: Optional[int] = Field(None, description="Volume")
    day_low: Optional[float] = Field(None, description="Day low")
    day_high: Optional[float] = Field(None, description="Day high")
    year_low: Optional[float] = Field(None, description="Year low")
    year_high: Optional[float] = Field(None, description="Year high")
    price_avg_50: Optional[float] = Field(None, description="50-day moving average")
    price_avg_200: Optional[float] = Field(None, description="200-day moving average")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class IndexInfoResponse(BaseModel):
    """Response model for /index-info/asset/{asset_identifier} endpoint"""
    asset_id: int = Field(..., description="Asset ID")
    ticker: str = Field(..., description="Asset ticker")
    data: List[IndexInfoItem] = Field(..., description="Index information")
    total_count: int = Field(..., description="Total number of records")


class ETFInfoResponse(BaseModel):
    """Response model for /etf-info/asset/{asset_identifier} endpoint"""
    etf_info_id: int = Field(..., description="ETF info ID")
    asset_id: int = Field(..., description="Asset ID")
    ticker: str = Field(..., description="ETF ticker")
    name: str = Field(..., description="ETF name")
    description: Optional[str] = Field(None, description="Description")
    issuer: Optional[str] = Field(None, description="Issuer")
    expense_ratio: Optional[float] = Field(None, description="Expense ratio")
    aum: Optional[int] = Field(None, description="Assets under management")
    inception_date: Optional[date] = Field(None, description="Inception date")
    category: Optional[str] = Field(None, description="Category")
    asset_class: Optional[str] = Field(None, description="Asset class")
    updated_at: datetime = Field(..., description="Last update timestamp")


class ETFSectorExposureItem(BaseModel):
    """ETF sector exposure item"""
    sector_exposure_id: int = Field(..., description="Sector exposure ID")
    etf_info_id: int = Field(..., description="ETF info ID")
    sector: str = Field(..., description="Sector name")
    weight: float = Field(..., description="Sector weight")
    updated_at: datetime = Field(..., description="Last update timestamp")


class ETFSectorExposureResponse(BaseModel):
    """Response model for /etf-sector-exposure/{etf_info_id} endpoint"""
    etf_info_id: int = Field(..., description="ETF info ID")
    data: List[ETFSectorExposureItem] = Field(..., description="Sector exposures")
    total_count: int = Field(..., description="Total number of sectors")


class ETFHoldingItem(BaseModel):
    """ETF holding item"""
    holding_id: int = Field(..., description="Holding ID")
    etf_info_id: int = Field(..., description="ETF info ID")
    ticker: str = Field(..., description="Holding ticker")
    name: str = Field(..., description="Holding name")
    weight: float = Field(..., description="Holding weight")
    shares: Optional[int] = Field(None, description="Number of shares")
    market_value: Optional[int] = Field(None, description="Market value")
    updated_at: datetime = Field(..., description="Last update timestamp")


class ETFHoldingsResponse(BaseModel):
    """Response model for /etf-holdings/{etf_info_id} endpoint"""
    etf_info_id: int = Field(..., description="ETF info ID")
    data: List[ETFHoldingItem] = Field(..., description="ETF holdings")
    total_count: int = Field(..., description="Total number of holdings")


class CryptoMetricsResponse(BaseModel):
    """Response model for /crypto-metrics/asset/{asset_identifier} endpoint"""
    asset_id: int = Field(..., description="Asset ID")
    ticker: str = Field(..., description="Asset ticker")
    market_cap: Optional[float] = Field(None, description="Market capitalization")
    circulating_supply: Optional[float] = Field(None, description="Circulating supply")
    total_supply: Optional[float] = Field(None, description="Total supply")
    max_supply: Optional[float] = Field(None, description="Maximum supply")
    volume_24h: Optional[float] = Field(None, description="24-hour volume")
    price_change_24h: Optional[float] = Field(None, description="24-hour price change")
    price_change_percent_24h: Optional[float] = Field(None, description="24-hour price change percentage")
    updated_at: datetime = Field(..., description="Last update timestamp")


class TechnicalIndicatorItem(BaseModel):
    """Technical indicator item"""
    indicator_id: int = Field(..., description="Indicator ID")
    asset_id: int = Field(..., description="Asset ID")
    timestamp_utc: datetime = Field(..., description="Timestamp")
    indicator_type: str = Field(..., description="Indicator type")
    data_interval: str = Field(..., description="Data interval")
    value: float = Field(..., description="Indicator value")
    parameters: Dict[str, Any] = Field(..., description="Indicator parameters")
    created_at: datetime = Field(..., description="Creation timestamp")


class TechnicalIndicatorsResponse(BaseModel):
    """Response model for /technical-indicators/asset/{asset_identifier} endpoint"""
    asset_id: int = Field(..., description="Asset ID")
    ticker: str = Field(..., description="Asset ticker")
    indicator_type: Optional[str] = Field(None, description="Indicator type filter")
    data_interval: str = Field(..., description="Data interval")
    data: List[TechnicalIndicatorItem] = Field(..., description="Technical indicators")
    total_count: int = Field(..., description="Total number of indicators")


# New schemas for Assets Table API
class AssetTableItem(BaseModel):
    """Individual asset item for the table view"""
    asset_id: int = Field(..., description="Unique asset ID")
    rank: Optional[int] = Field(None, description="Rank within the asset type (if applicable)")
    ticker: str = Field(..., description="Asset ticker symbol")
    name: str = Field(..., description="Asset name")
    asset_type: str = Field(..., description="Asset type")
    exchange: Optional[str] = Field(None, description="Exchange where asset is traded")
    currency: Optional[str] = Field(None, description="Asset currency")
    
    # Real-time/delayed data
    price: Optional[float] = Field(None, description="Current price")
    change_percent_today: Optional[float] = Field(None, description="Today's price change percentage")
    
    # Market data
    market_cap: Optional[float] = Field(None, description="Market capitalization")
    volume_today: Optional[float] = Field(None, description="Today's trading volume")
    change_52w_percent: Optional[float] = Field(None, description="52-week price change percentage")
    
    # Sparkline data (30-day price history)
    sparkline_30d: Optional[List[float]] = Field(None, description="30-day price history for sparkline chart")
    
    # Metadata
    data_source: Optional[str] = Field(None, description="Source of the data (e.g., 'twelvedata', 'binance', 'db')")
    last_updated: Optional[datetime] = Field(None, description="Last data update timestamp")
    is_realtime: Optional[bool] = Field(None, description="Whether the data is considered real-time (within freshness threshold)")


class AssetsTableResponse(BaseModel):
    """Response model for /assets/table endpoint"""
    data: List[AssetTableItem] = Field(..., description="List of assets with table data")
    total: int = Field(..., description="Total number of assets")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Number of assets per page")
    pages: int = Field(..., description="Total number of pages")
    asset_type: Optional[str] = Field(None, description="Filtered asset type")
    sort_by: Optional[str] = Field(None, description="Sort field")
    order: Optional[str] = Field(None, description="Sort order (asc/desc)")
    search: Optional[str] = Field(None, description="Search term")


# ============================================================================
# World Assets Schemas
# ============================================================================
class TreemapResponse(BaseModel):
    """트리맵 응답 스키마"""
    data: List[Dict[str, Any]]
    total_market_cap: float
    last_updated: datetime

class TreemapLiveItem(BaseModel):
    asset_id: int
    ticker: str
    name: str
    asset_type: str
    market_cap: Optional[float] = None
    logo_url: Optional[str] = None
    price_change_percentage_24h: Optional[float] = None
    current_price: Optional[float] = None
    market_status: str
    realtime_updated_at: Optional[datetime] = None
    daily_data_updated_at: Optional[datetime] = None

class TreemapLiveResponse(BaseModel):
    data: List[TreemapLiveItem]
    total_count: int

class AssetsRankingResponse(BaseModel):
    """자산 순위 응답 스키마"""
    rankings: List[Dict[str, Any]]
    total_count: int
    last_updated: datetime

class BondMarketResponse(BaseModel):
    """채권 시장 응답 스키마"""
    bond_data: List[Dict[str, Any]]
    total_value: float
    last_updated: datetime

class ScrapingLogsResponse(BaseModel):
    """스크래핑 로그 응답 스키마"""
    logs: List[Dict[str, Any]]
    total_count: int
    last_updated: datetime

class WorldAssetsStats(BaseModel):
    """세계 자산 통계 스키마"""
    total_market_cap: float
    total_assets: int
    last_updated: datetime

class MarketCapByCategory(BaseModel):
    """카테고리별 시가총액 스키마"""
    category: str
    market_cap: float
    percentage: float

class CollectionStatus(BaseModel):
    """수집 상태 스키마"""
    status: str
    last_collection: Optional[datetime] = None
    next_collection: Optional[datetime] = None

class TopAssetsResponse(BaseModel):
    """상위 자산 응답 스키마"""
    assets: List[Dict[str, Any]]
    total_count: int
    last_updated: datetime

class MarketCapTrends(BaseModel):
    """시가총액 트렌드 스키마"""
    trends: List[Dict[str, Any]]
    period: str
    last_updated: datetime

class AssetHistory(BaseModel):
    """자산 히스토리 스키마"""
    history: List[Dict[str, Any]]
    asset_name: str
    last_updated: datetime

class CategoryTrends(BaseModel):
    """카테고리 트렌드 스키마"""
    trends: List[Dict[str, Any]]
    category: str
    last_updated: datetime

class TopAssetsByCategory(BaseModel):
    """카테고리별 상위 자산 스키마"""
    category: str
    assets: List[Dict[str, Any]]
    total_count: int
    last_updated: datetime

class PerformanceTreemapResponse(BaseModel):
    """성과 트리맵 응답 스키마"""
    data: List[Dict[str, Any]]
    performance_metric: str
    last_updated: datetime


# ============================================================================
# Crypto Schemas
# ============================================================================

class BitcoinHalvingPeriodDataResponse(BaseModel):
    """비트코인 반감기 기간 데이터 응답 스키마"""
    period: int
    block_height: int
    date: datetime
    days_remaining: int
    blocks_remaining: int

class BitcoinHalvingSummary(BaseModel):
    """비트코인 반감기 요약 스키마"""
    current_period: int
    next_halving: BitcoinHalvingPeriodDataResponse
    total_halvings: int

class NextHalvingInfo(BaseModel):
    """다음 반감기 정보 스키마"""
    block_height: int
    estimated_date: datetime
    days_remaining: int
    blocks_remaining: int

class CryptoDataResponse(BaseModel):
    """암호화폐 데이터 응답 스키마"""
    symbol: str
    price: float
    market_cap: Optional[float]
    volume_24h: Optional[float]
    change_24h: Optional[float]
    last_updated: datetime

class TopCryptosResponse(BaseModel):
    """상위 암호화폐 응답 스키마"""
    cryptos: List[CryptoDataResponse]
    total_count: int
    last_updated: datetime

class GlobalCryptoMetrics(BaseModel):
    """글로벌 암호화폐 메트릭스 스키마"""
    total_market_cap: float
    total_volume_24h: float
    bitcoin_dominance: float
    active_cryptocurrencies: int
    last_updated: datetime


# ============================================================================
# Asset Overview Schemas
# ============================================================================

class AssetOverviewResponse(BaseModel):
    """자산 개요 통합 응답 스키마"""
    # 기본 자산 정보
    asset_id: int
    ticker: str
    name: str
    exchange: Optional[str]
    currency: Optional[str]
    description: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    type_name: str
    type_description: Optional[str]
    asset_category: str
    
    # 주식 정보 (주식인 경우)
    company_name: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    ceo: Optional[str] = None
    employees_count: Optional[int] = None
    ipo_date: Optional[date] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    exchange_full_name: Optional[str] = None
    cik: Optional[str] = None
    isin: Optional[str] = None
    cusip: Optional[str] = None
    description_en: Optional[str] = None
    description_ko: Optional[str] = None
    logo_image_url: Optional[str] = None
    
    # 재무 정보 (주식인 경우)
    market_cap: Optional[float] = None
    ebitda: Optional[float] = None
    shares_outstanding: Optional[float] = None
    pe_ratio: Optional[float] = None
    peg_ratio: Optional[float] = None
    beta: Optional[float] = None
    eps: Optional[float] = None
    dividend_yield: Optional[float] = None
    dividend_per_share: Optional[float] = None
    profit_margin_ttm: Optional[float] = None
    return_on_equity_ttm: Optional[float] = None
    revenue_ttm: Optional[float] = None
    price_to_book_ratio: Optional[float] = None
    book_value: Optional[float] = None
    revenue_per_share_ttm: Optional[float] = None
    operating_margin_ttm: Optional[float] = None
    return_on_assets_ttm: Optional[float] = None
    gross_profit_ttm: Optional[float] = None
    quarterly_earnings_growth_yoy: Optional[float] = None
    quarterly_revenue_growth_yoy: Optional[float] = None
    analyst_target_price: Optional[float] = None
    trailing_pe: Optional[float] = None
    forward_pe: Optional[float] = None
    price_to_sales_ratio_ttm: Optional[float] = None
    ev_to_revenue: Optional[float] = None
    ev_to_ebitda: Optional[float] = None
    
    # 52주 고가/저가 및 이동평균
    week_52_high: Optional[float] = None
    week_52_low: Optional[float] = None
    day_50_avg: Optional[float] = None
    day_200_avg: Optional[float] = None
    
    # 암호화폐 정보 (암호화폐인 경우)
    crypto_symbol: Optional[str] = None
    crypto_name: Optional[str] = None
    crypto_market_cap: Optional[float] = None
    circulating_supply: Optional[float] = None
    total_supply: Optional[float] = None
    max_supply: Optional[float] = None
    crypto_current_price: Optional[float] = None
    volume_24h: Optional[float] = None
    percent_change_1h: Optional[float] = None
    percent_change_24h: Optional[float] = None
    percent_change_7d: Optional[float] = None
    percent_change_30d: Optional[float] = None
    cmc_rank: Optional[int] = None
    category: Optional[str] = None
    crypto_description: Optional[str] = None
    logo_url: Optional[str] = None
    website_url: Optional[str] = None
    slug: Optional[str] = None
    date_added: Optional[date] = None
    platform: Optional[str] = None
    explorer: Optional[List[str]] = None
    source_code: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    crypto_is_active: Optional[bool] = None
    crypto_last_updated: Optional[datetime] = None
    
    # ETF 정보 (ETF인 경우)
    net_assets: Optional[float] = None
    net_expense_ratio: Optional[float] = None
    portfolio_turnover: Optional[float] = None
    etf_dividend_yield: Optional[float] = None
    inception_date: Optional[date] = None
    leveraged: Optional[bool] = None
    sectors: Optional[List[Dict[str, Any]]] = None
    holdings: Optional[List[Dict[str, Any]]] = None


