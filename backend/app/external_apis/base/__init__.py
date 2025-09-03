"""
Base classes for API clients.
"""
from .base_client import BaseAPIClient
from .tradfi_client import TradFiAPIClient
from .crypto_client import CryptoAPIClient
from .onchain_client import OnChainAPIClient
from .schemas import (
    # 가격 또는 수치 데이터
    OhlcvDataPoint,
    RealtimeQuoteData,
    BondMarketData,
    WorldAssetsRankingData,
    
    # 정보 데이터
    CompanyProfileData,
    StockFinancialsData,
    StockAnalystEstimatesData,
    EtfInfoData,
    EtfSectorExposureData,
    EtfHoldingsData,
    CryptoData,
    IndexInfoData,
    TechnicalIndicatorsData,
    
    # API 응답 래퍼
    ApiResponse,
    PaginatedResponse,
    
    # 유틸리티 타입들
    OhlcvData,
    RealtimeQuotes,
    CompanyProfiles,
    StockFinancials,
    StockAnalystEstimates,
    EtfInfos,
    EtfSectorExposures,
    EtfHoldings,
    CryptoDataList,
    IndexInfos,
    TechnicalIndicators,
    AnyFinancialData,
    AnyProfileData,
    AnyMarketData
)

__all__ = [
    "BaseAPIClient",
    "TradFiAPIClient", 
    "CryptoAPIClient",
    "OnChainAPIClient",
    
    # 스키마들
    "OhlcvDataPoint",
    "RealtimeQuoteData", 
    "BondMarketData",
    "WorldAssetsRankingData",
    "CompanyProfileData",
    "StockFinancialsData",
    "StockAnalystEstimatesData",
    "EtfInfoData",
    "EtfSectorExposureData",
    "EtfHoldingsData",
    "CryptoData",
    "IndexInfoData",
    "TechnicalIndicatorsData",
    "ApiResponse",
    "PaginatedResponse",
    
    # 유틸리티 타입들
    "OhlcvData",
    "RealtimeQuotes",
    "CompanyProfiles", 
    "StockFinancials",
    "StockAnalystEstimates",
    "EtfInfos",
    "EtfSectorExposures",
    "EtfHoldings",
    "CryptoDataList",
    "IndexInfos",
    "TechnicalIndicators",
    "AnyFinancialData",
    "AnyProfileData",
    "AnyMarketData"
]
