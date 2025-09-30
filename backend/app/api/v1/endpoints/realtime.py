"""
Realtime Data Management API endpoints
통합된 실시간 데이터 관리 API (가격 조회 + 수집기 관리 + 자산 테이블)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
import logging
from pydantic import BaseModel

from ....core.database import get_postgres_db
# Tiingo consumer import removed - using direct implementation
# scheduler_service import removed - not used in current endpoints
from ....core.cache import cache_with_invalidation
from ....schemas.asset import AssetsTableResponse
from ....services.endpoint.assets_table_service import AssetsTableService

logger = logging.getLogger(__name__)

router = APIRouter()



# ============================================================================
# Pydantic Models
# ============================================================================
# PriceResponse 모델 제거됨 - 직접 외부 API 호출 엔드포인트 제거로 인해 불필요


# ============================================================================
# 자산 테이블 데이터 조회 API
# ============================================================================

@router.get("/table", response_model=AssetsTableResponse)
@cache_with_invalidation(expire=15)  # 15초 캐시 (실시간 데이터 표시 주기에 맞춤)
async def get_assets_table(
    type_name: Optional[str] = Query(None, description="필터링할 자산 유형 이름"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    page_size: int = Query(50, ge=1, le=200, description="페이지당 항목 수"),
    sort_by: Optional[str] = Query("market_cap", description="정렬 필드 (market_cap, price, change_percent_today, volume_today)"),
    order: Optional[str] = Query("desc", description="정렬 순서 (asc/desc)"),
    search: Optional[str] = Query(None, description="검색어 (ticker 또는 name)"),
    db: Session = Depends(get_postgres_db)
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
# 실시간 가격 데이터 조회 API - REMOVED
# 클라이언트가 직접 외부 API를 호출하는 엔드포인트들은 제거됨
# 대신 데이터베이스에 저장된 실시간 데이터를 조회하는 엔드포인트 사용
# ============================================================================


# ============================================================================
# 실시간 데이터 수집기 관리 API - REMOVED
# realtime_collector가 정의되지 않아 제거됨
# 수집기 관리는 websocket_orchestrator와 scheduler_service를 통해 처리
# ============================================================================


# ============================================================================
# WebSocket 구독 관리 API
# ============================================================================

# WebSocket subscription endpoints - DISABLED (using websocket_orchestrator instead)
# @router.get("/ws/subscriptions")
# async def list_ws_subscriptions():
#     """WebSocket 구독 목록 조회"""
#     # consumer = get_consumer()
#     # return {"subscriptions": consumer.list_subscriptions()}
#     return {"message": "WebSocket subscriptions managed by websocket_orchestrator"}

# @router.post("/ws/subscriptions/add")
# async def add_ws_subscriptions(tickers: List[str]):
#     """WebSocket 구독 종목 추가"""
#     if not tickers:
#         raise HTTPException(status_code=400, detail="tickers is required")
#     # consumer = get_consumer()
#     # await consumer.add_tickers(tickers)
#     return {"status": "added", "tickers": sorted({t.upper() for t in tickers})}

# @router.post("/ws/subscriptions/remove")
# async def remove_ws_subscriptions(tickers: List[str]):
#     """WebSocket 구독 종목 제거"""
#     if not tickers:
#         raise HTTPException(status_code=400, detail="tickers is required")
#     # consumer = get_consumer()
#     # await consumer.remove_tickers(tickers)
#     return {"status": "removed", "tickers": sorted({t.upper() for t in tickers})}


# ============================================================================
# 실시간 가격 데이터 조회 API (개선된 버전)
# ============================================================================



@router.get("/pg/quotes-price")
@cache_with_invalidation(expire=10)  # 10초 캐시 (실시간 데이터)
async def get_realtime_quotes_price_postgres(
    asset_identifier: str = Query(..., description="Asset ID(s) or Ticker(s) - comma separated for multiple"),
    postgres_db: Session = Depends(get_postgres_db)
):
    """
    실시간 가격 데이터 조회 (PostgreSQL 전용)
    asset_identifier: Asset ID (integer) 또는 Ticker (string), 쉼표로 구분하여 다중 조회 가능
    """
    try:
        from ....models.asset import RealtimeQuote, Asset
        from sqlalchemy import desc
        
        # 쉼표로 구분된 다중 자산 처리
        identifiers = [s.strip() for s in asset_identifier.split(',') if s.strip()]
        
        if len(identifiers) == 1:
            # 단일 자산 조회 (기존 로직)
            identifier = identifiers[0]
            if identifier.isdigit():
                asset_id = int(identifier)
                quotes = postgres_db.query(RealtimeQuote)\
                    .filter(RealtimeQuote.asset_id == asset_id)\
                    .order_by(desc(RealtimeQuote.timestamp_utc))\
                    .limit(1)\
                    .all()
            else:
                # ticker로 조회
                asset = postgres_db.query(Asset).filter(Asset.ticker == identifier).first()
                if asset:
                    quotes = postgres_db.query(RealtimeQuote)\
                        .filter(RealtimeQuote.asset_id == asset.asset_id)\
                        .order_by(desc(RealtimeQuote.timestamp_utc))\
                        .limit(1)\
                        .all()
                else:
                    quotes = []
            
            if not quotes:
                raise HTTPException(status_code=404, detail="No realtime quotes found")
            
            quote = quotes[0]
            return {
                "asset_id": quote.asset_id,
                "timestamp_utc": quote.timestamp_utc.isoformat() if quote.timestamp_utc else None,
                "price": float(quote.price) if quote.price else None,
                "volume": float(quote.volume) if quote.volume else None,
                "change_amount": float(quote.change_amount) if quote.change_amount else None,
                "change_percent": float(quote.change_percent) if quote.change_percent else None,
                "data_source": quote.data_source,
                "database": "postgresql"
            }
        else:
            # 다중 자산 조회
            results = []
            for identifier in identifiers:
                try:
                    if identifier.isdigit():
                        asset_id = int(identifier)
                        quotes = postgres_db.query(RealtimeQuote)\
                            .filter(RealtimeQuote.asset_id == asset_id)\
                            .order_by(desc(RealtimeQuote.timestamp_utc))\
                            .limit(1)\
                            .all()
                    else:
                        # ticker로 조회
                        asset = postgres_db.query(Asset).filter(Asset.ticker == identifier).first()
                        if asset:
                            quotes = postgres_db.query(RealtimeQuote)\
                                .filter(RealtimeQuote.asset_id == asset.asset_id)\
                                .order_by(desc(RealtimeQuote.timestamp_utc))\
                                .limit(1)\
                                .all()
                        else:
                            quotes = []
                    
                    if quotes:
                        quote = quotes[0]
                        results.append({
                            "asset_id": quote.asset_id,
                            "timestamp_utc": quote.timestamp_utc.isoformat() if quote.timestamp_utc else None,
                            "price": float(quote.price) if quote.price else None,
                            "volume": float(quote.volume) if quote.volume else None,
                            "change_amount": float(quote.change_amount) if quote.change_amount else None,
                            "change_percent": float(quote.change_percent) if quote.change_percent else None,
                            "data_source": quote.data_source
                        })
                except Exception as e:
                    logger.warning(f"Failed to get quote for {identifier}: {e}")
                    continue
            
            if not results:
                raise HTTPException(status_code=404, detail="No realtime quotes found for any assets")
            
            return {
                "asset_identifiers": identifiers,
                "quotes": results,
                "data_source": "realtime_quotes",
                "database": "postgresql",
                "count": len(results)
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get realtime quotes from PostgreSQL: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get realtime quotes from PostgreSQL: {str(e)}")




@router.get("/pg/quotes-delay-price")
async def get_realtime_quotes_delay_price_postgres(
    asset_identifier: str = Query(..., description="Asset ID (integer) or Ticker (string)"),
    data_interval: str = Query("15m", description="Data interval (15m, 30m, 1h, 2h, 3h)"),
    days: int = Query(1, ge=1, le=1, description="Number of days to fetch (limited to 1 day)"),
    postgres_db: Session = Depends(get_postgres_db)
):
    """
    실시간 가격 데이터 조회 (지연 데이터, PostgreSQL 전용)
    asset_identifier: Asset ID (integer) 또는 Ticker (string)
    data_interval: 데이터 간격 (15m, 30m, 1h, 2h, 3h)
    """
    try:
        from ....models.asset import RealtimeQuoteTimeDelay, Asset
        from sqlalchemy import desc
        
        # 지원되는 간격 확인
        supported_intervals = ["15m", "30m", "1h", "2h", "3h"]
        if data_interval not in supported_intervals:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported interval: {data_interval}. Supported: {supported_intervals}"
            )
        
        # asset_identifier가 숫자인지 확인 (Asset ID)
        if asset_identifier.isdigit():
            asset_id = int(asset_identifier)
            quotes = postgres_db.query(RealtimeQuoteTimeDelay)\
                .filter(RealtimeQuoteTimeDelay.asset_id == asset_id)\
                .filter(RealtimeQuoteTimeDelay.data_interval == data_interval)\
                .order_by(desc(RealtimeQuoteTimeDelay.timestamp_utc))\
                .limit(100)\
                .all()
        else:
            # Ticker로 조회 (대소문자 정규화 및 USDT 페어 폴백 지원)
            ticker = asset_identifier.upper()
            quotes = []

            # 1) 정확히 동일한 ticker 자산 조회
            asset = postgres_db.query(Asset).filter(Asset.ticker == ticker).first()
            if asset:
                quotes = postgres_db.query(RealtimeQuoteTimeDelay)\
                    .filter(RealtimeQuoteTimeDelay.asset_id == asset.asset_id)\
                    .filter(RealtimeQuoteTimeDelay.data_interval == data_interval)\
                    .order_by(desc(RealtimeQuoteTimeDelay.timestamp_utc))\
                    .limit(100)\
                    .all()

            # 2) 지연 데이터가 없고, 기본 코인 티커인 경우 USDT 페어로 폴백 시도 (예: DOT -> DOTUSDT)
            if not quotes and not ticker.endswith("USDT"):
                usdt_ticker = f"{ticker}USDT"
                asset_usdt = postgres_db.query(Asset).filter(Asset.ticker == usdt_ticker).first()
                if asset_usdt:
                    quotes = postgres_db.query(RealtimeQuoteTimeDelay)\
                        .filter(RealtimeQuoteTimeDelay.asset_id == asset_usdt.asset_id)\
                        .filter(RealtimeQuoteTimeDelay.data_interval == data_interval)\
                        .order_by(desc(RealtimeQuoteTimeDelay.timestamp_utc))\
                        .limit(100)\
                        .all()
        
        if not quotes:
            raise HTTPException(status_code=404, detail="No delay quotes found")
        
        return {
            "asset_identifier": asset_identifier,
            "quotes": quotes,
            "data_source": "realtime_quotes_time_delay",
            "data_interval": data_interval,
            "database": "postgresql",
            "timestamp": quotes[0].timestamp_utc if quotes else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get delay quotes from PostgreSQL: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get delay quotes from PostgreSQL: {str(e)}")


@router.get("/intraday-ohlcv")
async def get_ohlcv_intraday(
    asset_identifier: str = Query(..., description="Asset ID (integer) or Ticker (string)"),
    ohlcv: bool = Query(True, description="true=OHLCV 데이터, false=close price만"),
    data_interval: str = Query("4h", description="Data interval (4h, 6h, 12h, 24h)"),
    days: int = Query(1, ge=1, le=1, description="Number of days to fetch (limited to 1 day)"),
    db: Session = Depends(get_postgres_db)
):
    """
    OHLCV 인트라데이 데이터 조회
    asset_identifier: Asset ID (integer) 또는 Ticker (string)
    ohlcv: true=OHLCV 데이터, false=close price만
    data_interval: 데이터 간격 (4h, 6h, 12h, 24h)
    """
    try:
        from ....services.endpoint.ohlcv_service import OHLCVService
        
        # 지원되는 간격 확인
        supported_intervals = ["4h", "6h", "12h", "24h"]
        if data_interval not in supported_intervals:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported interval: {data_interval}. Supported: {supported_intervals}"
            )
        
        # asset_identifier가 숫자인지 확인 (Asset ID)
        if asset_identifier.isdigit():
            asset_id = int(asset_identifier)
        else:
            # Ticker로 조회
            from ....models import Asset
            asset = db.query(Asset).filter(Asset.ticker == asset_identifier.upper()).first()
            if not asset:
                raise HTTPException(status_code=404, detail=f"Asset not found with ticker: {asset_identifier}")
            asset_id = asset.asset_id
        
        # OHLCV 데이터 조회
        ohlcv_data = await OHLCVService.get_ohlcv_data(
            db=db,
            asset_id=asset_id,
            data_interval=data_interval,
            include_ohlcv=ohlcv
        )
        
        if not ohlcv_data:
            raise HTTPException(status_code=404, detail="No OHLCV data found")
        
        return {
            "asset_identifier": asset_identifier,
            "asset_id": asset_id,
            "ohlcv": ohlcv,
            "data_interval": data_interval,
            "data": ohlcv_data,
            "count": len(ohlcv_data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get OHLCV data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get OHLCV data: {str(e)}")
