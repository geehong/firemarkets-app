import asyncio
import sys
import os

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Load environment variables (mimic Docker)
os.environ['POSTGRES_DATABASE_URL'] = 'postgresql://geehong:Power6100@localhost:5432/markets'

async def main():
    print("Test Crypto Collection started", flush=True)
    try:
        from app.core.database import SessionLocal
        from app.core.config_manager import ConfigManager
        from app.services.api_strategy_manager import ApiStrategyManager
        
        db = SessionLocal()
        config_manager = ConfigManager()
        api_manager = ApiStrategyManager(config_manager=config_manager)
        
        # Bitcoin (asset_id=1) 1m data fetch
        print("Checking fetch parameters for BTCUSDT 1m...", flush=True)
        params = api_manager._get_fetch_parameters(1, '1m')
        print(f"Fetch Params: {params}", flush=True)
        
        print("Fetching BTCUSDT 1m...", flush=True)
        data = await api_manager.get_ohlcv_data(asset_id=1, interval='1m')
        
        if data:
            print(f"Success! Fetched {len(data)} data points.", flush=True)
            print(f"First TS: {data[0].timestamp_utc}, Last TS: {data[-1].timestamp_utc}", flush=True)
            # Check is_backfill
            is_backfill = getattr(api_manager, '_last_fetch_was_backfill', False)
            print(f"Is Backfill: {is_backfill}", flush=True)
        else:
            print("Failed to fetch data or no data needed.", flush=True)
            
    except Exception as e:
        print(f"Error: {e}", flush=True)
        import traceback
        traceback.print_exc()
    print("Test Crypto Collection ended", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
