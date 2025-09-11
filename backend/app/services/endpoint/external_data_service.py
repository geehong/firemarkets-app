"""
External data service that integrates multiple API clients.
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

from app.external_apis.implementations import (
    AlphaVantageClient,
    FMPClient,
    BinanceClient,
    CoinbaseClient,
    CoinMarketCapClient
)

logger = logging.getLogger(__name__)


class ExternalDataService:
    """Service for fetching data from external APIs"""
    
    def __init__(self):
        self.alpha_vantage = AlphaVantageClient()
        self.fmp = FMPClient()
        self.binance = BinanceClient()
        self.coinbase = CoinbaseClient()
        self.coinmarketcap = CoinMarketCapClient()
    
    async def test_all_connections(self) -> Dict[str, bool]:
        """Test connections to all external APIs"""
        results = {}
        
        try:
            results["alpha_vantage"] = await self.alpha_vantage.test_connection()
        except Exception as e:
            logger.error(f"Alpha Vantage connection test failed: {e}")
            results["alpha_vantage"] = False
        
        try:
            results["fmp"] = await self.fmp.test_connection()
        except Exception as e:
            logger.error(f"FMP connection test failed: {e}")
            results["fmp"] = False
        
        try:
            results["binance"] = await self.binance.test_connection()
        except Exception as e:
            logger.error(f"Binance connection test failed: {e}")
            results["binance"] = False
        
        try:
            results["coinbase"] = await self.coinbase.test_connection()
        except Exception as e:
            logger.error(f"Coinbase connection test failed: {e}")
            results["coinbase"] = False
        
        try:
            results["coinmarketcap"] = await self.coinmarketcap.test_connection()
        except Exception as e:
            logger.error(f"CoinMarketCap connection test failed: {e}")
            results["coinmarketcap"] = False
        
        return results
    
    async def get_stock_data(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Get stock data from multiple sources"""
        data = {
            "ticker": ticker,
            "sources": {},
            "timestamp": datetime.now()
        }
        
        # Try Alpha Vantage first
        try:
            overview = await self.alpha_vantage.get_company_overview(ticker)
            if overview:
                data["sources"]["alpha_vantage"] = {
                    "company_name": overview.get("Name"),
                    "sector": overview.get("Sector"),
                    "industry": overview.get("Industry"),
                    "market_cap": self._safe_float(overview.get("MarketCapitalization")),
                    "pe_ratio": self._safe_float(overview.get("PERatio")),
                    "dividend_yield": self._safe_float(overview.get("DividendYield")),
                    "beta": self._safe_float(overview.get("Beta")),
                    "description": overview.get("Description")
                }
        except Exception as e:
            logger.error(f"Alpha Vantage stock data fetch failed for {ticker}: {e}")
        
        # Try FMP as backup
        if not data["sources"].get("alpha_vantage"):
            try:
                profile = await self.fmp.get_company_profile(ticker)
                if profile:
                    data["sources"]["fmp"] = {
                        "company_name": profile.get("companyName"),
                        "sector": profile.get("sector"),
                        "industry": profile.get("industry"),
                        "market_cap": self._safe_float(profile.get("mktCap")),
                        "pe_ratio": self._safe_float(profile.get("pe")),
                        "beta": self._safe_float(profile.get("beta")),
                        "description": profile.get("description")
                    }
            except Exception as e:
                logger.error(f"FMP stock data fetch failed for {ticker}: {e}")
        
        return data if data["sources"] else None
    
    async def get_crypto_data(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get cryptocurrency data from multiple sources"""
        data = {
            "symbol": symbol,
            "sources": {},
            "timestamp": datetime.now()
        }
        
        # Try CoinMarketCap first
        try:
            quote = await self.coinmarketcap.get_cryptocurrency_quotes(symbol)
            if quote:
                data["sources"]["coinmarketcap"] = {
                    "name": quote.get("name"),
                    "market_cap": quote.get("market_cap"),
                    "price": quote.get("price"),
                    "volume_24h": quote.get("volume_24h"),
                    "percent_change_24h": quote.get("percent_change_24h"),
                    "circulating_supply": quote.get("circulating_supply"),
                    "total_supply": quote.get("total_supply"),
                    "cmc_rank": quote.get("cmc_rank")
                }
        except Exception as e:
            logger.error(f"CoinMarketCap crypto data fetch failed for {symbol}: {e}")
        
        # Try Binance as backup
        if not data["sources"].get("coinmarketcap"):
            try:
                ticker_24h = await self.binance.get_24hr_ticker(symbol)
                if ticker_24h:
                    data["sources"]["binance"] = {
                        "price": ticker_24h.get("last_price"),
                        "volume": ticker_24h.get("volume"),
                        "price_change": ticker_24h.get("price_change"),
                        "price_change_percent": ticker_24h.get("price_change_percent"),
                        "high": ticker_24h.get("high_price"),
                        "low": ticker_24h.get("low_price")
                    }
            except Exception as e:
                logger.error(f"Binance crypto data fetch failed for {symbol}: {e}")
        
        return data if data["sources"] else None
    
    async def get_market_data(self, ticker: str, asset_type: str = "stock") -> Optional[Dict[str, Any]]:
        """Get market data (OHLCV) for a ticker"""
        if asset_type == "crypto":
            # Try Binance first for crypto
            try:
                ohlcv = await self.binance.get_ohlcv_data(ticker, interval="1d", limit=100)
                if ohlcv:
                    return {
                        "ticker": ticker,
                        "asset_type": asset_type,
                        "data": ohlcv,
                        "source": "binance",
                        "timestamp": datetime.now()
                    }
            except Exception as e:
                logger.error(f"Binance OHLCV fetch failed for {ticker}: {e}")
            
            # Try Coinbase as backup
            try:
                ohlcv = await self.coinbase.get_ohlcv_data(ticker)
                if ohlcv:
                    return {
                        "ticker": ticker,
                        "asset_type": asset_type,
                        "data": ohlcv,
                        "source": "coinbase",
                        "timestamp": datetime.now()
                    }
            except Exception as e:
                logger.error(f"Coinbase OHLCV fetch failed for {ticker}: {e}")
        
        else:
            # Try Alpha Vantage first for stocks
            try:
                ohlcv = await self.alpha_vantage.get_ohlcv_data(ticker)
                if ohlcv:
                    return {
                        "ticker": ticker,
                        "asset_type": asset_type,
                        "data": ohlcv,
                        "source": "alpha_vantage",
                        "timestamp": datetime.now()
                    }
            except Exception as e:
                logger.error(f"Alpha Vantage OHLCV fetch failed for {ticker}: {e}")
            
            # Try FMP as backup
            try:
                ohlcv = await self.fmp.get_ohlcv_data(ticker)
                if ohlcv:
                    return {
                        "ticker": ticker,
                        "asset_type": asset_type,
                        "data": ohlcv,
                        "source": "fmp",
                        "timestamp": datetime.now()
                    }
            except Exception as e:
                logger.error(f"FMP OHLCV fetch failed for {ticker}: {e}")
        
        return None
    
    # async def get_global_crypto_metrics(self) -> Optional[Dict[str, Any]]:
    #     """Get global cryptocurrency market metrics"""
    #     try:
    #         metrics = await self.coinmarketcap.get_global_metrics()
    #         if metrics:
    #             return {
    #                 "total_market_cap": metrics.get("total_market_cap"),
    #                 "total_volume_24h": metrics.get("total_volume_24h"),
    #                 "bitcoin_dominance": metrics.get("btc_dominance"),
    #                 "ethereum_dominance": metrics.get("eth_dominance"),
    #                 "total_cryptocurrencies": metrics.get("active_cryptocurrencies"),
    #                 "active_cryptocurrencies": metrics.get("active_cryptocurrencies"),
    #                 "market_cap_change_24h": 0.0,  # TODO: Calculate from historical data
    #                 "volume_change_24h": 0.0,  # TODO: Calculate from historical data
    #                 "last_updated": datetime.now()
    #             }
    #     except Exception as e:
    #         logger.error(f"Global crypto metrics fetch failed: {e}")
    #     
    #     return None
    
    def _safe_float(self, value: Any, default: float = None) -> Optional[float]:
        """Safely convert value to float"""
        if value is None:
            return default
        try:
            return float(value)
        except (ValueError, TypeError):
            return default 