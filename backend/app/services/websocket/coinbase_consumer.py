"""
Coinbase WebSocket Consumer 구현
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

class CoinbaseWSConsumer(BaseWSConsumer):
    """Coinbase WebSocket Consumer"""
    
    def __init__(self, config: ConsumerConfig):
        super().__init__(config)
        self.ws_url = "wss://ws-feed.exchange.coinbase.com"
        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        self._request_id = 0
        # Redis
        self._redis = None
        self._redis_url = self._build_redis_url()
        # 새로운 로깅 시스템
        self.ws_logger = WebSocketLogger("coinbase")
        # 재연결을 위한 원래 티커 목록 저장
        self.original_tickers = set()
        self.subscribed_tickers = []  # 구독 순서 보장을 위해 List 사용
    
    @property
    def client_name(self) -> str:
        return "coinbase"
    
    @property
    def api_key(self) -> Optional[str]:
        """Coinbase는 공개 데이터에 API 키가 필요하지 않음"""
        return None
    
    async def connect(self) -> bool:
        """WebSocket 연결"""
        try:
            logger.info(f"🔌 {self.client_name} attempting connection to {self.ws_url}")
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
            if self._ws is not None and not self._ws.closed:
                await self._ws.close()
        except Exception as e:
            logger.debug(f"🔌 {self.client_name} disconnect error: {e}")
        finally:
            self._ws = None
            self.is_connected = False
            logger.info(f"🔌 {self.client_name} disconnected")
    
    def _normalize_symbol(self, ticker: str) -> str:
        """Coinbase 심볼 규격으로 정규화 (asset_mapping.json 반영)"""
        t = (ticker or '').upper().strip()
        return get_symbol_for_provider(t, "coinbase")
    
    async def subscribe(self, tickers: List[str], skip_normalization: bool = False) -> bool:
        """티커 구독"""
        try:
            if not self.is_connected or not self._ws:
                logger.error(f"❌ {self.client_name} not connected")
                return False
            
            # 원래 티커 목록 저장 (정규화 전)
            if not skip_normalization:
                self.original_tickers = set(tickers)
                self.subscribed_tickers = []  # 재구독 시 초기화
            
            # Coinbase Exchange WebSocket 구독 메시지
            # 티커를 Coinbase Exchange 형식으로 변환 (USDT -> USD)
            product_ids = []
            for ticker in tickers:
                if skip_normalization:
                    # 재연결 시에는 정규화 건너뛰기
                    product_id = ticker
                else:
                    # 처음 구독 시에는 정규화 수행
                    product_id = self._normalize_symbol(ticker).replace('_', '-')
                
                product_ids.append(product_id)
                self.subscribed_tickers.append(ticker)  # List로 순서 보장
            
            subscribe_msg = {
                "type": "subscribe",
                "product_ids": product_ids,
                "channels": ["ticker", "matches"]  # matches = 거래 데이터
            }
            
            await self._ws.send(json.dumps(subscribe_msg))
            logger.info(f"📋 {self.client_name} subscribed to {len(product_ids)} products for {len(tickers)} tickers: {product_ids}")
            logger.info(f"📋 {self.client_name} subscription message sent successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} subscription failed: {e}")
            return False
    
    async def unsubscribe(self, tickers: List[str]) -> bool:
        """티커 구독 해제"""
        try:
            if not self.is_connected or not self._ws:
                return False
            
            # 구독 해제할 티커 목록 생성
            unsubscribe_tickers = []
            for ticker in tickers:
                normalized = self._normalize_symbol(ticker)
                unsubscribe_tickers.append(normalized.replace('_', '-'))
                # List에서 제거
                if normalized in self.subscribed_tickers:
                    self.subscribed_tickers.remove(normalized)
            
            # 구독 해제 요청 전송
            unsubscribe_msg = {
                "type": "unsubscribe",
                "product_ids": unsubscribe_tickers,
                "channels": ["ticker", "market_trades"]
            }
            
            await self._ws.send(json.dumps(unsubscribe_msg))
            logger.info(f"📋 {self.client_name} unsubscribed from {len(unsubscribe_tickers)} tickers")
            return True
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} unsubscription failed: {e}")
            return False
    
    async def run(self):
        """메인 실행 루프 - 연결 및 메시지 처리"""
        self.is_running = True
        logger.info(f"🚀 {self.client_name} started with {len(self.subscribed_tickers)} tickers")
        
        # 수신 주기 설정 (완화: 기본 1초로 단축)
        self.consumer_interval = int(GLOBAL_APP_CONFIGS.get("WEBSOCKET_CONSUMER_INTERVAL_SECONDS", 1))
        self.last_save_time = time.time()
        logger.info(f"⏰ {self.client_name} 저장 주기: {self.consumer_interval}초")
        
        max_reconnect_attempts = 5
        reconnect_attempts = 0
        reconnect_delay = 5
        
        try:
            while self.is_running and reconnect_attempts < max_reconnect_attempts:
                try:
                    # 연결 시도
                    if not self.is_connected:
                        if not await self.connect():
                            logger.error(f"❌ {self.client_name} connection failed")
                            reconnect_attempts += 1
                            await asyncio.sleep(reconnect_delay)
                            continue
                    
                    # 구독 시도 (원래 티커 목록이 있는 경우에만)
                    if self.original_tickers and not await self.subscribe(list(self.original_tickers)):
                        logger.error(f"❌ {self.client_name} subscription failed")
                        reconnect_attempts += 1
                        await asyncio.sleep(reconnect_delay)
                        continue
                    elif not self.original_tickers:
                        logger.warning(f"⚠️ {self.client_name} no tickers to subscribe to")
                        reconnect_attempts += 1
                        await asyncio.sleep(reconnect_delay)
                        continue
                    
                    # 연결 및 구독 성공
                    reconnect_attempts = 0
                    logger.info(f"✅ {self.client_name} connected and subscribed to {len(self.subscribed_tickers)} tickers")
                    
                    # 메시지 수신 루프 - 단일 recv 루프로 변경
                    while self.is_running and self.is_connected:
                        try:
                            # 단일 recv 호출로 동시성 문제 해결
                            message = await asyncio.wait_for(self._ws.recv(), timeout=30.0)
                            
                            try:
                                data = json.loads(message)
                                await self._handle_message(data)
                            except json.JSONDecodeError as e:
                                logger.error(f"❌ {self.client_name} JSON decode error: {e}")
                            except Exception as e:
                                logger.error(f"❌ {self.client_name} message handling error: {e}")
                                
                        except asyncio.TimeoutError:
                            # 타임아웃 시 ping으로 연결 상태 확인
                            try:
                                await self._ws.ping()
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
                            logger.error(f"❌ {self.client_name} recv error: {e}")
                            self.is_connected = False
                            break
                            
                except websockets.exceptions.ConnectionClosed:
                    logger.warning(f"⚠️ {self.client_name} connection closed")
                    self.is_connected = False
                    reconnect_attempts += 1
                    await asyncio.sleep(reconnect_delay)
                except Exception as e:
                    logger.error(f"❌ {self.client_name} run error: {e}")
                    self.is_connected = False
                    reconnect_attempts += 1
                    await asyncio.sleep(reconnect_delay)
            
            if reconnect_attempts >= max_reconnect_attempts:
                logger.error(f"❌ {self.client_name} max reconnection attempts reached")
                
        except Exception as e:
            logger.error(f"❌ {self.client_name} run error: {e}")
        finally:
            self.is_running = False
            logger.info(f"🛑 {self.client_name} stopped")
    
    async def _handle_message(self, data: dict):
        """메시지 처리 - Coinbase Exchange API 형식"""
        try:
            # 구독 응답 처리
            if data.get("type") == "subscriptions":
                logger.info(f"📨 {self.client_name} subscription response: {data}")
                return
            
            # 모든 메시지 처리 (저장 주기 체크 제거)
            current_time = time.time()
            
            # Coinbase Exchange API 메시지 타입 처리
            message_type = data.get("type")
            
            logger.debug(f"📨 {self.client_name} received message type: {message_type}")
            
            if message_type == "ticker":
                logger.debug(f"📈 {self.client_name} processing ticker data")
                await self._process_ticker_exchange(data)
            elif message_type == "match":
                logger.debug(f"📈 {self.client_name} processing match data")
                await self._process_match_exchange(data)
            elif message_type == "heartbeat":
                logger.debug(f"💓 {self.client_name} heartbeat")
            else:
                logger.debug(f"📨 {self.client_name} received unknown message: {data}")
                
        except Exception as e:
            logger.error(f"❌ {self.client_name} message processing error: {e}")
            logger.error(f"❌ {self.client_name} error type: {type(e).__name__}")
    
    async def _process_ticker_exchange(self, data: dict):
        """Coinbase Exchange ticker 데이터 처리"""
        try:
            # 원본 product_id 사용 (BTC-USD 형태)
            product_id = data.get("product_id", "")
            price = data.get("price")
            volume = data.get("volume_24h")
            time_str = data.get("time")
            
            if product_id and price:
                # Redis에 데이터 저장
                await self._store_to_redis({
                    'symbol': product_id,
                    'price': price,
                    'volume': volume or "0",
                    'timestamp': time_str,
                    'provider': self.client_name,
                    'type': 'ticker'
                })
                
                logger.info(f"📈 {self.client_name} {product_id}: ${price} (Vol24h: {volume})")
                
        except Exception as e:
            logger.error(f"❌ {self.client_name} ticker processing error: {e}")
    
    async def _process_match_exchange(self, data: dict):
        """Coinbase Exchange match(거래) 데이터 처리"""
        try:
            # 원본 product_id 사용 (BTC-USD 형태)
            product_id = data.get("product_id", "")
            price = data.get("price")
            size = data.get("size")
            time_str = data.get("time")
            
            if product_id and price:
                # Redis에 데이터 저장
                await self._store_to_redis({
                    'symbol': product_id,
                    'price': price,
                    'volume': size,
                    'timestamp': time_str,
                    'provider': self.client_name,
                    'type': 'trade'
                })
                
                logger.info(f"📈 {self.client_name} {product_id}: ${price} (Size: {size})")
                
        except Exception as e:
            logger.error(f"❌ {self.client_name} match processing error: {e}")
    
    async def _process_trades(self, events: List[dict]):
        """거래 데이터 처리"""
        try:
            for event in events:
                if event.get("type") == "update":
                    trades = event.get("trades", [])
                    for trade in trades:
                        product_id = trade.get("product_id", "").replace("-", "")
                        price = trade.get("price")
                        size = trade.get("size")
                        time_str = trade.get("time")
                        
                        if product_id and price:
                            # Redis에 데이터 저장
                            await self._store_to_redis({
                                'symbol': product_id,
                                'price': price,
                                'volume': size,
                                'timestamp': time_str,
                                'provider': self.client_name
                            })
                            
                            logger.debug(f"📈 {self.client_name} {product_id}: ${price} (Vol: {size})")
                            
        except Exception as e:
            logger.error(f"❌ {self.client_name} trades processing error: {e}")
    
    async def _process_ticker(self, events: List[dict]):
        """티커 데이터 처리"""
        try:
            for event in events:
                if event.get("type") == "update":
                    ticker = event.get("ticker", {})
                    product_id = ticker.get("product_id", "").replace("-", "")
                    price = ticker.get("price")
                    volume_24h = ticker.get("volume_24h")
                    time_str = ticker.get("time")
                    
                    if product_id and price:
                        # Redis에 데이터 저장
                        await self._store_to_redis({
                            'symbol': product_id,
                            'price': price,
                            'volume': volume_24h,
                            'timestamp': time_str,
                            'provider': self.client_name,
                            'type': 'ticker'
                        })
                        
                        logger.debug(f"📊 {self.client_name} {product_id}: ${price} (24h Vol: {volume_24h})")
                        
        except Exception as e:
            logger.error(f"❌ {self.client_name} ticker processing error: {e}")
    
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
            stream_key = 'coinbase:realtime'
            # 표준 필드 스키마로 정규화
            entry = {
                'symbol': str(data.get('symbol', '')),
                'price': str(data.get('price', '')),
                'volume': str(data.get('volume', '')),
                'raw_timestamp': str(data.get('timestamp', '')),
                'provider': 'coinbase',
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
            ping_msg = {"type": "ping"}
            await self._ws.send(json.dumps(ping_msg))
            return True
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} health check error: {e}")
            return False
