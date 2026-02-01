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
from app.models import OHLCVData, Asset, OHLCVIntradayData, RealtimeQuoteTimeDelay
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


def get_latest_unified_data(db: Session, asset_id: int) -> Optional[Dict]:
    """
    모든 테이블(실시간/분봉/일봉/랭킹)을 조회하여 가장 최신 데이터 1건을 반환
    """
    stmt = text("""
        WITH latest_prices AS (
            -- 1. Realtime Quotes (15m delay)
            SELECT 
                data_interval,
                price as close_price, 
                price as open_price,
                price as high_price,
                price as low_price,
                volume,
                change_percent,
                timestamp_utc 
            FROM realtime_quotes_time_delay 
            WHERE asset_id = :asset_id
            
            UNION ALL
            
            -- 2. Intraday Data
            SELECT 
                data_interval,
                close_price, 
                open_price,
                high_price,
                low_price,
                volume,
                change_percent,
                timestamp_utc 
            FROM ohlcv_intraday_data 
            WHERE asset_id = :asset_id
            
            UNION ALL
            
            -- 3. Daily Data
            SELECT 
                COALESCE(data_interval, '1d'),
                close_price, 
                open_price,
                high_price,
                low_price,
                volume,
                change_percent,
                timestamp_utc 
            FROM ohlcv_day_data 
            WHERE asset_id = :asset_id
            AND (data_interval = '1d' OR data_interval = '1day' OR data_interval IS NULL)

            UNION ALL
            
            -- 4. Ranking Data
            SELECT 
                '1d' as data_interval,
                price_usd as close_price, 
                price_usd as open_price,
                price_usd as high_price,
                price_usd as low_price,
                0 as volume,
                daily_change_percent as change_percent,
                CAST(ranking_date AS TIMESTAMP) as timestamp_utc
            FROM world_assets_ranking 
            WHERE asset_id = :asset_id
        )
        SELECT *
        FROM latest_prices
        ORDER BY timestamp_utc DESC
        LIMIT 1
    """)
    result = db.execute(stmt, {"asset_id": asset_id}).fetchone()
    if result:
        return dict(result._mapping)
    return None


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


def db_get_intraday_data(
    db: Session, 
    asset_id: int, 
    start_date: Optional[date], 
    end_date: Optional[date], 
    data_interval: str, 
    limit: int = 50000
) -> List[OHLCVIntradayData]:
    """Intraday (분봉/시간봉) 데이터 조회 - ohlcv_intraday_data 테이블 사용"""
    query = db.query(OHLCVIntradayData).filter(OHLCVIntradayData.asset_id == asset_id)
    
    query = query.filter(OHLCVIntradayData.data_interval == data_interval)
    
    if start_date:
        query = query.filter(OHLCVIntradayData.timestamp_utc >= start_date)
    if end_date:
        query = query.filter(OHLCVIntradayData.timestamp_utc <= end_date)
    
    if start_date:
        return query.order_by(OHLCVIntradayData.timestamp_utc.asc()).limit(limit).all()
    
    rows = query.order_by(OHLCVIntradayData.timestamp_utc.desc()).limit(limit).all()
    return sorted(rows, key=lambda x: x.timestamp_utc)

def db_get_delay_data(
    db: Session, 
    asset_id: int, 
    start_date: Optional[date], 
    end_date: Optional[date], 
    data_interval: str, 
    limit: int = 50000
) -> List[RealtimeQuoteTimeDelay]:
    """Realtime delay 데이터 조회 - realtime_quotes_time_delay 테이블 사용"""
    query = db.query(RealtimeQuoteTimeDelay).filter(RealtimeQuoteTimeDelay.asset_id == asset_id)
    query = query.filter(RealtimeQuoteTimeDelay.data_interval == data_interval)
    
    if start_date:
        query = query.filter(RealtimeQuoteTimeDelay.timestamp_utc >= start_date)
    if end_date:
        query = query.filter(RealtimeQuoteTimeDelay.timestamp_utc <= end_date)
    
    if start_date:
        return query.order_by(RealtimeQuoteTimeDelay.timestamp_utc.asc()).limit(limit).all()
    
    rows = query.order_by(RealtimeQuoteTimeDelay.timestamp_utc.desc()).limit(limit).all()
    return sorted(rows, key=lambda x: x.timestamp_utc)

