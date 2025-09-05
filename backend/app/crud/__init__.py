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

# Crypto, ETF, Onchain CRUD files removed - models consolidated into asset.py

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
    
    # Crypto, ETF, Onchain CRUD removed - models consolidated into asset.py
    
    # World Assets
    "CRUDWorldAssetsRanking", "CRUDBondMarketData", "CRUDScrapingLogs",
    "crud_world_assets_ranking", "crud_bond_market_data", "crud_scraping_logs"
]



