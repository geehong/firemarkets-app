"""
External APIs endpoints for testing and data retrieval.
"""
from typing import Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ...services.endpoint.external_data_service import ExternalDataService
from ...external_apis import (
    AlphaVantageClient,
    FMPClient,
    BinanceClient,
    CoinbaseClient,
    CoinMarketCapClient
)
from ...external_apis.implementations.edgar_client import EdgarClient
from ...external_apis.implementations.marketwatch_client import MarketWatchClient
from ...schemas.common import MarketDataResponse, ExternalAPITestResponse
# GlobalCryptoMetricsResponse,  # Commented out - duplicate API

router = APIRouter(tags=["External APIs"])

# Initialize services
external_data_service = ExternalDataService()


class ConnectionTestResponse(BaseModel):
    """Response model for connection tests"""
    alpha_vantage: bool
    fmp: bool
    binance: bool
    coinbase: bool
    coinmarketcap: bool
    edgar: bool


class StockDataResponse(BaseModel):
    """Response model for stock data"""
    ticker: str
    sources: Dict[str, Any]
    timestamp: str


class CryptoDataResponse(BaseModel):
    """Response model for crypto data"""
    symbol: str
    sources: Dict[str, Any]
    timestamp: str


class MarketDataResponse(BaseModel):
    """Response model for market data"""
    ticker: str
    asset_type: str
    data: list
    source: str
    timestamp: str


