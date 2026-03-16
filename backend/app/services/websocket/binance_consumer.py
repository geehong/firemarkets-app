import asyncio
import json
import logging
import time
import websockets
import traceback
from typing import List, Optional
import os
import redis.asyncio as redis
from datetime import datetime, timezone
from app.services.websocket.base_consumer import BaseWSConsumer, ConsumerConfig, AssetType
from app.utils.asset_mapping_loader import get_symbol_for_provider
from app.services.processor.redis_bucket_manager import RedisBucketManager

logger = logging.getLogger(__name__)

class BinanceWSConsumer(BaseWSConsumer):
    def __init__(self, config: ConsumerConfig):
        super().__init__(config)
        # Try both 9443 and 443 if needed
        self.ws_url = "wss://stream.binance.com:9443/stream"
        self._ws = None
        self._request_id = 0
        self._redis_url = self._build_redis_url()
        self.bucket_manager = RedisBucketManager(self._redis_url)
        self.subscribed_tickers = []
        self._is_subscribed = False
        self._asset_id_map = {}

    @property
    def client_name(self) -> str: return "binance"
    @property
    def api_key(self) -> Optional[str]: return None

    def _build_redis_url(self) -> str:
        host = os.getenv('REDIS_HOST', 'redis')
        port = os.getenv('REDIS_PORT', '6379')
        db = os.getenv('REDIS_DB', '0')
        password = os.getenv('REDIS_PASSWORD', '')
        if password: return f"redis://:{password}@{host}:{port}/{db}"
        return f"redis://{host}:{port}/{db}"

    async def connect(self) -> bool:
        logger.info("🚩 [BINANCE] connect() START")
        try:
            # 1. Redis Connect
            await self.bucket_manager.connect()
            logger.info("🚩 [BINANCE] Redis Bucket Manager Connected")
            
            # 2. WebSocket Connect
            logger.info(f"🔌 [BINANCE] Connecting to {self.ws_url} (timeout 30s)")
            self._ws = await asyncio.wait_for(
                websockets.connect(self.ws_url, ping_interval=20, ping_timeout=20), 
                timeout=30.0
            )
            self.is_connected = True
            logger.info("🚩 [BINANCE] WebSocket Connected")
            
            await self._load_asset_ids()
            return True
        except Exception as e:
            logger.error(f"❌ [BINANCE] connect() FAILED: {type(e).__name__}: {e}")
            logger.error(traceback.format_exc())
            return False

    async def _load_asset_ids(self):
        try:
            from app.core.database import get_postgres_db
            from app.models.asset import Asset
            db = next(get_postgres_db())
            assets = db.query(Asset.asset_id, Asset.ticker).all()
            self._asset_id_map = {self._normalize_symbol(t): aid for aid, t in assets}
            logger.info(f"📍 [BINANCE] Asset Map Loaded: {len(self._asset_id_map)} items")
            db.close()
        except Exception as e:
            logger.error(f"❌ [BINANCE] Failed to load assets: {e}")

    def _normalize_symbol(self, ticker: str) -> str:
        t = (ticker or '').upper().strip()
        return (get_symbol_for_provider(t, "binance") or t).lower()

    async def subscribe(self, tickers: List[str]) -> bool:
        try:
            if not self.is_connected or not self._ws: return False
            streams = []
            for t in tickers:
                normalized = self._normalize_symbol(t)
                streams.extend([f"{normalized}@trade", f"{normalized}@ticker"])
                if normalized not in self.subscribed_tickers: self.subscribed_tickers.append(normalized)
            
            if not streams: return True
            
            msg = {"method": "SUBSCRIBE", "params": streams, "id": self._get_next_id()}
            await self._ws.send(json.dumps(msg))
            logger.info(f"📤 [BINANCE] Subscribed to {len(streams)} streams")
            return True
        except Exception as e:
            logger.error(f"❌ [BINANCE] Subscribe error: {e}")
            return False

    async def unsubscribe(self, tickers: List[str]) -> bool: return True
    async def _perform_health_check(self) -> bool: return True
    def _get_next_id(self) -> int:
        self._request_id += 1
        return self._request_id

    async def disconnect(self):
        if self._ws: await self._ws.close()
        self.is_connected = False

    async def run(self):
        self.is_running = True
        while self.is_running:
            try:
                if not self.is_connected:
                    if not await self.connect():
                        await asyncio.sleep(10)
                        continue
                async for message in self._ws:
                    data = json.loads(message)
                    if "stream" in data and "data" in data:
                        stream, payload = data["stream"], data["data"]
                        if "@trade" in stream:
                            await self._process_tick(payload)
                        elif "@ticker" in stream:
                            await self._store_legacy(payload, "ticker")
                    elif "id" in data:
                        logger.info(f"✅ [BINANCE] Response: {data}")
            except Exception as e:
                logger.error(f"❌ [BINANCE] Run Error: {e}")
                self.is_connected = False
                await asyncio.sleep(10)

    async def _process_tick(self, data: dict):
        asset_id = self._asset_id_map.get(data.get('s', '').lower())
        if asset_id:
            p, q = float(data.get('p', 0)), float(data.get('q', 0))
            dt = datetime.fromtimestamp(data.get('T', 0)/1000.0, tz=timezone.utc)
            await self.bucket_manager.aggregate_tick(asset_id, "1m", p, q, dt)
            await self.bucket_manager.aggregate_tick(asset_id, "5m", p, q, dt)
        await self._store_legacy(data, "trade")

    async def _store_legacy(self, data: dict, mtype: str):
        r = self.bucket_manager.redis_client
        if r:
            entry = {'symbol': data.get('s'), 'price': str(data.get('p', data.get('c', ''))), 'provider': 'binance', 'type': mtype}
            await r.xadd('binance:realtime', entry, maxlen=1000, approximate=True)
