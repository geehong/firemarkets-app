import sys
import os
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
import json
from dotenv import load_dotenv

# Add payload directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# Load environment variables
env_path = os.path.join(os.path.dirname(__file__), '../.env')
load_dotenv(env_path)

from sqlalchemy import text

from app.core.database import SessionLocal
from app.models.asset import Asset, AssetType, AppConfiguration
from app.services.api_strategy_manager import ApiStrategyManager
from app.core.config_manager import ConfigManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_scheduler_config(db):
    print("\n--- Checking Scheduler Configuration ---")
    config = db.query(AppConfiguration).filter(AppConfiguration.config_key == 'SCHEDULER_CONFIG').first()
    if config:
        print(f"SCHEDULER_CONFIG found: {config.config_value}")
    else:
        print("SCHEDULER_CONFIG not found!")

    # Check collector enablement
    cm = ConfigManager()
    print(f"is_crypto_collection_enabled: {cm.is_crypto_collection_enabled()}")
    print(f"is_ohlcv_collection_enabled: {cm.is_ohlcv_collection_enabled()}")
    print(f"ohlcv_intervals: {cm.get_ohlcv_intervals()}")

def check_crypto_assets(db):
    print("\n--- Checking Active Crypto Assets ---")
    assets = (
        db.query(Asset)
        .join(AssetType)
        .filter(
            Asset.is_active == True,
            AssetType.type_name.ilike('%Crypto%')
        )
        .all()
    )
    
    print(f"Found {len(assets)} active crypto assets.")
    
    valid_assets = []
    for asset in assets:
        collect_price = asset.collection_settings.get('collect_price') if asset.collection_settings else 'N/A'
        collect_crypto = asset.collection_settings.get('collect_crypto_data') if asset.collection_settings else 'N/A'
        print(f"[{asset.asset_id}] {asset.ticker} ({asset.name}) - collect_price: {collect_price}, collect_crypto_data: {collect_crypto}")
        
        if str(collect_price).lower() == 'true':
             valid_assets.append(asset)
             
    return valid_assets

async def test_fetch_logic(db, assets):
    print("\n--- Testing Fetch Logic (Simulation) ---")
    api_manager = ApiStrategyManager()
    
    # Initialize RedisQueueManager
    from app.core.config_manager import ConfigManager
    from app.utils.redis_queue_manager import RedisQueueManager
    
    config_manager = ConfigManager()
    queue_manager = RedisQueueManager(config_manager)
    
    # Check simple connection
    try:
        await queue_manager._ensure_client()
        print("Redis connection successful via RedisQueueManager.")
    except Exception as e:
        print(f"Redis connection failed: {e}")
        return

    # Use the first asset passed
    if not assets:
        print("No assets to test.")
        return

    target_asset = assets[0]
    target_ticker = target_asset.ticker
    
    if target_asset:
        print(f"\nAnalyzing Target Asset: {target_asset.ticker} (ID: {target_asset.asset_id})")
        
        # 1. Check DB state
        try:
            # Using raw query to count rows
            result = db.execute(text("SELECT COUNT(*) FROM ohlcv_daily WHERE asset_id = :id"), {"id": target_asset.asset_id}).fetchone()
            count = result[0] if result else 0
            print(f"  Total OHLCV (Daily) records in DB: {count}")
            
            result = db.execute(text("SELECT MAX(timestamp_utc) FROM ohlcv_daily WHERE asset_id = :id"), {"id": target_asset.asset_id}).fetchone()
            last_date = result[0] if result else "None"
            print(f"  Latest OHLCV (Daily) in DB: {last_date}")
            
        except Exception as e:
            print(f"  Failed to query DB: {e}")
            db.rollback()

        # 2. Simulate Fetch
        print(f"  Simulating fetch for {target_ticker}...")
        try:
            ohlcv_data = await api_manager.get_ohlcv_data(asset_id=target_asset.asset_id, interval="1d")
            print(f"  Fetched {len(ohlcv_data)} records.")
            
            if ohlcv_data:
                print(f"  Sample: {ohlcv_data[0]}")
                
                # 3. Push to Redis (Real Push Test)
                print("  Pushing fetched data to Redis queue 'ohlcv_day_data'...")
                import json
                items = [json.loads(item.model_dump_json()) for item in ohlcv_data]
                
                await queue_manager.push_batch_task(
                    "ohlcv_day_data",
                    {
                        "items": items,
                        "metadata": {
                            "asset_id": target_asset.asset_id,
                            "interval": "1d",
                            "data_type": "ohlcv",
                            "is_backfill": True, # Force it to look like backfill
                            "debug_tag": "manual_push"
                        }
                    }
                )
                print("  Push completed. Check data_processor logs.")
                
        except Exception as e:
            print(f"  Fetch/Push failed: {e}")
            import traceback
            traceback.print_exc()

async def main():
    db = SessionLocal()
    try:
        check_scheduler_config(db)
        assets = check_crypto_assets(db)
        if assets:
            # Force test BTC specifically
            target_ticker = "BTCUSDT"
            target_asset = next((a for a in assets if a.ticker == target_ticker), None)
            if target_asset:
                print(f"Targeting {target_ticker} for deep dive...")
                
                # TEST 1: Direct DB Save Test
                print("\n--- TEST 1: Direct DB Save Test ---")
                from app.services.processor.repository import DataRepository
                from app.services.processor.validator import DataValidator
                validator = DataValidator()
                repo = DataRepository(validator)
                
                # Create dummy data for 2 days ago (safe to not overlap with prod flow)
                test_date = datetime.now() - timedelta(days=2)
                dummy_item = {
                    "asset_id": target_asset.asset_id,
                    "timestamp_utc": test_date,
                    "open_price": 0.01,
                    "high_price": 0.02,
                    "low_price": 0.01,
                    "close_price": 0.015,
                    "volume": 1000,
                    "interval": "1d"
                }
                print(f"Attempting to save dummy item: {dummy_item}")
                # save_ohlcv_data is async
                success = await repo.save_ohlcv_data([dummy_item], {"asset_id": target_asset.asset_id, "interval": "1d"})
                print(f"Direct Save Result: {success}")
                
                # Verify immediately
                from sqlalchemy import text
                stmt = text("SELECT * FROM ohlcv_day_data WHERE asset_id = :id ORDER BY timestamp_utc DESC LIMIT 5")
                result = db.execute(stmt, {"id": target_asset.asset_id})
                rows = result.fetchall()
                print(f"\n--- Verification: Latest 5 rows for {target_ticker} (ID: {target_asset.asset_id}) ---")
                for row in rows:
                    print(row)
                
                # TEST 2: Fetch Logic (API + Queue)
                print("\n--- TEST 2: API Fetch & Queue Push ---")
                await test_fetch_logic(db, [target_asset])
            else:
                 await test_fetch_logic(db, assets)
        else:
            print("No active crypto assets with collect_price=true found.")
            
        # Extra: Check Queue Size
        from app.core.config_manager import ConfigManager
        from app.utils.redis_queue_manager import RedisQueueManager
        config_manager = ConfigManager()
        queue_manager = RedisQueueManager(config_manager)
        size = await queue_manager.get_queue_size("ohlcv_day_data")
        print(f"Current 'ohlcv_day_data' queue size: {size}")
        
    finally:
        db.close()



if __name__ == "__main__":
    asyncio.run(main())
