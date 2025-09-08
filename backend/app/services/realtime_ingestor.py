"""
Realtime Redis→DB Ingestor

Reads standardized Redis Streams (finnhub:realtime, tiingo:realtime, alpaca:realtime)
and writes into realtime_quotes (minimal schema):
  - asset_id, timestamp_utc, price, volume, change_amount, change_percent, data_source

Batch-consumes with XREADGROUP per stream and upserts rows.
"""
import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

import redis.asyncio as redis
from sqlalchemy import insert
from sqlalchemy.dialects.mysql import insert as mysql_insert
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.asset import Asset, RealtimeQuote

logger = logging.getLogger(__name__)


STREAM_KEYS = [
    "finnhub:realtime",
    "tiingo:realtime",
    "alpaca:realtime",
]

CONSUMER_GROUP = "realtime_ingestor"
CONSUMER_NAME = "worker-1"


class RealtimeIngestor:
    def __init__(self):
        self._redis: Optional[redis.Redis] = None
        self._asset_cache: Dict[str, int] = {}

    async def _get_redis(self) -> redis.Redis:
        if self._redis is None:
            host = "redis"
            port = 6379
            db = 0
            self._redis = await redis.from_url(f"redis://{host}:{port}/{db}")
        return self._redis

    async def _ensure_groups(self):
        r = await self._get_redis()
        for skey in STREAM_KEYS:
            try:
                # 기존 메시지까지 소비하도록 처음에는 '0'부터 시작
                await r.xgroup_create(name=skey, groupname=CONSUMER_GROUP, id="0", mkstream=True)
                logger.info(f"Created consumer group {CONSUMER_GROUP} on {skey}")
            except Exception as e:
                # Group probably exists
                if "BUSYGROUP" in str(e):
                    continue
                logger.debug(f"xgroup_create skip {skey}: {e}")

    def _to_dt_utc(self, raw_timestamp: Optional[str]) -> datetime:
        """Convert ms epoch string to UTC datetime. Defaults to now if missing."""
        try:
            if raw_timestamp is None:
                return datetime.now(timezone.utc)
            ms = int(float(raw_timestamp))
            if ms > 1_000_000_000_000:  # ns or us
                # Try to coerce to ms
                while ms > 9_999_999_999_999:
                    ms = ms // 1000
            return datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
        except Exception:
            return datetime.now(timezone.utc)

    def _get_asset_id(self, db: Session, symbol: str) -> Optional[int]:
        key = symbol.upper()
        if key in self._asset_cache:
            return self._asset_cache[key]
        asset = db.query(Asset).filter(Asset.ticker == key).first()
        if not asset:
            return None
        self._asset_cache[key] = asset.asset_id
        return asset.asset_id

    def _calc_change(self, price: Optional[float], prev_close: Optional[float]):
        if price is None or prev_close is None or prev_close == 0:
            return None, None
        change_amount = float(price) - float(prev_close)
        change_percent = (change_amount / float(prev_close)) * 100.0
        return change_amount, change_percent

    async def run(self):
        await self._ensure_groups()
        r = await self._get_redis()
        logger.info("Realtime ingestor started")

        while True:
            try:
                # Read up to 200 messages across streams, block 2s
                resp = await r.xreadgroup(
                    groupname=CONSUMER_GROUP,
                    consumername=CONSUMER_NAME,
                    streams={k: ">" for k in STREAM_KEYS},
                    count=200,
                    block=2000,
                )
                if not resp:
                    continue

                # Process in a DB session
                db = SessionLocal()
                try:
                    ack_items: List[tuple] = []
                    for skey, entries in resp:
                        for msg_id, fields in entries:
                            try:
                                symbol = (fields.get("symbol") or "").upper()
                                if not symbol:
                                    continue
                                # Map to asset_id
                                asset_id = self._get_asset_id(db, symbol)
                                if not asset_id:
                                    logger.debug(f"No asset match for symbol {symbol}")
                                    continue
                                price = fields.get("price")
                                volume = fields.get("volume")
                                raw_ts = fields.get("raw_timestamp") or fields.get("timestamp")
                                provider = fields.get("provider") or "unknown"

                                # Normalize types
                                price_f = float(price) if price not in (None, "") else None
                                volume_f = float(volume) if volume not in (None, "") else None
                                ts_dt = self._to_dt_utc(raw_ts)

                                # TODO: prev_close source — leave None for now
                                change_amount, change_percent = self._calc_change(price_f, None)

                                # Insert row (no conflict policy; keeping all ticks)
                                stmt = insert(RealtimeQuote).values(
                                    asset_id=asset_id,
                                    timestamp_utc=ts_dt,
                                    price=price_f,
                                    volume=volume_f,
                                    change_amount=change_amount,
                                    change_percent=change_percent,
                                    data_source=str(provider)[:32],
                                )
                                db.execute(stmt)
                                ack_items.append((skey, msg_id))
                            except Exception as e:
                                logger.warning(f"Skip entry due to error: {e}")
                    if ack_items:
                        db.commit()
                        # Acknowledge after successful commit
                        for skey, msg_id in ack_items:
                            try:
                                await r.xack(skey, CONSUMER_GROUP, msg_id)
                            except Exception:
                                pass
                except Exception as e:
                    logger.error(f"DB error: {e}")
                    try:
                        db.rollback()
                    except Exception:
                        pass
                finally:
                    db.close()
            except Exception as e:
                logger.error(f"Ingest loop error: {e}")
                await asyncio.sleep(2)


async def main():
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    worker = RealtimeIngestor()
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())


