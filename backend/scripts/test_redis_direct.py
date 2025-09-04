#!/usr/bin/env python3
"""
Redis 큐 직접 테스트
"""
import asyncio
import sys
import json

# Add the app directory to the Python path
sys.path.insert(0, '/app')

from app.core.config_manager import ConfigManager
from app.utils.redis_queue_manager import RedisQueueManager
from app.core.database import SessionLocal

async def test_redis_direct():
    """Redis 큐에 직접 데이터를 올려보는 테스트"""
    
    print("--- Redis 큐 직접 테스트 시작 ---")
    
    # 의존성 설정
    db = SessionLocal()
    config_manager = ConfigManager(db)
    redis_queue_manager = RedisQueueManager(config_manager)
    
    try:
        # 1. 현재 큐 상태 확인
        print("1. 현재 큐 상태 확인")
        queue_size = await redis_queue_manager.get_queue_size()
        print(f"현재 큐 크기: {queue_size}")
        
        # 2. 테스트 데이터 생성
        print("2. 테스트 데이터 생성")
        test_payload = {
            "items": [
                {
                    "timestamp_utc": "2025-09-04T10:00:00Z",
                    "open_price": 100.0,
                    "high_price": 105.0,
                    "low_price": 95.0,
                    "close_price": 102.0,
                    "volume": 1000000.0
                }
            ],
            "metadata": {
                "asset_id": 4,
                "interval": "1d",
                "data_type": "ohlcv"
            }
        }
        
        # 3. Redis 큐에 데이터 올리기
        print("3. Redis 큐에 데이터 올리기")
        await redis_queue_manager.push_batch_task("ohlcv_data", test_payload)
        print("✅ 데이터를 큐에 올렸습니다")
        
        # 4. 큐 상태 다시 확인
        print("4. 큐 상태 다시 확인")
        queue_size = await redis_queue_manager.get_queue_size()
        print(f"큐 크기: {queue_size}")
        
        if queue_size > 0:
            # 5. 큐에서 데이터 가져오기
            print("5. 큐에서 데이터 가져오기")
            task = await redis_queue_manager.pop_batch_task(timeout_seconds=5)
            if task:
                print(f"✅ 큐에서 데이터 가져옴: {task['type']}")
                print(f"데이터: {json.dumps(task['payload'], indent=2)}")
            else:
                print("❌ 큐에서 데이터를 가져올 수 없음")
        else:
            print("❌ 큐가 비어있음")
    
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_redis_direct())
