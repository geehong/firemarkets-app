import asyncio
import json
import os
import redis.asyncio as redis
from datetime import datetime, timezone

async def test_push_ohlcv():
    # Use 'redis' as host when running inside the container
    redis_host = 'redis'
    redis_port = '6379'
    redis_url = f"redis://{redis_host}:{redis_port}/0"
    
    print(f"Connecting to {redis_url}...")
    r = await redis.from_url(redis_url)
    
    # Mock OHLCV Task
    task = {
        "type": "ohlcv_day_data",
        "payload": {
            "items": [
                {
                    "asset_id": 1,
                    "timestamp_utc": datetime.now(timezone.utc).isoformat(),
                    "open": 70000.0,
                    "high": 71000.0,
                    "low": 69000.0,
                    "close": 70500.0,
                    "volume": 100.0,
                    "interval": "1d"
                }
            ],
            "metadata": {
                "asset_id": 1,
                "interval": "1d"
            }
        }
    }
    
    await r.rpush("batch_data_queue", json.dumps(task))
    size = await r.llen("batch_data_queue")
    print(f"🚀 Pushed mock ohlcv_day_data task. Current queue size: {size}")
    await r.close()

if __name__ == "__main__":
    asyncio.run(test_push_ohlcv())
