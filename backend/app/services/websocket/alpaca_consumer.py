"""
Alpaca WebSocket Consumer 구현 (Real)
"""
import asyncio
import json
import logging
import time
from typing import List, Optional
import os
import websockets
import redis.asyncio as redis
from app.services.websocket.base_consumer import BaseWSConsumer, ConsumerConfig
from app.core.config import GLOBAL_APP_CONFIGS
from app.core.websocket_logging import WebSocketLogger
from app.services.websocket_log_service import websocket_log_service

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
        # 새로운 로깅 시스템
        self.ws_logger = WebSocketLogger("alpaca")
        # 재연결을 위한 원래 티커 목록 저장
        self.original_tickers = set()
        self.subscribed_tickers = []  # 구독 순서 보장을 위해 List 사용
    
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
            logger.error(f"❌ {self.client_name} connection details: api_key={self.api_key[:10]}..., secret_key={'***' if self.secret_key else 'None'}, ws_url={self.ws_url}")
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
    
    async def subscribe(self, tickers: List[str], skip_normalization: bool = False) -> bool:
        try:
            # 원래 티커 목록 저장 (정규화 전)
            if not skip_normalization:
                self.original_tickers = set(tickers)
                self.subscribed_tickers = []  # 재구독 시 초기화
            
            for ticker in tickers:
                if skip_normalization:
                    # 재연결 시에는 정규화 건너뛰기
                    norm = ticker
                else:
                    # 처음 구독 시에는 정규화 수행
                    norm = ticker.upper()
                
                self.subscribed_tickers.append(norm)  # List로 순서 보장
                logger.info(f"📋 {self.client_name} subscribed to {norm}")
            
            await self._send_subscribe()
            return True
        except Exception as e:
            logger.error(f"❌ {self.client_name} subscription failed: {e}")
            return False
    
    async def unsubscribe(self, tickers: List[str]) -> bool:
        try:
            for ticker in tickers:
                # List에서 제거
                if ticker.upper() in self.subscribed_tickers:
                    self.subscribed_tickers.remove(ticker.upper())
            await self._send_subscribe()
            return True
        except Exception as e:
            logger.error(f"❌ {self.client_name} unsubscription failed: {e}")
            return False
    
    async def run(self):
        """메인 실행 루프 - 연결 상태 관리 개선"""
        if not self.is_connected:
            logger.error(f"❌ {self.client_name} not connected")
            return
        
        self.is_running = True
        logger.info(f"🚀 {self.client_name} started with {len(self.subscribed_tickers)} tickers")
        
        # 수신 주기 설정 (기본 15초)
        self.consumer_interval = int(GLOBAL_APP_CONFIGS.get("WEBSOCKET_CONSUMER_INTERVAL_SECONDS", 15))
        self.last_save_time = time.time()
        logger.info(f"⏰ {self.client_name} 저장 주기: {self.consumer_interval}초")
        
        max_reconnect_attempts = 5
        reconnect_attempts = 0
        reconnect_delay = 5
        
        try:
            while self.is_running and self.is_connected:
                try:
                    # 메시지 수신
                    raw = await asyncio.wait_for(self._ws.recv(), timeout=30.0)
                    await self._handle_message(raw)
                    reconnect_attempts = 0  # 성공 시 리셋
                    
                except asyncio.TimeoutError:
                    # 타임아웃 시 구독 갱신
                    await self._send_subscribe()
                    continue
                    
                except websockets.exceptions.ConnectionClosed:
                    logger.warning(f"⚠️ {self.client_name} connection closed")
                    self.is_connected = False
                    break
                    
                except Exception as e:
                    logger.warning(f"⚠️ {self.client_name} ws error: {e}")
                    self.is_connected = False
                    break
            
            # 연결이 끊어진 경우 재연결 시도
            if not self.is_connected and self.is_running and reconnect_attempts < max_reconnect_attempts:
                reconnect_attempts += 1
                logger.info(f"🔄 {self.client_name} attempting reconnection {reconnect_attempts}/{max_reconnect_attempts}")
                
                # 재연결 대기
                await asyncio.sleep(reconnect_delay)
                reconnect_delay = min(reconnect_delay * 1.5, 30)
                
                # 재연결 시도
                if await self.connect():
                    # 재연결 성공 시 원래 티커 목록으로 구독 복원
                    if self.original_tickers:
                        if await self.subscribe(list(self.original_tickers), skip_normalization=True):
                            logger.info(f"✅ {self.client_name} reconnected and resubscribed to {len(self.original_tickers)} tickers")
                            # 재연결 성공 시 다시 실행
                            await self.run()
                            return
                        else:
                            logger.error(f"❌ {self.client_name} failed to resubscribe after reconnection")
                    else:
                        logger.warning(f"⚠️ {self.client_name} no original tickers to resubscribe")
                        # 재연결 성공 시 다시 실행
                        await self.run()
                        return
                
                logger.error(f"❌ {self.client_name} reconnection failed")
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} run error: {e}")
        finally:
            self.is_running = False
            logger.info(f"🛑 {self.client_name} stopped")
    
    async def _send_subscribe(self):
        if not self._ws or not self.subscribed_tickers:
            return
        # Alpaca는 채널별 구독 형식. trades(T), quotes(Q), bars(B) 등
        try:
            tickers = sorted(list(self.subscribed_tickers))
            # 폐장 시간에도 데이터를 받기 위해 quotes와 bars도 구독
            subscribe_msg = {
                "action": "subscribe", 
                "trades": tickers,
                "quotes": tickers,
                "bars": tickers
            }
            await self._ws.send(json.dumps(subscribe_msg))
            logger.info(f"📋 {self.client_name} subscribed trades/quotes/bars: {tickers}")
        except Exception as e:
            logger.warning(f"❌ subscribe send failed: {e}")
    
    async def _handle_message(self, raw: str):
        try:
            msg = json.loads(raw)
        except Exception:
            logger.debug(f"{self.client_name} non-json message: {raw}")
            return
        
        # 폐장 시간 디버깅을 위한 로깅 추가
        logger.debug(f"📨 {self.client_name} received message: {msg}")
        
        # 저장 주기 체크
        current_time = time.time()
        if current_time - self.last_save_time < self.consumer_interval:
            # 아직 저장 시간이 되지 않았으면 메시지만 받고 저장하지 않음
            logger.debug(f"⏰ {self.client_name} skipping message due to interval ({current_time - self.last_save_time:.1f}s < {self.consumer_interval}s)")
            return
        
        # 저장 시간이 되었으면 데이터 처리
        self.last_save_time = current_time
        logger.debug(f"✅ {self.client_name} processing message after interval")
        
        # 메시지는 리스트 형태로 배달되는 경우가 많음
        if isinstance(msg, list):
            for item in msg:
                await self._handle_alpaca_item(item)
            return
        if isinstance(msg, dict):
            await self._handle_alpaca_item(msg)
    
    async def _handle_alpaca_item(self, item: dict):
        try:
            msg_type = item.get('T')
            symbol = item.get('S')
            
            # 다양한 메시지 타입 처리
            if msg_type == 't':  # trade
                price = item.get('p')
                size = item.get('s')
                ts = item.get('t')
                logger.debug(f"📈 {self.client_name} trade: {symbol} = ${price} (vol: {size})")
            elif msg_type == 'q':  # quote
                bid = item.get('bp')
                ask = item.get('ap')
                logger.debug(f"📊 {self.client_name} quote: {symbol} bid=${bid} ask=${ask}")
                # quote의 경우 중간가격 사용
                if bid is not None and ask is not None:
                    price = (float(bid) + float(ask)) / 2
                else:
                    price = None
                size = None
                ts = item.get('t')
            elif msg_type == 'b':  # bar (1분 캔들)
                close = item.get('c')
                volume = item.get('v')
                logger.debug(f"📊 {self.client_name} bar: {symbol} close=${close} vol={volume}")
                price = close
                size = volume
                ts = item.get('t')
            else:
                logger.debug(f"📨 {self.client_name} unknown message type: {msg_type} for {symbol}")
                return
            
            # 타임스탬프 처리
            ts_ms = None
            try:
                if isinstance(ts, int):
                    ts_ms = int(ts / 1_000_000)  # epoch ns → ms
                elif isinstance(ts, str):
                    # RFC3339 형식 처리
                    from datetime import datetime
                    dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                    ts_ms = int(dt.timestamp() * 1000)
            except Exception as e:
                logger.debug(f"⏰ {self.client_name} timestamp parse error: {e}")
                ts_ms = None
            
            # 유효한 가격 데이터가 있을 때만 저장
            if symbol and price is not None:
                await self._store_to_redis({
                    'symbol': symbol,
                    'price': float(price),
                    'volume': float(size) if size is not None else None,
                    'timestamp': ts_ms,
                    'provider': self.client_name,
                })
                logger.debug(f"💾 {self.client_name} stored: {symbol} = ${price}")
            else:
                logger.debug(f"⚠️ {self.client_name} invalid data: symbol={symbol}, price={price}")
                
        except Exception as e:
            logger.error(f"❌ {self.client_name} item processing error: {e}")
            logger.debug(f"🔍 Problematic item: {item}")

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