@router.get("/test-connections", response_model=ConnectionTestResponse)
async def test_external_api_connections():
    """Test connections to all external APIs"""
    try:
        results = await external_data_service.test_all_connections()
        return ConnectionTestResponse(**results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connection test failed: {str(e)}")


@router.get("/stock/{ticker}", response_model=StockDataResponse)
async def get_stock_data(ticker: str):
    """Get stock data from external APIs"""
    try:
        data = await external_data_service.get_stock_data(ticker)
        if not data:
            raise HTTPException(status_code=404, detail=f"No stock data found for {ticker}")
        
        # Convert datetime to string for JSON serialization
        data["timestamp"] = data["timestamp"].isoformat()
        return StockDataResponse(**data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stock data: {str(e)}")


@router.get("/crypto/{symbol}", response_model=CryptoDataResponse)
async def get_crypto_data(symbol: str):
    """Get cryptocurrency data from external APIs"""
    try:
        data = await external_data_service.get_crypto_data(symbol)
        if not data:
            raise HTTPException(status_code=404, detail=f"No crypto data found for {symbol}")
        
        # Convert datetime to string for JSON serialization
        data["timestamp"] = data["timestamp"].isoformat()
        return CryptoDataResponse(**data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch crypto data: {str(e)}")


@router.get("/market-data/{ticker}", response_model=MarketDataResponse)
async def get_market_data(
    ticker: str,
    asset_type: str = Query("stock", description="Asset type: 'stock' or 'crypto'")
):
    """Get market data (OHLCV) for a ticker"""
    try:
        data = await external_data_service.get_market_data(ticker, asset_type)
        if not data:
            raise HTTPException(status_code=404, detail=f"No market data found for {ticker}")
        
        # Convert datetime to string for JSON serialization
        data["timestamp"] = data["timestamp"].isoformat()
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch market data: {str(e)}")


# @router.get("/global-crypto-metrics", response_model=GlobalCryptoMetricsResponse)
# async def get_global_crypto_metrics():
#     """Get global cryptocurrency market metrics"""
#     try:
#         metrics = await external_data_service.get_global_crypto_metrics()
#         if not metrics:
#             raise HTTPException(status_code=404, detail="No global crypto metrics available")
#         
#         # Convert datetime to string for JSON serialization
#         metrics["timestamp"] = metrics["timestamp"].isoformat()
#         return metrics
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Failed to fetch global crypto metrics: {str(e)}")


# Individual API endpoints for testing

@router.get("/alpha-vantage/test", response_model=ExternalAPITestResponse)
async def test_alpha_vantage():
    """Test Alpha Vantage API connection"""
    try:
        client = AlphaVantageClient()
        is_connected = await client.test_connection()
        rate_limits = client.get_rate_limit_info()
        
        return {
            "connected": is_connected,
            "rate_limits": rate_limits
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Alpha Vantage test failed: {str(e)}")


@router.get("/fmp/test", response_model=ExternalAPITestResponse)
async def test_fmp():
    """Test FMP API connection"""
    try:
        client = FMPClient()
        is_connected = await client.test_connection()
        rate_limits = client.get_rate_limit_info()
        
        return {
            "connected": is_connected,
            "rate_limits": rate_limits
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FMP test failed: {str(e)}")


@router.get("/binance/test", response_model=ExternalAPITestResponse)
async def test_binance():
    """Test Binance API connection"""
    try:
        client = BinanceClient()
        is_connected = await client.test_connection()
        rate_limits = client.get_rate_limit_info()
        
        return {
            "connected": is_connected,
            "rate_limits": rate_limits
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Binance test failed: {str(e)}")


@router.get("/coinbase/test", response_model=ExternalAPITestResponse)
async def test_coinbase():
    """Test Coinbase API connection"""
    try:
        client = CoinbaseClient()
        is_connected = await client.test_connection()
        rate_limits = client.get_rate_limit_info()
        
        return {
            "connected": is_connected,
            "rate_limits": rate_limits
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Coinbase test failed: {str(e)}")


@router.get("/coinmarketcap/test", response_model=ExternalAPITestResponse)
async def test_coinmarketcap():
    """Test CoinMarketCap API connection"""
    try:
        client = CoinMarketCapClient()
        is_connected = await client.test_connection()
        rate_limits = client.get_rate_limit_info()
        
        return {
            "connected": is_connected,
            "rate_limits": rate_limits
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CoinMarketCap test failed: {str(e)}")


@router.get("/edgar/test", response_model=ExternalAPITestResponse)
async def test_edgar():
    """Test SEC EDGAR API connection"""
    try:
        client = EdgarClient()
        is_connected = await client.test_connection()
        rate_limits = client.get_rate_limit_info()
        
        return {
            "api_name": "SEC EDGAR",
            "status": "connected" if is_connected else "failed",
            "message": f"EDGAR API connection {'successful' if is_connected else 'failed'}",
            "response_time": None,
            "timestamp": datetime.now()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"EDGAR test failed: {str(e)}")


@router.get("/marketwatch/test", response_model=ExternalAPITestResponse)
async def test_marketwatch():
    """Test MarketWatch scraping connection"""
    try:
        client = MarketWatchClient()
        is_connected = await client.test_connection()
        rate_limits = client.get_rate_limit_info()
        
        return {
            "api_name": "MarketWatch (Scraped)",
            "status": "connected" if is_connected else "failed",
            "message": f"MarketWatch scraping {'successful' if is_connected else 'failed'}",
            "response_time": None,
            "timestamp": datetime.now()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MarketWatch test failed: {str(e)}")


@router.get("/financial-statements/{ticker}")
async def get_financial_statements(
    ticker: str,
    statement_type: str = Query("balance-sheet", description="Statement type: 'balance-sheet', 'income-statement', 'cash-flow'"),
    period: str = Query("annual", description="Period: 'annual' or 'quarterly'"),
    limit: int = Query(4, ge=1, le=10, description="Number of periods to fetch")
):
    """Get financial statements data from SEC EDGAR"""
    try:
        client = EdgarClient()
        
        # Validate statement type
        valid_statements = ['balance-sheet', 'income-statement', 'cash-flow']
        if statement_type not in valid_statements:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid statement type. Must be one of: {valid_statements}"
            )
        
        # Validate period
        valid_periods = ['annual', 'quarterly']
        if period not in valid_periods:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid period. Must be one of: {valid_periods}"
            )
        
        financial_data = await client.get_financial_statements(
            symbol=ticker.upper(),
            statement_type=statement_type,
            period=period,
            limit=limit
        )
        
        if not financial_data:
            raise HTTPException(
                status_code=404, 
                detail=f"No {period} {statement_type} data found for {ticker}"
            )
        
        return {
            "ticker": ticker.upper(),
            "statement_type": statement_type,
            "period": period,
            "data": financial_data,
            "source": "SEC EDGAR",
            "total_records": len(financial_data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch financial data: {str(e)}")


@router.get("/stock-financials/{ticker}")
async def get_stock_financials(ticker: str):
    """
    Get comprehensive stock financials data from SEC EDGAR matching stock_financials table structure
    
    Note: SEC EDGAR only provides fundamental financial data (revenue, assets, equity, etc.).
    Market data (prices, P/E ratios, moving averages) are not available from SEC EDGAR.
    For complete financial data, consider using additional data sources like FMP, Alpha Vantage, etc.
    """
    try:
        client = EdgarClient()
        
        financial_data = await client.get_stock_financials(symbol=ticker.upper())
        
        if not financial_data:
            raise HTTPException(
                status_code=404, 
                detail=f"No financial data found for {ticker}"
            )
        
        return {
            "ticker": ticker.upper(),
            "data": financial_data,
            "source": "SEC EDGAR",
            "timestamp": datetime.now().isoformat(),
            "note": "SEC EDGAR provides fundamental data only. Market data (prices, ratios) require additional sources."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stock financials: {str(e)}")


@router.get("/marketwatch/stock-financials/{ticker}")
async def get_marketwatch_stock_financials(ticker: str):
    """
    Get comprehensive stock financials data from MarketWatch scraping
    
    Note: This uses web scraping which may be slower and less reliable than APIs.
    MarketWatch has terms of service that may restrict automated scraping.
    """
    try:
        client = MarketWatchClient()
        
        financial_data = await client.get_stock_financials(symbol=ticker.upper())
        
        if not financial_data:
            raise HTTPException(
                status_code=404, 
                detail=f"No financial data found for {ticker}"
            )
        
        return {
            "ticker": ticker.upper(),
            "data": financial_data,
            "source": "MarketWatch (Scraped)",
            "timestamp": datetime.now().isoformat(),
            "note": "Data scraped from MarketWatch. May be slower and less reliable than APIs."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch MarketWatch data: {str(e)}") 