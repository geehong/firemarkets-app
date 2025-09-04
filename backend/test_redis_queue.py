#!/usr/bin/env python3
"""
Redis Queue Manager 테스트 스크립트
"""
import asyncio
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, '/app')

from app.utils.redis_queue_manager import RedisQueueManager
from app.core.config_manager import ConfigManager

async def test_redis_queue():
    """Redis 큐 매니저 테스트"""
    try:
        # ConfigManager와 RedisQueueManager 초기화
        config_manager = ConfigManager()
        redis_queue_manager = RedisQueueManager(config_manager)
        
        # 테스트 작업을 Redis 큐에 추가
        test_task = {
            "task_type": "test",
            "items": [
                {"test": "data1", "value": 123},
                {"test": "data2", "value": 456}
            ]
        }
        
        await redis_queue_manager.push_batch_task("test", test_task)
        print("✅ 테스트 작업이 Redis 큐에 성공적으로 추가되었습니다.")
        
        # 큐 길이 확인 (기본 큐 이름 사용)
        queue_size = await redis_queue_manager.get_queue_size()
        print(f"📊 현재 큐 길이: {queue_size}")
        
        # 큐에서 작업 가져오기 (non-blocking)
        task = await redis_queue_manager.pop_batch_task(timeout_seconds=0)
        if task:
            print(f"📦 큐에서 가져온 작업: {task}")
        else:
            print("❌ 큐에서 작업을 가져올 수 없습니다.")
            
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_redis_queue())
