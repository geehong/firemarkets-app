import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

from app.collectors.base_collector import BaseCollector
from app.models.asset import Asset, AssetType, RealtimeQuotesTimeBar, RealtimeQuoteTimeDelay, OHLCVIntradayData
from app.external_apis.implementations.polygon_client import PolygonClient
from app.utils.trading_calendar import is_regular_market_hours
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import or_

logger = logging.getLogger(__name__)

class USBackfillCollector(BaseCollector):
    """
    Dedicated collector for backfilling US Stocks/ETFs bars after market close.
    Uses Polygon to fetch last 24h of 1m and 5m data.
    """
    
    def __init__(self, db, config_manager, api_manager, redis_queue_manager=None):
        super().__init__(db, config_manager, api_manager, redis_queue_manager)
        self.polygon_client = PolygonClient()

    async def collect(self) -> Dict[str, Any]:
        """Main collection logic"""
        logger.info("🚀 Starting US Stock Backfill collection")
        
        # 1. Get targets (ETFs and Stocks)
        asset_types = self.db.query(AssetType).filter(or_(AssetType.type_name == "ETFs", AssetType.type_name == "Stocks")).all()
        type_ids = [at.asset_type_id for at in asset_types]
        assets = self.db.query(Asset).filter(Asset.asset_type_id.in_(type_ids), Asset.is_active == True).all()
        
        target_assets = [{"ticker": a.ticker, "id": a.asset_id} for a in assets]
        logger.info(f"🎯 Target assets count: {len(target_assets)}")
        
        # 2. Timeframe (last 24h)
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=1)
        start_str = start_date.strftime('%Y-%m-%d')
        end_str = end_date.strftime('%Y-%m-%d')
        
        intervals = ["1m", "5m"]
        total_data_points = 0
        
        for interval in intervals:
            for asset in target_assets:
                ticker = asset["ticker"]
                asset_id = asset["id"]
                
                try:
                    data_points = await self.polygon_client.get_ohlcv_data(
                        symbol=ticker,
                        interval=interval,
                        start_date=start_str,
                        end_date=end_str,
                        limit=50000
                    )
                    
                    if not data_points:
                        continue
                        
                    # Filter for only last 24h AND Regular Market Hours
                    # USBackfillCollector is dedicated for US Stocks/ETFs, so we filter by market hours
                    data_points = [
                        dp for dp in data_points 
                        if dp.timestamp_utc >= start_date and is_regular_market_hours(dp.timestamp_utc)
                    ]
                    
                    if not data_points:
                        continue
                        
                    # Save to TimeBar
                    if not data_points:
                        continue
                        
                    # 3. Redis Queue에 전달하도록 수정 (직접 DB 저장 대신)
                    # ohlcv_intraday_data 타입으로 통합하여 전달
                    items = []
                    for dp in data_points:
                        ts = dp.timestamp_utc.astimezone(timezone.utc).replace(microsecond=0, tzinfo=None)
                        items.append({
                            "asset_id": asset_id,
                            "timestamp_utc": ts.isoformat(),
                            "data_interval": interval,
                            "open": float(dp.open_price),
                            "high": float(dp.high_price),
                            "low": float(dp.low_price),
                            "close": float(dp.close_price),
                            "volume": float(dp.volume or 0),
                            "data_source": "polygon"
                        })

                    if items and self.redis_queue_manager:
                        task_type = "ohlcv_day_data" if interval in ["1d", "daily"] else "ohlcv_intraday_data"
                        await self.redis_queue_manager.push_batch_task(
                            task_type,
                            {
                                "items": items,
                                "metadata": {
                                    "asset_id": asset_id,
                                    "interval": interval,
                                    "is_backfill": True,
                                    "target_tables": ["realtime_quotes_time_bar", "ohlcv_intraday_data"]
                                }
                            }
                        )
                        total_data_points += len(items)
                        logger.debug(f"📤 Enqueued {ticker} ({interval}) to Redis Queue")
                    
                except Exception as e:
                    logger.error(f"❌ Error backfilling {ticker} ({interval}): {e}")
                
                # Small sleep to be kind
                await asyncio.sleep(0.05)
                
        return {
            "success": True,
            "assets_processed": len(target_assets),
            "data_points_added": total_data_points,
            "message": f"US Stock backfill enqueued for {len(target_assets)} assets"
        }
