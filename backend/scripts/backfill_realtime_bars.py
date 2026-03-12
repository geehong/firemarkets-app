import asyncio
import logging
import os
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Any

# Add the root app directory to the path so we can import app modules
# The script is in app/scripts/, so its parent's parent is the project root (/)
# In the container, it's /app/app/scripts/, so project root is /app
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import SessionLocal, engine
from app.models.asset import RealtimeQuotesTimeBar, Asset
from app.external_apis.implementations.twelvedata_client import TwelveDataClient
from app.external_apis.implementations.polygon_client import PolygonClient
from sqlalchemy.dialects.postgresql import insert

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Target tickers and their asset IDs (based on DB query)
TARGET_ASSETS = [
    {"ticker": "GLD", "id": 313},
    {"ticker": "IAU", "id": 315},
    {"ticker": "SPY", "id": 4},
    {"ticker": "VEA", "id": 206},
    {"ticker": "IVV", "id": 144},
    {"ticker": "VOO", "id": 135},
    {"ticker": "BND", "id": 156},
    {"ticker": "VXUS", "id": 146},
    {"ticker": "AGG", "id": 301},
    {"ticker": "IJH", "id": 318},
    {"ticker": "QQQ", "id": 216},
    {"ticker": "IJR", "id": 319},
]

async def backfill_twelvedata_1m():
    """Backfill 7 days of 1m data using TwelveData"""
    logger.info("🚀 Starting TwelveData 1m backfill (last 7 days)")
    client = TwelveDataClient()
    db = SessionLocal()
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)
    
    start_str = start_date.strftime('%Y-%m-%d %H:%M:%S')
    end_str = end_date.strftime('%Y-%m-%d %H:%M:%S')
    
    for asset in TARGET_ASSETS:
        ticker = asset["ticker"]
        asset_id = asset["id"]
        logger.info(f"📊 Fetching 1m data for {ticker} (ID: {asset_id})")
        
        try:
            # TwelveData get_ohlcv_data handles rate limiting internally
            data_points = await client.get_ohlcv_data(
                symbol=ticker,
                interval="1m",
                start_date=start_str,
                end_date=end_str,
                limit=5000 # Max for 7 days of 1m (approx 2730 bars)
            )
            
            if not data_points:
                logger.warning(f"⚠️ No data returned for {ticker} from TwelveData")
                continue
                
            logger.info(f"💾 Saving {len(data_points)} 1m bars for {ticker}")
            
            # Prepare records for upsert
            records = []
            for dp in data_points:
                records.append({
                    "asset_id": asset_id,
                    "timestamp_utc": dp.timestamp_utc,
                    "data_interval": "1m",
                    "open_price": dp.open_price,
                    "high_price": dp.high_price,
                    "low_price": dp.low_price,
                    "close_price": dp.close_price,
                    "volume": dp.volume or 0,
                    "change_percent": dp.change_percent,
                    "updated_at": datetime.now()
                })
            
            if records:
                stmt = insert(RealtimeQuotesTimeBar).values(records)
                stmt = stmt.on_conflict_do_update(
                    constraint='uq_rt_bar_asset_ts_interval',
                    set_={
                        "open_price": stmt.excluded.open_price,
                        "high_price": stmt.excluded.high_price,
                        "low_price": stmt.excluded.low_price,
                        "close_price": stmt.excluded.close_price,
                        "volume": stmt.excluded.volume,
                        "change_percent": stmt.excluded.change_percent,
                        "updated_at": stmt.excluded.updated_at
                    }
                )
                db.execute(stmt)
                db.commit()
                logger.info(f"✅ Successfully backfilled {ticker} (1m)")
                
        except Exception as e:
            logger.error(f"❌ Error backfilling {ticker} (1m): {e}")
            db.rollback()
            
    db.close()

import argparse

