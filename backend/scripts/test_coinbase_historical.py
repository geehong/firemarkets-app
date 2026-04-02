
import asyncio
import sys
import os
from datetime import datetime, timezone

# Add parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.external_apis.implementations.coinbase_client import CoinbaseClient

async def test():
    coinbase = CoinbaseClient()
    
    # Test Coinbase 1m for BTC
    # Note: start/end must be ISO8601 strings
    start = "2020-01-01T00:00:00Z"
    end = "2020-01-01T05:00:00Z" # 300 minutes (5 hours)
    
    print(f"Testing Coinbase 1m for BTC (2020-01-01)")
    data = await coinbase.get_ohlcv_data("BTC", interval="1m", start_date=start, end_date=end, limit=300)
    
    print(f"Coinbase 1m records found: {len(data)}")
    if data:
        print(f"Earliest: {data[-1].timestamp_utc}")
        print(f"Latest: {data[0].timestamp_utc}")
    else:
        print("No data returned! Checking if symbol mapping is correct...")
        # See what symbol it's using
        coinbase_symbol = coinbase._convert_symbol_for_coinbase("BTC")
        print(f"Using symbol: {coinbase_symbol}")

if __name__ == "__main__":
    asyncio.run(test())
