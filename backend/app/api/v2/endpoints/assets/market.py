# backend/app/api/v2/endpoints/assets/market.py
"""
Market Module - 가격 정보 및 차트 데이터
대상 테이블: ohlcv_day_data, ohlcv_intraday_data, realtime_quotes
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List, Dict, Any
from datetime import date, datetime, timedelta
from collections import defaultdict
import logging

from app.core.database import get_postgres_db
from app.models import OHLCVData, Asset
from .shared.resolvers import resolve_asset_identifier
from .shared.validators import validate_data_interval

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# Helper Functions
# ============================================================================

def get_latest_ohlcv(db: Session, asset_id: int) -> Optional[OHLCVData]:
    """최신 일봉 OHLCV 데이터 조회"""
    return db.query(OHLCVData).filter(
        OHLCVData.asset_id == asset_id,
        OHLCVData.data_interval.in_(['1d', '1day', None])
    ).order_by(OHLCVData.timestamp_utc.desc()).first()


def db_get_ohlcv_data(
    db: Session, 
    asset_id: int, 
    start_date: Optional[date], 
    end_date: Optional[date], 
    data_interval: str, 
    limit: int = 50000
) -> List[OHLCVData]:
    """OHLCV 데이터 조회"""
    query = db.query(OHLCVData).filter(OHLCVData.asset_id == asset_id)
    
    # 인터벌 필터링
    if data_interval.lower() in ['1d', '1day']:
        query = query.filter(OHLCVData.data_interval.in_(['1d', '1day', None]))
    else:
        query = query.filter(OHLCVData.data_interval == data_interval)
    
    if start_date:
        query = query.filter(OHLCVData.timestamp_utc >= start_date)
    if end_date:
        query = query.filter(OHLCVData.timestamp_utc <= end_date)
    
    if start_date:
        return query.order_by(OHLCVData.timestamp_utc.asc()).limit(limit).all()
    
    # start_date가 없으면 최신 데이터 우선 조회 (DESC sorting -> Limit -> ASC resort)
    rows = query.order_by(OHLCVData.timestamp_utc.desc()).limit(limit).all()
    return sorted(rows, key=lambda x: x.timestamp_utc)


def aggregate_to_weekly(daily_rows: List[OHLCVData]) -> List[Dict]:
    """일봉 데이터를 주봉으로 집계"""
    buckets = defaultdict(list)
    for r in daily_rows:
        iso = r.timestamp_utc.isocalendar()
        key = (iso[0], iso[1])  # (ISO year, ISO week)
        buckets[key].append(r)

    aggregated = []
    for key in sorted(buckets.keys()):
        rows = sorted(buckets[key], key=lambda x: x.timestamp_utc)
        if not rows:
            continue
        
        first = rows[0]
        last = rows[-1]
        
        candle = {
            'timestamp_utc': last.timestamp_utc,
            'open_price': float(first.open_price) if first.open_price else None,
            'high_price': max((float(x.high_price) for x in rows if x.high_price), default=None),
            'low_price': min((float(x.low_price) for x in rows if x.low_price), default=None),
            'close_price': float(last.close_price) if last.close_price else None,
            'volume': sum(float(x.volume) for x in rows if x.volume),
            'change_percent': None,
            'data_interval': '1W'
        }
        aggregated.append(candle)
    
    # change_percent 계산
    prev_close = None
    for candle in aggregated:
        if prev_close and candle['close_price'] and prev_close > 0:
            candle['change_percent'] = round(((candle['close_price'] - prev_close) / prev_close) * 100, 4)
        prev_close = candle['close_price']
    
    return aggregated


def aggregate_to_monthly(daily_rows: List[OHLCVData]) -> List[Dict]:
    """일봉 데이터를 월봉으로 집계"""
    buckets = defaultdict(list)
    for r in daily_rows:
        ym = (r.timestamp_utc.year, r.timestamp_utc.month)
        buckets[ym].append(r)

    aggregated = []
    for (y, m) in sorted(buckets.keys()):
        rows = sorted(buckets[(y, m)], key=lambda x: x.timestamp_utc)
        if not rows:
            continue
        
        first = rows[0]
        last = rows[-1]
        
        candle = {
            'timestamp_utc': last.timestamp_utc,
            'open_price': float(first.open_price) if first.open_price else None,
            'high_price': max((float(x.high_price) for x in rows if x.high_price), default=None),
            'low_price': min((float(x.low_price) for x in rows if x.low_price), default=None),
            'close_price': float(last.close_price) if last.close_price else None,
            'volume': sum(float(x.volume) for x in rows if x.volume),
            'change_percent': None,
            'data_interval': '1M'
        }
        aggregated.append(candle)
    
    # change_percent 계산
    prev_close = None
    for candle in aggregated:
        if prev_close and candle['close_price'] and prev_close > 0:
            candle['change_percent'] = round(((candle['close_price'] - prev_close) / prev_close) * 100, 4)
        prev_close = candle['close_price']
    
    return aggregated


# ============================================================================
# OHLCV Endpoint
# ============================================================================

@router.get("/{asset_identifier}/ohlcv")
def get_ohlcv_data_v2(
    asset_identifier: str = Path(..., description="Asset ID or Ticker"),
    data_interval: str = Query("1d", description="데이터 간격 (1d, 1h, 1W, 1M)"),
    start_date: Optional[date] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    limit: int = Query(50000, ge=1, le=100000, description="최대 데이터 포인트 수"),
    db: Session = Depends(get_postgres_db)
):
    """
    OHLCV 차트 데이터 조회
    
    - **data_interval**: 1d(일봉), 1h(시간봉), 1W(주봉), 1M(월봉)
    - **start_date/end_date**: 날짜 범위 필터
    - **limit**: 최대 반환 개수
    """
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        
        interval_upper = data_interval.upper()
        
        # 주봉/월봉은 일봉 데이터를 집계
        if interval_upper in ['1W', '1M']:
            daily_rows = db_get_ohlcv_data(db, asset_id, start_date, end_date, '1d', 200000)
            
            if interval_upper == '1W':
                aggregated = aggregate_to_weekly(daily_rows)
            else:
                aggregated = aggregate_to_monthly(daily_rows)
            
            if limit:
                aggregated = aggregated[-limit:]
            
            return {
                "asset_id": asset_id,
                "data_interval": data_interval,
                "count": len(aggregated),
                "data": aggregated
            }
        
        # 일봉/시간봉은 직접 조회
        ohlcv_rows = db_get_ohlcv_data(db, asset_id, start_date, end_date, data_interval, limit)
        
        data = [
            {
                'timestamp_utc': row.timestamp_utc,
                'open_price': float(row.open_price) if row.open_price else None,
                'high_price': float(row.high_price) if row.high_price else None,
                'low_price': float(row.low_price) if row.low_price else None,
                'close_price': float(row.close_price) if row.close_price else None,
                'volume': float(row.volume) if row.volume else 0,
                'change_percent': float(row.change_percent) if row.change_percent else None,
                'data_interval': row.data_interval or '1d'
            }
            for row in ohlcv_rows
        ]
        
        return {
            "asset_id": asset_id,
            "data_interval": data_interval,
            "count": len(data),
            "data": data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get OHLCV data for {asset_identifier}")
        raise HTTPException(status_code=500, detail=f"Failed to get OHLCV data: {str(e)}")


# ============================================================================
# Price Endpoint
# ============================================================================

@router.get("/{asset_identifier}/price")
def get_price_data_v2(
    asset_identifier: str = Path(..., description="Asset ID or Ticker"),
    data_interval: str = Query("1d", description="데이터 간격"),
    db: Session = Depends(get_postgres_db)
):
    """
    현재 가격 및 변동률 조회
    
    최신 OHLCV 데이터 기반 가격 정보 반환
    """
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        
        # 최신 데이터 조회
        latest = get_latest_ohlcv(db, asset_id)
        
        if not latest:
            # 실시간 데이터 또는 WorldAssetsRanking에서 폴백
            from app.models import WorldAssetsRanking
            world_asset = db.query(WorldAssetsRanking).filter(
                WorldAssetsRanking.asset_id == asset_id
            ).order_by(WorldAssetsRanking.ranking_date.desc()).first()
            
            if world_asset:
                return {
                    "asset_id": asset_id,
                    "current_price": float(world_asset.price_usd) if world_asset.price_usd else None,
                    "change_percent_24h": float(world_asset.daily_change_percent) if world_asset.daily_change_percent else None,
                    "volume_24h": None,
                    "last_updated": world_asset.ranking_date,
                    "data_source": "world_assets_ranking"
                }
            
            raise HTTPException(status_code=404, detail="Price data not found")
        
        # 이전 종가 조회 (변동률 계산용)
        prev_ohlcv = db.query(OHLCVData).filter(
            OHLCVData.asset_id == asset_id,
            OHLCVData.timestamp_utc < latest.timestamp_utc,
            OHLCVData.data_interval.in_(['1d', '1day', None])
        ).order_by(OHLCVData.timestamp_utc.desc()).first()
        
        change_percent = None
        if latest.change_percent:
            change_percent = float(latest.change_percent)
        elif prev_ohlcv and prev_ohlcv.close_price and float(prev_ohlcv.close_price) > 0:
            current = float(latest.close_price)
            prev = float(prev_ohlcv.close_price)
            change_percent = ((current - prev) / prev) * 100
        
        return {
            "asset_id": asset_id,
            "current_price": float(latest.close_price) if latest.close_price else None,
            "open_price": float(latest.open_price) if latest.open_price else None,
            "high_price": float(latest.high_price) if latest.high_price else None,
            "low_price": float(latest.low_price) if latest.low_price else None,
            "prev_close": float(prev_ohlcv.close_price) if prev_ohlcv and prev_ohlcv.close_price else None,
            "change_percent_24h": change_percent,
            "volume_24h": float(latest.volume) if latest.volume else None,
            "last_updated": latest.timestamp_utc,
            "data_source": "ohlcv"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get price data for {asset_identifier}")
        raise HTTPException(status_code=500, detail=f"Failed to get price data: {str(e)}")


# ============================================================================
# History Endpoint (빠른 기간별 조회)
# ============================================================================

@router.get("/{asset_identifier}/history")
def get_price_history_v2(
    asset_identifier: str = Path(..., description="Asset ID or Ticker"),
    period: str = Query("1m", description="기간 (1d, 1w, 1m, 3m, 6m, 1y, all)"),
    db: Session = Depends(get_postgres_db)
):
    """
    빠른 기간별 가격 히스토리 조회
    
    - **period**: 1d(1일), 1w(1주), 1m(1개월), 3m(3개월), 6m(6개월), 1y(1년), all(전체)
    """
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        
        # 기간별 날짜 계산
        period_days = {
            '1d': 1,
            '1w': 7,
            '1m': 30,
            '3m': 90,
            '6m': 180,
            '1y': 365,
            'all': None
        }
        
        days = period_days.get(period.lower())
        start_date = None
        if days:
            start_date = (datetime.now() - timedelta(days=days)).date()
        
        ohlcv_rows = db_get_ohlcv_data(db, asset_id, start_date, None, '1d', 10000)
        
        # 간단한 형태로 반환
        data = [
            {
                'date': row.timestamp_utc.strftime('%Y-%m-%d'),
                'close': float(row.close_price) if row.close_price else None,
                'volume': float(row.volume) if row.volume else 0,
            }
            for row in ohlcv_rows
        ]
        
        return {
            "asset_id": asset_id,
            "period": period,
            "count": len(data),
            "data": data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get price history for {asset_identifier}")
        raise HTTPException(status_code=500, detail=f"Failed to get price history: {str(e)}")
