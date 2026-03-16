import logging
import os
import json
import time
import traceback
from typing import Dict, Any, Optional, List
import redis.asyncio as redis
from datetime import datetime

logger = logging.getLogger(__name__)

class RedisBucketManager:
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.redis_client = None
        self._lua_aggregator = None
        
        self.lua_path = os.path.join(os.path.dirname(__file__), "redis_aggregator.lua")
        self._lua_script_content = None
        if os.path.exists(self.lua_path):
            with open(self.lua_path, 'r') as f:
                self._lua_script_content = f.read()
            logger.info(f"📜 Lua script loaded from {self.lua_path}")
        else:
            logger.error(f"⚠️ Lua script NOT FOUND at {self.lua_path}")

    async def connect(self):
        try:
            if not self.redis_client:
                logger.info(f"🔗 RedisBucketManager connecting to {self.redis_url}")
                self.redis_client = await redis.from_url(self.redis_url, socket_timeout=5.0)
                await self.redis_client.ping()
                
                if self._lua_script_content:
                    self._lua_aggregator = self.redis_client.register_script(self._lua_script_content)
                    logger.info("✅ Lua script registered successfully")
                
                logger.info(f"✅ RedisBucketManager Connected to {self.redis_url}")
        except Exception as e:
            logger.error(f"❌ RedisBucketManager.connect failed: {type(e).__name__}: {e}")
            logger.error(traceback.format_exc())
            raise

    async def aggregate_tick(self, asset_id: int, interval: str, price: float, volume: float, timestamp_utc: datetime):
        if not self._lua_aggregator:
            await self.connect()
            
        # minutes = 1 if interval == "1m" else 5
        ts_window = timestamp_utc.replace(second=0, microsecond=0)
        if interval == "5m":
            ts_window = ts_window.replace(minute=(ts_window.minute // 5) * 5)
            
        ts_str = ts_window.strftime("%Y%m%d%H%M")
        key = f"realtime:bars:{interval}:{asset_id}:{ts_str}"
        
        try:
            await self._lua_aggregator(
                keys=[key],
                args=[price, volume, timestamp_utc.isoformat()]
            )
            index_key = f"realtime:index:{interval}"
            await self.redis_client.sadd(index_key, key)
            return True
        except Exception as e:
            logger.error(f"❌ Redis aggregation failed: {e}")
            return False

    async def add_bars_batch(self, bars: List[Dict[str, Any]]):
        """이미 형성된 바(Bar) 목록을 Redis 바구니에 일괄 추가 (Collector용)"""
        if not self.redis_client: await self.connect()
        
        try:
            pipeline = self.redis_client.pipeline()
            for b in bars:
                interval = b.get('interval', '1m')
                asset_id = b.get('asset_id')
                ts = b.get('timestamp_utc')
                if not all([asset_id, ts]): continue
                
                if isinstance(ts, str):
                    try:
                        ts_dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                    except ValueError:
                        # Handle other potential formats if needed
                        continue
                else:
                    ts_dt = ts
                    
                ts_str = ts_dt.strftime("%Y%m%d%H%M")
                key = f"realtime:bars:{interval}:{asset_id}:{ts_str}"
                
                bar_data = {
                    'open': str(b.get('open_price', b.get('open', 0))),
                    'high': str(b.get('high_price', b.get('high', 0))),
                    'low': str(b.get('low_price', b.get('low', 0))),
                    'close': str(b.get('close_price', b.get('close', 0))),
                    'volume': str(b.get('volume', 0)),
                    'updated_at': datetime.now().isoformat()
                }
                pipeline.hset(key, mapping=bar_data)
                
                index_key = f"realtime:index:{interval}"
                pipeline.sadd(index_key, key)
                
            await pipeline.execute()
            return True
        except Exception as e:
            logger.error(f"❌ Redis add_bars_batch failed: {e}")
            return False

    async def get_completed_bars(self, interval: str) -> List[Dict[str, Any]]:
        if not self.redis_client: await self.connect()
        index_key = f"realtime:index:{interval}"
        keys = await self.redis_client.smembers(index_key)
        completed_bars = []
        for key_bytes in keys:
            key = key_bytes.decode('utf-8')
            parts = key.split(':')
            if len(parts) < 5: continue
            asset_id = int(parts[3])
            ts_str = parts[4]
            data = await self.redis_client.hgetall(key)
            if data:
                bar = {k.decode('utf-8'): v.decode('utf-8') for k, v in data.items()}
                bar['asset_id'] = asset_id
                bar['interval'] = interval
                bar['timestamp_utc'] = datetime.strptime(ts_str, "%Y%m%d%H%M")
                completed_bars.append(bar)
                await self.redis_client.srem(index_key, key)
        return completed_bars

    async def delete_bar_key(self, key: str):
        if self.redis_client:
            await self.redis_client.delete(key)
