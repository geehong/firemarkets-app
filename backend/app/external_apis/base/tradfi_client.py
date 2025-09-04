"""
Abstract base class for traditional financial API clients.
"""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from datetime import datetime

from .base_client import BaseAPIClient
from .schemas import (
    OhlcvDataPoint,
    CompanyProfileData,
    StockFinancialsData,
    StockAnalystEstimatesData,
    RealtimeQuoteData,
    TechnicalIndicatorsData,
    EtfSectorExposureData
)


class TradFiAPIClient(BaseAPIClient, ABC):
    """Abstract base class for traditional financial API clients (stocks, ETFs, commodities)"""
    
    @abstractmethod
    async def get_ohlcv_data(
        self, 
        symbol: str, 
        interval: str = "1d",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[OhlcvDataPoint]:
        """
        Get OHLCV data for a symbol.
        
        Args:
            symbol: Stock/ETF/Commodity symbol
            interval: Data interval (1d, 1h, etc.)
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format
            limit: Maximum number of data points
            
        Returns:
            List of standardized OHLCV data points
        """
        pass
    
    @abstractmethod
    async def get_company_profile(self, symbol: str) -> Optional[CompanyProfileData]:
        """
        Get company profile information.
        
        Args:
            symbol: Stock/ETF symbol
            
        Returns:
            Standardized company profile data or None
        """
        pass
    
    @abstractmethod
    async def get_market_cap(self, symbol: str) -> Optional[float]:
        """
        Get market capitalization.
        
        Args:
            symbol: Stock/ETF symbol
            
        Returns:
            Market cap value or None
        """
        pass
    
    @abstractmethod
    async def get_realtime_quote(self, symbol: str) -> Optional[RealtimeQuoteData]:
        """
        Get real-time quote for a symbol.
        
        Args:
            symbol: Stock/ETF/Commodity symbol
            
        Returns:
            Standardized real-time quote data or None
        """
        pass
    
    @abstractmethod
    async def get_technical_indicators(self, symbol: str) -> Optional[TechnicalIndicatorsData]:
        """
        Get technical indicators for a symbol.
        
        Args:
            symbol: Stock/ETF/Commodity symbol
            
        Returns:
            Standardized technical indicators data or None
        """
        pass
    
    @abstractmethod
    async def get_etf_sector_exposure(self, symbol: str) -> Optional[List[EtfSectorExposureData]]:
        """
        Get ETF sector exposure data.
        
        Args:
            symbol: ETF symbol
            
        Returns:
            List of standardized sector exposure data or None if not available
        """
        pass
    
    @abstractmethod
    async def get_stock_financials(self, symbol: str) -> Optional[StockFinancialsData]:
        """
        Get stock financial data.
        
        Args:
            symbol: Stock symbol
            
        Returns:
            Standardized stock financial data or None if not available
        """
        pass

    # Optional: Analyst estimates. Not all providers support this.
    # Provide a default no-op implementation so callers can safely invoke it.
    async def get_analyst_estimates(self, symbol: str) -> Optional[List[StockAnalystEstimatesData]]:
        """
        Get analyst estimates data (optional).

        Args:
            symbol: Stock symbol

        Returns:
            List of standardized analyst estimate entries, or None if not available.
        """
        return None
