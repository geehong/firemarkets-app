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

# Financial models
from .financial import (
    FinancialStatement,
    FinancialMetrics,
    CompanyFinancials,
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

# Post models
from .blog import (
    Post,
    PostCategory,
    PostTag,
    PostComment,
    PostProduct,
    PostChart,
    PostTagAssociation,
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
    
    # Financial models
    "FinancialStatement",
    "FinancialMetrics",
    "CompanyFinancials",
    
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
    
    # Post models
    "Post",
    "PostCategory",
    "PostTag",
    "PostComment",
    "PostProduct",
    "PostChart",
    "PostTagAssociation",
]
