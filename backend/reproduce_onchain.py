import sys
import os
import asyncio
import logging
from datetime import datetime, timezone

# Ensure backend directory is in python path
sys.path.append(os.getcwd())

from app.core.database import SessionLocal
from app.core.config_manager import ConfigManager
from app.services.api_strategy_manager import ApiStrategyManager
from app.utils.redis_queue_manager import RedisQueueManager
from app.collectors.onchain_collector import OnchainCollector

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

async def run_reproduction():
    logger.info("Starting OnchainCollector Reproduction")
    
    db = SessionLocal()
    try:
        config_manager = ConfigManager()
        
        # Check Configs
        enabled = config_manager.is_onchain_collection_enabled()
        logger.info(f"Is Onchain Collection Enabled: {enabled}")
        
        api_key = config_manager.get_bitcoin_data_api_key()
        logger.info(f"Bitcoin Data API Key Present: {bool(api_key)}")
        
        # Use real RedisQueueManager
        queue_manager = RedisQueueManager(config_manager)

        
        
        # Initialize Collector
        api_manager = ApiStrategyManager(config_manager)
        
        collector = OnchainCollector(
            db=db,
            config_manager=config_manager,
            api_manager=api_manager,
            redis_queue_manager=queue_manager
        )
        
        # Check BTC Asset ID
        logger.info(f"BTC Asset ID: {collector.bitcoin_asset_id}")
        
        if not collector.bitcoin_asset_id:
            logger.error("BTC Asset ID not found!")
            return

        # Run collection
        logger.info("Running _collect_data()...")
        result = await collector._collect_data()
        logger.info(f"Collection Result: {result}")
        
    except Exception as e:
        logger.exception("An error occurred during reproduction")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_reproduction())
