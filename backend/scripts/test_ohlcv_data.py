#!/usr/bin/env python3
"""
OHLCV 데이터 변환 디버깅 테스트
"""
import asyncio
import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, '/app')

from app.core.config_manager import ConfigManager
from app.services.api_strategy_manager import ApiStrategyManager
from app.utils.redis_queue_manager import RedisQueueManager
from app.core.database import SessionLocal

async def test_ohlcv_data_conversion():
    """OHLCV 데이터 변환 과정을 테스트합니다."""
    
    # 의존성 설정
    db = SessionLocal()
    config_manager = ConfigManager(db)
    api_manager = ApiStrategyManager(config_manager)
    redis_queue_manager = RedisQueueManager(config_manager)
    
    try:
        # 테스트할 자산 ID들
        test_assets = [1, 4, 8]  # BTCUSDT, SPY, AAPL
        
        for asset_id in test_assets:
            print(f"\n=== Testing asset_id {asset_id} ===")
            
            # 1. get_ohlcv_data 호출
            ohlcv_data = await api_manager.get_ohlcv_data(asset_id, "1d")
            
            if ohlcv_data is None:
                print(f"❌ get_ohlcv_data returned None for asset_id {asset_id}")
                continue
            
            print(f"✅ get_ohlcv_data returned {len(ohlcv_data)} records for asset_id {asset_id}")
            
            # 2. 첫 번째 레코드 구조 확인
            if ohlcv_data:
                first_record = ohlcv_data[0]
                print(f"📊 First record structure: {type(first_record)}")
                print(f"📊 First record data: {first_record}")
                
                # 3. model_dump() 테스트
                try:
                    dumped = first_record.model_dump()
                    print(f"✅ model_dump() successful: {len(dumped)} fields")
                except Exception as e:
                    print(f"❌ model_dump() failed: {e}")
            
            # 4. Redis 큐에 올리기 테스트
            try:
                items = [item.model_dump() for item in ohlcv_data]
                await redis_queue_manager.push_batch_task(
                    "ohlcv_day_data",
                    {
                        "items": items,
                        "metadata": {
                            "asset_id": asset_id,
                            "interval": "1d",
                            "data_type": "ohlcv"
                        }
                    }
                )
                print(f"✅ Successfully pushed {len(items)} items to Redis queue")
            except Exception as e:
                print(f"❌ Failed to push to Redis queue: {e}")
    
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_ohlcv_data_conversion())



