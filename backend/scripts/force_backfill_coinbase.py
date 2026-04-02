
import asyncio
import sys
import os
from datetime import datetime, timezone

# Add parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.external_apis.implementations.coinbase_client import CoinbaseClient

async def run():
    client = CoinbaseClient()
    
    # Force backfill for 2017-08-01
    start = "2017-08-01T00:00:00Z"
    end = "2017-08-01T10:00:00Z"
    
    print(f"Forcing Coinbase 1m for BTC (2020-01-01)")
    data = await client.get_ohlcv_data("BTC", interval="1m", start_date=start, end_date=end, limit=600)
    
    print(f"Fetched {len(data)} records")
    if data:
        print(f"Earliest: {data[-1].timestamp_utc}")
        print(f"Latest: {data[0].timestamp_utc}")
    else:
        print("Still returned empty. This is the issue.")

if __name__ == "__main__":
    asyncio.run(run())
