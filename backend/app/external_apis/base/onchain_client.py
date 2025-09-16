"""
Abstract base class for onchain data API clients.
"""
from abc import ABC, abstractmethod
from typing import Optional, List
from datetime import datetime

from .base_client import BaseAPIClient
from .schemas import OnChainMetricData


class OnChainAPIClient(BaseAPIClient, ABC):
    """Abstract base class for onchain data API clients"""
    
    @abstractmethod
    async def get_onchain_metrics(
        self, 
        metric_type: str = "all",
        days: int = 30
    ) -> Optional[List[OnChainMetricData]]:
        """
        Get specific onchain metrics (e.g., MVRV, SOPR).
        
        Args:
            metric_type: Type of metric ("all", "mvrv", "nupl", "sopr", etc.)
            days: Number of days to fetch
            
        Returns:
            List of standardized onchain metrics data or None
        """
        pass
    
    @abstractmethod
    async def get_network_stats(
        self, 
        stat_type: str = "all",
        days: int = 30
    ) -> Optional[List[OnChainMetricData]]:
        """
        Get network statistics (e.g., hashrate, difficulty).
        
        Args:
            stat_type: Type of statistic ("all", "hashrate", "difficulty", etc.)
            days: Number of days to fetch
            
        Returns:
            List of standardized network statistics data or None
        """
        pass
