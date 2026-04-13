
import asyncio
import os
from app.core.config import load_and_set_global_configs, initialize_bitcoin_asset_id
from app.core.database import SessionLocal
from app.collectors.news_collector import NewsCollector
from app.services.api_strategy_manager import ApiStrategyManager
from app.core.config_manager import ConfigManager

async def test_news_collection():
    # Initialize configs first
    load_and_set_global_configs()
    initialize_bitcoin_asset_id()
    
    db = SessionLocal()
    try:
        config_manager = ConfigManager()
        api_manager = ApiStrategyManager(config_manager=config_manager)
        collector = NewsCollector(db, config_manager=config_manager, api_manager=api_manager)
        
        print("Starting manual news collection test...")
        # Test CryptoPanic (broader filter 'all' and more tickers)
        count = await collector._collect_cryptopanic()
        print(f"Collected {count} items from CryptoPanic.")
        
    except Exception as e:
        import traceback
        print(f"Collection test failed: {e}")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_news_collection())
