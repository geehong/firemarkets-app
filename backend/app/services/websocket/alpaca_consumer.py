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
from app.core.api_key_fallback_manager import APIKeyFallbackManager
# websocket_log_service removed - using file logging only

logger = logging.getLogger(__name__)

class AlpacaWSConsumer(BaseWSConsumer):
    """Alpaca WebSocket Consumer (Real)"""
    
    def __init__(self, config: ConsumerConfig):
        super().__init__(config)
        # API 키 Fallback 매니저 초기화
        self.api_key_manager = APIKeyFallbackManager("alpaca")
        self.current_key_info = None
        
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
        # 동시성 제어를 위한 락
        self._run_lock = asyncio.Lock()
        self._recv_lock = asyncio.Lock()
        self._is_running_task = False
        self.last_save_time = 0
    
    @property
    def client_name(self) -> str:
        return "alpaca"
    
    @property
    def api_key(self) -> Optional[str]:
        if self.current_key_info and 'key' in self.current_key_info:
            return self.current_key_info['key']
        return None
    
    @property
    def secret_key(self) -> Optional[str]:
        if self.current_key_info and 'secret' in self.current_key_info:
            return self.current_key_info['secret']
        return None
    
    async def connect(self) -> bool:
        """WebSocket 연결 (API 키 Fallback 지원)"""
        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                # 현재 API 키 정보 가져오기
                self.current_key_info = self.api_key_manager.get_current_key()
                if not self.current_key_info:
                    # 환경 변수에서 직접 읽기
                    import os
                    api_key = os.getenv("ALPACA_API_KEY")
                    secret_key = os.getenv("ALPACA_SECRET_KEY")
                    if api_key and secret_key:
                        self.current_key_info = {
                            "key": api_key,
                            "secret": secret_key,
                            "priority": 1,
                            "is_active": True
                        }
                        logger.info(f"🔑 Using Alpaca API key from environment variables")
                    else:
                        logger.error("❌ No active Alpaca API keys available")
                        return False
                
                # API 키 정보가 딕셔너리가 아닌 경우 처리
                if not isinstance(self.current_key_info, dict):
                    logger.error(f"❌ Invalid API key format: {type(self.current_key_info)}")
                    # 리스트인 경우 첫 번째 요소 사용
                    if isinstance(self.current_key_info, list) and len(self.current_key_info) > 0:
                        self.current_key_info = self.current_key_info[0]
                        logger.info(f"🔄 Using first API key from list: {type(self.current_key_info)}")
                    else:
                        retry_count += 1
                        continue
                
                if not self.api_key or not self.secret_key:
                    logger.error("❌ alpaca api/secret not set")
                    failed_key = self.current_key_info.get('key', 'unknown') if self.current_key_info else "unknown"
                    self.api_key_manager.mark_key_failed(self.current_key_info)
                    
                    # API 키 fallback 로그
                    from app.services.websocket_orchestrator import log_api_key_fallback, log_consumer_connection_attempt
                    log_api_key_fallback(
                        self.client_name, 
                        failed_key, 
                        "fallback_attempt", 
                        "API key or secret not set"
                    )
                    log_consumer_connection_attempt(self.client_name, retry_count + 1, max_retries, "API key or secret not set")
                    
                    retry_count += 1
                    continue
                
                logger.info(f"🔑 Using Alpaca API key: {self.api_key_manager.get_key_info_for_logging()}")
                
                # 연결 시도 로그
                from app.services.websocket_orchestrator import log_consumer_connection_attempt
                log_consumer_connection_attempt(self.client_name, retry_count + 1, max_retries)
                
                self._ws = await asyncio.wait_for(
                    websockets.connect(self.ws_url, ping_interval=20, ping_timeout=20),
                    timeout=60.0  # 60초 타임아웃
                )
                
                # Consume welcome message: [{"T":"success","msg":"connected"}]
                welcome_msg = await asyncio.wait_for(self._ws.recv(), timeout=10)
                logger.debug(f"Alpaca welcome message: {welcome_msg}")
                
                # 인증 전송
                await self._ws.send(json.dumps({"action": "auth", "key": self.api_key, "secret": self.secret_key}))
                
                # Read auth response: [{"T":"success","msg":"authenticated"}]
                resp = await asyncio.wait_for(self._ws.recv(), timeout=10)
                try:
                    auth_msg = json.loads(resp)
                except Exception:
                    auth_msg = resp
                
                # 인증 실패 확인
                # Alpaca auth response can be a list or a dict
                is_auth_success = False
                if isinstance(auth_msg, list) and len(auth_msg) > 0:
                    first_msg = auth_msg[0]
                    if first_msg.get('T') == 'success' and first_msg.get('msg') == 'authenticated':
                        is_auth_success = True
                elif isinstance(auth_msg, dict):
                    if auth_msg.get('T') == 'success' and auth_msg.get('msg') == 'authenticated':
                        is_auth_success = True
                
                if not is_auth_success:
                    logger.error(f"❌ Alpaca authentication failed: {auth_msg}")
                    failed_key = self.current_key_info.get('key', 'unknown') if self.current_key_info and isinstance(self.current_key_info, dict) else "unknown"
                    self.api_key_manager.mark_key_failed(self.current_key_info)
                    
                    # 에러 메시지 추출
                    error_detail = "Unknown error"
                    if isinstance(auth_msg, list) and len(auth_msg) > 0:
                        error_detail = auth_msg[0].get('msg', 'Unknown error')
                    elif isinstance(auth_msg, dict):
                        error_detail = auth_msg.get('msg', 'Unknown error')
                    elif isinstance(auth_msg, str):
                        error_detail = auth_msg
                    
                    # API 키 fallback 로그
                    from app.services.websocket_orchestrator import log_api_key_fallback, log_consumer_connection_attempt
                    log_api_key_fallback(
                        self.client_name, 
                        failed_key, 
                        "fallback_attempt", 
                        f"Authentication failed: {error_detail}"
                    )
                    log_consumer_connection_attempt(self.client_name, retry_count + 1, max_retries, f"Authentication failed: {error_detail}")
                    
                    retry_count += 1
                    continue
                
                logger.info(f"alpaca auth response: {auth_msg}")
                self.is_connected = True
                self.connection_errors = 0
                logger.info(f"✅ {self.client_name} connected with key: {self.api_key_manager.get_key_info_for_logging()}")
                # 구독 초기화
                await self._send_subscribe()
                return True
            except Exception as e:
                error_msg = str(e) if e else "Unknown connection error"
                logger.error(f"❌ {self.client_name} connection failed: {error_msg}")
                logger.error(f"❌ {self.client_name} error type: {type(e).__name__}")
                failed_key = self.current_key_info.get('key', 'unknown') if self.current_key_info else "unknown"
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
            # 연결 상태를 먼저 False로 설정하여 추가 recv() 호출 방지
            self.is_connected = False
            
            if self._ws is not None:
                await self._ws.close()
        except Exception:
            pass
        self._ws = None
        self.is_connected = False
        logger.info(f"🔌 {self.client_name} disconnected")
    
    async def _safe_recv(self):
        """동시성 문제를 방지하는 안전한 recv() 메서드"""
        async with self._recv_lock:
            if self._ws is None or self._ws.closed:
                raise websockets.exceptions.ConnectionClosed(None, None)
            
            # 추가적인 연결 상태 확인
            if not self.is_connected:
                raise websockets.exceptions.ConnectionClosed(None, None)
                
            return await self._ws.recv()
    
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
        # 동시성 제어: 이미 실행 중이면 중복 실행 방지
        async with self._run_lock:
            if self._is_running_task:
                logger.warning(f"⚠️ {self.client_name} already running, skipping duplicate execution")
                return
            
            self._is_running_task = True
            
            if not self.is_connected:
                logger.error(f"❌ {self.client_name} not connected")
                self._is_running_task = False
                return
            
            self.is_running = True
            logger.info(f"🚀 {self.client_name} started with {len(self.subscribed_tickers)} tickers")
            
            # 수신 주기 설정 (기본 15초)
            self.consumer_interval = int(GLOBAL_APP_CONFIGS.get("WEBSOCKET_CONSUMER_INTERVAL_SECONDS", 15))
            logger.info(f"⏰ {self.client_name} 저장 주기: {self.consumer_interval}초")
            
            max_reconnect_attempts = 5
            reconnect_attempts = 0
            reconnect_delay = 30  # 5초 → 30초로 증가
            
            # 메인 실행 루프 (재연결 포함)
            try:
                while self.is_running:
                    try:
                        # 연결이 끊어진 경우 재연결 시도
                        if not self.is_connected and reconnect_attempts < max_reconnect_attempts:
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
                                        reconnect_attempts = 0  # 재연결 시도 횟수 리셋
                                        continue  # 메인 루프로 돌아가서 계속 실행
                                    else:
                                        logger.error(f"❌ {self.client_name} failed to resubscribe after reconnection")
                                else:
                                    logger.warning(f"⚠️ {self.client_name} no original tickers to resubscribe")
                                    reconnect_attempts = 0  # 재연결 시도 횟수 리셋
                                    continue  # 메인 루프로 돌아가서 계속 실행
                            
                            logger.error(f"❌ {self.client_name} reconnection failed")
                            continue
                        
                        # 연결되지 않은 상태면 대기
                        if not self.is_connected:
                            await asyncio.sleep(5)
                            continue
                        
                        # 메시지 수신 루프
                        while self.is_running and self.is_connected:
                            try:
                                # 안전한 메시지 수신
                                raw = await asyncio.wait_for(self._safe_recv(), timeout=30.0)
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
                                
                    except Exception as e:
                        logger.error(f"❌ {self.client_name} main loop error: {e}")
                        self.is_connected = False
                        
            finally:
                self.is_running = False
                self._is_running_task = False
                logger.info(f"🛑 {self.client_name} stopped")
    
    async def _send_subscribe(self):
        if not self._ws or not self.subscribed_tickers:
            return
        # Alpaca는 채널별 구독 형식. trades(T), quotes(Q), bars(B) 등
        try:
            tickers = sorted(list(self.subscribed_tickers))
            subscribe_msg = {
                "action": "subscribe", 
                "trades": tickers
            }
            await self._ws.send(json.dumps(subscribe_msg))
            logger.info(f"📋 {self.client_name} subscribed trades/quotes: {tickers}")
        except Exception as e:
            logger.warning(f"❌ subscribe send failed: {e}")
    
    async def _handle_message(self, raw: str):
        try:
            msg = json.loads(raw)
        except Exception:
            logger.debug(f"{self.client_name} non-json message: {raw}")
            return
        
        # 폐장 시간 디버깅을 위한 로깅 추가
        if isinstance(msg, list) and msg and msg[0].get('T') == 'subscription':
             logger.info(f"📨 {self.client_name} subscription confirmation received")
        else:
             logger.info(f"📨 {self.client_name} received message: {msg}")
        
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
                logger.info(f"💾 {self.client_name} stored: {symbol} = ${price}")
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