def _fill_missing_change_percent(data_list: List[Dict]) -> List[Dict]:
    """리스트 내의 Dict 데이터에서 change_percent가 없는 경우 이전 종가(prev_close)를 기준으로 계산하여 채움"""
    # Sort just in case, though usually already sorted
    sorted_data = sorted(data_list, key=lambda x: x['timestamp_utc'])
    
    prev_close = None
    
    for row in sorted_data:
        close_p = row.get('close_price')
        change_p = row.get('change_percent')
        
        # Calculate if missing
        if change_p is None and prev_close is not None and prev_close > 0 and close_p is not None:
             # Calculate and update in place
             change_p = round(((close_p - prev_close) / prev_close) * 100, 4)
             row['change_percent'] = change_p
        
        # Update prev_close
        if close_p is not None:
            prev_close = close_p
            
    return sorted_data

def _format_ohlcv_rows(rows):
    # Ensure rows are sorted by timestamp for correct change_percent calculation
    sorted_rows = sorted(rows, key=lambda x: x.timestamp_utc)
    
    res = []
    
    seen_timestamps = set()
    
    for row in sorted_rows:
        if row.timestamp_utc in seen_timestamps:
            continue
        seen_timestamps.add(row.timestamp_utc)

        if isinstance(row, RealtimeQuoteTimeDelay):
            res.append({
                'timestamp_utc': row.timestamp_utc,
                'open_price': float(row.price),
                'high_price': float(row.price),
                'low_price': float(row.price),
                'close_price': float(row.price),
                'volume': float(row.volume) if row.volume else 0,
                'change_percent': float(row.change_percent) if row.change_percent else None,
                'data_interval': row.data_interval
            })
        else:
            res.append({
                'timestamp_utc': row.timestamp_utc,
                'open_price': float(row.open_price) if row.open_price else None,
                'high_price': float(row.high_price) if row.high_price else None,
                'low_price': float(row.low_price) if row.low_price else None,
                'close_price': float(row.close_price) if row.close_price else None,
                'volume': float(row.volume) if row.volume else 0,
                'change_percent': float(row.change_percent) if row.change_percent else None,
                'data_interval': row.data_interval or '1d'
            })
            
    # Use helper to fill any missing change_percent (though _format_ohlcv_rows usually handles raw data, this is safe)
    # Note: The previous logic inside here was removing the need for this, but to be consistent with 
    # the new plan where we do it at the end, we can use the helper here too for simple calls.
    return _fill_missing_change_percent(res)


    return aggregated

def get_daily_data_combined(db, asset_id, start_date, end_date, limit):
    """일봉 데이터 조회 + 인트라데이/딜레이 합성 병합"""
    # 1. Primary: ohlcv_day_data
    ohlcv_rows = db_get_ohlcv_data(db, asset_id, start_date, end_date, '1d', limit)
    data = _format_ohlcv_rows(ohlcv_rows)
    
    # Normalize timestamps to 00:00:00 for 1d data to avoid duplicates
    for d in data:
        d['timestamp_utc'] = d['timestamp_utc'].replace(hour=0, minute=0, second=0, microsecond=0)
    
    # 2. Synthesis helper (from 5m + 15m delay)
    def db_get_delay_data_local(db_l, a_id, s_date, e_date, d_interval, lmt):
        from app.models import RealtimeQuoteTimeDelay
        query = db_l.query(RealtimeQuoteTimeDelay).filter(RealtimeQuoteTimeDelay.asset_id == a_id)
        query = query.filter(RealtimeQuoteTimeDelay.data_interval == d_interval)
        if s_date: query = query.filter(RealtimeQuoteTimeDelay.timestamp_utc >= s_date)
        if e_date: query = query.filter(RealtimeQuoteTimeDelay.timestamp_utc <= e_date)
        rows = query.order_by(RealtimeQuoteTimeDelay.timestamp_utc.desc()).limit(lmt).all()
        return sorted(rows, key=lambda x: x.timestamp_utc)

    base_5m = db_get_intraday_data(db, asset_id, start_date, end_date, '5m', limit * 12)
    base_15m = db_get_delay_data_local(db, asset_id, start_date, end_date, '15m', limit * 4)
    
    all_source_data = _format_ohlcv_rows(base_5m) + _format_ohlcv_rows(base_15m)
    
    unique_sources = {}
    for d in all_source_data:
        ts = d['timestamp_utc']
        if ts not in unique_sources or d.get('high_price') != d.get('low_price'):
            unique_sources[ts] = d
    
    synth_data = resample_intraday_data(list(unique_sources.values()), 1440, '1d') # 1d
    
    # 3. Merge
    unique_final = {d['timestamp_utc']: d for d in data}
    for d in synth_data:
        ts = d['timestamp_utc']
        # Add if missing or if synthesized candle is more complete (just a safety check)
        if ts not in unique_final:
            unique_final[ts] = d
    
    merged_data = sorted(unique_final.values(), key=lambda x: x['timestamp_utc'])
    return _fill_missing_change_percent(merged_data)


