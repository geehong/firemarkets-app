#!/usr/bin/env python3
"""
DLQ(Dead-Letter Queue)에 있는 실패한 작업을 재처리하는 스크립트.
DataProcessor의 버그 수정 후, 이 스크립트를 실행하여 실패한 데이터를 다시 처리할 수 있습니다.
"""
import asyncio
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.config_manager import ConfigManager
from app.utils.redis_queue_manager import RedisQueueManager
from app.utils.logger import logger

async def reprocess_dlq():
    """DLQ의 모든 작업을 원래의 배치 큐로 다시 옮깁니다."""
    
    logger.info("--- DLQ 재처리 시작 ---")
    
    config_manager = ConfigManager()
    redis_queue_manager = RedisQueueManager(config_manager)
    
    try:
        dlq_size = await redis_queue_manager.get_queue_size("dead_letter_queue")
        if dlq_size == 0:
            logger.info("DLQ가 비어있습니다. 재처리할 작업이 없습니다.")
            return

        logger.info(f"DLQ에 {dlq_size}개의 작업이 있습니다. 재처리를 시작합니다.")

        reprocessed_count = 0
        for _ in range(dlq_size):
            success = await redis_queue_manager.reprocess_one_from_dlq()
            if success:
                reprocessed_count += 1
        
        logger.info(f"✅ {reprocessed_count}개의 작업을 성공적으로 재처리 큐에 넣었습니다.")

    except Exception as e:
        logger.error(f"DLQ 재처리 중 오류 발생: {e}", exc_info=True)
    finally:
        if redis_queue_manager.redis_client:
            await redis_queue_manager.redis_client.close()

if __name__ == "__main__":
    asyncio.run(reprocess_dlq())