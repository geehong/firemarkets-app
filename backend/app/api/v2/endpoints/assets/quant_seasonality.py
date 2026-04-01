from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
import logging
import json
from datetime import datetime

from fastapi_cache.decorator import cache
from app.core.database import get_postgres_db
from app.services.quant_seasonality_engine import QuantSeasonalityEngine
from app.models.asset import Asset

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/quant-seasonality")
@cache(expire=3600)  # 1 hour cache as fallback
async def get_quant_seasonality(
    rate_regime: Optional[str] = Query("all", enum=["all", "hiking", "cutting"]),
    compare: Optional[str] = Query("SPY,QQQ,GLD", description="Comma separated tickers to compare"),
    db: Session = Depends(get_postgres_db)
):
    """
    Returns cross-asset quant seasonality analysis data.
    Checks for pre-calculated data in Redis first.
    """
    try:
        # 1. Check custom Redis key from scheduler
        # We can use the FastAPICache backend or a direct client.
        try:
            from fastapi_cache import FastAPICache
            backend = FastAPICache.get_backend()
            # FastAPICache.get_backend() returns a RedisBackend in this app
            # RedisBackend.get(key) is async
            cached_data = await backend.get("quant:seasonality:btc")
            if cached_data:
                logger.info("Serving quant seasonality from custom Redis key")
                return json.loads(cached_data)
        except Exception as cache_err:
            logger.warning(f"Failed to check custom Redis cache: {cache_err}")

        # 2. Cache miss or error - calculate real-time
        engine = QuantSeasonalityEngine(db)
        
        # Resolve BTC asset id
        btc_asset = db.query(Asset).filter(Asset.ticker == 'BTCUSDT').first()
        if not btc_asset:
            btc_asset = db.query(Asset).filter(Asset.ticker == 'BTC').first()
            
        if not btc_asset:
            raise HTTPException(status_code=404, detail="BTC asset not found in database")
            
        # Resolve compare assets
        compare_tickers = [t.strip() for t in compare.split(",")]
        compare_assets = {}
        for ticker in compare_tickers:
            asset = db.query(Asset).filter(Asset.ticker == ticker).first()
            if asset:
                compare_assets[ticker] = asset.asset_id
        
        # Run analysis
        full_analysis = engine.run_full_analysis(btc_asset.asset_id, compare_assets)
        return full_analysis
        
    except Exception as e:
        logger.exception("Failed to get quant seasonality data")
        raise HTTPException(status_code=500, detail=str(e))
