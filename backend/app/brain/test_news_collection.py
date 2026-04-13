
import asyncio
from app.core.database import SessionLocal
from app.collectors.news_collector import NewsCollector
from app.services.api_strategy_manager import ApiStrategyManager

async def test_news_collection():
    db = SessionLocal()
    try:
        api_manager = ApiStrategyManager()
        collector = NewsCollector(db, api_manager=api_manager)
        
        print("Starting manual news collection test...")
        # We only run CryptoPanic for a quick test
        count = await collector._collect_cryptopanic()
        print(f"Collected {count} items from CryptoPanic.")
        
    except Exception as e:
        print(f"Collection test failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_news_collection())
