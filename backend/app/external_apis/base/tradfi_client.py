"""
Abstract base class for traditional financial API clients.
"""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from datetime import datetime

from .base_client import BaseAPIClient


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
    ) -> List[Dict[str, Any]]:
        """
        Get OHLCV data for a symbol.
        
        Args:
            symbol: Stock/ETF/Commodity symbol
            interval: Data interval (1d, 1h, etc.)
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format
            limit: Maximum number of data points
            
        Returns:
            List of OHLCV data dictionaries
        """
        pass
    
    @abstractmethod
    async def get_company_profile(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Get company profile information.
        
        Args:
            symbol: Stock/ETF symbol
            
        Returns:
            Company profile data or None
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
    async def get_realtime_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Get real-time quote for a symbol.
        
        Args:
            symbol: Stock/ETF/Commodity symbol
            
        Returns:
            Real-time quote data or None
        """
        pass
    
    @abstractmethod
    async def get_technical_indicators(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Get technical indicators for a symbol.
        
        Args:
            symbol: Stock/ETF/Commodity symbol
            
        Returns:
            Technical indicators data or None
        """
        pass
