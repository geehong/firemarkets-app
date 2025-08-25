"""
Real-time price API endpoints.
"""
from typing import List
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from app.services import price_service
from app.core.cache import cache_with_invalidation

router = APIRouter()


class PriceResponse(BaseModel):
    """실시간 가격 응답 모델"""
    prices: dict[str, float]
    asset_type: str
    symbol_count: int


@router.get("/crypto", response_model=PriceResponse)
@cache_with_invalidation(expire=10)  # 암호화폐는 변동성이 크므로 캐시 시간을 10초로 짧게 설정
async def get_crypto_prices(
    symbols: List[str] = Query(..., description="암호화폐 심볼 리스트 (예: BTC, ETH)")
):
    """
    여러 암호화폐 심볼에 대한 실시간 가격을 Binance에서 조회합니다.
    
    Args:
        symbols: 암호화폐 심볼 리스트
        
    Returns:
        실시간 가격 데이터
    """
    try:
        prices = await price_service.get_realtime_crypto_prices(symbols=symbols)
        
        return PriceResponse(
            prices=prices,
            asset_type="crypto",
            symbol_count=len(prices)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch crypto prices: {str(e)}")


@router.get("/stock", response_model=PriceResponse)
@cache_with_invalidation(expire=300)  # 주식은 5분 캐싱 (60초에서 증가)
async def get_stock_prices(
    symbols: List[str] = Query(..., description="주식 심볼 리스트 (예: AAPL, GOOGL)")
):
    """
    여러 주식 심볼에 대한 실시간 가격을 Yahoo Finance에서 조회합니다.
    
    Args:
        symbols: 주식 심볼 리스트
        
    Returns:
        실시간 가격 데이터
    """
    try:
        prices = await price_service.get_realtime_stock_prices(symbols=symbols)
        
        return PriceResponse(
            prices=prices,
            asset_type="stock",
            symbol_count=len(prices)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stock prices: {str(e)}")


@router.get("/{asset_type}", response_model=PriceResponse)
@cache_with_invalidation(expire=30)  # 기본 30초 캐싱
async def get_prices_by_type(
    asset_type: str,
    symbols: List[str] = Query(..., description="자산 심볼 리스트")
):
    """
    자산 유형에 따른 실시간 가격을 조회합니다.
    
    Args:
        asset_type: 자산 유형 (crypto 또는 stock)
        symbols: 자산 심볼 리스트
        
    Returns:
        실시간 가격 데이터
    """
    try:
        prices = await price_service.get_realtime_prices_by_type(symbols=symbols, asset_type=asset_type)
        
        return PriceResponse(
            prices=prices,
            asset_type=asset_type,
            symbol_count=len(prices)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch {asset_type} prices: {str(e)}")
