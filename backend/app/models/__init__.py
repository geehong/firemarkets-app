# backend_temp/app/models/__init__.py

# Asset related models
from .asset import (
    Asset,
    AssetType,
    OHLCVData,
    StockProfile,
    StockFinancial,
    StockAnalystEstimate,
    IndexInfo,
)

# Crypto related models
from .crypto import (
    CryptoMetric,
    CryptoData,
)

# ETF related models
from .etf import (
    EtfInfo,
    EtfSectorExposure,
    EtfHolding,
)

# Onchain related models
from .onchain import (
    OnchainMetricsInfo,
)

# System related models
from .system import (
    AppConfiguration,
    SchedulerLog,
    ApiCallLog,
    TechnicalIndicator,
    EconomicIndicator,
)

# World assets related models
from .world_assets import (
    WorldAssetsRanking,
    BondMarketData,
    ScrapingLogs,
)

# Export all models
__all__ = [
    # Asset models
    "Asset",
    "AssetType", 
    "OHLCVData",
    "StockProfile",
    "StockFinancial",
    "StockAnalystEstimate",
    "IndexInfo",
    
    # Crypto models
    "CryptoMetric",
    "CryptoData",
    
    # ETF models
    "EtfInfo",
    "EtfSectorExposure",
    "EtfHolding",
    
    # Onchain models
    "OnchainMetricsInfo",
    
    # System models
    "AppConfiguration",
    "SchedulerLog",
    "ApiCallLog",
    "TechnicalIndicator",
    "EconomicIndicator",
    
    # World assets models
    "WorldAssetsRanking",
    "BondMarketData",
    "ScrapingLogs",
]
