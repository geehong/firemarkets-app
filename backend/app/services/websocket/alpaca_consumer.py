"""
Alpaca WebSocket Consumer 구현 (Real)
"""
import asyncio
import json
import logging
from typing import List, Optional
import os
import websockets
import redis.asyncio as redis
from app.services.websocket.base_consumer import BaseWSConsumer, ConsumerConfig
from app.core.config import GLOBAL_APP_CONFIGS

logger = logging.getLogger(__name__)

class AlpacaWSConsumer(BaseWSConsumer):
    """Alpaca WebSocket Consumer (Real)"""
    
    def __init__(self, config: ConsumerConfig):
        super().__init__(config)
        self.api_key = GLOBAL_APP_CONFIGS.get('ALPACA_API_KEY') or os.getenv('ALPACA_API_KEY')
        self.secret_key = GLOBAL_APP_CONFIGS.get('ALPACA_SECRET_KEY') or os.getenv('ALPACA_SECRET_KEY')
        # IEX 피드(무료/지연) 또는 SIP(유료) 선택
        self.ws_url = "wss://stream.data.alpaca.markets/v2/iex"
        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        # Redis
        self._redis = None
        self._redis_url = self._build_redis_url()
    
    @property
    def client_name(self) -> str:
        return "alpaca"
    
    @property
    def api_key(self) -> Optional[str]:
        return self._api_key
    
    @api_key.setter
    def api_key(self, value: str):
        self._api_key = value
    
    async def connect(self) -> bool:
        """WebSocket 연결 (실제)"""
        try:
            if not self.api_key or not self.secret_key:
                logger.error("❌ alpaca api/secret not set")
                return False
            self._ws = await websockets.connect(self.ws_url, ping_interval=20, ping_timeout=20)
            # 인증 전송
            await self._ws.send(json.dumps({"action": "auth", "key": self.api_key, "secret": self.secret_key}))
            resp = await asyncio.wait_for(self._ws.recv(), timeout=10)
            try:
                auth_msg = json.loads(resp)
            except Exception:
                auth_msg = resp
            logger.info(f"alpaca auth response: {auth_msg}")
            self.is_connected = True
            self.connection_errors = 0
            logger.info(f"✅ {self.client_name} connected")
            # 구독 초기화
            await self._send_subscribe()
            return True
        except Exception as e:
            logger.error(f"❌ {self.client_name} connection failed: {e}")
            self.connection_errors += 1
            self.is_connected = False
            self._ws = None
            return False
    
    async def disconnect(self):
        """WebSocket 연결 해제"""
        try:
            if self._ws is not None:
                await self._ws.close()
        except Exception:
            pass
        self._ws = None
        self.is_connected = False
        logger.info(f"🔌 {self.client_name} disconnected")
    
    async def subscribe(self, tickers: List[str]) -> bool:
        try:
            for ticker in tickers:
                self.subscribed_tickers.add(ticker.upper())
            await self._send_subscribe()
            return True
        except Exception as e:
            logger.error(f"❌ {self.client_name} subscription failed: {e}")
            return False
    
    async def unsubscribe(self, tickers: List[str]) -> bool:
        try:
            for ticker in tickers:
                self.subscribed_tickers.discard(ticker.upper())
            await self._send_subscribe()
            return True
        except Exception as e:
            logger.error(f"❌ {self.client_name} unsubscription failed: {e}")
            return False
    
    async def run(self):
        backoff = 1
        self.is_running = True
        logger.info(f"🚀 {self.client_name} started with {len(self.subscribed_tickers)} tickers")
        while self.is_running:
            try:
                if not self._ws:
                    ok = await self.connect()
                    if not ok:
                        await asyncio.sleep(min(backoff, 30))
                        backoff = min(backoff * 2, 60)
                        continue
                    backoff = 1
                try:
                    raw = await asyncio.wait_for(self._ws.recv(), timeout=30)
                except asyncio.TimeoutError:
                    await self._send_subscribe()
                    continue
                await self._handle_message(raw)
            except Exception as e:
                logger.warning(f"⚠️ {self.client_name} ws error: {e}")
                await self.disconnect()
                await asyncio.sleep(min(backoff, 30))
                backoff = min(backoff * 2, 60)
        logger.info(f"🛑 {self.client_name} stopped")
    
    async def _send_subscribe(self):
        if not self._ws or not self.subscribed_tickers:
            return
        # Alpaca는 채널별 구독 형식. trades(T), quotes(Q), bars(B) 등
        try:
            await self._ws.send(json.dumps({"action": "subscribe", "trades": sorted(list(self.subscribed_tickers))}))
            logger.info(f"📋 {self.client_name} subscribed trades: {sorted(list(self.subscribed_tickers))}")
        except Exception as e:
            logger.warning(f"❌ subscribe send failed: {e}")
    
    async def _handle_message(self, raw: str):
        try:
            msg = json.loads(raw)
        except Exception:
            logger.debug(f"{self.client_name} non-json message: {raw}")
            return
        # 메시지는 리스트 형태로 배달되는 경우가 많음
        if isinstance(msg, list):
            for item in msg:
                await self._handle_alpaca_item(item)
            return
        if isinstance(msg, dict):
            await self._handle_alpaca_item(msg)
    
    async def _handle_alpaca_item(self, item: dict):
        # trade 이벤트 타입은 'T'
        try:
            if item.get('T') == 't':  # trade
                symbol = item.get('S')
                price = item.get('p')
                size = item.get('s')
                ts = item.get('t')  # RFC3339 또는 epoch ns
                ts_ms = None
                try:
                    # epoch ns → ms
                    if isinstance(ts, int):
                        ts_ms = int(ts / 1_000_000)
                    else:
                        ts_ms = None
                except Exception:
                    ts_ms = None
                await self._store_to_redis({
                    'symbol': symbol,
                    'price': float(price) if price is not None else None,
                    'volume': float(size) if size is not None else None,
                    'timestamp': ts_ms,
                    'provider': self.client_name,
                })
        except Exception as e:
            logger.debug(f"parse/store error: {e}")

    def _build_redis_url(self) -> str:
        host = os.getenv('REDIS_HOST', 'redis')
        port = os.getenv('REDIS_PORT', '6379')
        db = os.getenv('REDIS_DB', '0')
        password = os.getenv('REDIS_PASSWORD', '')
        if password:
            return f"redis://:{password}@{host}:{port}/{db}"
        return f"redis://{host}:{port}/{db}"

    async def _get_redis(self):
        if self._redis is None:
            self._redis = await redis.from_url(self._redis_url)
        return self._redis

    async def _store_to_redis(self, data: dict):
        """Redis에 데이터 저장 (표준 스키마)"""
        try:
            r = await self._get_redis()
            stream_key = 'alpaca:realtime'
            entry = {
                'symbol': str(data.get('symbol', '')),
                'price': str(data.get('price', '')),
                'volume': str(data.get('volume', '')),
                'raw_timestamp': str(data.get('timestamp', '')),
                'provider': 'alpaca',
            }
            await r.xadd(stream_key, entry)
        except Exception as e:
            logger.error(f"❌ {self.client_name} redis store error: {e}")

    async def _perform_health_check(self) -> bool:
        """헬스체크: WebSocket 연결 상태 기준"""
        return bool(self.is_connected and self._ws is not None)
