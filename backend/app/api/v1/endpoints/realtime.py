"""
Realtime Data Management API endpoints
통합된 실시간 데이터 관리 API (가격 조회 + 수집기 관리 + 자산 테이블)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
import logging
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone, time as dt_time

from ....core.database import get_postgres_db
# Tiingo consumer import removed - using direct implementation
# scheduler_service import removed - not used in current endpoints
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
    days: str = Query("1", description="Number of days to fetch (1) or 'last' for latest value only"),
    data_source: Optional[str] = Query(None, description="Data source filter (optional, only for crypto assets)"),
    postgres_db: Session = Depends(get_postgres_db)
):
    """
    실시간 가격 데이터 조회 (지연 데이터, PostgreSQL 전용)
    asset_identifier: Asset ID (integer) 또는 Ticker (string)
    data_interval: 데이터 간격 (15m, 30m, 1h, 2h, 3h)
    days: 조회할 일수 (1) 또는 'last' (최신값만)
    data_source: 데이터 소스 필터 (선택적, 암호화폐일 때만 사용)
    """
    try:
        from ....models.asset import RealtimeQuoteTimeDelay, Asset
        from sqlalchemy import desc, and_, func
        
        # 지원되는 간격 확인
        supported_intervals = ["15m", "30m", "1h", "2h", "3h"]
        if data_interval not in supported_intervals:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported interval: {data_interval}. Supported: {supported_intervals}"
            )
        
        # days 파라미터 처리
        is_last_only = days.lower() == "last"
        
        # data_source 필터 설정 (제공된 경우에만 사용)
        target_data_source = data_source.lower() if data_source else None
        
        # asset_id 조회
        if asset_identifier.isdigit():
            asset_id = int(asset_identifier)
        else:
            # Ticker로 조회 (대소문자 정규화 및 USDT 페어 폴백 지원)
            ticker = asset_identifier.upper()
            asset = postgres_db.query(Asset).filter(Asset.ticker == ticker).first()
            
            if not asset:
                # USDT 페어로 폴백 시도
                if not ticker.endswith("USDT"):
                    usdt_ticker = f"{ticker}USDT"
                    asset = postgres_db.query(Asset).filter(Asset.ticker == usdt_ticker).first()
            
            if not asset:
                raise HTTPException(status_code=404, detail=f"Asset not found with ticker: {asset_identifier}")
            
            asset_id = asset.asset_id
        
        # 쿼리 구성
        query = postgres_db.query(RealtimeQuoteTimeDelay)\
            .filter(RealtimeQuoteTimeDelay.asset_id == asset_id)\
            .filter(RealtimeQuoteTimeDelay.data_interval == data_interval)
        
        # data_source가 제공된 경우에만 필터링
        if target_data_source:
            query = query.filter(RealtimeQuoteTimeDelay.data_source == target_data_source)
        
        query = query.order_by(desc(RealtimeQuoteTimeDelay.timestamp_utc))
        
        # days="last"인 경우 최신값만
        if is_last_only:
            query = query.limit(1)
        else:
            # days가 숫자인 경우 처리
            try:
                days_int = int(days)
                if days_int > 0:
                    # 최근 N일 데이터 조회를 위한 날짜 계산
                    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_int)
                    query = query.filter(RealtimeQuoteTimeDelay.timestamp_utc >= cutoff_date)
                query = query.limit(100)
            except ValueError:
                # 숫자가 아니면 기본값 1일
                cutoff_date = datetime.now(timezone.utc) - timedelta(days=1)
                query = query.filter(RealtimeQuoteTimeDelay.timestamp_utc >= cutoff_date).limit(100)
        
        quotes = query.all()
        
        if not quotes:
            raise HTTPException(status_code=404, detail="No delay quotes found")
        
        # change_amount, change_percent 계산 로직
        processed_quotes = []
        for quote in quotes:
            quote_dict = {
                "id": quote.id,
                "asset_id": quote.asset_id,
                "timestamp_utc": quote.timestamp_utc.isoformat() if quote.timestamp_utc else None,
                "price": float(quote.price) if quote.price else None,
                "volume": float(quote.volume) if quote.volume else None,
                "change_amount": float(quote.change_amount) if quote.change_amount else None,
                "change_percent": float(quote.change_percent) if quote.change_percent else None,
                "data_source": quote.data_source,
                "data_interval": quote.data_interval
            }
            
            # change_amount 또는 change_percent가 null인 경우 이전일 마지막 데이터로 계산
            if quote.price and (quote.change_amount is None or quote.change_percent is None):
                current_price = float(quote.price)
                current_timestamp = quote.timestamp_utc
                
                if current_timestamp:
                    # 현재 타임스탬프의 날짜 계산 (UTC 기준)
                    if isinstance(current_timestamp, datetime):
                        current_date = current_timestamp.date()
                    else:
                        # 문자열인 경우 파싱
                        if isinstance(current_timestamp, str):
                            current_timestamp = datetime.fromisoformat(current_timestamp.replace('Z', '+00:00'))
                            current_date = current_timestamp.date()
                        else:
                            current_date = current_timestamp
                    
                    previous_date = current_date - timedelta(days=1)
                    
                    # 이전일 마지막 데이터 조회 (같은 asset_id, data_interval, data_source)
                    # 전날 날짜 범위 내의 가장 마지막 데이터
                    previous_day_start = datetime.combine(previous_date, dt_time.min)
                    if previous_day_start.tzinfo is None:
                        previous_day_start = previous_day_start.replace(tzinfo=timezone.utc)
                    
                    # 전날의 끝 (다음날 00:00:00 미만)
                    next_day = previous_date + timedelta(days=1)
                    previous_day_end = datetime.combine(next_day, dt_time.min)
                    if previous_day_end.tzinfo is None:
                        previous_day_end = previous_day_end.replace(tzinfo=timezone.utc)
                    
                    # 이전일 데이터 조회 쿼리 구성
                    previous_day_query = postgres_db.query(RealtimeQuoteTimeDelay)\
                        .filter(
                            and_(
                                RealtimeQuoteTimeDelay.asset_id == asset_id,
                                RealtimeQuoteTimeDelay.data_interval == data_interval,
                                RealtimeQuoteTimeDelay.timestamp_utc >= previous_day_start,
                                RealtimeQuoteTimeDelay.timestamp_utc < previous_day_end
                            )
                        )
                    
                    # data_source가 제공된 경우에만 필터링
                    if target_data_source:
                        previous_day_query = previous_day_query.filter(
                            RealtimeQuoteTimeDelay.data_source == target_data_source
                        )
                    
                    previous_day_last = previous_day_query\
                        .order_by(desc(RealtimeQuoteTimeDelay.timestamp_utc))\
                        .first()
                    
                    if previous_day_last and previous_day_last.price:
                        previous_price = float(previous_day_last.price)
                        
                        if previous_price > 0:
                            # change_amount 계산
                            if quote.change_amount is None:
                                calculated_change_amount = current_price - previous_price
                                quote_dict["change_amount"] = round(calculated_change_amount, 8)
                            
                            # change_percent 계산
                            if quote.change_percent is None:
                                calculated_change_percent = ((current_price - previous_price) / previous_price) * 100
                                quote_dict["change_percent"] = round(calculated_change_percent, 4)
            
            processed_quotes.append(quote_dict)
        
        # 응답 형식 구성
        if is_last_only and processed_quotes:
            # days="last"인 경우 단일 객체 반환
            return {
                "asset_identifier": asset_identifier,
                "quote": processed_quotes[0],
                "data_source": "realtime_quotes_time_delay",
                "data_interval": data_interval,
                "database": "postgresql",
                "timestamp": processed_quotes[0]["timestamp_utc"]
            }
        else:
            # 여러 데이터 반환
            return {
                "asset_identifier": asset_identifier,
                "quotes": processed_quotes,
                "data_source": "realtime_quotes_time_delay",
                "data_interval": data_interval,
                "database": "postgresql",
                "count": len(processed_quotes),
                "timestamp": processed_quotes[0]["timestamp_utc"] if processed_quotes else None
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
    data_interval: str = Query("4h", description="Data interval (1h, 4h, 6h, 12h, 24h)"),
    days: int = Query(1, ge=1, le=1, description="Number of days to fetch (limited to 1 day)"),
    limit: int = Query(1000, ge=1, le=10000, description="Maximum number of data points"),
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
        supported_intervals = ["1h", "4h", "6h", "12h", "24h"]
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
            include_ohlcv=ohlcv,
            limit=limit
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
