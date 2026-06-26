import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.core.config_manager import ConfigManager
from app.services.api_strategy_manager import ApiStrategyManager
from app.utils.redis_queue_manager import RedisQueueManager
from app.collectors.ohlcv_collector import OHLCVCollector

async def main():
    db = SessionLocal()
    config_manager = ConfigManager()
    api_manager = ApiStrategyManager(config_manager=config_manager)
    redis_queue_manager = RedisQueueManager(config_manager=config_manager)
    
    collector = OHLCVCollector(
        db=db,
        config_manager=config_manager,
        api_manager=api_manager,
        redis_queue_manager=redis_queue_manager
    )
    
    # Collect only 1d daily bars for all asset types
    collector.set_schedule_config(
        scheduled_intervals=["1d"],
        asset_type_filter=None  # all types
    )
    
    print("Starting OHLCV 1d collection manually...")
    result = await collector.collect_with_settings()
    print("Result:", result)
    db.close()

if __name__ == "__main__":
    asyncio.run(main())
