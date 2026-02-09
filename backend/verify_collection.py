
import sys
import os
sys.path.append(os.getcwd())
import asyncio
from app.collectors.onchain_collector import OnchainCollector
from app.core.config_manager import ConfigManager
from app.core.database import SessionLocal
from sqlalchemy import text

from app.services.api_strategy_manager import ApiStrategyManager
from app.utils.redis_queue_manager import RedisQueueManager

class MockRedisQueueManager:
    def __init__(self):
        self.enqueued_items = []

    async def push_batch_task(self, task_type: str, payload: dict) -> None:
        print(f"MockRedis: Pushing task {task_type} with payload keys {list(payload.keys())}")
        self.enqueued_items.append({"type": task_type, "payload": payload})

async def verify_collection():
    print("Starting verification for 'market_cap'...")
    
    # Initialize Dependencies
    config = ConfigManager()
    api_manager = ApiStrategyManager(config)
    redis_manager = MockRedisQueueManager() # Use Mock
    
    # Initialize Collector
    db = SessionLocal()
    try:
        collector = OnchainCollector(db, config, api_manager, redis_manager)
        
        # We want to specifically test 'market_cap'
        metric_name = 'market_cap'
        days = 10
        
        print(f"Fetching {metric_name} for last {days} days...")
        
        # Find start_date
        from datetime import datetime, timedelta
        start_date = (datetime.utcnow() - timedelta(days=days)).strftime('%Y-%m-%d')
        
        # Fetch data (it will push to mock redis)
        await collector._fetch_and_enqueue_for_metric(metric_name, days=days, start_date=start_date)
        
        # Check Mock Redis
        if not redis_manager.enqueued_items:
            print("No items enqueued to MockRedis.")
            return

        print(f"MockRedis captured {len(redis_manager.enqueued_items)} tasks.")
        task = redis_manager.enqueued_items[0]
        payload = task['payload']
        # The payload structure usually depends on what OnchainCollector pushes. 
        # It seems it pushes the list of items directly or wrapped?
        # Based on logs: "payload": payload
        # And previously I assumed payload had 'data'. Let's check payload type.
        
        items = payload if isinstance(payload, list) else payload.get('data', payload)
        
        print(f"Captured {len(items)} items from payload.")
        
        if not items:
            print("No items found in payload.")
            return

        # Now try to save using DataProcessor's logic (Repository)
        from app.services.processor.repository import DataRepository
        from app.services.processor.validator import DataValidator
        
        validator = DataValidator()
        repo = DataRepository(validator)
        
        print("Saving to DB...")
        success = await repo.save_onchain_metrics(items)
        
        if success:
            print("Save returned SUCCESS.")
        else:
            print("Save returned FAILURE.")
            
        # Verify in DB
        # Refresh session to see committed changes
        db.close()
        db = SessionLocal()
        
        count_sql = text(f"SELECT COUNT(*) FROM crypto_metrics WHERE market_cap IS NOT NULL AND timestamp_utc >= '{start_date}';")
        rows = db.execute(count_sql).fetchall()
        count = rows[0][0]
        print(f"DB Row Count for market_cap >= {start_date}: {count}")
        
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(verify_collection())
