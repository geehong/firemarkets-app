import asyncio
import sys
import os
import json
from datetime import datetime

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ['POSTGRES_DATABASE_URL'] = 'postgresql://geehong:Power6100@localhost:5432/markets'

async def main():
    print("Test Crypto Worker started")
    try:
        from app.core.database import SessionLocal
        from app.crud.asset import crud_ohlcv
        
        db = SessionLocal()
        
        # Test data for BTC (asset_id=1, ticker=BTCUSDT)
        # Interval: 1m
        # Timestamp: Dec 31, 2025
        ohlcv_list = [{
            "asset_id": 1,
            "timestamp_utc": datetime(2025, 12, 31, 23, 59, 0),
            "open_price": 50000.0,
            "high_price": 50100.0,
            "low_price": 49900.0,
            "close_price": 50050.0,
            "volume": 100.0,
            "data_interval": "1m"
        }]
        
        print("Inserting test data into OHLCVIntradayData...")
        count = crud_ohlcv.bulk_upsert_ohlcv_intraday(db, ohlcv_list)
        print(f"Upserted {count} records.")
        
        # Verify
        from app.models.asset import OHLCVIntradayData
        record = db.query(OHLCVIntradayData).filter_by(asset_id=1, timestamp_utc=datetime(2025, 12, 31, 23, 59, 0), data_interval='1m').first()
        if record:
            print(f"Verified! Record found: {record.timestamp_utc}, Close: {record.close_price}")
            # Clean up
            db.delete(record)
            db.commit()
            print("Cleaned up test record.")
        else:
            print("Failed to find record.")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
