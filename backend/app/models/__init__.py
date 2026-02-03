# backend/app/models/__init__.py

# Import Base from database
from app.core.database import Base

# All models are now consolidated in asset.py
from .asset import (
    # Core models
    Asset,
    AssetType,
    
    # Stock models
    OHLCVData,
    OHLCVIntradayData,
    RealtimeQuoteTimeDelay,
    StockProfile,
    StockFinancial,
    StockAnalystEstimate,
    MacrotrendsFinancial,
    MacrotrendsField,
    
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
    TokenBlacklist,
    AuditLog,
)

# KIS models
from .kis_master import KisKwMaster
from .kis_overseas_master import KisOverseasMaster
from .kis_foreign_index_master import KisForeignIndexMaster

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
    "Base",
    # Core models
    "Asset",
    "AssetType",
    
    # Stock models
    "OHLCVData",
    "OHLCVIntradayData",
    "RealtimeQuoteTimeDelay",
    "StockProfile",
    "StockFinancial",
    "StockAnalystEstimate",
    "MacrotrendsFinancial",
    "MacrotrendsField",
    
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
    "TokenBlacklist",
    "AuditLog",
    "KisKwMaster",
    "KisOverseasMaster",
    "KisForeignIndexMaster",
    
    # Post models
    "Post",
    "PostCategory",
    "PostTag",
    "PostComment",
    "PostProduct",
    "PostChart",
    "PostTagAssociation",
]
