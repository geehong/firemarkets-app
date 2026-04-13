
import asyncio
from app.core.config import load_and_set_global_configs, initialize_bitcoin_asset_id
from app.core.database import SessionLocal
from app.services.scheduler_service import SchedulerService

async def test_pipeline():
    load_and_set_global_configs()
    initialize_bitcoin_asset_id()
    
    db = SessionLocal()
    try:
        scheduler = SchedulerService()
        pipeline_func = scheduler._create_news_pipeline_function()
        
        print("Starting manual News AI Pipeline test...")
        # Since the function is async, we need to await it
        # The _create_news_pipeline_function returns a wrapper function
        await pipeline_func()
        print("Pipeline test completed.")
        
    except Exception as e:
        import traceback
        print(f"Pipeline test failed: {e}")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_pipeline())
