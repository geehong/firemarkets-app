import asyncio
import logging
import os
import sys
import argparse
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

# Add the root app directory to the path so we can import app modules
# Script is in app/services/ingest/, so parent of parent of parent of parent is the project root (backend/)
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_dir))))
if root_dir not in sys.path:
    sys.path.append(root_dir)

from app.core.database import SessionLocal, engine
from app.models.asset import RealtimeQuotesTimeBar, RealtimeQuoteTimeDelay, OHLCVIntradayData, Asset, AssetType
from app.external_apis.implementations.polygon_client import PolygonClient
from app.utils.trading_calendar import is_regular_market_hours
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import or_, and_

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(name)s - %(message)s')
logger = logging.getLogger(__name__)

async def get_target_assets(db, asset_type_name: str = None):
    """Fetch all ETFs and Stocks from the database"""
    if asset_type_name:
        asset_types = db.query(AssetType).filter(AssetType.type_name == asset_type_name).all()
    else:
        asset_types = db.query(AssetType).filter(or_(AssetType.type_name == "ETFs", AssetType.type_name == "Stocks")).all()
    
    type_ids = [at.asset_type_id for at in asset_types]
    
    assets = db.query(Asset).filter(Asset.asset_type_id.in_(type_ids), Asset.is_active == True).all()
    return [{"ticker": a.ticker, "id": a.asset_id} for a in assets]

async def backfill_polygon_24h(assets: List[Dict[str, Any]], intervals: List[str] = ["1m", "5m"], force_24h: bool = False):
    """Backfill last 24 hours of data for given assets and intervals using Polygon"""
    logger.info(f"🚀 Starting Polygon backfill for {len(assets)} assets, intervals: {intervals}")
    client = PolygonClient()
    db = SessionLocal()
    
    # Calculate timeframe using UTC
    end_date = datetime.now(timezone.utc)
    if force_24h:
        start_date = end_date - timedelta(days=1)
    else:
        # Default to 2 days to ensure coverage of the last closed session
        start_date = end_date - timedelta(days=2)
    
    start_str = start_date.strftime('%Y-%m-%d')
    end_str = end_date.strftime('%Y-%m-%d')
    
    for interval in intervals:
        logger.info(f"--- Processing interval: {interval} ---")
        for asset in assets:
            ticker = asset["ticker"]
            asset_id = asset["id"]
            
            logger.info(f"📊 Fetching {interval} data for {ticker} (ID: {asset_id})")
            
            try:
                # Polygon get_ohlcv_data
                data_points = await client.get_ohlcv_data(
                    symbol=ticker,
                    interval=interval,
                    start_date=start_str,
                    end_date=end_str,
                    limit=50000
                )
                
                if not data_points:
                    logger.warning(f"⚠️ No data returned for {ticker} ({interval}) from Polygon")
                    continue
                
                # Filter for only last 24 hours AND Regular Market Hours
                if force_24h:
                    data_points = [
                        dp for dp in data_points 
                        if dp.timestamp_utc >= start_date and is_regular_market_hours(dp.timestamp_utc)
                    ]
                else:
                    # Even if not force_24h, we should respect regular hours if it's a Stock/ETF
                    data_points = [
                        dp for dp in data_points 
                        if is_regular_market_hours(dp.timestamp_utc)
                    ]
                
                logger.info(f"💾 Saving {len(data_points)} {interval} bars for {ticker}")
                
                # 1. Save to RealtimeQuotesTimeBar (1m, 5m)
                await upsert_bars(db, RealtimeQuotesTimeBar, asset_id, interval, data_points)
                
                # 2. Save 1m data to RealtimeQuoteTimeDelay (Permanent)
                if interval == "1m":
                    await upsert_delay_bars(db, asset_id, data_points)
                
                # 3. Save to OHLCVIntradayData (Historical table)
                await upsert_historical_bars(db, asset_id, interval, data_points)
                
                db.commit()
                logger.info(f"✅ Successfully backfilled {ticker} ({interval})")
                
            except Exception as e:
                logger.error(f"❌ Error backfilling {ticker} ({interval}): {e}")
                db.rollback()
            
            # Small delay to respect rate limits if needed (PolygonClient usually handles it)
            await asyncio.sleep(0.1)
            
    db.close()

import traceback

async def upsert_bars(db, model, asset_id: int, interval: str, data_points: List[Any]):
    """Generic upsert for RealtimeQuotesTimeBar"""
    seen = {}
    for dp in data_points:
        # Normalize to naive UTC as DB uses timestamp without time zone
        ts = dp.timestamp_utc.astimezone(timezone.utc).replace(microsecond=0, tzinfo=None)
        key = (asset_id, ts, interval, "polygon")
        seen[key] = {
            "asset_id": asset_id,
            "timestamp_utc": ts,
            "data_interval": interval,
            "data_source": "polygon",
            "open_price": float(dp.open_price),
            "high_price": float(dp.high_price),
            "low_price": float(dp.low_price),
            "close_price": float(dp.close_price),
            "volume": float(dp.volume or 0),
            "updated_at": datetime.utcnow().replace(microsecond=0)
        }
    
    unique_records = list(seen.values())
    if unique_records:
        batch_size = 500
        for i in range(0, len(unique_records), batch_size):
            batch = unique_records[i:i+batch_size]
            try:
                stmt = insert(model).values(batch)
                stmt = stmt.on_conflict_do_update(
                    index_elements=['asset_id', 'timestamp_utc', 'data_interval'],
                    set_={
                        "open_price": stmt.excluded.open_price,
                        "high_price": stmt.excluded.high_price,
                        "low_price": stmt.excluded.low_price,
                        "close_price": stmt.excluded.close_price,
                        "volume": stmt.excluded.volume,
                        "updated_at": stmt.excluded.updated_at
                    }
                )
                db.execute(stmt)
            except Exception as e:
                logger.error(f"❌ Upsert to {model.__tablename__} failed for {asset_id} (batch {i}): {e}")
                raise e

