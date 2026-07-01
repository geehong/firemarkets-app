import asyncio
import sys
import os
import httpx
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import PostgreSQLSessionLocal
from app.models.asset import Asset, OHLCVData
from sqlalchemy import delete

async def main():
    db = PostgreSQLSessionLocal()
    try:
        asset = db.query(Asset).filter(Asset.ticker == 'MSTR').first()
        if not asset:
            print("MSTR not found")
            return
            
        print(f"Found MSTR: {asset.asset_id}")
        
        # Tiingo Token (we can pull from env, but let's hardcode for one-off fix)
        token = os.getenv("TIINGO_API_KEY") or "6ad65759391ef22e0dccb8d2b171769c782c4853"
        url = f"https://api.tiingo.com/tiingo/daily/mstr/prices?startDate=1995-01-01&token={token}"
        
        async with httpx.AsyncClient(timeout=60) as client:
            res = await client.get(url)
            res.raise_for_status()
            data = res.json()
            
        if not data:
            print("No data from Tiingo")
            return
            
        print(f"Fetched {len(data)} items from Tiingo. First: {data[0]['date']}, Last: {data[-1]['date']}")
        
        # 1. Delete existing MSTR data
        stmt = delete(OHLCVData).where(OHLCVData.asset_id == asset.asset_id)
        res = db.execute(stmt)
        print(f"Deleted {res.rowcount} old rows")
        
        # 2. Insert new adjusted data
        new_rows = []
        for d in data:
            try:
                timestamp = datetime.fromisoformat(d['date'].replace('Z', '+00:00')).replace(tzinfo=None)
            except Exception:
                continue
                
            open_price = float(d.get('adjOpen') or d.get('open'))
            high_price = float(d.get('adjHigh') or d.get('high'))
            low_price = float(d.get('adjLow') or d.get('low'))
            close_price = float(d.get('adjClose') or d.get('close'))
            volume = float(d.get('adjVolume') or d.get('volume'))
            
            new_rows.append(
                OHLCVData(
                    asset_id=asset.asset_id,
                    timestamp_utc=timestamp,
                    data_interval='1d',
                    open_price=open_price,
                    high_price=high_price,
                    low_price=low_price,
                    close_price=close_price,
                    volume=volume
                )
            )
            
        # Bulk insert
        chunk_size = 500
        for i in range(0, len(new_rows), chunk_size):
            db.bulk_save_objects(new_rows[i:i+chunk_size])
            
        db.commit()
        print(f"Successfully inserted {len(new_rows)} adjusted rows")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
