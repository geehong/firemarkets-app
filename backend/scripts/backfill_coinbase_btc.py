import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from typing import List, Any

# 프로젝트 루트를 python path에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.api_strategy_manager import ApiStrategyManager
from app.core.database import get_postgres_db
from app.models import OHLCVIntradayData
from sqlalchemy.dialects.postgresql import insert

async def get_earliest_date(asset_id, interval):
    """현재 DB의 가장 오래된 날짜 조회"""
    db = next(get_postgres_db())
    try:
        record = db.query(OHLCVIntradayData)\
            .filter(OHLCVIntradayData.asset_id == asset_id, OHLCVIntradayData.data_interval == interval)\
            .order_by(OHLCVIntradayData.timestamp_utc.asc())\
            .first()
        # 데이터가 없으면 현재 시간 반환, 있으면 그 시간 반환
        return record.timestamp_utc if record else datetime.now(timezone.utc)
    finally:
        db.close()

async def upsert_historical_bars(db, asset_id: int, interval: str, data_points: List[Any]):
    """OHLCVIntradayData 테이블에 데이터 UPSERT (중복 방지)"""
    records = []
    for dp in data_points:
        # DB는 naive UTC를 사용하므로 타임존 제거
        ts = dp.timestamp_utc
        if ts.tzinfo is not None:
             ts = ts.astimezone(timezone.utc).replace(microsecond=0, tzinfo=None)
        
        records.append({
            "asset_id": asset_id,
            "timestamp_utc": ts,
            "data_interval": interval,
            "open_price": float(dp.open_price),
            "high_price": float(dp.high_price),
            "low_price": float(dp.low_price),
            "close_price": float(dp.close_price),
            "volume": float(dp.volume or 0),
        })
    
    if records:
        # 대량 입력을 위해 1000개씩 분할 처리
        batch_size = 1000
        for i in range(0, len(records), batch_size):
            batch = records[i:i+batch_size]
            try:
                stmt = insert(OHLCVIntradayData).values(batch)
                stmt = stmt.on_conflict_do_update(
                    index_elements=['asset_id', 'timestamp_utc', 'data_interval'],
                    set_={
                        "open_price": stmt.excluded.open_price,
                        "high_price": stmt.excluded.high_price,
                        "low_price": stmt.excluded.low_price,
                        "close_price": stmt.excluded.close_price,
                        "volume": stmt.excluded.volume,
                    }
                )
                db.execute(stmt)
            except Exception as e:
                print(f"Upsert failed for batch starting at {i}: {e}")
                raise e

async def backfill():
    api_manager = ApiStrategyManager()
    asset_id = 1  # BTCUSDT
    intervals = ["1m", "5m"]
    
    # 설정: 더 자주 저장하기 위해 10,000으로 조정
    chunk_limit = 10000 
    target_start_date = "2015-01-01"
    target_start_dt = datetime.fromisoformat(target_start_date).replace(tzinfo=timezone.utc)

    db = next(get_postgres_db())
    try:
        for interval in intervals:
            print(f"\n=== Smart Backfill for {interval} starting from existing gap (Target: 2015) ===")
            
            # DB에 있는 가장 오래된 데이터의 시점부터 과거로 수집 시작 (Target 시점까지)
            current_end_dt = await get_earliest_date(asset_id, interval)
            if current_end_dt.tzinfo is None:
                current_end_dt = current_end_dt.replace(tzinfo=timezone.utc)
                
            print(f"Beginning backfill for {interval} starting from {current_end_dt.strftime('%Y-%m-%d %H:%M:%S')} backwards to {target_start_date}...")
            
            while current_end_dt > target_start_dt:
                if interval == "1m":
                    end_dt_to_fetch = current_end_dt - timedelta(minutes=1)
                else:
                    end_dt_to_fetch = current_end_dt - timedelta(minutes=5)
                
                # Coinbase API expects ISO format
                end_date_str = end_dt_to_fetch.strftime('%Y-%m-%dT%H:%M:%SZ')
                print(f"Fetching chunk ending at {end_date_str} (Limit: {chunk_limit})")
                
                try:
                    ohlcv_data = await api_manager.get_ohlcv_data(
                        asset_id=asset_id, 
                        interval=interval, 
                        preferred_data_source="coinbase",
                        limit=chunk_limit,
                        end_date=end_date_str
                    )
                    
                    if not ohlcv_data or len(ohlcv_data) == 0:
                        print(f"No more data found for {interval} at {end_date_str}. Stopping.")
                        break
                    
                    # 수집된 데이터를 DB에 저장
                    await upsert_historical_bars(db, asset_id, interval, ohlcv_data)
                    db.commit() # 주기적으로 커밋
                    
                    # 수집된 가장 오래된 날짜 확인
                    oldest_in_chunk = ohlcv_data[-1].timestamp_utc
                    if oldest_in_chunk.tzinfo is None:
                        oldest_in_chunk = oldest_in_chunk.replace(tzinfo=timezone.utc)
                        
                    print(f"Successfully processed {len(ohlcv_data)} records. Oldest in chunk: {oldest_in_chunk}")
                    
                    # 다음 chunk의 시작점으로 설정
                    current_end_dt = oldest_in_chunk
                    
                    # API 부하 방지
                    await asyncio.sleep(1)
                    
                except Exception as e:
                    print(f"Error during backfill chunk: {e}")
                    db.rollback()
                    break
    finally:
        db.close()

    print("\nSmart backfill sequence completed.")

if __name__ == "__main__":
    asyncio.run(backfill())
