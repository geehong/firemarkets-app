"""
CRUD operations for database models.
"""

# Base CRUD
from .base import CRUDBase

# Asset CRUD
from .asset import (
    CRUDAsset, CRUDOHLCV, CRUDStockFinancial, 
    CRUDStockProfile, CRUDStockEstimate, CRUDIndexInfo,
    crud_asset, crud_ohlcv, crud_stock_financial,
    crud_stock_profile, crud_stock_estimate, crud_index_info
)

# Crypto CRUD
from .crypto import (
    CRUDCryptoMetric, CRUDCryptoData,
    crud_crypto_metric, crud_crypto_data
)

# ETF CRUD
from .etf import (
    CRUDEtfInfo, CRUDEtfSectorExposure, CRUDEtfHolding,
    crud_etf_info, crud_etf_sector_exposure, crud_etf_holding
)

# Onchain CRUD
from .onchain import (
    CRUDCryptoMetric,
    crud_onchain_metric
)

# World Assets CRUD
from .world_assets import (
    CRUDWorldAssetsRanking, CRUDBondMarketData, CRUDScrapingLogs,
    crud_world_assets_ranking, crud_bond_market_data, crud_scraping_logs
)

__all__ = [
    # Base
    "CRUDBase",
    
    # Asset
    "CRUDAsset", "CRUDOHLCV", "CRUDStockFinancial", 
    "CRUDStockProfile", "CRUDStockEstimate", "CRUDIndexInfo",
    "crud_asset", "crud_ohlcv", "crud_stock_financial",
    "crud_stock_profile", "crud_stock_estimate", "crud_index_info",
    
    # Crypto
    "CRUDCryptoMetric", "CRUDCryptoData",
    "crud_crypto_metric", "crud_crypto_data",
    
    # ETF
    "CRUDEtfInfo", "CRUDEtfSectorExposure", "CRUDEtfHolding",
    "crud_etf_info", "crud_etf_sector_exposure", "crud_etf_holding",
    
    # Onchain
    "CRUDCryptoMetric",
    "crud_onchain_metric",
    
    # World Assets
    "CRUDWorldAssetsRanking", "CRUDBondMarketData", "CRUDScrapingLogs",
    "crud_world_assets_ranking", "crud_bond_market_data", "crud_scraping_logs"
]