def aggregate_to_weekly_v2(daily_data: List[Dict]) -> List[Dict]:
    """일봉 데이터(Dict)를 주봉으로 집계"""
    buckets = defaultdict(list)
    for r in daily_data:
        iso = r['timestamp_utc'].isocalendar()
        key = (iso[0], iso[1])  # (ISO year, ISO week)
        buckets[key].append(r)

    aggregated = []
    for key in sorted(buckets.keys()):
        rows = sorted(buckets[key], key=lambda x: x['timestamp_utc'])
        if not rows:
            continue
        
        first = rows[0]
        last = rows[-1]
        
        candle = {
            'timestamp_utc': last['timestamp_utc'],
            'open_price': float(first['open_price']) if first['open_price'] else None,
            'high_price': max((float(x['high_price']) for x in rows if x['high_price']), default=None),
            'low_price': min((float(x['low_price']) for x in rows if x['low_price']), default=None),
            'close_price': float(last['close_price']) if last['close_price'] else None,
            'volume': sum(float(x['volume']) for x in rows if x['volume']),
            'change_percent': None,
            'data_interval': '1W'
        }
        aggregated.append(candle)
    
    prev_close = None
    for candle in aggregated:
        if prev_close and candle['close_price'] and prev_close > 0:
            candle['change_percent'] = round(((candle['close_price'] - prev_close) / prev_close) * 100, 4)
        prev_close = candle['close_price']
    
    return aggregated


def aggregate_to_monthly_v2(daily_data: List[Dict]) -> List[Dict]:
    """일봉 데이터(Dict)를 월봉으로 집계"""
    buckets = defaultdict(list)
    for r in daily_data:
        ym = (r['timestamp_utc'].year, r['timestamp_utc'].month)
        buckets[ym].append(r)

    aggregated = []
    for (y, m) in sorted(buckets.keys()):
        rows = sorted(buckets[(y, m)], key=lambda x: x['timestamp_utc'])
        if not rows:
            continue
        
        first = rows[0]
        last = rows[-1]
        
        candle = {
            'timestamp_utc': last['timestamp_utc'],
            'open_price': float(first['open_price']) if first['open_price'] else None,
            'high_price': max((float(x['high_price']) for x in rows if x['high_price']), default=None),
            'low_price': min((float(x['low_price']) for x in rows if x['low_price']), default=None),
            'close_price': float(last['close_price']) if last['close_price'] else None,
            'volume': sum(float(x['volume']) for x in rows if x['volume']),
            'change_percent': None,
            'data_interval': '1M'
        }
        aggregated.append(candle)
    
    prev_close = None
    for candle in aggregated:
        if prev_close and candle['close_price'] and prev_close > 0:
            candle['change_percent'] = round(((candle['close_price'] - prev_close) / prev_close) * 100, 4)
        prev_close = candle['close_price']
    
    return aggregated


