# backend/app/models/__init__.py

# All models are now consolidated in asset.py
from .asset import (
    # Core models
    Asset,
    AssetType,
    
    # Stock models
    OHLCVData,
    StockProfile,
    StockFinancial,
    StockAnalystEstimate,
    
    # ETF models
    ETFInfo,
    
    # Index models
    IndexInfo,
    
    # Crypto models
    CryptoData,
    CryptoMetric,
    
    # Real-time models
    RealtimeQuote,
    SparklineData,
    
    # Onchain models
    OnchainMetricsInfo,
    
    # World assets models
    WorldAssetsRanking,
    BondMarketData,
    ScrapingLogs,
)

# System related models
from .asset import (
    AppConfiguration,
    SchedulerLog,
    ApiCallLog,
    TechnicalIndicator,
    EconomicIndicator,
)

# User related models
from .asset import (
    User,
)

# Session related models
from .asset import (
    UserSession,
    TokenBlacklist,
    AuditLog,
)

# Export all models
__all__ = [
    # Core models
    "Asset",
    "AssetType",
    
    # Stock models
    "OHLCVData",
    "StockProfile",
    "StockFinancial",
    "StockAnalystEstimate",
    
    # ETF models
    "ETFInfo",
    
    # Index models
    "IndexInfo",
    
    # Crypto models
    "CryptoData",
    "CryptoMetric",
    
    # Real-time models
    "RealtimeQuote",
    "SparklineData",
    
    # Onchain models
    "OnchainMetricsInfo",
    
    # World assets models
    "WorldAssetsRanking",
    "BondMarketData",
    "ScrapingLogs",
    
    # System models
    "AppConfiguration",
    "SchedulerLog",
    "ApiCallLog",
    "TechnicalIndicator",
    "EconomicIndicator",
    
    # User models
    "User",
    
    # Session models
    "UserSession",
    "TokenBlacklist",
    "AuditLog",
]
