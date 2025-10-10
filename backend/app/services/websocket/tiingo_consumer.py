"""
Tiingo WebSocket Consumer 구현 (Real)
"""
import asyncio
import json
import logging
import time
from typing import List, Optional
import os
import websockets
import redis.asyncio as redis
from datetime import datetime
from app.services.websocket.base_consumer import BaseWSConsumer, ConsumerConfig
from app.core.config import GLOBAL_APP_CONFIGS
from app.core.websocket_logging import WebSocketLogger
from app.core.api_key_fallback_manager import APIKeyFallbackManager
# websocket_log_service removed - using file logging only

logger = logging.getLogger(__name__)

class TiingoWSConsumer(BaseWSConsumer):
    """Tiingo WebSocket Consumer (Real)"""
    
    def __init__(self, config: ConsumerConfig):
        super().__init__(config)
        # API 키 Fallback 매니저 초기화
        self.api_key_manager = APIKeyFallbackManager("tiingo")
        self.current_key_info = None
        self._cooldown_until: float = 0.0
        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        self._recv_task: Optional[asyncio.Task] = None
        # Redis
        self._redis = None
        self._redis_url = self._build_redis_url()
        # 새로운 로깅 시스템
        self.ws_logger = WebSocketLogger("tiingo")
    
    @property
    def client_name(self) -> str:
        return "tiingo"
    
    @property
    def api_key(self) -> Optional[str]:
        if self.current_key_info and 'key' in self.current_key_info:
            return self.current_key_info['key']
        return None
    
    @property
    def ws_url(self) -> str:
        if self.api_key:
            return f"wss://api.tiingo.com/iex?token={self.api_key}"
        return "wss://api.tiingo.com/iex"
    
    
    async def connect(self) -> bool:
        """WebSocket 연결 (API 키 Fallback 지원)"""
        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                # 현재 API 키 정보 가져오기
                self.current_key_info = self.api_key_manager.get_current_key()
                if not self.current_key_info:
                    logger.error("❌ No active Tiingo API keys available")
                    return False
                
                if not self.api_key:
                    logger.error("❌ Tiingo API key not configured")
                    self.api_key_manager.mark_key_failed(self.current_key_info)
                    retry_count += 1
                    continue
                
                logger.info(f"🔑 Using Tiingo API key: {self.api_key_manager.get_key_info_for_logging()}")
                
                # 연결 시도 로그
                from app.services.websocket_orchestrator import log_consumer_connection_attempt
                log_consumer_connection_attempt(self.client_name, retry_count + 1, max_retries)
                
                # Disable periodic pings to avoid certain providers closing with 1005
                self._ws = await websockets.connect(
                    self.ws_url,
                    ping_interval=None,
                    close_timeout=10,
                    max_size=2**20,
                )
                self.is_connected = True
                self.connection_errors = 0
                logger.info(f"✅ {self.client_name} connected successfully with key: {self.api_key_manager.get_key_info_for_logging()}")
                # 초기 구독 전송
                await self._send_subscribe()
                return True
            except Exception as e:
                logger.error(f"❌ {self.client_name} connection failed: {e}")
                failed_key = self.current_key_info['key'] if self.current_key_info else "unknown"
                self.api_key_manager.mark_key_failed(self.current_key_info)
                
                # API 키 fallback 로그
                from app.services.websocket_orchestrator import log_api_key_fallback, log_consumer_connection_attempt
                log_api_key_fallback(
                    self.client_name, 
                    failed_key, 
                    "fallback_attempt", 
                    f"Connection failed: {str(e)}"
                )
                log_consumer_connection_attempt(self.client_name, retry_count + 1, max_retries, f"Connection failed: {str(e)}")
                
                retry_count += 1
                continue
        
        # 모든 재시도 실패
        logger.error(f"❌ {self.client_name} connection failed after {max_retries} attempts")
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
        """티커 구독 (실제)"""
        try:
            for ticker in tickers:
                self.subscribed_tickers.add(ticker.upper())
            await self._send_subscribe()
            return True
        except Exception as e:
            logger.error(f"❌ {self.client_name} subscription failed: {e}")
            return False
    
    async def unsubscribe(self, tickers: List[str]) -> bool:
        """티커 구독 해제"""
        try:
            for ticker in tickers:
                self.subscribed_tickers.discard(ticker.upper())
            await self._send_subscribe()
            return True
        except Exception as e:
            logger.error(f"❌ {self.client_name} unsubscription failed: {e}")
            return False
    
    async def run(self):
        """메인 실행 루프 - 단일 recv 루프 보장"""
        backoff = 1
        self.is_running = True
        logger.info(f"🚀 {self.client_name} started with {len(self.subscribed_tickers)} tickers")
        
        # 수신 주기 설정 (기본 15초)
        self.consumer_interval = int(GLOBAL_APP_CONFIGS.get("WEBSOCKET_CONSUMER_INTERVAL_SECONDS", 15))
        self.last_save_time = time.time()
        logger.info(f"⏰ {self.client_name} 저장 주기: {self.consumer_interval}초")
        
        while self.is_running:
            try:
                # Respect cooldown after quota/bandwidth errors
                now = time.time()
                if now < self._cooldown_until:
                    await asyncio.sleep(min(60, self._cooldown_until - now))
                    continue
                if not self._ws:
                    ok = await self.connect()
                    if not ok:
                        await asyncio.sleep(min(backoff, 30))
                        backoff = min(backoff * 2, 60)
                        continue
                    backoff = 1
                # 수신 루프
                try:
                    # 단일 recv 루프에서만 수신하도록 보장
                    raw = await asyncio.wait_for(self._ws.recv(), timeout=30)
                except asyncio.TimeoutError:
                    # Heartbeat: 구독 재전송으로 연결 유지
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
        if not self._ws or not self.api_key:
            return
        if not self.subscribed_tickers:
            return
        payload = {
            "eventName": "subscribe",
            "eventData": {
                "authToken": self.api_key,
                "tickers": sorted(list(self.subscribed_tickers)),
            },
        }
        try:
            await self._ws.send(json.dumps(payload))
            logger.info(f"📋 {self.client_name} subscribed to {sorted(list(self.subscribed_tickers))}")
        except Exception as e:
            logger.warning(f"❌ subscribe send failed: {e}")
    
    async def _handle_message(self, raw: str):
        try:
            msg = json.loads(raw)
        except Exception:
            logger.debug(f"{self.client_name} non-json message: {raw}")
            return
        
        mtype = msg.get("messageType")
        if mtype == "H":
            return
        if mtype in ("I", "E"):
            # Log Tiingo info/error payloads for troubleshooting (e.g., auth/token issues)
            level = logger.warning if mtype == "E" else logger.info
            level(f"{self.client_name} {mtype}: {msg}")
            # If bandwidth/quota exceeded, back off for 10 minutes
            try:
                if mtype == "E":
                    code = int(((msg or {}).get("response") or {}).get("code") or 0)
                    if code == 403:
                        self._cooldown_until = time.time() + 600  # 10 minutes
                        await self.disconnect()
            except Exception:
                pass
            return
        
        # 저장 주기 체크 (데이터 메시지만)
        data = msg.get("data")
        if data:
            current_time = time.time()
            if current_time - self.last_save_time < self.consumer_interval:
                # 아직 저장 시간이 되지 않았으면 메시지만 받고 저장하지 않음
                return
            
            # 저장 시간이 되었으면 데이터 처리
            self.last_save_time = current_time
            
            if isinstance(data, dict):
                await self._store_from_tiingo_item(data)
            elif isinstance(data, list):
                for item in data:
                    await self._store_from_tiingo_item(item)
    
    async def _store_from_tiingo_item(self, item: dict):
        try:
            ticker = (item.get("ticker") or item.get("symbol") or "").upper()
            if not ticker:
                return
            price = item.get("last") or item.get("price") or item.get("close")
            volume = item.get("volume")
            ts_ms = int(datetime.utcnow().timestamp() * 1000)
            await self._store_to_redis({
                'symbol': ticker,
                'price': float(price) if price is not None else None,
                'volume': float(volume) if volume is not None else None,
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
            stream_key = 'tiingo:realtime'
            entry = {
                'symbol': str(data.get('symbol', '')),
                'price': str(data.get('price', '')),
                'volume': str(data.get('volume', '')),
                'raw_timestamp': str(data.get('timestamp', '')),
                'provider': 'tiingo',
            }
            await r.xadd(stream_key, entry, maxlen=100000, approximate=True)
        except Exception as e:
            logger.error(f"❌ {self.client_name} redis store error: {e}")

    async def _perform_health_check(self) -> bool:
        """헬스체크: WebSocket 연결 상태 기준"""
        return bool(self.is_connected and self._ws is not None)
