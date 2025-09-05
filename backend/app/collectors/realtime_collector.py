"""
DEPRECATED (v2): This module is kept for reference only.
In the v2 pipeline, the canonical DataProcessor lives at
`backend/app/services/data_processor.py` and is responsible for real-time and
batch processing. Do not import or schedule this module.
"""
import logging
import asyncio
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session
from pydantic import ValidationError

from app.core.database import SessionLocal, get_db
from app.core.config_manager import ConfigManager
from app.utils.redis_queue_manager import RedisQueueManager
from app.external_apis import schemas
from app.crud import ohlcv as crud_ohlcv
from app.crud import asset as crud_asset
# Crypto, ETF, Onchain CRUD removed - models consolidated into asset.py

logger = logging.getLogger(__name__)


class DataProcessor:
    """
    A long-running service that processes data from Redis queues and streams.
    It acts as the single point of entry for writing data to the database,
    ensuring data integrity and consistency.
    """

    def __init__(
        self,
        config_manager: ConfigManager,
        redis_queue_manager: RedisQueueManager,
    ):
        self.config_manager = config_manager
        self.redis_queue_manager = redis_queue_manager
        self.db_session_factory = SessionLocal
        self.is_running = False

    async def start(self):
        """Starts the main processing loop."""
        self.is_running = True
        logger.info("Data Processor service starting...")
        # Run both real-time and batch processing concurrently.
        await asyncio.gather(
            self._process_realtime_streams(),
            self._process_batch_queue()
        )

    def stop(self):
        """Signals the processor to stop."""
        self.is_running = False
        logger.info("Data Processor service stopping...")

    def get_db(self) -> Session:
        """Provides a database session for a unit of work."""
        return self.db_session_factory()

    # ============================================================================
    # Real-time Stream Processing (Logic migrated from RealtimeCollector)
    # ============================================================================

    async def _process_realtime_streams(self):
        """Continuously processes data from real-time Redis streams."""
        logger.info("Starting real-time stream processing loop...")
        while self.is_running:
            try:
                # Only process if the market is likely open to save resources.
                if not self._is_us_stock_market_open():
                    await asyncio.sleep(60)  # Check again in a minute.
                    continue

                raw_messages = await self.redis_queue_manager.pop_from_streams(count=1000)
                if not raw_messages:
                    await asyncio.sleep(1)  # Brief pause if no new data.
                    continue

                quotes_to_save, last_ids = self._parse_stream_messages(raw_messages)

                if quotes_to_save:
                    await self._bulk_save_realtime_quotes(quotes_to_save)
                
                if last_ids:
                    await self.redis_queue_manager.trim_streams(last_ids)

            except Exception as e:
                logger.error(f"Error in real-time stream processing loop: {e}", exc_info=True)
                await asyncio.sleep(10) # Wait before retrying on error.

    def _is_us_stock_market_open(self) -> bool:
        """A simple check for US stock market hours based on UTC."""
        now_utc = datetime.utcnow()
        # Monday(0) to Friday(4)
        if now_utc.weekday() > 4:
            return False
        # 13:30 to 20:00 UTC (9:30 AM to 4:00 PM ET, no DST handling)
        if 13 <= now_utc.hour < 20:
            return True
        return False
        
    def _parse_stream_messages(self, raw_messages: Dict[str, List[tuple]]) -> (List[schemas.RealtimeQuoteData], Dict[str, str]):
        """Parses raw stream messages into standardized Pydantic models."""
        quotes = []
        last_ids = {}
        for stream_name, messages in raw_messages.items():
            for msg_id, msg_data in messages:
                try:
                    data_str = msg_data.get(b'data')
                    if not data_str:
                        continue
                    
                    data = json.loads(data_str)
                    quote = schemas.RealtimeQuoteData.model_validate(data)
                    quotes.append(quote)
                    last_ids[stream_name.decode('utf-8')] = msg_id.decode('utf-8')
                except (json.JSONDecodeError, ValidationError, KeyError) as e:
                    logger.warning(f"Failed to parse message {msg_id} from {stream_name}: {e}")
        return quotes, last_ids

    async def _bulk_save_realtime_quotes(self, quotes: List[schemas.RealtimeQuoteData]):
        """Saves a batch of real-time quotes to the database."""
        db = self.get_db()
        try:
            crud_asset.upsert_realtime_quotes(db, quotes)
            logger.info(f"Successfully saved/updated {len(quotes)} real-time quotes.")
        except Exception as e:
            logger.error(f"Failed to bulk save real-time quotes: {e}")
        finally:
            db.close()

    # ============================================================================
    # Batch Queue Processing
    # ============================================================================

    async def _process_batch_queue(self):
        """Continuously processes tasks from the batch data Redis queue."""
        logger.info("Starting batch queue processing loop...")
        while self.is_running:
            try:
                task_json = await self.redis_queue_manager.pop_batch_task()
                if not task_json:
                    continue # pop_batch_task has a timeout, so this is normal

                task = json.loads(task_json)
                success = await self._process_batch_task(task)

                if not success:
                    # If processing fails after retries, move to DLQ
                    await self.redis_queue_manager.move_to_dlq(task_json, "Task processing failed")

            except Exception as e:
                logger.error(f"Error in batch queue processing loop: {e}", exc_info=True)
                # In case of system error, wait before retrying to prevent rapid failure loops
                await asyncio.sleep(10)

    async def _process_batch_task(self, task: dict) -> bool:
        """Routes a single batch task to the appropriate handler."""
        task_type = task.get('type')
        payload = task.get('payload')

        if not task_type or not payload:
            logger.warning(f"Invalid task format received: {task}")
            return False # Invalid task, don't retry

        handlers = {
            "ohlcv_data": self._save_ohlcv_data,
            "etf_info": self._save_etf_info,
            "crypto_info": self._save_crypto_data,
            "onchain_metric": self._save_onchain_metric
        }

        handler = handlers.get(task_type)
        if not handler:
            logger.error(f"Unknown task type '{task_type}'. Moving to DLQ.")
            return False # No handler, don't retry

        try:
            await handler(payload)
            return True
        except Exception as e:
            logger.error(f"Handler for task type '{task_type}' failed: {e}", exc_info=True)
            return False # Handler failed, allow for retry/DLQ

    # --- Batch Task Handlers ---

    async def _save_ohlcv_data(self, payload: dict):
        db = self.get_db()
        try:
            # Pydantic 모델로 데이터 유효성 검사 및 변환
            ohlcv_records = [schemas.OhlcvDataPoint.model_validate(item) for item in payload.get('data', [])]
            asset_id = payload.get('asset_id')
            interval = payload.get('interval')
            if ohlcv_records and asset_id and interval:
                crud_ohlcv.create_ohlcv_records(db, ohlcv_records, asset_id, interval)
                logger.info(f"Saved {len(ohlcv_records)} OHLCV records for asset {asset_id} ({interval}).")
        finally:
            db.close()

    # ETF, Crypto, Onchain save methods removed - CRUD files deleted
    # These will be handled by the main DataProcessor service
