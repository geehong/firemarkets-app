"""
Crypto-related Pydantic schemas.
"""
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from decimal import Decimal
from pydantic import BaseModel, Field


class CryptoAssetBase(BaseModel):
    """Base crypto asset model"""
    symbol: str = Field(..., description="Cryptocurrency symbol")
    name: str = Field(..., description="Cryptocurrency name")
    price: Optional[Decimal] = Field(None, description="Current price")
    market_cap: Optional[Decimal] = Field(None, description="Market capitalization")
    volume_24h: Optional[Decimal] = Field(None, description="24-hour trading volume")
    price_change_24h: Optional[Decimal] = Field(None, description="24-hour price change")
    price_change_percent_24h: Optional[Decimal] = Field(None, description="24-hour price change percentage")
    circulating_supply: Optional[Decimal] = Field(None, description="Circulating supply")
    total_supply: Optional[Decimal] = Field(None, description="Total supply")
    max_supply: Optional[Decimal] = Field(None, description="Maximum supply")
    rank: Optional[int] = Field(None, description="Market cap rank")
    is_active: bool = Field(default=True, description="Whether the cryptocurrency is active")


class CryptoAssetCreate(CryptoAssetBase):
    """Crypto asset creation model"""
    pass


class CryptoAssetUpdate(BaseModel):
    """Crypto asset update model"""
    name: Optional[str] = Field(None, description="Cryptocurrency name")
    price: Optional[Decimal] = Field(None, description="Current price")
    market_cap: Optional[Decimal] = Field(None, description="Market capitalization")
    volume_24h: Optional[Decimal] = Field(None, description="24-hour trading volume")
    price_change_24h: Optional[Decimal] = Field(None, description="24-hour price change")
    price_change_percent_24h: Optional[Decimal] = Field(None, description="24-hour price change percentage")
    circulating_supply: Optional[Decimal] = Field(None, description="Circulating supply")
    total_supply: Optional[Decimal] = Field(None, description="Total supply")
    max_supply: Optional[Decimal] = Field(None, description="Maximum supply")
    rank: Optional[int] = Field(None, description="Market cap rank")
    is_active: Optional[bool] = Field(None, description="Whether the cryptocurrency is active")


