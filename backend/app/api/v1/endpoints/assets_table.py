"""
Assets Table API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
import logging

from ....core.database import get_db
from ....core.cache import cache_with_invalidation
from ....schemas.asset import AssetsTableResponse
from ....services.assets_table_service import AssetsTableService
from ....core.config import GLOBAL_APP_CONFIGS
from ....services.tiingo_ws_consumer import get_consumer
from ....services.scheduler_service import get_scheduler

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=AssetsTableResponse)
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

@router.post("/admin/tiingo-ws/start")
async def start_tiingo_ws(tickers: list[str] = None, token: Optional[str] = Query(None)):
    if not tickers:
        tickers = ["AAPL", "MSFT", "GOOGL"]
    consumer = get_consumer()
    if token:
        # set/override token on consumer
        consumer.auth_token = token
    await consumer.start(tickers)
    return {"status": "started", "tickers": tickers, "has_token": bool(token)}

@router.post("/admin/tiingo-ws/stop")
async def stop_tiingo_ws():
    consumer = get_consumer()
    await consumer.stop()
    return {"status": "stopped"}
@router.post("/admin/scheduler/start")
async def start_scheduler(asset_types: Optional[List[str]] = None):
    scheduler = get_scheduler()
    await scheduler.start(asset_types)
    return {"status": "started", "targets": asset_types or list(scheduler.intervals.keys())}


@router.post("/admin/scheduler/stop")
async def stop_scheduler(asset_types: Optional[List[str]] = None):
    scheduler = get_scheduler()
    await scheduler.stop(asset_types)
    return {"status": "stopped", "targets": asset_types or list(scheduler.intervals.keys())}


@router.get("/admin/scheduler/status")
async def scheduler_status():
    scheduler = get_scheduler()
    return {"status": scheduler.status(), "intervals": scheduler.intervals}


# Admin: WS subscription management
@router.get("/admin/tiingo-ws/subscriptions")
async def list_tiingo_ws_subscriptions():
    consumer = get_consumer()
    return {"subscriptions": consumer.list_subscriptions()}


@router.post("/admin/tiingo-ws/add")
async def add_tiingo_ws_subscriptions(tickers: List[str]):
    if not tickers:
        raise HTTPException(status_code=400, detail="tickers is required")
    consumer = get_consumer()
    await consumer.add_tickers(tickers)
    return {"status": "added", "tickers": sorted({t.upper() for t in tickers})}


@router.post("/admin/tiingo-ws/remove")
async def remove_tiingo_ws_subscriptions(tickers: List[str]):
    if not tickers:
        raise HTTPException(status_code=400, detail="tickers is required")
    consumer = get_consumer()
    await consumer.remove_tickers(tickers)
    return {"status": "removed", "tickers": sorted({t.upper() for t in tickers})}


@router.get("/admin/tiingo-ws/status")
async def tiingo_ws_status():
    consumer = get_consumer()
    return {
        "service": consumer.service,
        "url": consumer.ws_url,
        "subscriptions": consumer.list_subscriptions(),
        "last_connect_at": consumer.last_connect_at,
        "last_tick_at": consumer.last_tick_at,
        "last_error": consumer.last_error,
    }
