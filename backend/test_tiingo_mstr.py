import asyncio
from app.external_apis.implementations.tiingo_client import TiingoClient

async def main():
    client = TiingoClient()
    # Fetch 10000 days of data for MSTR
    data = await client.get_ohlcv_data('MSTR', limit=10000)
    print(f"Fetched {len(data)} items")
    if data:
        print(f"Earliest data point: {data[0]}")
        print(f"Latest data point: {data[-1]}")

asyncio.run(main())
