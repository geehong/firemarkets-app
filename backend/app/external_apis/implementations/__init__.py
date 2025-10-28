"""
API Client Implementations

This module contains concrete implementations of API clients
that inherit from the abstract base classes defined in the base module.
"""

from .fmp_client import FMPClient
from .binance_client import BinanceClient
from .bitcoin_data_client import BitcoinDataClient
from .tiingo_client import TiingoClient
from .alpha_vantage_client import AlphaVantageClient
from .polygon_client import PolygonClient
from .coinbase_client import CoinbaseClient
from .coingecko_client import CoinGeckoClient
from .coinmarketcap_client import CoinMarketCapClient
from .twelvedata_client import TwelveDataClient
from .finnhub_client import FinnhubClient
from .macrotrends_client import MacrotrendsClient

__all__ = [
    # Traditional Financial API Clients
    "FMPClient",
    "TiingoClient", 
    "AlphaVantageClient",
    "PolygonClient",
    "TwelveDataClient",
    "FinnhubClient",
    "MacrotrendsClient",
    
    # Cryptocurrency API Clients
    "BinanceClient",
    "CoinbaseClient",
    "CoinGeckoClient", 
    "CoinMarketCapClient",
    
    # On-chain Data API Clients
    "BitcoinDataClient",
]
