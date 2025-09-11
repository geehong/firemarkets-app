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

logger = logging.getLogger(__name__)

class FinnhubWSConsumer(BaseWSConsumer):
    """Finnhub WebSocket Consumer"""
    
    def __init__(self, config: ConsumerConfig):
        super().__init__(config)
        self.api_key = GLOBAL_APP_CONFIGS.get('FINNHUB_API_KEY')
        if not self.api_key:
            # 환경변수에서 직접 읽기
            self.api_key = os.getenv('FINNHUB_API_KEY')
        self.ws_url = f"wss://ws.finnhub.io?token={self.api_key}"
        self.websocket = None
        self._receive_task = None
        # Redis
        self._redis = None
        self._redis_url = self._build_redis_url()
    
    @property
    def client_name(self) -> str:
        return "finnhub"
    
    @property
    def api_key(self) -> Optional[str]:
        return self._api_key
    
    @api_key.setter
    def api_key(self, value: str):
        self._api_key = value
    
    async def connect(self) -> bool:
        """WebSocket 연결"""
        try:
            if not self.api_key:
                logger.error("Finnhub API key not configured")
                return False
            
            self.websocket = await websockets.connect(self.ws_url)
            self.is_connected = True
            self.connection_errors = 0
            logger.info(f"✅ {self.client_name} connected")
            return True
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} connection failed: {e}")
            self.connection_errors += 1
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

    async def subscribe(self, tickers: List[str]) -> bool:
        """티커 구독"""
        try:
            if not self.is_connected or not self.websocket:
                logger.error(f"❌ {self.client_name} not connected")
                return False
            
            for ticker in tickers:
                norm = self._normalize_symbol(ticker)
                subscribe_msg = {"type": "subscribe", "symbol": norm}
                await self.websocket.send(json.dumps(subscribe_msg))
                self.subscribed_tickers.add(norm)
                logger.info(f"📋 {self.client_name} subscribed to {norm}")
            
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
                self.subscribed_tickers.discard(ticker)
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
        logger.info(f"🚀 {self.client_name} started with {len(self.subscribed_tickers)} tickers")
        
        # 수신 주기 설정 (기본 15초)
        self.consumer_interval = int(GLOBAL_APP_CONFIGS.get("WEBSOCKET_CONSUMER_INTERVAL_SECONDS", 15))
        self.last_save_time = time.time()
        logger.info(f"⏰ {self.client_name} 저장 주기: {self.consumer_interval}초")
        
        reconnect_delay = 5  # 재연결 대기 시간
        max_reconnect_attempts = 10
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
                wait_time = reconnect_delay * (1.5 ** min(reconnect_attempts - 1, 5))
                await asyncio.sleep(min(wait_time, 120))  # 최대 2분 대기
                
                # 재연결 시도
                if await self.connect():
                    # 재연결 성공 시 구독 복원
                    if await self.subscribe(list(self.subscribed_tickers)):
                        logger.info(f"✅ {self.client_name} reconnected and resubscribed to {len(self.subscribed_tickers)} tickers")
                        reconnect_attempts = 0  # 성공 시 리셋
                        reconnect_delay = 5  # 대기 시간 리셋
                    else:
                        logger.error(f"❌ {self.client_name} failed to resubscribe after reconnection")
                        self.is_connected = False
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
            # 저장 주기 체크
            current_time = time.time()
            if current_time - self.last_save_time < self.consumer_interval:
                # 아직 저장 시간이 되지 않았으면 메시지만 받고 저장하지 않음
                return
            
            # 저장 시간이 되었으면 데이터 처리
            self.last_save_time = current_time
            
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
        """거래 데이터 처리"""
        try:
            symbol = trade.get('s')
            price = trade.get('p')
            volume = trade.get('v')
            timestamp = trade.get('t')
            
            if symbol and price:
                # Redis에 데이터 저장
                await self._store_to_redis({
                    'symbol': symbol,
                    'price': price,
                    'volume': volume,
                    'timestamp': timestamp,
                    'provider': self.client_name
                })
                
                logger.debug(f"📈 {self.client_name} {symbol}: ${price} (Vol: {volume})")
                
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
            
            await r.xadd(stream_key, entry)
            logger.debug(f"✅ {self.client_name} stored to redis: {data.get('symbol')} = {data.get('price')}")
            
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