def resample_intraday_data(rows: List[Dict], interval_minutes: int, label: str = None) -> List[Dict]:
    """intraday 데이터를 N분봉으로 리샘플링. rows는 이미 Dict 형태 리스트임을 가정."""
    if not rows:
        return []

    label = label or f'{interval_minutes}m'
    aggregated = []
    bucket_start_time = None
    bucket_rows = []

    # Sort
    rows = sorted(rows, key=lambda x: x['timestamp_utc'])

    for r in rows:
        ts = r['timestamp_utc']
        
        if interval_minutes >= 1440:
            # 1d or more: floor to day
            current_bucket_time = ts.replace(hour=0, minute=0, second=0, microsecond=0)
        elif interval_minutes >= 60:
            # Multi-hour: floor to hour + interval hours
            hours_floor = (ts.hour // (interval_minutes // 60)) * (interval_minutes // 60)
            current_bucket_time = ts.replace(hour=hours_floor, minute=0, second=0, microsecond=0)
        else:
            # Sub-hour: floor to minutes
            minute_floor = (ts.minute // interval_minutes) * interval_minutes
            current_bucket_time = ts.replace(minute=minute_floor, second=0, microsecond=0)

        if bucket_start_time is None:
            bucket_start_time = current_bucket_time
            bucket_rows.append(r)
        elif current_bucket_time == bucket_start_time:
            bucket_rows.append(r)
        else:
            if bucket_rows:
                aggregated.append(_make_candle(bucket_rows, bucket_start_time, label))
            bucket_start_time = current_bucket_time
            bucket_rows = [r]

    if bucket_rows:
        aggregated.append(_make_candle(bucket_rows, bucket_start_time, label))
        
    return aggregated

def _make_candle(rows, timestamp, interval_str):
    """Dict 형태의 rows로부터 캔들 생성"""
    first = rows[0]
    last = rows[-1]
    
    high = max((float(x['high_price']) for x in rows if x['high_price'] is not None), default=0.0)
    low = min((float(x['low_price']) for x in rows if x['low_price'] is not None), default=0.0)
    vol = sum((float(x['volume']) for x in rows if x['volume'] is not None))
    
    candle = {
        'timestamp_utc': timestamp,
        'open_price': float(first['open_price']) if first['open_price'] else None,
        'high_price': high,
        'low_price': low,
        'close_price': float(last['close_price']) if last['close_price'] else None,
        'volume': vol,
        'change_percent': None,
        'data_interval': interval_str
    }
    return candle


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
        # Data Interval Normalization
        norm_int = data_interval.lower().strip()
        if norm_int in ['1m', '1month', '1mo']:
            data_interval = '1M'
        elif norm_int in ['min', '1min']:
            data_interval = '1m'
        elif norm_int in ['1d', '1day']:
            data_interval = '1d'
        elif norm_int in ['1w', '1week']:
            data_interval = '1W'

        asset_id = resolve_asset_identifier(db, asset_identifier)
        interval_upper = data_interval.upper()
        
        # 1. 주봉/월봉 (1W, 1M - 대문자 M은 월봉을 의미하는 경우가 많음)
        if data_interval in ['1W', '1M', '1w', '1mo', '1month']:
            # M이 포함되어 있거나 1W인 경우. 
            # 단, 1m은 분봉이므로 제외해야 함.
            if data_interval == '1m':
                pass # Continue to intraday logic
            else:
                daily_data = get_daily_data_combined(db, asset_id, start_date, end_date, 20000)
                
                if data_interval.upper() == '1W':
                    aggregated = aggregate_to_weekly_v2(daily_data)
                else:
                    aggregated = aggregate_to_monthly_v2(daily_data)
                
                if limit:
                    aggregated = aggregated[-limit:]
                
                return {
                    "asset_id": asset_id,
                    "data_interval": data_interval,
                    "count": len(aggregated),
                    "data": aggregated
                }
        
        if interval_upper in ['1D', '1DAY']:
             data = get_daily_data_combined(db, asset_id, start_date, end_date, limit)
             
             # Fallback: if 'today' KST is not present, check unified latest data
             # Simple Logic: If last candle is old (>24h or so), try to attach latest synthesized candle
             if data:
                 last_ts = data[-1]['timestamp_utc']
             else:
                 last_ts = datetime(2000,1,1) # dummy
            
             latest_unified = get_latest_unified_data(db, asset_id)
             
             if latest_unified:
                 unified_ts = latest_unified['timestamp_utc']
                 # 1d normalization: Force to 00:00:00
                 ts_normalized = unified_ts.replace(hour=0, minute=0, second=0, microsecond=0)
                 
                 # Logic: If data is empty OR last data is older than normalized unified, APPEND
                 # If last data is SAME date as normalized unified, UPDATE (replace) with unified (more recent info)
                 
                 unified_candle = {
                     'timestamp_utc': ts_normalized,
                     'open_price': float(latest_unified['open_price']) if latest_unified['open_price'] else None,
                     'high_price': float(latest_unified['high_price']) if latest_unified['high_price'] else None,
                     'low_price': float(latest_unified['low_price']) if latest_unified['low_price'] else None,
                     'close_price': float(latest_unified['close_price']) if latest_unified['close_price'] else None,
                     'volume': float(latest_unified['volume']) if latest_unified['volume'] else 0,
                     'change_percent': float(latest_unified['change_percent']) if latest_unified['change_percent'] else None,
                     'data_interval': '1d'
                 }

                 if not data:
                     data.append(unified_candle)
                 else:
                     last_ts = data[-1]['timestamp_utc']
                     # Ensure last_ts is also normalized (it should be from get_daily_data_combined)
                     last_ts_norm = last_ts.replace(hour=0, minute=0, second=0, microsecond=0)
                     
                     if ts_normalized > last_ts_norm:
                         logger.info(f"[OHLCV] '{asset_identifier}' 1d: attaching NEW unified latest {ts_normalized} (Price: {unified_candle['close_price']})")
                         data.append(unified_candle)
                     elif ts_normalized == last_ts_norm:
                         # Update existing today's candle with latest info
                         logger.info(f"[OHLCV] '{asset_identifier}' 1d: UPDATING existing latest {ts_normalized} (Price: {unified_candle['close_price']})")
                         data[-1] = unified_candle

        # 3. 리샘플링/합성 (15m, 30m, 1h, 4h)
        elif data_interval in ['15m', '30m', '1h', '4h']:
            interval_map = {'15m': 15, '30m': 30, '1h': 60, '4h': 240}
            target_min = interval_map[data_interval]
            
            # Primary data
            primary_rows = db_get_intraday_data(db, asset_id, start_date, end_date, data_interval, limit)
            primary_data = _format_ohlcv_rows(primary_rows)
            
            # Synthesized from higher freq
            base_5m = db_get_intraday_data(db, asset_id, start_date, end_date, '5m', limit * 12)
            base_15m = db_get_delay_data(db, asset_id, start_date, end_date, '15m', limit * 4)
            all_source_data = _format_ohlcv_rows(base_5m) + _format_ohlcv_rows(base_15m)
            
            unique_sources = {}
            for d in all_source_data:
                ts = d['timestamp_utc']
                if ts not in unique_sources or d.get('high_price') != d.get('low_price'):
                    unique_sources[ts] = d
            
            synth_data = resample_intraday_data(list(unique_sources.values()), target_min, data_interval)
            
            # Merge
            unique_final = {d['timestamp_utc']: d for d in primary_data}
            for d in synth_data:
                ts = d['timestamp_utc']
                if ts not in unique_final or d.get('high_price') != d.get('low_price'):
                    unique_final[ts] = d
            
            data = sorted(unique_final.values(), key=lambda x: x['timestamp_utc'])
            data = _fill_missing_change_percent(data)

        # 4. 그 외 (1m 등)
        else:
            intraday_rows = db_get_intraday_data(db, asset_id, start_date, end_date, data_interval, limit)
            data = _format_ohlcv_rows(intraday_rows)

        if limit and len(data) > limit:
            data = data[-limit:]

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
        
        # Unified Logic for latest price
        latest_unified = get_latest_unified_data(db, asset_id)
        
        if latest_unified:
            logger.info(f"[Price] '{asset_identifier}' Returning unified latest: {latest_unified['close_price']} at {latest_unified['timestamp_utc']}")
            return {
                "asset_id": asset_id,
                "current_price": float(latest_unified['close_price']) if latest_unified['close_price'] else None,
                "open_price": float(latest_unified['open_price']) if latest_unified['open_price'] else None,
                "high_price": float(latest_unified['high_price']) if latest_unified['high_price'] else None,
                "low_price": float(latest_unified['low_price']) if latest_unified['low_price'] else None,
                "prev_close": None, # Should fetch yesterday's close separately if needed for logic, but unified covers current
                "change_percent_24h": float(latest_unified['change_percent']) if latest_unified['change_percent'] else None,
                "volume_24h": float(latest_unified['volume']) if latest_unified['volume'] else None,
                "last_updated": latest_unified['timestamp_utc'],
                "data_source": "unified"
            }
            
        # Fallback (Old logic) if unified fails or returns nothing (unlikely if assets exist)
        latest = get_latest_ohlcv(db, asset_id)
        if not latest:
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


# ============================================================================
# Batch Latest Price Endpoint
# ============================================================================

@router.get("/latest-prices/batch")
def get_batch_latest_prices_v2(
    tickers: str = Query(..., description="Comma-separated tickers (e.g. AAPL,BTC,TSLA)"),
    db: Session = Depends(get_postgres_db)
):
    """
    여러 티커의 최신 가격 일괄 조회
    """
    try:
        logger.info(f"[BatchPrice] Request for tickers: {tickers}")
        
        if not tickers:
            return {"data": []}
            
        ticker_list = [t.strip().upper() for t in tickers.split(',') if t.strip()]
        
        # 1. Get Asset IDs
        assets = db.query(Asset.asset_id, Asset.ticker).filter(
            Asset.ticker.in_(ticker_list)
        ).all()
        
        logger.info(f"[BatchPrice] Found {len(assets)} assets for tickers: {[a.ticker for a in assets]}")
        
        if not assets:
            return {"data": []}
            
        asset_map = {a.asset_id: a.ticker for a in assets}
        asset_ids = list(asset_map.keys())
        
        # 2. Get Max Date per Asset (optimized UNION ALL)
        # Check Realtime (delay), Intraday, and Daily tables
        # Priority: Timestamp DESC
        
        stmt = text("""
            WITH latest_prices AS (
                -- 1. Realtime Quotes (15m delay)
                SELECT 
                    asset_id, 
                    price as close_price, 
                    timestamp_utc 
                FROM realtime_quotes_time_delay 
                WHERE asset_id = ANY(:asset_ids)
                
                UNION ALL
                
                -- 2. Intraday Data
                SELECT 
                    asset_id, 
                    close_price, 
                    timestamp_utc 
                FROM ohlcv_intraday_data 
                WHERE asset_id = ANY(:asset_ids)
                
                UNION ALL
                
                -- 3. Daily Data
                SELECT 
                    asset_id, 
                    close_price, 
                    timestamp_utc 
                FROM ohlcv_day_data 
                WHERE asset_id = ANY(:asset_ids) 
                AND (data_interval = '1d' OR data_interval = '1day' OR data_interval IS NULL)

                UNION ALL
                
                -- 4. World Assets Ranking (Daily Snapshot)
                SELECT 
                    asset_id, 
                    price_usd as close_price, 
                    CAST(ranking_date AS TIMESTAMP) as timestamp_utc
                FROM world_assets_ranking 
                WHERE asset_id = ANY(:asset_ids)
            )
            SELECT DISTINCT ON (asset_id) 
                asset_id, 
                close_price, 
                timestamp_utc 
            FROM latest_prices
            ORDER BY asset_id, timestamp_utc DESC
        """)
        
        rows = db.execute(stmt, {"asset_ids": asset_ids}).fetchall()
        
        logger.info(f"[BatchPrice] DB Query Result: {len(rows)} rows fetched")
        
        data = []
        for row in rows:
            mapped = dict(row._mapping)
            t_ticker = asset_map.get(mapped['asset_id'])
            if t_ticker:
                logger.debug(f"[BatchPrice] {t_ticker} -> {mapped['close_price']} at {mapped['timestamp_utc']}")
                data.append({
                    "ticker": t_ticker,
                    "price": float(mapped['close_price']) if mapped['close_price'] else None,
                    "last_updated": mapped['timestamp_utc']
                })
                
        logger.info(f"[BatchPrice] Returning {len(data)} items: {[d['ticker'] for d in data]}")
        return {"data": data}

    except Exception as e:
        logger.exception("Failed to get batch latest prices")
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)}")
