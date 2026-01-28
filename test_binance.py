import asyncio
import sys
import os

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

async def main():
    print("Test script started", flush=True)
    try:
        from app.external_apis.implementations.binance_client import BinanceClient
        client = BinanceClient()
        print("Fetching BTCUSDT 1m from Binance...", flush=True)
        data = await client.get_ohlcv_data('BTCUSDT', interval='1m', limit=10)
        if data:
            print(f"Success! Fetched {len(data)} data points.", flush=True)
            for d in data:
                print(f"TS: {d.timestamp_utc}, Close: {d.close_price}", flush=True)
        else:
            print("Failed to fetch data.", flush=True)
    except Exception as e:
        print(f"Error: {e}", flush=True)
    print("Test script ended", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