async def backfill_polygon_5m(ticker_filter: str = None):
    """Backfill 7 days of 5m data using Polygon"""
    logger.info("🚀 Starting Polygon 5m backfill (last 7 days)")
    client = PolygonClient()
    db = SessionLocal()
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)
    
    start_str = start_date.strftime('%Y-%m-%d')
    end_str = end_date.strftime('%Y-%m-%d')
    
    for asset in TARGET_ASSETS:
        ticker = asset["ticker"]
        asset_id = asset["id"]
        
        if ticker_filter and ticker.upper() != ticker_filter.upper():
            continue
            
        logger.info(f"📊 Fetching 5m data for {ticker} (ID: {asset_id})")
        
        try:
            # Custom retry loop for Polygon backfill
            max_retries = 5
            data_points = []
            for attempt in range(max_retries):
                try:
                    data_points = await client.get_ohlcv_data(
                        symbol=ticker,
                        interval="5m",
                        start_date=start_str,
                        end_date=end_str,
                        limit=50000
                    )
                    if data_points:
                        break
                    logger.warning(f"⚠️ Attempt {attempt+1}: No data for {ticker}, retrying in 30s...")
                    await asyncio.sleep(30)
                except Exception as e:
                    if "429" in str(e) or "Too Many Requests" in str(e):
                        wait_time = (attempt + 1) * 60
                        logger.warning(f"⚠️ Rate limited (429) on {ticker}, waiting {wait_time}s...")
                        await asyncio.sleep(wait_time)
                    else:
                        raise e
            
            if not data_points:
                logger.warning(f"⚠️ Finally gave up on {ticker} for Polygon 5m")
                continue
                
            logger.info(f"💾 Saving {len(data_points)} 5m bars for {ticker}")
            
            # Prepare records for upsert
            records = []
            for dp in data_points:
                records.append({
                    "asset_id": asset_id,
                    "timestamp_utc": dp.timestamp_utc,
                    "data_interval": "5m",
                    "open_price": dp.open_price,
                    "high_price": dp.high_price,
                    "low_price": dp.low_price,
                    "close_price": dp.close_price,
                    "volume": dp.volume or 0,
                    "change_percent": dp.change_percent,
                    "updated_at": datetime.now()
                })
            
            if records:
                # Batch insert to avoid parameter limits and improve error handling
                batch_size = 100
                for i in range(0, len(records), batch_size):
                    batch_values = records[i : i + batch_size]
                    try:
                        ins_stmt = insert(RealtimeQuotesTimeBar).values(batch_values)
                        upsert_stmt = ins_stmt.on_conflict_do_update(
                            index_elements=['asset_id', 'timestamp_utc', 'data_interval'],
                            set_={
                                "open_price": ins_stmt.excluded.open_price,
                                "high_price": ins_stmt.excluded.high_price,
                                "low_price": ins_stmt.excluded.low_price,
                                "close_price": ins_stmt.excluded.close_price,
                                "volume": ins_stmt.excluded.volume,
                                "change_percent": ins_stmt.excluded.change_percent,
                                "updated_at": datetime.now() 
                            }
                        )
                        db.execute(upsert_stmt)
                        db.commit()
                    except Exception as b_e:
                        db.rollback()
                        logger.error(f"❌ Batch error saving 5m data for {ticker}: {b_e}")
                        import traceback
                        logger.error(traceback.format_exc())
                        raise b_e
                
                logger.info(f"✅ Successfully backfilled {len(data_points)} 5m bars for {ticker}")
                
        except Exception as e:
            logger.error(f"❌ Error backfilling {ticker} (5m): {e}")
            db.rollback()
            
    db.close()

async def main():
    parser = argparse.ArgumentParser(description="Backfill historical OHLCV data")
    parser.add_argument("--ticker", type=str, help="Specific ticker to backfill (e.g. SPY)")
    args = parser.parse_args()

    # TwelveData exhausted for today (800 credit limit reached)
    # await backfill_twelvedata_1m()
    await backfill_polygon_5m(ticker_filter=args.ticker)
    logger.info("✨ All backfill tasks completed!")

if __name__ == "__main__":
    asyncio.run(main())
