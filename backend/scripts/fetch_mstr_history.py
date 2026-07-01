import asyncio
import sys
import os
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.external_apis.implementations.alpha_vantage_client import AlphaVantageClient
from app.external_apis.implementations.finnhub_client import FinnhubClient
from app.external_apis.implementations.twelvedata_client import TwelveDataClient
from app.core.database import PostgreSQLSessionLocal
from app.models.asset import Asset
from scripts.backfill_gap_ohlcv import GapBackfiller

async def fetch_and_save(client_name, client, asset_id, start_date, end_date):
    print(f"\n--- Fetching from {client_name} ---")
    try:
        data = await client.get_ohlcv_data(
            symbol='MSTR', 
            interval='1d', 
            start_date=start_date, 
            end_date=end_date,
            limit=10000  # Some clients might need a limit to override their defaults
        )
        
        if not data:
            print(f"No data returned from {client_name}")
            return
            
        print(f"Fetched {len(data)} items from {client_name}. First: {data[0].timestamp_utc}, Last: {data[-1].timestamp_utc}")
        
        # Save to DB
        backfiller = GapBackfiller()
        rows = backfiller._normalize_ohlcv_rows([{
            'date': d.timestamp_utc,
            'open': d.open_price,
            'high': d.high_price,
            'low': d.low_price,
            'close': d.close_price,
            'volume': d.volume
        } for d in data], asset_id)
        
        saved = backfiller.upsert_ohlcv(rows)
        print(f"Saved {saved} new rows to DB from {client_name}")
    except Exception as e:
        print(f"Error fetching from {client_name}: {e}")

async def main():
    db = PostgreSQLSessionLocal()
    try:
        asset = db.query(Asset).filter(Asset.ticker == 'MSTR').first()
        if not asset:
            print("MSTR not found")
            return
            
        print(f"Found MSTR: {asset.asset_id}")
        
        start_date = '1995-01-01'
        end_date = datetime.now().strftime('%Y-%m-%d')

        # 1. Alpha Vantage (Full outputsize can be provided via client internally usually, but let's try)
        av_client = AlphaVantageClient()
        await fetch_and_save("AlphaVantage", av_client, asset.asset_id, start_date, end_date)
        
        # 2. Finnhub (Needs unix timestamps internally maybe, but get_ohlcv_data should handle string)
        fh_client = FinnhubClient()
        await fetch_and_save("Finnhub", fh_client, asset.asset_id, start_date, end_date)
        
        # 3. TwelveData (Max limit 5000 typically, but we'll try)
        td_client = TwelveDataClient()
        await fetch_and_save("TwelveData", td_client, asset.asset_id, start_date, end_date)
        
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
