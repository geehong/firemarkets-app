"""
Finnhub WebSocket Consumer 구현
"""
import asyncio
import json
import logging
import time
import websockets
from typing import List, Optional
import os
import redis.asyncio as redis
from app.services.websocket.base_consumer import BaseWSConsumer, ConsumerConfig, AssetType
from app.core.config import GLOBAL_APP_CONFIGS
from app.core.websocket_logging import WebSocketLogger
from app.core.api_key_fallback_manager import APIKeyFallbackManager
# websocket_log_service removed - using file logging only

logger = logging.getLogger(__name__)

class FinnhubWSConsumer(BaseWSConsumer):
    """Finnhub WebSocket Consumer"""
    
    def __init__(self, config: ConsumerConfig):
        super().__init__(config)
        # API 키 Fallback 매니저 초기화
        self.api_key_manager = APIKeyFallbackManager("finnhub")
        self.current_key_info = None
        self.websocket = None
        self._receive_task = None
        # Redis
        self._redis = None
        self._redis_url = self._build_redis_url()
        # 새로운 로깅 시스템
        self.ws_logger = WebSocketLogger("finnhub")
        # 재연결을 위한 원래 티커 목록 저장
        self.original_tickers = set()
        self.subscribed_tickers = []  # 구독 순서 보장을 위해 List 사용
        # Throttling: 티커별 마지막 저장 시간 (CPU 절약용)
        self._last_save_times: dict = {}  # {symbol: timestamp}
        # Redis 저장 주기 (기본 1초 - 실시간 유지, CPU만 절약)
        # DB 저장 throttle은 data_processor에서 처리
        self._save_interval = float(os.getenv("WEBSOCKET_REDIS_SAVE_INTERVAL", "0.2"))
    
    @property
    def client_name(self) -> str:
        return "finnhub"
    
    @property
    def api_key(self) -> Optional[str]:
        if self.current_key_info and 'key' in self.current_key_info:
            return self.current_key_info['key']
        return None
    
    @property
    def ws_url(self) -> str:
        if self.api_key:
            return f"wss://ws.finnhub.io?token={self.api_key}"
        return ""
    
    
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
                    api_key = os.getenv("FINNHUB_API_KEY")
                    if api_key:
                        self.current_key_info = {
                            "key": api_key,
                            "priority": 1,
                            "is_active": True
                        }
                        logger.info(f"🔑 Using Finnhub API key from environment variables")
                    else:
                        logger.error("❌ No active Finnhub API keys available")
                        return False
                
                if not self.api_key:
                    logger.error("❌ Finnhub API key not configured")
                    self.api_key_manager.mark_key_failed(self.current_key_info)
                    retry_count += 1
                    continue
                
                logger.info(f"🔑 Using Finnhub API key: {self.api_key_manager.get_key_info_for_logging()}")
                
                # 연결 시도 로그
                from app.services.websocket_orchestrator import log_consumer_connection_attempt
                log_consumer_connection_attempt(self.client_name, retry_count + 1, max_retries)
                
                # 기존 연결이 있으면 먼저 닫기 (finnhub는 1 API key당 1개 연결만 허용)
                if self.websocket and not self.websocket.closed:
                    logger.info(f"🔌 {self.client_name} closing existing connection before reconnecting")
                    try:
                        await self.websocket.close()
                    except Exception as e:
                        logger.warning(f"⚠️ {self.client_name} error closing existing connection: {e}")
                    self.websocket = None
                    self.is_connected = False
                
                # 연결 타임아웃 설정 (30초 → 60초로 증가)
                self.websocket = await asyncio.wait_for(
                    websockets.connect(self.ws_url, ping_interval=20, ping_timeout=10),
                    timeout=60.0
                )
                self.is_connected = True
                self.connection_errors = 0
                logger.info(f"✅ {self.client_name} connected successfully with key: {self.api_key_manager.get_key_info_for_logging()}")
                return True
                
            except asyncio.TimeoutError:
                logger.error(f"❌ {self.client_name} connection timeout after 60 seconds")
                failed_key = self.current_key_info.get('key', 'unknown') if self.current_key_info else "unknown"
                self.api_key_manager.mark_key_failed(self.current_key_info)
                
                # API 키 fallback 로그
                from app.services.websocket_orchestrator import log_api_key_fallback, log_consumer_connection_attempt
                log_api_key_fallback(
                    self.client_name, 
                    failed_key, 
                    "fallback_attempt", 
                    "Connection timeout after 60 seconds"
                )
                log_consumer_connection_attempt(self.client_name, retry_count + 1, max_retries, "Connection timeout after 60 seconds")
                
                retry_count += 1
                continue
            except Exception as e:
                error_msg = str(e)
                failed_key = self.current_key_info['key'] if self.current_key_info else "unknown"
                
                if "429" in error_msg or "Too Many Requests" in error_msg:
                    logger.error(f"❌ {self.client_name} connection failed: HTTP 429 - Too Many Requests")
                    logger.warning(f"⚠️ {self.client_name} API rate limit exceeded, will wait longer before retry")
                    
                    # API 키 fallback 로그
                    from app.services.websocket_orchestrator import log_api_key_fallback, log_consumer_connection_attempt
                    log_api_key_fallback(
                        self.client_name, 
                        failed_key, 
                        "fallback_attempt", 
                        "HTTP 429 - Too Many Requests (Rate limit exceeded)"
                    )
                    log_consumer_connection_attempt(self.client_name, retry_count + 1, max_retries, "HTTP 429 - Too Many Requests (Rate limit exceeded)")
                else:
                    logger.error(f"❌ {self.client_name} connection failed: {e}")
                    
                    # API 키 fallback 로그
                    from app.services.websocket_orchestrator import log_api_key_fallback, log_consumer_connection_attempt
                    log_api_key_fallback(
                        self.client_name, 
                        failed_key, 
                        "fallback_attempt", 
                        f"Connection failed: {str(e)}"
                    )
                    log_consumer_connection_attempt(self.client_name, retry_count + 1, max_retries, f"Connection failed: {str(e)}")
                
                self.api_key_manager.mark_key_failed(self.current_key_info)
                retry_count += 1
                continue
        
        # 모든 재시도 실패
        logger.error(f"❌ {self.client_name} connection failed after {max_retries} attempts")
        return False
    
    async def disconnect(self):
        """WebSocket 연결 해제"""
        try:
            if self.websocket:
                await self.websocket.close()
                self.websocket = None
            self.is_connected = False
            logger.info(f"🔌 {self.client_name} disconnected")
        except Exception as e:
            logger.error(f"❌ {self.client_name} disconnect error: {e}")
    
    def _normalize_symbol(self, ticker: str) -> str:
        """Finnhub 심볼 규격으로 정규화
        - 크립토: USDT로 끝나고 접두사가 없으면 'BINANCE:' 접두사 부여
        - 특수 티커 처리: BRK-B -> BRK.B, TCEHY -> TCEHY (중국 주식)
        - 해외 주식: 2222.SR -> 2222.SR (사우디아라비아)
        - 기본: 그대로 반환
        """
        t = (ticker or '').upper().strip()
        if ':' in t:
            return t
        if t.endswith('USDT'):
            return f"BINANCE:{t}"
        
        # 특수 티커 처리
        if t == 'BRK-B':
            return 'BRK.B'  # Finnhub에서 BRK-B는 BRK.B로 표기
        elif t == 'TCEHY':
            return 'TCEHY'  # 중국 주식은 그대로
        elif t == '2222.SR':
            return '2222.SR'  # 사우디아라비아 주식은 그대로
        
        return t

    async def subscribe(self, tickers: List[str], skip_normalization: bool = False) -> bool:
        """티커 구독"""
        try:
            if not self.is_connected or not self.websocket:
                logger.error(f"❌ {self.client_name} not connected")
                return False
            
            # 원래 티커 목록 저장 (정규화 전)
            if not skip_normalization:
                self.original_tickers = set(tickers)
                self.subscribed_tickers = []  # 재구독 시 초기화
            
            logger.info(f"📝 {self.client_name} subscribe start: total={len(tickers)}, skip_normalization={skip_normalization}")
            sent_count = 0
            for ticker in tickers:
                if skip_normalization:
                    # 재연결 시에는 정규화 건너뛰기
                    norm = ticker
                else:
                    # 처음 구독 시에는 정규화 수행
                    norm = self._normalize_symbol(ticker)
                # 정규화 매핑 로그
                if not skip_normalization and norm != ticker:
                    logger.debug(f"🔁 {self.client_name} normalize: {ticker} -> {norm}")
                
                subscribe_msg = {"type": "subscribe", "symbol": norm}
                logger.debug(f"➡️  {self.client_name} send subscribe payload: {subscribe_msg}")
                await self.websocket.send(json.dumps(subscribe_msg))
                self.subscribed_tickers.append(norm)  # List로 순서 보장
                logger.info(f"📋 {self.client_name} subscribed to {norm}")
                sent_count += 1
            
            logger.info(f"✅ {self.client_name} subscribe done: sent={sent_count}, unique_now={len(set(self.subscribed_tickers))}")
            return True
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} subscription failed: {e}")
            return False
    
    async def unsubscribe(self, tickers: List[str]) -> bool:
        """티커 구독 해제"""
        try:
            if not self.is_connected or not self.websocket:
                return False
            
            for ticker in tickers:
                unsubscribe_msg = {"type": "unsubscribe", "symbol": ticker}
                await self.websocket.send(json.dumps(unsubscribe_msg))
                # List에서 제거
                if ticker in self.subscribed_tickers:
                    self.subscribed_tickers.remove(ticker)
                logger.info(f"📋 {self.client_name} unsubscribed from {ticker}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} unsubscription failed: {e}")
            return False
    
    async def run(self):
        """메인 실행 루프 - 메시지 필터링 모드 + 자동 재연결"""
        if not self.is_connected:
            logger.error(f"❌ {self.client_name} not connected")
            return
        
        self.is_running = True
        logger.info(f"🚀 {self.client_name} started with {len(self.subscribed_tickers)} tickers: {self.subscribed_tickers[:20]}{'...' if len(self.subscribed_tickers) > 20 else ''}")
        
        # 수신 주기 설정 (기본 15초)
        self.consumer_interval = int(GLOBAL_APP_CONFIGS.get("WEBSOCKET_CONSUMER_INTERVAL_SECONDS", 15))
        self.last_save_time = time.time()
        logger.info(f"⏰ {self.client_name} 저장 주기: {self.consumer_interval}초")
        
        reconnect_delay = 30  # 재연결 대기 시간 (5초 → 30초로 증가)
        max_reconnect_attempts = 5  # 최대 재연결 시도 횟수를 5회로 설정
        reconnect_attempts = 0
        
        while self.is_running and reconnect_attempts < max_reconnect_attempts:
            try:
                # 메시지 수신 루프 (연결이 끊어져도 계속 시도)
                while self.is_running and self.is_connected:
                    try:
                        # 타임아웃을 설정하여 연결 상태를 주기적으로 확인
                        message = await asyncio.wait_for(self.websocket.recv(), timeout=30.0)
                        
                        try:
                            data = json.loads(message)
                            await self._handle_message(data)
                            # 성공적으로 메시지를 받으면 재연결 시도 횟수 리셋
                            reconnect_attempts = 0
                        except json.JSONDecodeError as e:
                            logger.error(f"❌ {self.client_name} JSON decode error: {e}")
                        except Exception as e:
                            logger.error(f"❌ {self.client_name} message handling error: {e}")
                            
                    except asyncio.TimeoutError:
                        # 타임아웃 시 ping으로 연결 상태 확인
                        try:
                            await self.websocket.ping()
                            logger.debug(f"🏓 {self.client_name} ping successful")
                        except Exception as e:
                            logger.warning(f"⚠️ {self.client_name} ping failed: {e}")
                            self.is_connected = False
                            break
                            
                    except websockets.exceptions.ConnectionClosed:
                        logger.warning(f"⚠️ {self.client_name} connection closed")
                        self.is_connected = False
                        break
                    except Exception as e:
                        logger.error(f"❌ {self.client_name} message receive error: {e}")
                        self.is_connected = False
                        break
                        
            except Exception as e:
                logger.error(f"❌ {self.client_name} run error: {e}")
                self.is_connected = False
            
            # 연결이 끊어진 경우 재연결 시도
            if not self.is_connected and self.is_running:
                reconnect_attempts += 1
                logger.info(f"🔄 {self.client_name} attempting reconnection {reconnect_attempts}/{max_reconnect_attempts}")
                
                # 재연결 대기 (지수 백오프)
                # HTTP 429 오류 시 더 긴 대기 시간 적용
                if reconnect_attempts > 1:  # 2번째 시도부터 30분 대기
                    wait_time = 1800  # 30분 대기 (finnhub 무료 플랜 제한 고려)
                    logger.warning(f"⚠️ {self.client_name} HTTP 429 detected, waiting 30 minutes before retry")
                else:
                    wait_time = reconnect_delay * (2 ** min(reconnect_attempts - 1, 6))  # 더 긴 지수 백오프
                
                await asyncio.sleep(min(wait_time, 1800))  # 최대 30분 대기
                
                # 재연결 시도
                if await self.connect():
                    # 재연결 성공 시 원래 티커 목록으로 구독 복원
                    if self.original_tickers:
                        if await self.subscribe(list(self.original_tickers), skip_normalization=True):
                            logger.info(f"✅ {self.client_name} reconnected and resubscribed to {len(self.original_tickers)} tickers")
                            reconnect_attempts = 0  # 성공 시 리셋
                            reconnect_delay = 30  # 대기 시간 리셋 (5초 → 30초)
                        else:
                            logger.error(f"❌ {self.client_name} failed to resubscribe after reconnection")
                            self.is_connected = False
                    else:
                        logger.warning(f"⚠️ {self.client_name} no original tickers to resubscribe")
                        reconnect_attempts = 0  # 성공 시 리셋
                        reconnect_delay = 30  # 대기 시간 리셋 (5초 → 30초)
                else:
                    logger.error(f"❌ {self.client_name} reconnection failed")
                    # 재연결 실패 시 대기 시간 증가
                    reconnect_delay = min(reconnect_delay * 1.2, 60)
        
        if reconnect_attempts >= max_reconnect_attempts:
            logger.error(f"❌ {self.client_name} max reconnection attempts reached")
        
        self.is_running = False
        logger.info(f"🛑 {self.client_name} stopped")
    
    async def _handle_message(self, data: dict):
        """메시지 처리 - 주기적 저장 필터링"""
        try:
            # 저장 주기 체크 로직 제거 - 모든 메시지 처리
            # current_time = time.time()
            # if current_time - self.last_save_time < self.consumer_interval:
            #     return
            
            # 모든 메시지 처리
            self.last_save_time = time.time()
            
            if data.get('type') == 'trade':
                # 거래 데이터 처리
                trade_data = data.get('data', [])
                for trade in trade_data:
                    await self._process_trade(trade)
            elif data.get('type') == 'quote':
                # 호가 데이터 처리 (간단 저장)
                quote = data
                symbol = quote.get('s')
                bid = quote.get('b')
                ask = quote.get('a')
                ts = quote.get('t')
                if symbol and (bid is not None or ask is not None):
                    # 가격은 중간값으로 저장 (표준 스키마 충족 위해)
                    mid = None
                    try:
                        if bid is not None and ask is not None:
                            mid = (float(bid) + float(ask)) / 2.0
                        elif bid is not None:
                            mid = float(bid)
                        elif ask is not None:
                            mid = float(ask)
                    except Exception:
                        mid = None
                    if mid is not None:
                        await self._store_to_redis({
                            'symbol': symbol,
                            'price': mid,
                            'volume': None,
                            'timestamp': ts,
                            'provider': self.client_name,
                        })
            elif data.get('type') == 'ping':
                # Ping 응답
                pong_msg = {"type": "pong"}
                await self.websocket.send(json.dumps(pong_msg))
            else:
                logger.debug(f"📨 {self.client_name} received: {data}")
                
        except Exception as e:
            logger.error(f"❌ {self.client_name} message processing error: {e}")
            # 메시지 처리 오류가 발생해도 연결은 유지
    
    async def _process_trade(self, trade: dict):
        """거래 데이터 처리 (throttling 적용)"""
        try:
            symbol = trade.get('s')
            price = trade.get('p')
            volume = trade.get('v')
            timestamp = trade.get('t')
            
            if not symbol or not price:
                return
            
            # Throttling: 티커별 저장 주기 제한 (CPU 절약)
            current_time = time.time()
            last_save = self._last_save_times.get(symbol, 0)
            if current_time - last_save < self._save_interval:
                return  # 저장 간격 내에 있으면 건너뜀
            
            self._last_save_times[symbol] = current_time
            
            # Redis에 데이터 저장
            await self._store_to_redis({
                'symbol': symbol,
                'price': price,
                'volume': volume,
                'timestamp': timestamp,
                'provider': self.client_name
            })
            
            if symbol in ['MSFT', 'NVDA', 'AAPL', 'GOOG', 'PLTR', 'LLY', 'V', 'MA', 'AMX', 'BIDU']:
                logger.info(f"📈 [DEBUG-FH-RECV] {self.client_name} {symbol}: ${price} (Vol: {volume})")
                
        except Exception as e:
            logger.error(f"❌ {self.client_name} trade processing error: {e}")
    
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
            stream_key = 'finnhub:realtime'
            
            # 데이터 유효성 검사
            if not data.get('symbol') or data.get('price') is None:
                logger.warning(f"⚠️ {self.client_name} invalid data for redis store: {data}")
                return
            
            # 표준 필드 스키마로 정규화
            entry = {
                'symbol': str(data.get('symbol', '')),
                'price': str(data.get('price', '')),
                'volume': str(data.get('volume', '')),
                'raw_timestamp': str(data.get('timestamp', '')),
                'provider': 'finnhub',
            }
            
            # Redis 연결 상태 확인
            try:
                await r.ping()
            except Exception as ping_error:
                logger.error(f"❌ {self.client_name} redis connection lost: {ping_error}")
                # Redis 재연결 시도
                self._redis = None
                r = await self._get_redis()
            
            await r.xadd(stream_key, entry, maxlen=100000, approximate=True)
            logger.debug(f"✅ {self.client_name} stored to redis: {data.get('symbol')} = {data.get('price')}")
            
        except redis.exceptions.BusyLoadingError:
            logger.warning(f"⚠️ [{self.client_name.upper()}] Redis loading, skipping storage for {entry.get('symbol')}")
        except Exception as e:
            logger.error(f"❌ {self.client_name} redis store error: {e}")
            logger.error(f"🔍 Data that failed to store: {data}")
            # Redis 연결 재설정
            self._redis = None
    
    async def _perform_health_check(self) -> bool:
        """헬스체크 수행"""
        try:
            if not self.websocket or self.websocket.closed:
                return False
            
            # Ping 전송
            ping_msg = {"type": "ping"}
            await self.websocket.send(json.dumps(ping_msg))
            return True
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} health check error: {e}")
            return False
