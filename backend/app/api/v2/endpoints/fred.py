from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.api import deps
from app.collectors.fred_collector import FredCollector
from app.core.config_manager import ConfigManager
from app.services.api_strategy_manager import ApiStrategyManager
from app.utils.redis_queue_manager import RedisQueueManager

router = APIRouter()

@router.post("/collect", response_model=Dict[str, Any])
async def collect_fred_data(
    db: Session = Depends(deps.get_current_db)
):
    """
    Trigger FRED data collection manually.
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info("FRED collection endpoint called")
    try:
        # Manually verify/get dependencies since they are not all standard Depends currently
        # In a real app, these managers might be singletons or injected via Depends
        config_manager = ConfigManager()
        # api_manager = ApiStrategyManager(config_manager) # Heavy initialization, skipping for now
        redis_queue_manager = RedisQueueManager(config_manager)

        collector = FredCollector(
            db=db,
            config_manager=config_manager,
            api_manager=None,
            redis_queue_manager=redis_queue_manager
        )
        
        result = await collector.collect_with_settings()
        return result
    except Exception as e:
        logger.error(f"Error in collect_fred_data: {e}")
        raise HTTPException(status_code=500, detail=str(e))
