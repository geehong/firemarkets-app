"""
External APIs endpoints for testing and data retrieval.
"""
from typing import Dict, Any, Optional
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