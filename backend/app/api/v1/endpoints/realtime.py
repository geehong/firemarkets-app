"""
Realtime Data Management API endpoints
통합된 실시간 데이터 관리 API (가격 조회 + 수집기 관리 + 자산 테이블)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
import logging
from pydantic import BaseModel

from ....core.database import get_db
from ....services.tiingo_ws_consumer import get_consumer
from ....services.scheduler_service import scheduler_service as get_scheduler
from ....services import price_service
from ....core.cache import cache_with_invalidation
from app.external_apis.implementations import TiingoClient
from ....schemas.asset import AssetsTableResponse
from ....services.assets_table_service import AssetsTableService

logger = logging.getLogger(__name__)

router = APIRouter()



# ============================================================================
# Pydantic Models
# ============================================================================

class PriceResponse(BaseModel):
    """실시간 가격 응답 모델"""
    prices: dict[str, dict[str, float | None]]
    asset_type: str
    symbol_count: int


# ============================================================================
# 자산 테이블 데이터 조회 API
# ============================================================================

@router.get("/table", response_model=AssetsTableResponse)
@cache_with_invalidation(expire=300)  # 5분 캐시 (실시간 데이터 포함)
async def get_assets_table(
    type_name: Optional[str] = Query(None, description="필터링할 자산 유형 이름"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    page_size: int = Query(50, ge=1, le=200, description="페이지당 항목 수"),
    sort_by: Optional[str] = Query("market_cap", description="정렬 필드 (market_cap, price, change_percent_today, volume_today)"),
    order: Optional[str] = Query("desc", description="정렬 순서 (asc/desc)"),
    search: Optional[str] = Query(None, description="검색어 (ticker 또는 name)"),
    db: Session = Depends(get_db)
):
    """자산 테이블 데이터 조회 (가격, 변화율, 시총액, 거래량, 52주 변화율, 30일 스파크라인 포함)"""
    try:
        # 서비스 레이어를 통한 데이터 조회
        result = await AssetsTableService.get_assets_table_data(
            db=db,
            type_name=type_name,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            order=order,
            search=search
        )
        
        return AssetsTableResponse(**result)
        
    except Exception as e:
        logger.exception("Failed to get assets table data")
        raise HTTPException(status_code=500, detail=f"Failed to get assets table data: {str(e)}")


# ============================================================================
# 실시간 가격 데이터 조회 API
# ============================================================================

@router.get("/prices/crypto", response_model=PriceResponse)
@cache_with_invalidation(expire=10)  # 암호화폐는 변동성이 크므로 캐시 시간을 10초로 짧게 설정
async def get_crypto_prices(
    symbols: List[str] = Query(..., description="암호화폐 심볼 리스트 (예: BTC, ETH)")
):
    """
    여러 암호화폐 심볼에 대한 실시간 가격을 Binance에서 조회합니다.
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


@router.get("/prices/stock", response_model=PriceResponse)
async def get_stock_prices(
    symbols: List[str] = Query(..., description="주식 심볼 리스트 (예: AAPL, GOOGL)")
):
    """
    여러 주식 심볼에 대한 실시간 가격을 Yahoo Finance에서 조회합니다.
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


@router.get("/prices/tiingo", response_model=PriceResponse)
@cache_with_invalidation(expire=900)  # Tiingo는 15분 지연이므로 15분 캐싱
async def get_tiingo_prices(
    symbols: List[str] = Query(..., description="주식/ETF 심볼 리스트 (예: AAPL, SPY)")
):
    """
    여러 주식/ETF 심볼에 대한 가격을 Tiingo에서 조회합니다.
    """
    try:
        tiingo_client = TiingoClient()
        quotes = await tiingo_client.get_batch_quotes(symbols)
        
        # 응답 형식 변환
        prices = {}
        for symbol, quote_data in quotes.items():
            prices[symbol] = {
                'price': quote_data.get('last'),
                'change_percent': quote_data.get('changePercent'),
                'market_cap': None,  # Tiingo 무료 플랜에서는 제공하지 않음
                'volume': quote_data.get('volume')
            }
        
        return PriceResponse(
            prices=prices,
            asset_type="tiingo",
            symbol_count=len(prices)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch Tiingo prices: {str(e)}")


@router.get("/prices/{asset_type}", response_model=PriceResponse)
@cache_with_invalidation(expire=30)  # 기본 30초 캐싱
async def get_prices_by_type(
    asset_type: str,
    symbols: List[str] = Query(..., description="자산 심볼 리스트")
):
    """
    자산 유형에 따른 실시간 가격을 조회합니다.
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


# ============================================================================
# 실시간 데이터 수집기 관리 API
# ============================================================================

@router.post("/collectors/run")
async def start_realtime_collectors(asset_types: Optional[List[str]] = None):
    """실시간 데이터 수집기 시작 (Tiingo WebSocket + 스케줄러)"""
    try:
        # RealtimeCollector를 사용하여 수집기 시작
        result = await realtime_collector.collect_with_settings()
        
        if result['success']:
            return {
                "status": "started",
                "websocket": "running",
                "scheduler": "running",
                "message": result['message']
            }
        else:
            raise HTTPException(status_code=500, detail=result['message'])
        
    except Exception as e:
        logger.error(f"Failed to start realtime collectors: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start realtime collectors: {str(e)}")


@router.post("/collectors/stop")
async def stop_realtime_collectors(asset_types: Optional[List[str]] = None):
    """실시간 데이터 수집기 중지 (Tiingo WebSocket + 스케줄러)"""
    try:
        # RealtimeCollector를 사용하여 수집기 중지
        result = await realtime_collector.stop_collectors()
        
        if result['success']:
            return {
                "status": "stopped",
                "websocket": "stopped",
                "scheduler": "stopped",
                "message": result['message']
            }
        else:
            raise HTTPException(status_code=500, detail=result['message'])
        
    except Exception as e:
        logger.error(f"Failed to stop realtime collectors: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to stop realtime collectors: {str(e)}")


@router.get("/collectors/status")
async def get_realtime_collectors_status():
    """실시간 데이터 수집기 상태 조회"""
    try:
        # RealtimeCollector를 사용하여 상태 조회
        status = realtime_collector.get_status()
        
        if 'error' in status:
            raise HTTPException(status_code=500, detail=status['error'])
        
        return status
        
    except Exception as e:
        logger.error(f"Failed to get realtime collectors status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")


# ============================================================================
# WebSocket 구독 관리 API
# ============================================================================

@router.get("/ws/subscriptions")
async def list_ws_subscriptions():
    """WebSocket 구독 목록 조회"""
    consumer = get_consumer()
    return {"subscriptions": consumer.list_subscriptions()}


@router.post("/ws/subscriptions/add")
async def add_ws_subscriptions(tickers: List[str]):
    """WebSocket 구독 종목 추가"""
    if not tickers:
        raise HTTPException(status_code=400, detail="tickers is required")
    consumer = get_consumer()
    await consumer.add_tickers(tickers)
    return {"status": "added", "tickers": sorted({t.upper() for t in tickers})}


@router.post("/ws/subscriptions/remove")
async def remove_ws_subscriptions(tickers: List[str]):
    """WebSocket 구독 종목 제거"""
    if not tickers:
        raise HTTPException(status_code=400, detail="tickers is required")
    consumer = get_consumer()
    await consumer.remove_tickers(tickers)
    return {"status": "removed", "tickers": sorted({t.upper() for t in tickers})}
