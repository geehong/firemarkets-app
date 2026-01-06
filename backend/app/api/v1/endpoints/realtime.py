"""
Realtime Data Management API endpoints
통합된 실시간 데이터 관리 API (가격 조회 + 수집기 관리 + 자산 테이블)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List, Tuple, Any
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
# Helper Functions
# ============================================================================

def resolve_asset_id_with_fallback(db, asset_identifier: str) -> int:
    """
    Asset ID 또는 Ticker를 asset_id로 변환 (다중 폴백 지원)
    1차: 정확한 티커 매칭
    2차: USDT/USD 접미사 제거 후 재시도 (예: SOLUSDT -> SOL)
    3차: USDT 페어로 폴백 시도 (예: SOL -> SOLUSDT)
    """
    from ....models import Asset
    
    if asset_identifier.isdigit():
        return int(asset_identifier)
    
    ticker = asset_identifier.upper()
    
    # 1차 시도: 정확한 티커 매칭
    asset = db.query(Asset).filter(Asset.ticker == ticker).first()
    if asset:
        return asset.asset_id
    
    # 2차 시도: USDT/USD 접미사 제거 후 재시도
    normalized_ticker = ticker
    if normalized_ticker.endswith('USDT'):
        normalized_ticker = normalized_ticker[:-4]  # Remove 'USDT'
    elif normalized_ticker.endswith('-USD'):
        normalized_ticker = normalized_ticker[:-4]  # Remove '-USD'
    elif normalized_ticker.endswith('USD'):
        normalized_ticker = normalized_ticker[:-3]  # Remove 'USD'
    
    if normalized_ticker != ticker:
        asset = db.query(Asset).filter(Asset.ticker == normalized_ticker).first()
        if asset:
            return asset.asset_id
    
    # 3차 시도: USDT 페어로 폴백 시도
    if not ticker.endswith("USDT"):
        usdt_ticker = f"{ticker}USDT"
        asset = db.query(Asset).filter(Asset.ticker == usdt_ticker).first()
        if asset:
            return asset.asset_id
    
    raise HTTPException(status_code=404, detail=f"Asset not found with ticker: {asset_identifier}")





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
        from sqlalchemy import desc, and_
        
        # 이전일 마지막 데이터를 찾는 헬퍼 함수
        def find_previous_day_last_price(current_timestamp_obj, asset_id, data_source_filter=None, max_days_back=7):
            """
            현재 timestamp보다 이전일의 마지막 유효 데이터를 찾습니다.
            주말/휴일이 있어도 최대 max_days_back일 전까지 찾습니다.
            """
            # 현재 timestamp를 datetime 객체로 변환
            if isinstance(current_timestamp_obj, datetime):
                current_dt = current_timestamp_obj
            elif isinstance(current_timestamp_obj, str):
                current_dt = datetime.fromisoformat(current_timestamp_obj.replace('Z', '+00:00'))
            else:
                current_dt = current_timestamp_obj
            
            if current_dt.tzinfo is None:
                current_dt = current_dt.replace(tzinfo=timezone.utc)
            
            current_date = current_dt.date()
            
            for days_back in range(1, max_days_back + 1):
                check_date = current_date - timedelta(days=days_back)
                
                # 해당 날짜의 시작과 끝 시간 계산
                day_start = datetime.combine(check_date, dt_time.min)
                if day_start.tzinfo is None:
                    day_start = day_start.replace(tzinfo=timezone.utc)
                
                next_day = check_date + timedelta(days=1)
                day_end = datetime.combine(next_day, dt_time.min)
                if day_end.tzinfo is None:
                    day_end = day_end.replace(tzinfo=timezone.utc)
                
                # 해당 날짜의 데이터 조회 (현재 timestamp보다 이전인 데이터만)
                day_query = postgres_db.query(RealtimeQuote)\
                    .filter(
                        and_(
                            RealtimeQuote.asset_id == asset_id,
                            RealtimeQuote.timestamp_utc >= day_start,
                            RealtimeQuote.timestamp_utc < day_end,
                            RealtimeQuote.timestamp_utc < current_dt  # 현재 timestamp보다 이전인 데이터만
                        )
                    )
                
                # data_source가 제공된 경우에만 필터링
                if data_source_filter:
                    day_query = day_query.filter(RealtimeQuote.data_source == data_source_filter)
                
                day_last = day_query\
                    .order_by(desc(RealtimeQuote.timestamp_utc))\
                    .first()
                
                if day_last and day_last.price:
                    try:
                        price = float(day_last.price)
                        if price > 0:
                            logger.debug(f"Found previous day last price: {price} for date {check_date} (days_back={days_back})")
                            return price
                    except (ValueError, TypeError):
                        continue
            
            logger.warning(f"No previous day last price found for asset_id={asset_id}, current_date={current_date}")
            return None
        
        # change_amount, change_percent 계산 헬퍼 함수
        def calculate_change_values(quote, asset_id):
            """이전일 마지막 데이터와 비교하여 change_amount와 change_percent 계산"""
            quote_dict = {
                "asset_id": quote.asset_id,
                "timestamp_utc": quote.timestamp_utc.isoformat() if quote.timestamp_utc else None,
                "price": float(quote.price) if quote.price else None,
                "volume": float(quote.volume) if quote.volume else None,
                "change_amount": float(quote.change_amount) if quote.change_amount else None,
                "change_percent": float(quote.change_percent) if quote.change_percent else None,
                "data_source": quote.data_source,
                "database": "postgresql"
            }
            
            # 모든 경우에 이전일 마지막 데이터와 비교하여 change_amount, change_percent 계산/업데이트
            if quote.price:
                current_price = float(quote.price)
                current_timestamp = quote.timestamp_utc
                
                if current_timestamp:
                    # 현재 timestamp를 datetime 객체로 변환
                    if isinstance(current_timestamp, datetime):
                        current_dt = current_timestamp
                    elif isinstance(current_timestamp, str):
                        current_dt = datetime.fromisoformat(current_timestamp.replace('Z', '+00:00'))
                    else:
                        current_dt = current_timestamp
                    
                    if current_dt.tzinfo is None:
                        current_dt = current_dt.replace(tzinfo=timezone.utc)
                    
                    # 이전일 마지막 데이터 찾기 (주말/휴일 고려)
                    previous_price = find_previous_day_last_price(
                        current_dt, asset_id, quote.data_source
                    )
                    
                    if previous_price and previous_price > 0:
                        # change_amount 계산 (null이거나 값이 있어도 업데이트)
                        calculated_change_amount = current_price - previous_price
                        quote_dict["change_amount"] = round(calculated_change_amount, 8)
                        
                        # change_percent 계산 (null이거나 값이 있어도 업데이트)
                        calculated_change_percent = ((current_price - previous_price) / previous_price) * 100
                        quote_dict["change_percent"] = round(calculated_change_percent, 4)
            
            return quote_dict
        
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
            return calculate_change_values(quote, quote.asset_id)
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
                        quote_dict = calculate_change_values(quote, quote.asset_id)
                        # 다중 조회 응답에서는 database 필드 제거
                        quote_dict.pop("database", None)
                        results.append(quote_dict)
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
    limit: int = Query(360, ge=1, le=10000, description="Maximum number of data points to fetch (default: 360, 24*15)"),
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
        from ....models.asset import RealtimeQuoteTimeDelay, Asset, OHLCVData
        from sqlalchemy import desc, and_, func
        from datetime import time as dt_time
        
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
            # Ticker로 조회 (대소문자 정규화 및 다중 폴백 지원)
            ticker = asset_identifier.upper()
            asset = postgres_db.query(Asset).filter(Asset.ticker == ticker).first()
            
            if not asset:
                # 2차 시도: USDT/USD 접미사 제거 후 재시도 (예: SOLUSDT -> SOL, SOL-USD -> SOL)
                normalized_ticker = ticker
                if normalized_ticker.endswith('USDT'):
                    normalized_ticker = normalized_ticker[:-4]  # Remove 'USDT'
                elif normalized_ticker.endswith('-USD'):
                    normalized_ticker = normalized_ticker[:-4]  # Remove '-USD'
                elif normalized_ticker.endswith('USD'):
                    normalized_ticker = normalized_ticker[:-3]  # Remove 'USD'
                
                if normalized_ticker != ticker:
                    asset = postgres_db.query(Asset).filter(Asset.ticker == normalized_ticker).first()
            
            if not asset:
                # 3차 시도: USDT 페어로 폴백 시도
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
            # 날짜 필터 대신 마지막 N개 레코드를 가져옴 (주말/휴장일 대응)
            try:
                days_int = int(days)
                if days_int > 0:
                    # 간격에 따른 1일치 포인트 수 계산
                    # 15m: 96개 (24시간 * 4), 30m: 48개, 1h: 24개, 2h: 12개, 3h: 8개
                    points_per_day = {
                        "15m": 96,   # 24 * 4
                        "30m": 48,   # 24 * 2
                        "1h": 24,    # 24 * 1
                        "2h": 12,    # 24 / 2
                        "3h": 8      # 24 / 3
                    }
                    points_needed = points_per_day.get(data_interval, 96) * days_int
                    # limit 파라미터 사용
                    query = query.limit(limit)
                else:
                    query = query.limit(limit)
            except ValueError:
                # 숫자가 아니면 limit 파라미터 사용
                query = query.limit(limit)
        
        quotes = query.all()
        
        # RealtimeQuoteTimeDelay에 데이터가 없으면 OHLCV 데이터로 폴백
        if not quotes:
            logger.info(f"No realtime delay quotes found for {asset_identifier}, falling back to OHLCV data")
            
            # OHLCV 데이터로 폴백 (15m 간격은 1h로 매핑)
            ohlcv_interval_map = {
                "15m": "1h",
                "30m": "1h", 
                "1h": "1h",
                "2h": "4h",
                "3h": "4h"
            }
            ohlcv_interval = ohlcv_interval_map.get(data_interval, "1h")
            
            ohlcv_query = postgres_db.query(OHLCVData)\
                .filter(OHLCVData.asset_id == asset_id)\
                .filter(OHLCVData.data_interval == ohlcv_interval)\
                .order_by(desc(OHLCVData.timestamp_utc))
            
            if is_last_only:
                ohlcv_query = ohlcv_query.limit(1)
            else:
                # 날짜 필터 대신 마지막 N개 레코드를 가져옴 (주말/휴장일 대응)
                try:
                    days_int = int(days)
                    if days_int > 0:
                        # OHLCV 간격에 따른 1일치 포인트 수 계산
                        # 1h: 24개, 4h: 6개
                        ohlcv_points_per_day = {
                            "1h": 24,
                            "4h": 6
                        }
                        points_needed = ohlcv_points_per_day.get(ohlcv_interval, 24) * days_int
                        # limit 파라미터 사용
                        ohlcv_query = ohlcv_query.limit(limit)
                    else:
                        ohlcv_query = ohlcv_query.limit(limit)
                except ValueError:
                    # 숫자가 아니면 limit 파라미터 사용
                    ohlcv_query = ohlcv_query.limit(limit)
            
            ohlcv_data = ohlcv_query.all()
            
            if not ohlcv_data:
                raise HTTPException(status_code=404, detail=f"No data found for asset: {asset_identifier}")
            
            # OHLCV 데이터를 quote 형식으로 변환
            processed_quotes = []
            for idx, ohlcv in enumerate(ohlcv_data):
                # 이전 데이터와 비교하여 변화율 계산
                prev_close = ohlcv_data[idx + 1].close_price if idx + 1 < len(ohlcv_data) else None
                
                change_amount = None
                change_percent = None
                if ohlcv.close_price and prev_close:
                    change_amount = float(ohlcv.close_price) - float(prev_close)
                    change_percent = (change_amount / float(prev_close)) * 100 if prev_close > 0 else None
                
                quote_dict = {
                    "id": ohlcv.id,
                    "asset_id": ohlcv.asset_id,
                    "timestamp_utc": ohlcv.timestamp_utc.isoformat() if ohlcv.timestamp_utc else None,
                    "price": float(ohlcv.close_price) if ohlcv.close_price else None,
                    "volume": float(ohlcv.volume) if ohlcv.volume else None,
                    "change_amount": round(change_amount, 8) if change_amount is not None else None,
                    "change_percent": round(change_percent, 4) if change_percent is not None else None,
                    "data_source": "ohlcv_fallback",
                    "data_interval": data_interval
                }
                processed_quotes.append(quote_dict)
            
            # 응답 반환
            if is_last_only and processed_quotes:
                return {
                    "asset_identifier": asset_identifier,
                    "quote": processed_quotes[0],
                    "data_source": "ohlcv_fallback",
                    "data_interval": data_interval,
                    "database": "postgresql",
                    "timestamp": processed_quotes[0]["timestamp_utc"]
                }
            else:
                return {
                    "asset_identifier": asset_identifier,
                    "quotes": processed_quotes,
                    "data_source": "ohlcv_fallback",
                    "data_interval": data_interval,
                    "database": "postgresql",
                    "count": len(processed_quotes),
                    "timestamp": processed_quotes[0]["timestamp_utc"] if processed_quotes else None
                }
        
        # RealtimeQuoteTimeDelay 데이터가 있는 경우 기존 로직 계속
        
        # 이전일 마지막 데이터를 찾는 헬퍼 함수 (OHLCVData 사용)
        def find_previous_day_last_price(current_timestamp_obj, asset_id, data_interval, target_data_source, max_days_back=7):
            """
            현재 timestamp보다 이전일의 마지막 유효 데이터를 OHLCVData에서 찾습니다.
            /api/v1/assets/price/{asset_identifier} 엔드포인트와 동일한 로직 사용.
            주말/휴일이 있어도 최대 max_days_back일 전까지 찾습니다.
            """
            from ....models.asset import OHLCVData
            
            # 현재 timestamp를 datetime 객체로 변환
            if isinstance(current_timestamp_obj, datetime):
                current_dt = current_timestamp_obj
            elif isinstance(current_timestamp_obj, str):
                current_dt = datetime.fromisoformat(current_timestamp_obj.replace('Z', '+00:00'))
            else:
                current_dt = current_timestamp_obj
            
            if current_dt.tzinfo is None:
                current_dt = current_dt.replace(tzinfo=timezone.utc)
            
            current_date = current_dt.date()
            
            for days_back in range(1, max_days_back + 1):
                check_date = current_date - timedelta(days=days_back)
                
                # OHLCVData에서 일봉 데이터 조회 (1d 간격)
                # /api/v1/assets/price/{asset_identifier} 엔드포인트와 동일한 로직
                ohlcv_query = postgres_db.query(
                    OHLCVData.timestamp_utc,
                    OHLCVData.close_price
                ).filter(
                    OHLCVData.asset_id == asset_id
                    # data_interval 필터링 제거 - 모든 일봉 데이터 조회 (주말/월말 포함)
                ).filter(
                    OHLCVData.timestamp_utc <= check_date  # check_date 이전 또는 같은 날짜
                ).filter(
                    OHLCVData.timestamp_utc < current_dt  # 현재 timestamp보다 이전인 데이터만
                ).order_by(
                    desc(OHLCVData.timestamp_utc)
                ).limit(1)
                
                ohlcv_data = ohlcv_query.first()
                
                if ohlcv_data and ohlcv_data.close_price:
                    try:
                        price = float(ohlcv_data.close_price)
                        if price > 0:
                            logger.info(
                                f"[CHANGE_CALC] Found previous day last price from OHLCVData: {price} "
                                f"for date {check_date} (days_back={days_back}), "
                                f"timestamp={ohlcv_data.timestamp_utc}, asset_id={asset_id}"
                            )
                            return price
                    except (ValueError, TypeError):
                        continue
                else:
                    logger.info(
                        f"[CHANGE_CALC] No OHLCVData found for date {check_date} (days_back={days_back}), "
                        f"asset_id={asset_id}, current_dt={current_dt}"
                    )
            
            logger.warning(f"No previous day last price found in OHLCVData for asset_id={asset_id}, current_date={current_date}")
            return None
        
        # change_amount, change_percent 계산 로직
        processed_quotes = []
        for quote in quotes:
            quote_dict = {
                "id": quote.id,
                "asset_id": quote.asset_id,
                "timestamp_utc": quote.timestamp_utc.isoformat() if quote.timestamp_utc else None,
                "price": float(quote.price) if quote.price else None,
                "volume": float(quote.volume) if quote.volume else None,
                "change_amount": None,  # 항상 재계산
                "change_percent": None,  # 항상 재계산
                "data_source": quote.data_source,
                "data_interval": quote.data_interval
            }
            
            # 모든 경우에 이전일 마지막 데이터와 비교하여 change_amount, change_percent 계산/업데이트
            if quote.price:
                current_price = float(quote.price)
                current_timestamp = quote.timestamp_utc
                
                if current_timestamp:
                    # 현재 timestamp를 datetime 객체로 변환
                    if isinstance(current_timestamp, datetime):
                        current_dt = current_timestamp
                    elif isinstance(current_timestamp, str):
                        current_dt = datetime.fromisoformat(current_timestamp.replace('Z', '+00:00'))
                    else:
                        current_dt = current_timestamp
                    
                    if current_dt.tzinfo is None:
                        current_dt = current_dt.replace(tzinfo=timezone.utc)
                    
                    # 이전일 마지막 데이터 찾기 (주말/휴일 고려)
                    # 현재 quote의 data_source를 사용 (target_data_source가 None일 수 있음)
                    quote_data_source = target_data_source if target_data_source else quote.data_source
                    logger.info(
                        f"[CHANGE_CALC] Starting search for previous day price: "
                        f"asset_id={asset_id}, current_timestamp={current_dt}, "
                        f"data_interval={data_interval}, data_source={quote_data_source}"
                    )
                    previous_price = find_previous_day_last_price(
                        current_dt, asset_id, data_interval, quote_data_source
                    )
                    logger.info(
                        f"[CHANGE_CALC] Previous price result: {previous_price} "
                        f"for asset_id={asset_id}, current_price={current_price}"
                    )
                    
                    if previous_price and previous_price > 0:
                        # change_amount 계산 (항상 재계산)
                        calculated_change_amount = current_price - previous_price
                        quote_dict["change_amount"] = round(calculated_change_amount, 8)
                        
                        # change_percent 계산 (항상 재계산)
                        calculated_change_percent = ((current_price - previous_price) / previous_price) * 100
                        quote_dict["change_percent"] = round(calculated_change_percent, 4)
                        logger.info(
                            f"[CHANGE_CALC] Updated change_amount={quote_dict['change_amount']}, "
                            f"change_percent={quote_dict['change_percent']}"
                        )
                    else:
                        # 이전일 데이터를 찾지 못한 경우 로그
                        logger.warning(
                            f"[CHANGE_CALC] Could not find previous day price for asset_id={asset_id}, "
                            f"current_timestamp={current_dt}, data_interval={data_interval}, "
                            f"data_source={quote_data_source}, current_price={current_price}"
                        )
            
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
    data_interval: str = Query("4h", description="Data interval (1m, 5m, 15m, 30m, 1h, 4h, 6h, 12h, 24h)"),
    days: int = Query(1, ge=1, le=1, description="Number of days to fetch (limited to 1 day)"),
    limit: int = Query(1000, ge=1, le=10000, description="Maximum number of data points"),
    db: Session = Depends(get_postgres_db)
):
    """
    OHLCV 인트라데이 데이터 조회
    asset_identifier: Asset ID (integer) 또는 Ticker (string)
    ohlcv: true=OHLCV 데이터, false=close price만
    data_interval: 데이터 간격 (1m, 5m, 15m, 30m, 1h, 4h, 6h, 12h, 24h)
    """
    try:
        from ....services.endpoint.ohlcv_service import OHLCVService
        
        # 지원되는 간격 확인
        supported_intervals = ["1m", "5m", "15m", "30m", "1h", "4h", "6h", "12h", "24h"]
        if data_interval not in supported_intervals:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported interval: {data_interval}. Supported: {supported_intervals}"
            )
        
        # asset_id 조회 (티커 정규화 폴백 포함)
        asset_id = resolve_asset_id_with_fallback(db, asset_identifier)
        
        # OHLCV 데이터 조회 (폴백 지원: 15m/30m은 1m/5m 데이터 집계)
        ohlcv_data = await OHLCVService.get_ohlcv_data_with_fallback(
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


@router.get("/intraday-price")
async def get_intraday_price(
    asset_identifier: str = Query(..., description="Asset ID (integer) or Ticker (string)"),
    data_interval: str = Query("4h", description="Data interval (1m, 5m, 15m, 30m, 1h, 4h, 6h, 12h, 24h)"),
    days: int = Query(1, ge=1, le=1, description="Number of days to fetch (limited to 1 day)"),
    limit: int = Query(1000, ge=1, le=10000, description="Maximum number of data points"),
    db: Session = Depends(get_postgres_db)
):
    """
    인트라데이 가격 데이터 조회 (close, volume만 반환)
    asset_identifier: Asset ID (integer) 또는 Ticker (string)
    data_interval: 데이터 간격 (1m, 5m, 15m, 30m, 1h, 4h, 6h, 12h, 24h)
    """
    try:
        from ....services.endpoint.ohlcv_service import OHLCVService
        
        # 지원되는 간격 확인
        supported_intervals = ["1m", "5m", "15m", "30m", "1h", "4h", "6h", "12h", "24h"]
        if data_interval not in supported_intervals:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported interval: {data_interval}. Supported: {supported_intervals}"
            )
        
        # asset_id 조회 (티커 정규화 폴백 포함)
        asset_id = resolve_asset_id_with_fallback(db, asset_identifier)

        
        # OHLCV 데이터 조회 (폴백 지원: 15m/30m은 1m/5m 데이터 집계)
        ohlcv_data = await OHLCVService.get_ohlcv_data_with_fallback(
            db=db,
            asset_id=asset_id,
            data_interval=data_interval,
            include_ohlcv=True,  # 전체 데이터를 가져온 후 필터링
            limit=limit
        )
        
        if not ohlcv_data:
            raise HTTPException(status_code=404, detail="No price data found")
        
        # close와 volume만 추출
        price_data = []
        for item in ohlcv_data:
            price_item = {
                "close": item.get("close"),
                "volume": item.get("volume")
            }
            # timestamp도 포함할지 확인 - 사용자가 명시하지 않았지만 일반적으로 필요할 수 있음
            # 하지만 요구사항에 "close"와 "volume"만이라고 했으므로 제외
            price_data.append(price_item)
        
        return {
            "asset_identifier": asset_identifier,
            "asset_id": asset_id,
            "data_interval": data_interval,
            "data": price_data,
            "count": len(price_data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get intraday price data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get intraday price data: {str(e)}")


@router.get("/sparkline-price")
async def get_sparkline_price(
    asset_identifier: str = Query(..., description="Asset ID (integer) or Ticker (string)"),
    data_interval: str = Query("15m", description="Data interval (1m, 5m, 10m, 15m, 30m, 1h)"),
    days: int = Query(1, ge=1, le=1, description="Number of days to fetch (limited to 1 day)"),
    data_source: Optional[str] = Query(None, description="Data source filter (optional, only for crypto assets)"),
    db: Session = Depends(get_postgres_db)
):
    """
    스파크라인용 가격 데이터 조회 (유효성 검증 포함)
    quotes-delay-price와 intraday-price 중 유효한 데이터를 자동 선택
    - 오늘 날짜 기준으로 최신 데이터 확인
    - 요청한 포인트 수 충족 여부 확인
    - 날짜가 현저하게 차이나는 경우 배제
    """
    try:
        from ....models import Asset
        from datetime import date as date_type
        
        # asset_id 조회 (티커 정규화 폴백 포함)
        asset_id = resolve_asset_id_with_fallback(db, asset_identifier)
        
        # 지원하는 인터벌 설정 (분 단위)
        interval_minutes_map = {
            "1m": 1,
            "5m": 5,
            "10m": 10,
            "15m": 15,
            "30m": 30,
            "1h": 60,
        }

        if data_interval not in interval_minutes_map:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported interval: {data_interval}. Supported: {list(interval_minutes_map.keys())}"
            )

        target_minutes = interval_minutes_map[data_interval]

        # 5m, 10m, 30m 은 1m 데이터를 기반으로 다운샘플링
        if data_interval in {"5m", "10m", "30m"}:
            base_interval = "1m"
        else:
            base_interval = data_interval

        base_minutes = interval_minutes_map[base_interval]
        downsample_factor = max(1, target_minutes // base_minutes)

        # 간격에 따른 예상 포인트 수 계산
        points_per_day = {key: int(1440 / minutes) for key, minutes in interval_minutes_map.items()}
        expected_points = points_per_day[data_interval] * days
        fetch_points = expected_points * downsample_factor
        
        # 오늘 날짜
        today = datetime.now(timezone.utc).date()
        
        # 데이터 유효성 검증 함수
        def validate_data_freshness(
            quotes: list,
            source_name: str,
            expected_override: Optional[int] = None
        ) -> Tuple[bool, int, Optional[datetime]]:
            """
            데이터 유효성 검증
            Returns: (is_valid, point_count, latest_timestamp)
            """
            if not quotes or len(quotes) == 0:
                logger.warning(f"[sparkline-price] {source_name}: No data")
                return False, 0, None
            
            point_count = len(quotes)
            
            # 최신 데이터의 날짜 확인
            latest_quote = quotes[0] if quotes else None
            if not latest_quote:
                return False, point_count, None
            
            # timestamp 추출
            latest_timestamp_str = latest_quote.get("timestamp_utc") or latest_quote.get("timestamp")
            if not latest_timestamp_str:
                logger.warning(f"[sparkline-price] {source_name}: No timestamp in latest quote")
                return False, point_count, None
            
            try:
                if isinstance(latest_timestamp_str, str):
                    latest_timestamp = datetime.fromisoformat(latest_timestamp_str.replace('Z', '+00:00'))
                else:
                    latest_timestamp = latest_timestamp_str
                
                if latest_timestamp.tzinfo is None:
                    latest_timestamp = latest_timestamp.replace(tzinfo=timezone.utc)
                
                latest_date = latest_timestamp.date()
                
                # 날짜 차이 계산 (일 단위)
                days_diff = (today - latest_date).days
                
                # 유효성 검증:
                # 1. 포인트 수가 예상의 50% 이상인지 확인
                # 2. 최신 데이터가 오늘 또는 어제인지 확인 (2일 이상 차이나면 무효)
                expected_threshold = expected_override if expected_override is not None else expected_points
                has_enough_points = point_count >= max(1, expected_threshold * 0.5)
                is_recent = days_diff <= 1
                
                is_valid = has_enough_points and is_recent
                
                logger.info(
                    f"[sparkline-price] {source_name}: "
                    f"points={point_count}/{expected_points}, "
                    f"latest_date={latest_date}, "
                    f"days_diff={days_diff}, "
                    f"valid={is_valid}"
                )
                
                return is_valid, point_count, latest_timestamp
                
            except Exception as e:
                logger.error(f"[sparkline-price] {source_name}: Error validating timestamp: {e}")
                return False, point_count, None
        
        # 1. quotes-delay-price 시도
        quotes_delay_data = None
        quotes_delay_valid = False
        quotes_delay_points = 0
        
        # quotes-delay-price는 기존 저장 인터벌만 지원 (현재 15m 이상)
        if data_interval not in {"1m", "5m", "10m"}:
            try:
                # 내부적으로 quotes-delay-price 로직 호출
                from ....models.asset import RealtimeQuoteTimeDelay
                from sqlalchemy import desc
                
                query = db.query(RealtimeQuoteTimeDelay)\
                    .filter(RealtimeQuoteTimeDelay.asset_id == asset_id)\
                    .filter(RealtimeQuoteTimeDelay.data_interval == data_interval)\
                    .order_by(desc(RealtimeQuoteTimeDelay.timestamp_utc))\
                    .limit(expected_points)
                
                if data_source:
                    query = query.filter(RealtimeQuoteTimeDelay.data_source == data_source.lower())
                
                quotes = query.all()
                
                if quotes:
                    # quote 형식으로 변환
                    processed_quotes = []
                    for quote in quotes:
                        processed_quotes.append({
                            "timestamp_utc": quote.timestamp_utc.isoformat() if quote.timestamp_utc else None,
                            "price": float(quote.price) if quote.price else None,
                            "volume": float(quote.volume) if quote.volume else None,
                        })
                    
                    override = min(expected_points, len(processed_quotes))
                    quotes_delay_valid, quotes_delay_points, _ = validate_data_freshness(
                        processed_quotes, "quotes-delay-price", override
                    )
                    
                    if quotes_delay_valid:
                        quotes_delay_data = processed_quotes
                        
            except Exception as e:
                logger.warning(f"[sparkline-price] quotes-delay-price failed: {e}")
        
        # 2. intraday-price 시도 (필요 시 1m 데이터를 기반으로 다운샘플링)
        intraday_data = None
        intraday_valid = False
        intraday_points = 0
        
        try:
            from ....services.endpoint.ohlcv_service import OHLCVService

            # 후보 인터벌 목록 (필요 시 1m 다운샘플링)
            candidate_intervals: List[str]
            if data_interval == "1m":
                candidate_intervals = ["1m"]
            elif data_interval in {"5m", "10m"}:
                candidate_intervals = ["1m"]
            elif data_interval == "15m":
                candidate_intervals = ["15m", "1m"]
            elif data_interval == "30m":
                candidate_intervals = ["1m"]
            elif data_interval == "1h":
                candidate_intervals = ["1h", "15m", "1m"]
            else:
                candidate_intervals = [base_interval]

            for candidate_interval in candidate_intervals:
                candidate_minutes = interval_minutes_map.get(candidate_interval)
                if not candidate_minutes:
                    continue
                if candidate_minutes > target_minutes:
                    continue

                candidate_factor = max(1, target_minutes // candidate_minutes)
                candidate_limit = expected_points * candidate_factor

                ohlcv_data = await OHLCVService.get_ohlcv_data_with_fallback(
                    db=db,
                    asset_id=asset_id,
                    data_interval=candidate_interval,
                    include_ohlcv=True,
                    limit=candidate_limit
                )

                if not ohlcv_data:
                    continue

                processed_data = []
                for item in ohlcv_data:
                    processed_data.append({
                        "timestamp_utc": item.get("timestamp"),
                        "price": item.get("close"),
                        "volume": item.get("volume")
                    })

                if not processed_data:
                    continue

                def _parse_timestamp(value: Any) -> Optional[datetime]:
                    if not value:
                        return None
                    if isinstance(value, datetime):
                        return value
                    try:
                        return datetime.fromisoformat(str(value).replace('Z', '+00:00'))
                    except Exception:
                        return None

                processed_data = [
                    data for data in processed_data
                    if _parse_timestamp(data.get("timestamp_utc"))
                ]
                processed_data.sort(
                    key=lambda x: _parse_timestamp(x.get("timestamp_utc")),
                    reverse=True
                )

                if candidate_factor > 1:
                    processed_data = processed_data[::candidate_factor]

                if len(processed_data) > expected_points:
                    processed_data = processed_data[:expected_points]

                if not processed_data:
                    continue

                effective_expected = min(expected_points, len(processed_data))
                current_valid, current_points, _ = validate_data_freshness(
                    processed_data,
                    f"intraday-price({candidate_interval})",
                    effective_expected
                )

                if current_valid:
                    intraday_data = processed_data
                    intraday_valid = True
                    intraday_points = current_points
                    break
                else:
                    # 유효하지 않지만 기존보다 많은 포인트라면 후보로 유지
                    if (intraday_data is None) or (current_points > intraday_points):
                        intraday_data = processed_data
                        intraday_points = current_points
                        intraday_valid = False

        except Exception as e:
            logger.warning(f"[sparkline-price] intraday-price failed: {e}")
        
        # 3. 유효한 데이터 선택 (우선순위: quotes-delay-price > intraday-price)
        selected_data = None
        selected_source = None
        
        if quotes_delay_valid and quotes_delay_data:
            selected_data = quotes_delay_data
            selected_source = "quotes-delay-price"
            logger.info(f"[sparkline-price] Selected quotes-delay-price: {quotes_delay_points} points")
        elif intraday_valid and intraday_data:
            selected_data = intraday_data
            selected_source = "intraday-price"
            logger.info(f"[sparkline-price] Selected intraday-price: {intraday_points} points")
        else:
            # 둘 다 유효하지 않은 경우, 더 많은 포인트를 가진 것을 선택
            if quotes_delay_points > intraday_points:
                selected_data = quotes_delay_data if quotes_delay_data else None
                selected_source = "quotes-delay-price" if quotes_delay_data else None
            elif intraday_points > 0:
                selected_data = intraday_data if intraday_data else None
                selected_source = "intraday-price" if intraday_data else None
        
        if not selected_data:
            raise HTTPException(
                status_code=404, 
                detail=f"No valid sparkline data found for {asset_identifier}. "
                       f"quotes-delay-price: {quotes_delay_points} points, "
                       f"intraday-price: {intraday_points} points"
            )
        
        # 응답 형식 (SparklineTable과 호환)
        return {
            "asset_identifier": asset_identifier,
            "asset_id": asset_id,
            "quotes": selected_data,
            "data_source": selected_source,
            "data_interval": data_interval,
            "count": len(selected_data),
            "expected_points": expected_points
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get sparkline price data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get sparkline price data: {str(e)}")
