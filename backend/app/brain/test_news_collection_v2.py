
import asyncio
import os
from app.core.config import load_and_set_global_configs, initialize_bitcoin_asset_id
from app.core.database import SessionLocal
from app.collectors.news_collector import NewsCollector
from app.services.api_strategy_manager import ApiStrategyManager

async def test_news_collection():
    # Initialize configs first
    load_and_set_global_configs()
    initialize_bitcoin_asset_id()
    
    db = SessionLocal()
    try:
        api_manager = ApiStrategyManager()
        collector = NewsCollector(db, api_manager=api_manager)
        
        print("Starting manual news collection test...")
        # Test CryptoPanic (broader filter 'all' and more tickers)
        count = await collector._collect_cryptopanic()
        print(f"Collected {count} items from CryptoPanic.")
        
        # Test Tiingo
        count_tiingo = await collector._collect_tiingo()
        print(f"Collected {count_tiingo} items from Tiingo.")
        
    except Exception as e:
        import traceback
        print(f"Collection test failed: {e}")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_news_collection())
