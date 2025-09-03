"""
Abstract base class for cryptocurrency API clients.
"""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from datetime import datetime

from .base_client import BaseAPIClient
from .schemas import (
    OhlcvDataPoint,
    RealtimeQuoteData,
    CryptoData
)


class CryptoAPIClient(BaseAPIClient, ABC):
    """Abstract base class for cryptocurrency API clients"""
    
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
        Get OHLCV data for a cryptocurrency.
        
        Args:
            symbol: Cryptocurrency symbol (e.g., 'BTCUSDT', 'ETH')
            interval: Data interval (1d, 1h, etc.)
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format
            limit: Maximum number of data points
            
        Returns:
            List of standardized OHLCV data points
        """
        pass
    
    @abstractmethod
    async def get_realtime_quote(self, symbol: str) -> Optional[RealtimeQuoteData]:
        """
        Get real-time quote for a cryptocurrency.
        
        Args:
            symbol: Cryptocurrency symbol
            
        Returns:
            Standardized real-time quote data or None
        """
        pass
    
    @abstractmethod
    async def get_exchange_info(self) -> Optional[Dict[str, Any]]:
        """
        Get exchange information.
        
        Returns:
            Exchange information or None
        """
        pass
    
    @abstractmethod
    async def get_global_metrics(self) -> Optional[Dict[str, Any]]:
        """
        Get global cryptocurrency market metrics.
        
        Returns:
            Global market metrics or None
        """
        pass
    
    @abstractmethod
    async def get_crypto_data(self, symbol: str) -> Optional[CryptoData]:
        """
        Get comprehensive cryptocurrency data.
        
        Args:
            symbol: Cryptocurrency symbol (e.g., 'BTC', 'ETH')
            
        Returns:
            Standardized cryptocurrency data or None
        """
        pass
