#!/usr/bin/env python
"""
Commodity OHLCV Backfill Script
realtime_quotes_time_delay의 15분 데이터를 사용하여
ohlcv_intraday_data (1h, 4h) 및 ohlcv_day_data (1d)의 갭을 채움

Usage:
    python -m scripts.backfill_commodity_ohlcv
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from sqlalchemy import text
from app.core.database import SessionLocal


def get_data_gaps():
    """커머디티 OHLCV 데이터의 갭 확인"""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT 
                'realtime_quotes_time_delay' as source,
                MIN(timestamp_utc) as min_ts,
                MAX(timestamp_utc) as max_ts,
                COUNT(*) as cnt
            FROM realtime_quotes_time_delay r
            JOIN assets a ON r.asset_id = a.asset_id
            JOIN asset_types at ON a.asset_type_id = at.asset_type_id
            WHERE at.type_name = 'Commodities'
            UNION ALL
            SELECT 
                'ohlcv_intraday_data' as source,
                MIN(timestamp_utc),
                MAX(timestamp_utc),
                COUNT(*)
            FROM ohlcv_intraday_data o
            JOIN assets a ON o.asset_id = a.asset_id
            JOIN asset_types at ON a.asset_type_id = at.asset_type_id
            WHERE at.type_name = 'Commodities'
            UNION ALL
            SELECT 
                'ohlcv_day_data' as source,
                MIN(timestamp_utc),
                MAX(timestamp_utc),
                COUNT(*)
            FROM ohlcv_day_data o
            JOIN assets a ON o.asset_id = a.asset_id
            JOIN asset_types at ON a.asset_type_id = at.asset_type_id
            WHERE at.type_name = 'Commodities'
        """))
        
        print("=" * 60)
        print("커머디티 OHLCV 데이터 범위:")
        print("=" * 60)
        for row in result:
            print(f"{row[0]:30} | {row[1]} ~ {row[2]} | {row[3]:,} rows")
        print("=" * 60)
    finally:
        db.close()


def backfill_intraday(interval: str, days_back: int = 90):
    """인트라데이 데이터 백필 (1h, 4h)"""
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        start_time = now - timedelta(days=days_back)
        
        if interval == "1h":
            truncate_sql = "date_trunc('hour', timestamp_utc)"
        elif interval == "4h":
            truncate_sql = "date_trunc('hour', timestamp_utc) - ((EXTRACT(HOUR FROM timestamp_utc)::int % 4) * INTERVAL '1 hour')"
        else:
            print(f"지원하지 않는 interval: {interval}")
            return 0
        
        aggregate_sql = text(f"""
            INSERT INTO ohlcv_intraday_data (asset_id, timestamp_utc, data_interval, open_price, high_price, low_price, close_price, volume)
            SELECT 
                r.asset_id,
                {truncate_sql} as agg_timestamp,
                :interval as data_interval,
                (array_agg(r.price ORDER BY r.timestamp_utc ASC))[1] as open_price,
                MAX(r.price) as high_price,
                MIN(r.price) as low_price,
                (array_agg(r.price ORDER BY r.timestamp_utc DESC))[1] as close_price,
                COALESCE(SUM(r.volume), 0) as volume
            FROM realtime_quotes_time_delay r
            JOIN assets a ON r.asset_id = a.asset_id
            JOIN asset_types at ON a.asset_type_id = at.asset_type_id
            WHERE at.type_name = 'Commodities'
              AND r.timestamp_utc >= :start_time
              AND r.timestamp_utc < :end_time
            GROUP BY r.asset_id, {truncate_sql}
            ON CONFLICT (asset_id, timestamp_utc, data_interval) DO UPDATE SET
                high_price = GREATEST(ohlcv_intraday_data.high_price, EXCLUDED.high_price),
                low_price = LEAST(ohlcv_intraday_data.low_price, EXCLUDED.low_price),
                close_price = EXCLUDED.close_price,
                volume = EXCLUDED.volume,
                updated_at = NOW()
        """)
        
        result = db.execute(aggregate_sql, {
            "interval": interval,
            "start_time": start_time,
            "end_time": now
        })
        db.commit()
        count = result.rowcount or 0
        print(f"✅ {interval} 백필 완료: {count} rows affected")
        return count
    except Exception as e:
        db.rollback()
        print(f"❌ {interval} 백필 실패: {e}")
        return 0
    finally:
        db.close()


def backfill_daily(days_back: int = 90):
    """일봉 데이터 백필 (1d)"""
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        start_time = now - timedelta(days=days_back)
        
        aggregate_sql = text("""
            INSERT INTO ohlcv_day_data (asset_id, timestamp_utc, open_price, high_price, low_price, close_price, volume)
            SELECT 
                r.asset_id,
                date_trunc('day', r.timestamp_utc) as agg_timestamp,
                (array_agg(r.price ORDER BY r.timestamp_utc ASC))[1] as open_price,
                MAX(r.price) as high_price,
                MIN(r.price) as low_price,
                (array_agg(r.price ORDER BY r.timestamp_utc DESC))[1] as close_price,
                COALESCE(SUM(r.volume), 0) as volume
            FROM realtime_quotes_time_delay r
            JOIN assets a ON r.asset_id = a.asset_id
            JOIN asset_types at ON a.asset_type_id = at.asset_type_id
            WHERE at.type_name = 'Commodities'
              AND r.timestamp_utc >= :start_time
              AND r.timestamp_utc < :end_time
            GROUP BY r.asset_id, date_trunc('day', r.timestamp_utc)
            ON CONFLICT (asset_id, timestamp_utc) DO UPDATE SET
                high_price = GREATEST(ohlcv_day_data.high_price, EXCLUDED.high_price),
                low_price = LEAST(ohlcv_day_data.low_price, EXCLUDED.low_price),
                close_price = EXCLUDED.close_price,
                volume = EXCLUDED.volume,
                updated_at = NOW()
        """)
        
        result = db.execute(aggregate_sql, {
            "start_time": start_time,
            "end_time": now
        })
        db.commit()
        count = result.rowcount or 0
        print(f"✅ 1d 백필 완료: {count} rows affected")
        return count
    except Exception as e:
        db.rollback()
        print(f"❌ 1d 백필 실패: {e}")
        return 0
    finally:
        db.close()


def main():
    """메인 함수"""
    print("\n" + "=" * 60)
    print("커머디티 OHLCV 백필 스크립트")
    print("=" * 60)
    
    # 1. 현재 데이터 갭 확인
    get_data_gaps()
    
    # 2. 백필 실행
    print("\n백필 시작...")
    
    # 인트라데이 (1h, 4h) - 90일 분량
    backfill_intraday("1h", days_back=90)
    backfill_intraday("4h", days_back=90)
    
    # 일봉 (1d) - 90일 분량
    backfill_daily(days_back=90)
    
    # 3. 결과 확인
    print("\n백필 후 데이터 범위:")
    get_data_gaps()
    
    print("\n✅ 백필 완료!")


if __name__ == "__main__":
    main()
