
import asyncio
import logging
import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.scheduler_service import SessionLocal, ConfigManager, ApiStrategyManager, RedisQueueManager
from app.collectors.onchain_collector import OnchainCollector
from app.core.config import load_and_set_global_configs, initialize_bitcoin_asset_id

async def test_onchain_collection():
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    # 1. Load configs
    load_and_set_global_configs()
    initialize_bitcoin_asset_id()
    
    db = SessionLocal()
    config_manager = ConfigManager()
    api_manager = ApiStrategyManager(config_manager=config_manager)
    redis_queue_manager = RedisQueueManager(config_manager=config_manager)

    try:
        collector = OnchainCollector(
            db=db,
            config_manager=config_manager,
            api_manager=api_manager,
            redis_queue_manager=redis_queue_manager
        )
        
        logger.info("Starting manual Onchain collection test for ALL metrics...")
        result = await collector.collect_with_settings()
        logger.info(f"Collection result: {result}")
        
    except Exception as e:
        logger.error(f"Test failed: {e}", exc_info=True)
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_onchain_collection())
