"""
Binance WebSocket Consumer 구현
"""
import asyncio
import json
import logging
import time
import websockets
from typing import List, Optional
import os
import redis.asyncio as redis
from datetime import datetime
from app.services.websocket.base_consumer import BaseWSConsumer, ConsumerConfig, AssetType
from app.core.config import GLOBAL_APP_CONFIGS
from app.core.websocket_logging import WebSocketLogger
from app.utils.asset_mapping_loader import get_symbol_for_provider
# websocket_log_service removed - using file logging only

logger = logging.getLogger(__name__)

class BinanceWSConsumer(BaseWSConsumer):
    """Binance WebSocket Consumer"""
    
    def __init__(self, config: ConsumerConfig):
        super().__init__(config)
        self.ws_url = "wss://stream.binance.com:9443/stream"
        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        self._request_id = 0
        # Redis
        self._redis = None
        self._redis_url = self._build_redis_url()
        # 새로운 로깅 시스템
        self.ws_logger = WebSocketLogger("binance")
        # 재연결을 위한 원래 티커 목록 저장
        self.original_tickers = set()
        self.subscribed_tickers = []  # 구독 순서 보장을 위해 List 사용
        self._is_subscribed = False  # 구독 상태 추적
        self._pending_subscription_id = None  # 대기 중인 구독 요청 ID
        # Throttling: 티커별 마지막 저장 시간 (CPU 절약용)
        self._last_save_times: dict = {}  # {symbol: timestamp}
        # Redis 저장 주기 (기본 1초 - 실시간 유지, CPU만 절약)
        # DB 저장 throttle은 data_processor에서 처리
        self._save_interval = float(os.getenv("WEBSOCKET_REDIS_SAVE_INTERVAL", "0.2"))
    
    @property
    def client_name(self) -> str:
        return "binance"
    
    @property
    def api_key(self) -> Optional[str]:
        """Binance는 공개 데이터에 API 키가 필요하지 않음"""
        return None
    
    async def connect(self) -> bool:
        """WebSocket 연결 - Coinbase와 동일한 구조"""
        try:
            logger.info(f"🔌 {self.client_name} attempting connection to {self.ws_url}")
            
            # 연결 전 잠시 대기 (동시 연결 방지)
            await asyncio.sleep(0.1)
            
            self._ws = await asyncio.wait_for(
                websockets.connect(
                    self.ws_url,
                    ping_interval=20,
                    ping_timeout=10,
                    close_timeout=10
                ),
                timeout=30.0  # 30초 타임아웃
            )
            self.is_connected = True
            self.connection_errors = 0
            logger.info(f"✅ {self.client_name} connected")
            return True
            
        except asyncio.TimeoutError:
            logger.error(f"❌ {self.client_name} connection timeout after 30 seconds")
            self.connection_errors += 1
            self.is_connected = False
            self._ws = None
            return False
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} connection failed: {e}")
            logger.error(f"❌ {self.client_name} error type: {type(e).__name__}")
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
        self._is_subscribed = False  # 연결 해제 시 구독 상태도 초기화
        self._pending_subscription_id = None  # 대기 중인 구독 ID도 초기화
        logger.info(f"🔌 {self.client_name} disconnected")
    
    def _normalize_symbol(self, ticker: str) -> str:
        """Binance 심볼 규격으로 정규화 (asset_mapping.json 반영)"""
        t = (ticker or '').upper().strip()
        if not t:
            logger.warning(f"⚠️ {self.client_name} empty ticker provided for normalization")
            return ''
        
        normalized = get_symbol_for_provider(t, "binance")
        if not normalized:
            logger.warning(f"⚠️ {self.client_name} no mapping found for {ticker}, using original")
            normalized = t
        
        # 바이낸스 스트림은 소문자를 사용
        return normalized.upper().lower()
    
    async def subscribe(self, tickers: List[str], skip_normalization: bool = False) -> bool:
        """티커 구독"""
        try:
            if not self.is_connected or not self._ws:
                logger.error(f"❌ {self.client_name} not connected")
                return False
            
            logger.info(f"📋 {self.client_name} starting subscription for {len(tickers)} tickers: {tickers}")
            
            # 원래 티커 목록 저장 (정규화 전)
            if not skip_normalization:
                self.original_tickers = set(tickers)
                self.subscribed_tickers = []  # 재구독 시 초기화
            
            # 구독할 스트림 목록 생성
            streams = []
            valid_tickers = []
            for ticker in tickers:
                if skip_normalization:
                    # 재연결 시에는 정규화 건너뛰기
                    normalized = ticker
                else:
                    # 처음 구독 시에는 정규화 수행
                    normalized = self._normalize_symbol(ticker)
                
                # 정규화 실패한 티커는 건너뜀
                if not normalized or normalized.strip() == '':
                    logger.warning(f"⚠️ {self.client_name} skipping invalid ticker: {ticker} (normalized to empty)")
                    continue
                
                # 거래 데이터와 24시간 티커 데이터 구독
                streams.extend([
                    f"{normalized}@trade",
                    f"{normalized}@ticker"
                ])
                valid_tickers.append(normalized)  # List로 순서 보장
                logger.debug(f"📋 {self.client_name} added streams for {ticker} -> {normalized}")
            
            # 유효한 티커가 없으면 실패
            if not valid_tickers:
                logger.error(f"❌ {self.client_name} no valid tickers after normalization")
                return False
            
            if not skip_normalization:
                self.subscribed_tickers = valid_tickers
            else:
                self.subscribed_tickers.extend(valid_tickers)
            
            # 구독 요청 전송
            subscription_id = self._get_next_id()
            subscribe_msg = {
                "method": "SUBSCRIBE",
                "params": streams,
                "id": subscription_id
            }
            
            self._pending_subscription_id = subscription_id  # 대기 중인 구독 ID 저장
            logger.info(f"📋 {self.client_name} sending subscription message: {len(streams)} streams (id: {subscription_id})")
            await self._ws.send(json.dumps(subscribe_msg))
            logger.info(f"📋 {self.client_name} subscription request sent for {len(streams)} streams ({len(tickers)} tickers)")
            # 구독 상태는 Binance 응답을 받은 후 _handle_message에서 설정됨
            return True
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} subscription failed: {e}")
            return False
    
    async def unsubscribe(self, tickers: List[str]) -> bool:
        """티커 구독 해제"""
        try:
            if not self.is_connected or not self._ws:
                return False
            
            # 구독 해제할 스트림 목록 생성
            streams = []
            for ticker in tickers:
                normalized = self._normalize_symbol(ticker)
                streams.extend([
                    f"{normalized}@trade",
                    f"{normalized}@ticker"
                ])
                # List에서 제거
                if normalized in self.subscribed_tickers:
                    self.subscribed_tickers.remove(normalized)
            
            # 구독 해제 요청 전송
            unsubscribe_msg = {
                "method": "UNSUBSCRIBE",
                "params": streams,
                "id": self._get_next_id()
            }
            
            await self._ws.send(json.dumps(unsubscribe_msg))
            logger.info(f"📋 {self.client_name} unsubscribed from {len(streams)} streams")
            return True
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} unsubscription failed: {e}")
            return False
    
    async def run(self):
        """메인 실행 루프 - Coinbase와 동일한 구조"""
        self.is_running = True
        logger.info(f"🚀 [BINANCE] 시작됨: {len(self.subscribed_tickers)}개 티커 할당")
        logger.info(f"📋 [BINANCE] 할당된 티커: {self.subscribed_tickers}")
        
        # 수신 주기 설정 (완화: 기본 1초로 단축)
        self.consumer_interval = int(GLOBAL_APP_CONFIGS.get("WEBSOCKET_CONSUMER_INTERVAL_SECONDS", 1))
        self.last_save_time = time.time()
        logger.info(f"⏰ {self.client_name} 저장 주기: {self.consumer_interval}초")
        
        max_reconnect_attempts = 5
        reconnect_attempts = 0
        reconnect_delay = 30  # 5초 → 30초로 증가
        
        try:
            while self.is_running and reconnect_attempts < max_reconnect_attempts:
                try:
                    # 연결 시도
                    if not self.is_connected:
                        logger.info(f"🔌 [BINANCE] 연결 시도 중... (시도 {reconnect_attempts + 1}/{max_reconnect_attempts})")
                        if not await self.connect():
                            logger.error(f"❌ [BINANCE] 연결 실패")
                            reconnect_attempts += 1
                            await asyncio.sleep(reconnect_delay)
                            continue
                        logger.info(f"✅ [BINANCE] 연결 성공")
                    
                    # 구독 시도 (티커가 있고 아직 구독되지 않은 경우에만)
                    if not self.subscribed_tickers:
                        logger.warning(f"⚠️ {self.client_name} has no tickers to subscribe, waiting...")
                        await asyncio.sleep(10)  # 티커 할당 대기
                        continue
                    
                    # 이미 구독된 경우 재구독 건너뛰기 (오케스트레이터에서 이미 구독했을 수 있음)
                    if not self._is_subscribed:
                        logger.info(f"📋 {self.client_name} attempting subscription to {len(self.subscribed_tickers)} tickers")
                        if not await self.subscribe(list(self.subscribed_tickers), skip_normalization=True):
                            logger.error(f"❌ {self.client_name} subscription failed")
                            reconnect_attempts += 1
                            await asyncio.sleep(reconnect_delay)
                            continue
                        logger.info(f"⏳ {self.client_name} subscription request sent, waiting for confirmation in message loop...")
                    else:
                        logger.debug(f"✅ {self.client_name} already subscribed, skipping subscription")
                    
                    # 연결 및 구독 성공
                    reconnect_attempts = 0
                    logger.info(f"✅ [BINANCE] 연결 및 구독 완료: {len(self.subscribed_tickers)}개 티커")
                    
                    # 메시지 수신 루프
                    logger.info(f"🔄 [BINANCE] 메시지 수신 루프 시작")
                    message_count = 0
                    async for message in self._ws:
                        if not self.is_running:
                            logger.info(f"🛑 [BINANCE] 실행 중지 요청, 루프 종료")
                            break
                        
                        try:
                            message_count += 1
                            if message_count % 1000 == 0:
                                logger.info(f"📊 [BINANCE] {message_count}개 메시지 처리됨")
                            
                            data = json.loads(message)
                            await self._handle_message(data)
                        except json.JSONDecodeError as e:
                            logger.error(f"❌ [BINANCE] JSON decode error: {e}, message: {message[:200]}")
                        except Exception as e:
                            logger.error(f"❌ [BINANCE] message handling error: {e}")
                            import traceback
                            logger.error(f"❌ [BINANCE] 오류 상세: {traceback.format_exc()}")
                    
                    # 메시지 루프가 종료되면 연결 상태 초기화
                    logger.warning(f"⚠️ [BINANCE] 메시지 수신 루프 종료됨 (연결 끊김 가능성)")
                    self.is_connected = False
                    self._is_subscribed = False
                    
                except websockets.exceptions.ConnectionClosed:
                    logger.warning(f"⚠️ {self.client_name} connection closed")
                    self.is_connected = False
                    self._is_subscribed = False
                    self._pending_subscription_id = None
                    reconnect_attempts += 1
                    await asyncio.sleep(reconnect_delay)
                except Exception as e:
                    logger.error(f"❌ {self.client_name} run error: {e}")
                    self.is_connected = False
                    self._is_subscribed = False
                    self._pending_subscription_id = None
                    reconnect_attempts += 1
                    await asyncio.sleep(reconnect_delay)
                
                # 타이트 루프 방지를 위한 짧은 휴식
                await asyncio.sleep(1)
            
            if reconnect_attempts >= max_reconnect_attempts:
                logger.error(f"❌ {self.client_name} max reconnection attempts reached")
                
        except Exception as e:
            logger.error(f"❌ {self.client_name} run error: {e}")
        finally:
            self.is_running = False
            logger.info(f"🛑 {self.client_name} stopped")
    
    async def _handle_message(self, data: dict):
        """메시지 처리 - Coinbase와 동일한 구조"""
        try:
            # 구독 응답 처리
            if "id" in data:
                response_id = data.get("id")
                # 대기 중인 구독 응답인지 확인
                if response_id == self._pending_subscription_id:
                    self._pending_subscription_id = None  # 대기 중인 구독 ID 초기화
                    
                    # 에러 응답 확인
                    if "error" in data:
                        error_msg = data.get("error", {})
                        logger.error(f"❌ [BINANCE] subscription error (id: {response_id}): {error_msg}")
                        self._is_subscribed = False  # 에러 발생 시 구독 상태 초기화
                        return
                    
                    # 성공 응답 확인
                    if "result" in data:
                        if data["result"] is None:
                            logger.info(f"✅ [BINANCE] subscription successful (id: {response_id})")
                            self._is_subscribed = True  # 구독 성공 확인
                        else:
                            logger.info(f"📨 [BINANCE] subscription result (id: {response_id}): {data}")
                        return
                else:
                    # 다른 ID의 응답 (예: 이전 요청의 응답)
                    logger.debug(f"📨 [BINANCE] received response for different id: {response_id} (pending: {self._pending_subscription_id})")
            
            # 모든 메시지 처리 (저장 주기 체크 제거)
            if "stream" in data and "data" in data:
                stream_name = data["stream"]
                stream_data = data["data"]
                
                # 구독이 확인되지 않았는데 스트림 데이터를 받으면 구독 성공으로 간주
                if not self._is_subscribed and self._pending_subscription_id is None:
                    logger.info(f"✅ [BINANCE] received stream data, subscription confirmed: {stream_name}")
                    self._is_subscribed = True
                
                logger.debug(f"📨 [BINANCE→HANDLE] 스트림 수신: {stream_name}")
                
                if "@trade" in stream_name:
                    await self._process_trade(stream_data)
                elif "@ticker" in stream_name:
                    await self._process_ticker(stream_data)
                else:
                    logger.debug(f"📨 [BINANCE] unknown stream: {stream_name}")
            else:
                logger.debug(f"📨 [BINANCE] received non-stream message: {data}")
                
        except Exception as e:
            logger.error(f"❌ {self.client_name} message processing error: {e}")
            import traceback
            logger.error(f"❌ [BINANCE→HANDLE] 오류 상세: {traceback.format_exc()}")
    
    async def _process_trade(self, trade_data: dict):
        """거래 데이터 처리 (throttling 적용)"""
        try:
            symbol = trade_data.get('s')
            price = trade_data.get('p')
            quantity = trade_data.get('q')
            trade_time = trade_data.get('T')
            
            if not symbol or not price:
                return
            
            # Throttling: 티커별 저장 주기 제한 (CPU 절약)
            current_time = time.time()
            last_save = self._last_save_times.get(symbol, 0)
            if current_time - last_save < self._save_interval:
                return  # 저장 간격 내에 있으면 건너뜀
            
            self._last_save_times[symbol] = current_time
            
            logger.debug(f"📈 [BINANCE→PROCESS] {symbol}: ${price} (Vol: {quantity})")
            # Redis에 데이터 저장
            await self._store_to_redis({
                'symbol': symbol,
                'price': price,
                'volume': quantity,
                'timestamp': trade_time,
                'provider': self.client_name
            })
                
        except Exception as e:
            logger.error(f"❌ {self.client_name} trade processing error: {e}")
    
    async def _process_ticker(self, ticker_data: dict):
        """24시간 티커 데이터 처리 (throttling 적용 - trade와 별도 키 사용)"""
        try:
            symbol = ticker_data.get('s')
            last_price = ticker_data.get('c')
            volume = ticker_data.get('v')
            event_time = ticker_data.get('E')
            
            if not symbol or not last_price:
                return
            
            # Throttling: 티커별 저장 주기 제한 (ticker 이벤트용 별도 키)
            ticker_key = f"{symbol}:ticker"
            current_time = time.time()
            last_save = self._last_save_times.get(ticker_key, 0)
            if current_time - last_save < self._save_interval:
                return  # 저장 간격 내에 있으면 건너뜀
            
            self._last_save_times[ticker_key] = current_time
            
            logger.debug(f"📈 [BINANCE→PROCESS] {symbol}: ${last_price} (Vol24h: {volume})")
            # Redis에 데이터 저장
            await self._store_to_redis({
                'symbol': symbol,
                'price': last_price,
                'volume': volume,
                'timestamp': event_time,
                'provider': self.client_name,
                'type': 'ticker'
            })
                
        except Exception as e:
            logger.error(f"❌ {self.client_name} ticker processing error: {e}")
    
    def _get_next_id(self) -> int:
        """다음 요청 ID 생성"""
        self._request_id += 1
        return self._request_id
    
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
            stream_key = 'binance:realtime'
            # 표준 필드 스키마로 정규화
            symbol = str(data.get('symbol', ''))
            price = str(data.get('price', ''))
            entry = {
                'symbol': symbol,
                'price': price,
                'volume': str(data.get('volume', '')),
                'raw_timestamp': str(data.get('timestamp', '')),
                'provider': 'binance',
                'type': str(data.get('type', 'trade'))
            }
            logger.debug(f"💾 [BINANCE→REDIS] 저장 시도: {symbol} = ${price} (stream: {stream_key})")
            await r.xadd(stream_key, entry, maxlen=100000, approximate=True)
            logger.debug(f"✅ [BINANCE→REDIS] 저장 완료: {symbol} = ${price}")
        except redis.exceptions.BusyLoadingError:
            logger.warning(f"⚠️ [BINANCE] Redis loading, skipping storage for {data.get('symbol')}")
        except Exception as e:
            logger.error(f"❌ {self.client_name} redis store error: {e}")
            import traceback
            logger.error(f"❌ [BINANCE→REDIS] 저장 실패 상세: {traceback.format_exc()}")
    
    async def _perform_health_check(self) -> bool:
        """헬스체크: WebSocket 연결 상태 기준"""
        try:
            if not self._ws or self._ws.closed:
                return False
            
            # Ping 전송으로 연결 상태 확인
            ping_msg = {"method": "LIST_SUBSCRIPTIONS", "id": self._get_next_id()}
            await self._ws.send(json.dumps(ping_msg))
            return True
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} health check error: {e}")
            return False