async def upsert_historical_bars(db, asset_id: int, interval: str, data_points: List[Any]):
    """Upsert for OHLCVIntradayData (Historical bars used for charts)"""
    records = []
    for dp in data_points:
        # Normalize to naive UTC
        ts = dp.timestamp_utc.astimezone(timezone.utc).replace(microsecond=0, tzinfo=None)
        records.append({
            "asset_id": asset_id,
            "timestamp_utc": ts,
            "data_interval": interval,
            "open_price": float(dp.open_price),
            "high_price": float(dp.high_price),
            "low_price": float(dp.low_price),
            "close_price": float(dp.close_price),
            "volume": float(dp.volume or 0),
        })
    
    if records:
        batch_size = 500
        for i in range(0, len(records), batch_size):
            batch = records[i:i+batch_size]
            try:
                stmt = insert(OHLCVIntradayData).values(batch)
                stmt = stmt.on_conflict_do_update(
                    index_elements=['asset_id', 'timestamp_utc', 'data_interval'],
                    set_={
                        "open_price": stmt.excluded.open_price,
                        "high_price": stmt.excluded.high_price,
                        "low_price": stmt.excluded.low_price,
                        "close_price": stmt.excluded.close_price,
                        "volume": stmt.excluded.volume,
                    }
                )
                db.execute(stmt)
            except Exception as e:
                logger.error(f"❌ Upsert to OHLCVIntradayData failed for {asset_id} (batch {i}): {e}")
                raise e

async def upsert_delay_bars(db, asset_id: int, data_points: List[Any]):
    """Upsert for RealtimeQuoteTimeDelay (Permanent 1m bars)"""
    seen = {}
    for dp in data_points:
        # Normalize to naive UTC
        ts = dp.timestamp_utc.astimezone(timezone.utc).replace(microsecond=0, tzinfo=None)
        key = (asset_id, ts)
        seen[key] = {
            "asset_id": asset_id,
            "timestamp_utc": ts,
            "price": float(dp.close_price),
            "volume": float(dp.volume or 0),
            "data_source": "polygon",
            "data_interval": "1m",
            "updated_at": datetime.utcnow().replace(microsecond=0)
        }
    
    unique_records = list(seen.values())
    if unique_records:
        batch_size = 500
        for i in range(0, len(unique_records), batch_size):
            batch = unique_records[i:i+batch_size]
            try:
                stmt = insert(RealtimeQuoteTimeDelay).values(batch)
                stmt = stmt.on_conflict_do_update(
                    index_elements=['asset_id', 'timestamp_utc', 'data_source', 'data_interval'],
                    set_={
                        "price": stmt.excluded.price,
                        "volume": stmt.excluded.volume,
                        "updated_at": stmt.excluded.updated_at
                    }
                )
                db.execute(stmt)
            except Exception as e:
                logger.error(f"❌ Upsert to RealtimeQuoteTimeDelay failed for {asset_id} (batch {i}): {e}")
                raise e

async def main():
    parser = argparse.ArgumentParser(description="Backfill historical OHLCV data for US Stocks/ETFs")
    parser.add_argument("--ticker", type=str, help="Specific ticker to backfill (e.g. VOO)")
    parser.add_argument("--daily", action="store_true", help="Run 24h backfill for all active ETFs/Stocks")
    parser.add_argument("--days", type=int, default=1, help="Number of days to backfill (default: 1)")
    parser.add_argument("--type", type=str, help="Asset type to filter (e.g. ETFs, Stocks)")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.ticker:
            asset = db.query(Asset).filter(Asset.ticker == args.ticker.upper()).first()
            if not asset:
                logger.error(f"❌ Asset not found for ticker: {args.ticker}")
                return
            assets = [{"ticker": asset.ticker, "id": asset.asset_id}]
        else:
            assets = await get_target_assets(db, asset_type_name=args.type)
            
        if not assets:
            logger.warning("⚠️ No assets found to backfill.")
            return

        logger.info(f"🎯 Targeted {len(assets)} assets for backfill.")
        
        # Determine timeframe
        intervals = ["1m", "5m"]
        force_24h = args.daily or args.days == 1
        
        await backfill_polygon_24h(assets, intervals, force_24h=force_24h)
        
        logger.info("✨ All backfill tasks completed!")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
