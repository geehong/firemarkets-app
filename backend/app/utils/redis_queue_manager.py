import json
import asyncio
from typing import Any, Optional

import redis.asyncio as redis

from app.core.config_manager import ConfigManager
from app.utils.logger import logger


class RedisQueueManager:
    """Encapsulates Redis queue/stream operations with a DLQ (dead-letter queue)."""

    def __init__(self, config_manager: ConfigManager):
        self.config_manager = config_manager
        self.redis_client: Optional[redis.Redis] = None
        self.queue_key = "batch_data_queue"
        self.dlq_key = "dead_letter_queue"

    async def _ensure_client(self) -> redis.Redis:
        """
        Ensures a Redis client is available and attached to the current event loop.
        In a multi-threaded scheduler environment, different jobs may run in different event loops.
        """
        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            current_loop = None

        if self.redis_client is not None:
            # Check if the client is still valid for the current loop
            try:
                # If we have a client but no loop info, or the loop changed, we should reconnect
                if not hasattr(self, "_attached_loop") or self._attached_loop != current_loop:
                    logger.info(f"Event loop changed or mismatch in RedisQueueManager ({getattr(self, '_attached_loop', 'None')} -> {current_loop}). Reconnecting...")
                    # Note: We don't necessarily need to aclose() if the old loop is already closed or inaccessible,
                    # but it's good practice if possible. However, aclose() itself might fail if the loop is wrong.
                    try:
                        await self.redis_client.ping()
                    except (RuntimeError, Exception):
                        # Loop mismatch often causes RuntimeError when trying to use the client
                        self.redis_client = None
                    
                    if self.redis_client:
                         await self.redis_client.aclose()
                         self.redis_client = None
                else:
                    return self.redis_client
            except Exception as e:
                logger.warning(f"Error checking Redis client loop: {e}. Reconnecting...")
                self.redis_client = None
        
        # ConfigManager에서 Redis 설정 가져오기
        host = self.config_manager._get_config("REDIS_HOST", "redis", str)
        port = int(self.config_manager._get_config("REDIS_PORT", 6379, int))
        db = int(self.config_manager._get_config("REDIS_DB", 0, int))
        
        # Redis 연결 시도
        url = f"redis://{host}:{port}/{db}"
        self.redis_client = await redis.from_url(url)
        await self.redis_client.ping()
        self._attached_loop = current_loop
        
        logger.info(f"RedisQueueManager connected to {host}:{port} db={db} on loop {current_loop}")
        return self.redis_client

    async def push_batch_task(self, task_type: str, payload: dict) -> None:
        client = await self._ensure_client()
        message = json.dumps({"type": task_type, "payload": payload}, ensure_ascii=False)
        await client.rpush(self.queue_key, message)
        logger.debug(f"Enqueued task to {self.queue_key}: {task_type}")

    async def pop_batch_task(self, timeout_seconds: int = 1) -> Optional[dict]:
        client = await self._ensure_client()
        try:
            item = await client.blpop(self.queue_key, timeout=timeout_seconds)
            if not item:
                return None
            _, raw = item
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("Failed to decode task JSON; discarding")
            return None

    async def move_to_dlq(self, task_json: str, error: str) -> None:
        client = await self._ensure_client()
        wrapper = json.dumps({"failed_task": task_json, "error": error}, ensure_ascii=False)
        await client.rpush(self.dlq_key, wrapper)
        logger.error(f"Moved task to DLQ: {error}")

    async def reprocess_one_from_dlq(self) -> bool:
        """
        Pops one task from the DLQ, unwraps it, and pushes it back to the main queue.
        """
        client = await self._ensure_client()
        raw_wrapper = await client.lpop(self.dlq_key)
        if not raw_wrapper:
            return False
        
        try:
            wrapper = json.loads(raw_wrapper)
            failed_task_json = wrapper.get("failed_task")
            await client.rpush(self.queue_key, failed_task_json)
            logger.info("Reprocessed one task from DLQ back to the main queue.")
            return True
        except (json.JSONDecodeError, TypeError) as e:
            logger.error(f"Failed to reprocess DLQ item, putting it back: {e}")
            await client.rpush(self.dlq_key, raw_wrapper) # Re-queue on parsing error
            return False

    async def process_dlq(self, handler: Optional[Any] = None, max_items: int = 100) -> int:
        client = await self._ensure_client()
        processed = 0
        for _ in range(max_items):
            raw = await client.lpop(self.dlq_key)
            if raw is None:
                break
            try:
                entry = json.loads(raw)
                if handler:
                    await handler(entry)
                processed += 1
            except Exception as e:
                logger.warning(f"Failed to process DLQ item: {e}")
        return processed

    async def get_queue_size(self, queue_name: Optional[str] = None) -> int:
        client = await self._ensure_client()
        key = queue_name or self.queue_key
        size = await client.llen(key)
        return int(size)