class CryptoAssetResponse(CryptoAssetBase):
    """Crypto asset response model"""
    crypto_asset_id: int = Field(..., description="Unique crypto asset ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    class Config:
        from_attributes = True


class CryptoAssetListResponse(BaseModel):
    """Crypto asset list response model"""
    crypto_assets: List[CryptoAssetResponse] = Field(..., description="List of crypto assets")
    total: int = Field(..., description="Total number of crypto assets")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Number of assets per page")
    pages: int = Field(..., description="Total number of pages")


class CryptoPriceData(BaseModel):
    """Crypto price data model"""
    crypto_asset_id: int = Field(..., description="Crypto asset ID")
    symbol: str = Field(..., description="Cryptocurrency symbol")
    timestamp: datetime = Field(..., description="Price timestamp")
    price: Optional[Decimal] = Field(None, description="Price")
    volume: Optional[Decimal] = Field(None, description="Trading volume")
    market_cap: Optional[Decimal] = Field(None, description="Market capitalization")
    price_change: Optional[Decimal] = Field(None, description="Price change")
    price_change_percent: Optional[Decimal] = Field(None, description="Price change percentage")


class CryptoMetrics(BaseModel):
    """Crypto metrics model"""
    crypto_asset_id: int = Field(..., description="Crypto asset ID")
    symbol: str = Field(..., description="Cryptocurrency symbol")
    volatility: Optional[Decimal] = Field(None, description="Price volatility")
    sharpe_ratio: Optional[Decimal] = Field(None, description="Sharpe ratio")
    beta: Optional[Decimal] = Field(None, description="Beta coefficient")
    correlation_btc: Optional[Decimal] = Field(None, description="Correlation with Bitcoin")
    correlation_eth: Optional[Decimal] = Field(None, description="Correlation with Ethereum")
    market_dominance: Optional[Decimal] = Field(None, description="Market dominance percentage")
    updated_at: datetime = Field(..., description="Last update timestamp")


# New schemas for actual API responses
class OHLCVPoint(BaseModel):
    """OHLCV data point"""
    timestamp_utc: date = Field(..., description="Timestamp")
    open_price: float = Field(..., description="Opening price")
    high_price: float = Field(..., description="Highest price")
    low_price: float = Field(..., description="Lowest price")
    close_price: float = Field(..., description="Closing price")
    volume: float = Field(..., description="Trading volume")
    change_percent: Optional[float] = Field(None, description="Price change percentage")


class BitcoinHalvingPeriodDataResponse(BaseModel):
    """Response model for /bitcoin/halving-data/{period_number} endpoint"""
    period_number: int = Field(..., description="Halving period number")
    start_date: date = Field(..., description="Period start date")
    end_date: date = Field(..., description="Period end date")
    ohlcv_data: List[OHLCVPoint] = Field(..., description="OHLCV data for the period")
    metadata: Dict[str, Any] = Field(..., description="Period metadata")


class BitcoinHalvingSummary(BaseModel):
    """Response model for /bitcoin/halving-summary endpoint"""
    total_periods: int = Field(..., description="Total number of halving periods")
    current_period: int = Field(..., description="Current halving period")
    next_halving_date: Optional[date] = Field(None, description="Next halving date")
    blocks_until_halving: Optional[int] = Field(None, description="Blocks until next halving")
    current_block_reward: float = Field(..., description="Current block reward")
    next_block_reward: float = Field(..., description="Next block reward after halving")
    periods: List[Dict[str, Any]] = Field(..., description="All halving periods data")


class NextHalvingInfo(BaseModel):
    """Response model for /bitcoin/next-halving endpoint"""
    next_halving_date: Optional[date] = Field(None, description="Next halving date")
    blocks_until_halving: Optional[int] = Field(None, description="Blocks until next halving")
    current_block_reward: float = Field(..., description="Current block reward")
    next_block_reward: float = Field(..., description="Next block reward after halving")
    estimated_days_until_halving: Optional[int] = Field(None, description="Estimated days until halving")


class CryptoDataItem(BaseModel):
    """Individual crypto data item"""
    symbol: str = Field(..., description="Cryptocurrency symbol")
    name: str = Field(..., description="Cryptocurrency name")
    price: float = Field(..., description="Current price")
    market_cap: float = Field(..., description="Market capitalization")
    volume_24h: float = Field(..., description="24-hour trading volume")
    price_change_24h: float = Field(..., description="24-hour price change")
    price_change_percent_24h: float = Field(..., description="24-hour price change percentage")
    circulating_supply: Optional[float] = Field(None, description="Circulating supply")
    total_supply: Optional[float] = Field(None, description="Total supply")
    max_supply: Optional[float] = Field(None, description="Maximum supply")
    rank: int = Field(..., description="Market cap rank")
    last_updated: datetime = Field(..., description="Last update timestamp")


class CryptoDataResponse(BaseModel):
    """Response model for /data/{symbol} endpoint"""
    data: CryptoDataItem = Field(..., description="Cryptocurrency data")


class TopCryptosResponse(BaseModel):
    """Response model for /top endpoint"""
    data: List[CryptoDataItem] = Field(..., description="Top cryptocurrencies")
    total_count: int = Field(..., description="Total number of cryptocurrencies")


# class CryptoMetricsResponse(BaseModel):
#     """Response model for /metrics/{symbol} endpoint"""
#     symbol: str = Field(..., description="Cryptocurrency symbol")
#     volatility: Optional[float] = Field(None, description="Price volatility")
#     sharpe_ratio: Optional[float] = Field(None, description="Sharpe ratio")
#     beta: Optional[float] = Field(None, description="Beta coefficient")
#     correlation_btc: Optional[float] = Field(None, description="Correlation with Bitcoin")
#     correlation_eth: Optional[float] = Field(None, description="Correlation with Ethereum")
#     market_dominance: Optional[float] = Field(None, description="Market dominance percentage")
#     price_data: List[Dict[str, Any]] = Field(..., description="Historical price data")
#     updated_at: datetime = Field(..., description="Last update timestamp")


class GlobalCryptoMetrics(BaseModel):
    """Response model for /global-metrics endpoint"""
    total_market_cap: float = Field(..., description="Total market capitalization")
    total_volume_24h: float = Field(..., description="Total 24-hour volume")
    bitcoin_dominance: float = Field(..., description="Bitcoin market dominance")
    ethereum_dominance: float = Field(..., description="Ethereum market dominance")
    total_cryptocurrencies: int = Field(..., description="Total number of cryptocurrencies")
    active_cryptocurrencies: int = Field(..., description="Number of active cryptocurrencies")
    market_cap_change_24h: float = Field(..., description="24-hour market cap change")
    volume_change_24h: float = Field(..., description="24-hour volume change")
    last_updated: datetime = Field(..., description="Last update timestamp")



