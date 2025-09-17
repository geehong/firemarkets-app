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
from app.services.websocket_log_service import websocket_log_service

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
    
    @property
    def client_name(self) -> str:
        return "binance"
    
    @property
    def api_key(self) -> Optional[str]:
        """Binance는 공개 데이터에 API 키가 필요하지 않음"""
        return None
    
    async def connect(self) -> bool:
        """WebSocket 연결"""
        try:
            self.ws_logger.connection_attempt(self.ws_url)
            await websocket_log_service.log_event(
                "INFO", "connection_attempt", f"Attempting connection to {self.ws_url}",
                consumer_name=self.client_name, log_metadata={"url": self.ws_url}
            )
            
            self._ws = await asyncio.wait_for(
                websockets.connect(
                    self.ws_url,
                    ping_interval=20,
                    ping_timeout=10,
                    close_timeout=10
                ),
                timeout=30.0  # 30초 타임아웃 추가
            )
            self.is_connected = True
            self.connection_errors = 0
            
            self.ws_logger.connection_success()
            await websocket_log_service.log_event(
                "INFO", "connection_success", "Connected successfully",
                consumer_name=self.client_name
            )
            return True
            
        except asyncio.TimeoutError:
            error_msg = "Connection timeout after 30 seconds"
            self.ws_logger.connection_failed(error_msg)
            await websocket_log_service.log_event(
                "ERROR", "connection_failed", error_msg,
                consumer_name=self.client_name, error_type="TimeoutError"
            )
            self.connection_errors += 1
            self.is_connected = False
            self._ws = None
            return False
            
        except Exception as e:
            error_msg = f"Connection failed: {e}"
            self.ws_logger.connection_failed(error_msg)
            await websocket_log_service.log_event(
                "ERROR", "connection_failed", error_msg,
                consumer_name=self.client_name, error_type=type(e).__name__
            )
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
    
    def _normalize_symbol(self, ticker: str) -> str:
        """Binance 심볼 규격으로 정규화
        - 모든 심볼은 소문자로 변환
        - USDT로 끝나는 심볼은 그대로 사용
        """
        t = (ticker or '').upper().strip()
        if t.endswith('USDT'):
            return t.lower()
        return t.lower()
    
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
            for ticker in tickers:
                if skip_normalization:
                    # 재연결 시에는 정규화 건너뛰기
                    normalized = ticker
                else:
                    # 처음 구독 시에는 정규화 수행
                    normalized = self._normalize_symbol(ticker)
                
                # 거래 데이터와 24시간 티커 데이터 구독
                streams.extend([
                    f"{normalized}@trade",
                    f"{normalized}@ticker"
                ])
                self.subscribed_tickers.append(normalized)  # List로 순서 보장
                logger.debug(f"📋 {self.client_name} added streams for {ticker} -> {normalized}")
            
            # 구독 요청 전송
            subscribe_msg = {
                "method": "SUBSCRIBE",
                "params": streams,
                "id": self._get_next_id()
            }
            
            logger.info(f"📋 {self.client_name} sending subscription message: {len(streams)} streams")
            await self._ws.send(json.dumps(subscribe_msg))
            logger.info(f"📋 {self.client_name} subscribed to {len(streams)} streams for {len(tickers)} tickers")
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
        """메인 실행 루프 - 메시지 필터링 모드"""
        if not self.is_connected:
            logger.error(f"❌ {self.client_name} not connected")
            return
        
        self.is_running = True
        logger.info(f"🚀 {self.client_name} started with {len(self.subscribed_tickers)} tickers")
        
        # 수신 주기 설정 (기본 15초)
        self.consumer_interval = int(GLOBAL_APP_CONFIGS.get("WEBSOCKET_CONSUMER_INTERVAL_SECONDS", 15))
        self.last_save_time = time.time()
        logger.info(f"⏰ {self.client_name} 저장 주기: {self.consumer_interval}초")
        
        try:
            async for message in self._ws:
                if not self.is_running:
                    break
                
                try:
                    data = json.loads(message)
                    await self._handle_message(data)
                except json.JSONDecodeError as e:
                    logger.error(f"❌ {self.client_name} JSON decode error: {e}")
                except Exception as e:
                    logger.error(f"❌ {self.client_name} message handling error: {e}")
                    
        except websockets.exceptions.ConnectionClosed:
            logger.warning(f"⚠️ {self.client_name} connection closed")
            self.is_connected = False
        except Exception as e:
            logger.error(f"❌ {self.client_name} run error: {e}")
        finally:
            self.is_running = False
            logger.info(f"🛑 {self.client_name} stopped")
    
    async def _handle_message(self, data: dict):
        """메시지 처리 - 주기적 저장 필터링"""
        try:
            # 구독 응답 처리 (저장 주기와 무관하게 처리)
            if "result" in data and "id" in data:
                if data["result"] is None:
                    logger.debug(f"📨 {self.client_name} subscription response: {data}")
                else:
                    logger.info(f"📨 {self.client_name} subscription result: {data}")
                return
            
            # 저장 주기 체크 (스트림 데이터만)
            if "stream" in data and "data" in data:
                current_time = time.time()
                if current_time - self.last_save_time < self.consumer_interval:
                    # 아직 저장 시간이 되지 않았으면 메시지만 받고 저장하지 않음
                    logger.debug(f"⏰ {self.client_name} skipping message (not time to save yet)")
                    return
                
                # 저장 시간이 되었으면 데이터 처리
                self.last_save_time = current_time
                
                stream_name = data["stream"]
                stream_data = data["data"]
                
                logger.debug(f"📨 {self.client_name} processing stream: {stream_name}")
                
                if "@trade" in stream_name:
                    await self._process_trade(stream_data)
                elif "@ticker" in stream_name:
                    await self._process_ticker(stream_data)
                else:
                    logger.debug(f"📨 {self.client_name} unknown stream: {stream_name}")
            else:
                logger.debug(f"📨 {self.client_name} received non-stream message: {data}")
                
        except Exception as e:
            logger.error(f"❌ {self.client_name} message processing error: {e}")
    
    async def _process_trade(self, trade_data: dict):
        """거래 데이터 처리"""
        try:
            symbol = trade_data.get('s')
            price = trade_data.get('p')
            quantity = trade_data.get('q')
            trade_time = trade_data.get('T')
            
            if symbol and price:
                # Redis에 데이터 저장
                await self._store_to_redis({
                    'symbol': symbol,
                    'price': price,
                    'volume': quantity,
                    'timestamp': trade_time,
                    'provider': self.client_name
                })
                
                logger.debug(f"📈 {self.client_name} {symbol}: ${price} (Vol: {quantity})")
                
        except Exception as e:
            logger.error(f"❌ {self.client_name} trade processing error: {e}")
    
    async def _process_ticker(self, ticker_data: dict):
        """24시간 티커 데이터 처리"""
        try:
            symbol = ticker_data.get('s')
            last_price = ticker_data.get('c')
            volume = ticker_data.get('v')
            event_time = ticker_data.get('E')
            
            if symbol and last_price:
                # Redis에 데이터 저장
                await self._store_to_redis({
                    'symbol': symbol,
                    'price': last_price,
                    'volume': volume,
                    'timestamp': event_time,
                    'provider': self.client_name,
                    'type': 'ticker'
                })
                
                logger.debug(f"📊 {self.client_name} {symbol}: ${last_price} (24h Vol: {volume})")
                
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
            entry = {
                'symbol': str(data.get('symbol', '')),
                'price': str(data.get('price', '')),
                'volume': str(data.get('volume', '')),
                'raw_timestamp': str(data.get('timestamp', '')),
                'provider': 'binance',
                'type': str(data.get('type', 'trade'))
            }
            await r.xadd(stream_key, entry)
        except Exception as e:
            logger.error(f"❌ {self.client_name} redis store error: {e}")
    
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
