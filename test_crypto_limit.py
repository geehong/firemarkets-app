import asyncio
import sys
import os
import httpx
from datetime import datetime, timedelta

async def main():
    print("Test Crypto Direct started")
    # Fetch BTCUSDT 1m from Binance for a specific range
    # start_date: 2026-01-09
    # end_date: 2026-01-20
    # limit: 5000 (Testing if Binance allows > 1000)
    
    start_date = '2026-01-09'
    end_date = '2026-01-20'
    
    start_time_ms = int(datetime.strptime(start_date, '%Y-%m-%d').timestamp() * 1000)
    end_time_ms = int(datetime.strptime(end_date, '%Y-%m-%d').timestamp() * 1000)
    
    async with httpx.AsyncClient() as client:
        url = f"https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&startTime={start_time_ms}&endTime={end_time_ms}&limit=5000"
        resp = await client.get(url, timeout=10)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"Fetched {len(data)} items")
            if data:
                print(f"First TS: {datetime.fromtimestamp(data[0][0]/1000)}")
                print(f"Last TS: {datetime.fromtimestamp(data[-1][0]/1000)}")
        else:
            print(f"Error: {resp.text}")

if __name__ == "__main__":
    asyncio.run(main())
