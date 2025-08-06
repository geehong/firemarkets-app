"""
Onchain data-related Pydantic schemas.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from decimal import Decimal
from pydantic import BaseModel, Field


class OnchainDataBase(BaseModel):
    """Base onchain data model"""
    blockchain: str = Field(..., description="Blockchain name")
    metric_name: str = Field(..., description="Metric name")
    value: Optional[Decimal] = Field(None, description="Metric value")
    unit: Optional[str] = Field(None, description="Value unit")
    description: Optional[str] = Field(None, description="Metric description")
    source: Optional[str] = Field(None, description="Data source")


class OnchainDataCreate(OnchainDataBase):
    """Onchain data creation model"""
    pass


class OnchainDataUpdate(BaseModel):
    """Onchain data update model"""
    value: Optional[Decimal] = Field(None, description="Metric value")
    unit: Optional[str] = Field(None, description="Value unit")
    description: Optional[str] = Field(None, description="Metric description")
    source: Optional[str] = Field(None, description="Data source")


class OnchainDataResponse(OnchainDataBase):
    """Onchain data response model"""
    onchain_id: int = Field(..., description="Unique onchain data ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    class Config:
        from_attributes = True


class OnchainDataListResponse(BaseModel):
    """Onchain data list response model"""
    onchain_data: List[OnchainDataResponse] = Field(..., description="List of onchain data")
    total: int = Field(..., description="Total number of onchain data records")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Number of records per page")
    pages: int = Field(..., description="Total number of pages")


class BitcoinMetrics(BaseModel):
    """Bitcoin-specific metrics model"""
    bitcoin_id: int = Field(..., description="Bitcoin metrics ID")
    price: Optional[Decimal] = Field(None, description="Bitcoin price")
    market_cap: Optional[Decimal] = Field(None, description="Market capitalization")
    circulating_supply: Optional[Decimal] = Field(None, description="Circulating supply")
    total_supply: Optional[Decimal] = Field(None, description="Total supply")
    max_supply: Optional[Decimal] = Field(None, description="Maximum supply")
    volume_24h: Optional[Decimal] = Field(None, description="24-hour volume")
    dominance: Optional[Decimal] = Field(None, description="Market dominance")
    active_addresses: Optional[int] = Field(None, description="Active addresses")
    transaction_count: Optional[int] = Field(None, description="Transaction count")
    hash_rate: Optional[Decimal] = Field(None, description="Hash rate")
    difficulty: Optional[Decimal] = Field(None, description="Mining difficulty")
    block_height: Optional[int] = Field(None, description="Current block height")
    block_time: Optional[Decimal] = Field(None, description="Average block time")
    mempool_size: Optional[int] = Field(None, description="Mempool size")
    mempool_fees: Optional[Decimal] = Field(None, description="Mempool fees")
    updated_at: datetime = Field(..., description="Last update timestamp")


class EthereumMetrics(BaseModel):
    """Ethereum-specific metrics model"""
    ethereum_id: int = Field(..., description="Ethereum metrics ID")
    price: Optional[Decimal] = Field(None, description="Ethereum price")
    market_cap: Optional[Decimal] = Field(None, description="Market capitalization")
    circulating_supply: Optional[Decimal] = Field(None, description="Circulating supply")
    total_supply: Optional[Decimal] = Field(None, description="Total supply")
    volume_24h: Optional[Decimal] = Field(None, description="24-hour volume")
    dominance: Optional[Decimal] = Field(None, description="Market dominance")
    active_addresses: Optional[int] = Field(None, description="Active addresses")
    transaction_count: Optional[int] = Field(None, description="Transaction count")
    gas_price: Optional[Decimal] = Field(None, description="Gas price")
    gas_used: Optional[Decimal] = Field(None, description="Gas used")
    block_height: Optional[int] = Field(None, description="Current block height")
    block_time: Optional[Decimal] = Field(None, description="Average block time")
    total_value_locked: Optional[Decimal] = Field(None, description="Total value locked in DeFi")
    defi_protocols: Optional[int] = Field(None, description="Number of DeFi protocols")
    updated_at: datetime = Field(..., description="Last update timestamp")


class DeFiMetrics(BaseModel):
    """DeFi metrics model"""
    defi_id: int = Field(..., description="DeFi metrics ID")
    total_value_locked: Optional[Decimal] = Field(None, description="Total value locked")
    defi_market_cap: Optional[Decimal] = Field(None, description="DeFi market capitalization")
    defi_dominance: Optional[Decimal] = Field(None, description="DeFi dominance")
    lending_protocols: Optional[int] = Field(None, description="Number of lending protocols")
    dex_protocols: Optional[int] = Field(None, description="Number of DEX protocols")
    yield_farming_protocols: Optional[int] = Field(None, description="Number of yield farming protocols")
    stablecoin_market_cap: Optional[Decimal] = Field(None, description="Stablecoin market cap")
    stablecoin_dominance: Optional[Decimal] = Field(None, description="Stablecoin dominance")
    updated_at: datetime = Field(..., description="Last update timestamp")


class NetworkMetrics(BaseModel):
    """Network metrics model"""
    network_id: int = Field(..., description="Network metrics ID")
    blockchain: str = Field(..., description="Blockchain name")
    active_nodes: Optional[int] = Field(None, description="Active nodes")
    network_hash_rate: Optional[Decimal] = Field(None, description="Network hash rate")
    difficulty: Optional[Decimal] = Field(None, description="Network difficulty")
    block_height: Optional[int] = Field(None, description="Current block height")
    block_time: Optional[Decimal] = Field(None, description="Average block time")
    transaction_throughput: Optional[Decimal] = Field(None, description="Transaction throughput")
    network_utilization: Optional[Decimal] = Field(None, description="Network utilization")
    updated_at: datetime = Field(..., description="Last update timestamp")


class OnchainAlert(BaseModel):
    """Onchain alert model"""
    alert_id: int = Field(..., description="Unique alert ID")
    blockchain: str = Field(..., description="Blockchain name")
    alert_type: str = Field(..., description="Alert type")
    severity: str = Field(..., description="Alert severity")
    title: str = Field(..., description="Alert title")
    message: str = Field(..., description="Alert message")
    threshold: Optional[Decimal] = Field(None, description="Alert threshold")
    current_value: Optional[Decimal] = Field(None, description="Current value")
    is_active: bool = Field(default=True, description="Whether alert is active")
    created_at: datetime = Field(..., description="Alert creation timestamp")
    triggered_at: Optional[datetime] = Field(None, description="Alert trigger timestamp")






