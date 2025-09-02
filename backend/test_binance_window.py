#!/usr/bin/env python3
import asyncio
from datetime import datetime, timedelta

from app.external_apis.binance_client import BinanceClient
from app.collectors.ohlcv_collector import OHLCVCollector


async def main():
    client = BinanceClient()
    symbol = "ETHUSDT"
    start_str = "2022-04-10"
    end_str = "2022-09-22"

    start_dt = datetime.strptime(start_str, "%Y-%m-%d")
    end_dt = datetime.strptime(end_str, "%Y-%m-%d")
    start_ms = int(start_dt.timestamp() * 1000)
    end_ms = int(((end_dt + timedelta(days=1)) - timedelta(milliseconds=1)).timestamp() * 1000)

    data = await client.get_ohlcv_data(symbol, interval="1d", limit=1000, start_time_ms=start_ms, end_time_ms=end_ms)
    print(f"rows: {len(data) if data else 0}")
    if not data:
        return
    print(f"first: {data[0]['timestamp_utc']}, last: {data[-1]['timestamp_utc']}")

    # Store into DB for asset_id=2 (ETH)
    collector = OHLCVCollector()
    stored = await collector._store_ohlcv_data_with_interval(2, data, '1d')
    print(f"stored: {stored}")


if __name__ == "__main__":
    asyncio.run(main())


