"""
Data Processor Service 실행 스크립트
"""
import asyncio
import signal
import sys
import os
from app.services.data_processor import DataProcessor
from app.core.config_manager import ConfigManager
from app.utils.redis_queue_manager import RedisQueueManager
# from app.utils.logger import logger # Original logger import commented out or removed

# Initialize logging
import logging
from app.utils.logger import setup_logger

# Default logging level from environment or INFO
log_level = os.getenv("LOG_LEVEL", "INFO").upper()

# Configure standard logging first
logging.basicConfig(level=getattr(logging, log_level), format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Configure structlog
setup_logger(level=log_level)

logger = logging.getLogger("app.services.data_processor")
logger.setLevel(getattr(logging, log_level))
logging.getLogger("app.services.processor.repository").setLevel(getattr(logging, log_level))


async def main():
    """메인 실행 함수"""
    logger.info("DataProcessor main() 시작")
    config_manager = ConfigManager()
    logger.info("ConfigManager 생성 완료")
    redis_queue_manager = RedisQueueManager(config_manager)
    logger.info("RedisQueueManager 생성 완료")
    processor = DataProcessor(config_manager, redis_queue_manager)
    logger.info("DataProcessor 인스턴스 생성 완료")

    def signal_handler(signum, frame):
        logger.info(f"Signal {signum} received, stopping Data Processor...")
        asyncio.create_task(processor.stop())

    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)

    await processor.start()

if __name__ == "__main__":
    asyncio.run(main())