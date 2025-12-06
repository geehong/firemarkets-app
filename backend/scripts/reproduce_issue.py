import asyncio
import sys
import os
from unittest.mock import MagicMock, AsyncMock

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.data_processor import DataProcessor

async def test_process_batch_task():
    print("Testing DataProcessor._process_batch_task with ohlcv_day_data...")
    
    # Mock dependencies
    config_manager = MagicMock()
    redis_queue_manager = MagicMock()
    
    # Instantiate DataProcessor
    processor = DataProcessor(config_manager, redis_queue_manager)
    
    # Mock repository
    processor.repository = AsyncMock()
    processor.repository.save_ohlcv_data.return_value = True
    
    # Test Payload
    task = {
        "type": "ohlcv_day_data",
        "payload": {
            "items": [{"asset_id": 1, "close": 100}],
            "metadata": {"interval": "1d"}
        }
    }
    
    # Execute
    result = await processor._process_batch_task(task)
    
    if result:
        print("✅ SUCCESS: DataProcessor handled ohlcv_day_data")
    else:
        print("❌ FAILURE: DataProcessor returned False for ohlcv_day_data")

    # Test Intraday
    print("\nTesting DataProcessor._process_batch_task with ohlcv_intraday_data...")
    task_intraday = {
        "type": "ohlcv_intraday_data",
        "payload": {
            "items": [{"asset_id": 1, "close": 100}],
            "metadata": {"interval": "5m"}
        }
    }
    
    result_intraday = await processor._process_batch_task(task_intraday)
    
    if result_intraday:
        print("✅ SUCCESS: DataProcessor handled ohlcv_intraday_data")
    else:
        print("❌ FAILURE: DataProcessor returned False for ohlcv_intraday_data")

if __name__ == "__main__":
    asyncio.run(test_process_batch_task())
