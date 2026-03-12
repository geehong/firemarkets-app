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
                    await self._upsert_bars(asset_id, interval, data_points)
                    
                    # Save to Delay (Permanent 1m)
                    if interval == "1m":
                        await self._upsert_delay_bars(asset_id, data_points)
                    
                    # Save to Historical (for charts)
                    await self._upsert_historical_bars(asset_id, interval, data_points)
                        
                    self.db.commit()
                    total_data_points += len(data_points)
                    logger.debug(f"✅ Backfilled {ticker} ({interval})")
                    
                except Exception as e:
                    logger.error(f"❌ Error backfilling {ticker} ({interval}): {e}")
                    self.db.rollback()
                
                # Small sleep to be kind
                await asyncio.sleep(0.05)
                
        return {
            "success": True,
            "assets_processed": len(target_assets),
            "data_points_added": total_data_points,
            "message": f"US Stock backfill completed for {len(target_assets)} assets"
        }

    async def _upsert_bars(self, asset_id: int, interval: str, data_points: List[Any]):
        seen = {}
        for dp in data_points:
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
                stmt = insert(RealtimeQuotesTimeBar).values(batch)
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
                self.db.execute(stmt)

    async def _upsert_delay_bars(self, asset_id: int, data_points: List[Any]):
        seen = {}
        for dp in data_points:
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
                stmt = insert(RealtimeQuoteTimeDelay).values(batch)
                stmt = stmt.on_conflict_do_update(
                    index_elements=['asset_id', 'timestamp_utc', 'data_source', 'data_interval'],
                    set_={
                        "price": stmt.excluded.price,
                        "volume": stmt.excluded.volume,
                        "updated_at": stmt.excluded.updated_at
                    }
                )
                self.db.execute(stmt)
    async def _upsert_historical_bars(self, asset_id: int, interval: str, data_points: List[Any]):
        """Upsert for OHLCVIntradayData (Historical bars used for charts)"""
        records = []
        for dp in data_points:
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
                self.db.execute(stmt)
