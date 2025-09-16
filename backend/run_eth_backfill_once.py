#!/usr/bin/env python3
import asyncio
from datetime import datetime

from app.services.api_strategy_manager import api_manager
from app.collectors.ohlcv_collector import OHLCVCollector
from app.core.database import get_db
from app.models.asset import Asset


async def run_once(asset_id: int = 2):
    db = next(get_db())
    try:
        asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
        if not asset:
            print(f"Asset {asset_id} not found")
            return

        ticker = asset.ticker
        asset_type = asset.asset_type.type_name.lower() if asset.asset_type else "crypto"
        print(f"Fetching backfill for {ticker} ({asset_type})...")

        # Fetch using api_manager (date window computed internally)
        df = await api_manager.get_ohlcv(ticker, '1d', asset_type=asset_type, asset_id=asset_id)
        if df is None or df.empty:
            print("No data fetched (either up-to-date or API returned empty)")
            return

        print(f"Fetched {len(df)} rows: {df.index.min()} ~ {df.index.max()}")

        # Convert to list[dict] and store via collector
        collector = OHLCVCollector()
        ohlcv = []
        for ts, row in df.iterrows():
            if not isinstance(ts, (datetime,)):  # pandas Timestamp is acceptable via isinstance to datetime
                try:
                    ts = ts.to_pydatetime()
                except Exception:
                    continue
            record = {
                "timestamp_utc": ts,
                "open_price": float(row.get('open', row.get('open_price', 0)) or 0),
                "high_price": float(row.get('high', row.get('high_price', 0)) or 0),
                "low_price": float(row.get('low', row.get('low_price', 0)) or 0),
                "close_price": float(row.get('close', row.get('close_price', 0)) or 0),
                "volume": float(row.get('volume', 0) or 0),
            }
            if all(record[k] > 0 for k in ["open_price", "high_price", "low_price", "close_price"]):
                ohlcv.append(record)

        if not ohlcv:
            print("No valid OHLCV rows to store")
            return

        added = await collector._store_ohlcv_data_with_interval(asset_id, ohlcv, '1d')
        print(f"Stored {added} new/updated rows")
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(run_once(2))























