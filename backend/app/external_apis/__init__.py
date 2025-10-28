"""
External API clients for financial data.

This module provides access to all API clients organized by category:
- Traditional Financial API clients (stocks, ETFs, etc.)
- Cryptocurrency API clients
- On-chain data API clients
"""

# Base classes
from .base.base_client import BaseAPIClient
from .base.tradfi_client import TradFiAPIClient
from .base.crypto_client import CryptoAPIClient
from .base.onchain_client import OnChainAPIClient

# All implementations
from .implementations import (
    # Traditional Financial API Clients
    FMPClient, TiingoClient, AlphaVantageClient, PolygonClient, TwelveDataClient, MacrotrendsClient,
    # Cryptocurrency API Clients
    BinanceClient, CoinbaseClient, CoinGeckoClient, CoinMarketCapClient,
    # On-chain Data API Clients
    BitcoinDataClient
)

__all__ = [
    # Base classes
    "BaseAPIClient",
    "TradFiAPIClient",
    "CryptoAPIClient", 
    "OnChainAPIClient",
    
    # Traditional Financial API Clients
    "FMPClient",
    "TiingoClient",
    "AlphaVantageClient",
    "PolygonClient", 
    "TwelveDataClient",
    "MacrotrendsClient",
    
    # Cryptocurrency API Clients
    "BinanceClient",
    "CoinbaseClient",
    "CoinGeckoClient",
    "CoinMarketCapClient",
    
    # On-chain Data API Clients
    "BitcoinDataClient"
]






