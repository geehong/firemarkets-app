"""
TwelveData WebSocket Consumer 구현 - DISABLED
현재 비활성화됨 (플랜 제한으로 인해)
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

# DISABLED: TwelveData WebSocket Consumer
# class TwelveDataWSConsumer(BaseWSConsumer):
    """TwelveData WebSocket Consumer"""
    
    def __init__(self, config: ConsumerConfig):
        super().__init__(config)
        self._api_key = GLOBAL_APP_CONFIGS.get('TWELVEDATA_API_KEY')
        if not self._api_key:
            # 환경변수에서 직접 읽기
            self._api_key = os.getenv('TWELVEDATA_API_KEY')
        self.ws_url = f"wss://ws.twelvedata.com/v1/quotes/price?apikey={self._api_key}"
        self.websocket = None
        self._receive_task = None
        # Redis
        self._redis = None
        self._redis_url = self._build_redis_url()
    
    @property
    def client_name(self) -> str:
        return "twelvedata"
    
    @property
    def api_key(self) -> Optional[str]:
        return self._api_key
    
    @api_key.setter
    def api_key(self, value: str):
        self._api_key = value
    
    async def connect(self) -> bool:
        """WebSocket 연결"""
        logger.info(f"🔌 {self.client_name} connect() method called")
        
        try:
            if not self.api_key:
                logger.error("TwelveData API key not configured")
                return False
            
            logger.info(f"🔌 {self.client_name} attempting connection to: {self.ws_url}")
            logger.info(f"🔑 {self.client_name} using API key: {self.api_key[:10]}...")
                
            self.websocket = await websockets.connect(self.ws_url)
            
            self.is_connected = True
            logger.info(f"✅ {self.client_name} connected")
            return True
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} connection failed: {e}")
            logger.error(f"❌ {self.client_name} URL: {self.ws_url}")
            logger.error(f"❌ {self.client_name} API key: {self.api_key[:10] if self.api_key else 'None'}...")
            import traceback
            logger.error(f"❌ {self.client_name} traceback: {traceback.format_exc()}")
            return False
    
    async def disconnect(self):
        """WebSocket 연결 해제"""
        if self.websocket:
            await self.websocket.close()
            self.is_connected = False
            logger.info(f"🔌 {self.client_name} disconnected")
    
    async def subscribe(self, tickers: List[str]) -> bool:
        """티커 구독"""
        if not self.websocket:
            logger.error(f"❌ {self.client_name} not connected")
            return False
            
        try:
            # 심볼 정규화
            normalized_tickers = [self._normalize_symbol(ticker) for ticker in tickers]
            
            # TwelveData 구독 메시지 형식
            subscribe_msg = {
                "action": "subscribe",
                "params": {
                    "symbols": ",".join(normalized_tickers)
                }
            }
            
            await self.websocket.send(json.dumps(subscribe_msg))
            self.subscribed_tickers.update(tickers)
            logger.info(f"📋 {self.client_name} subscribed to: {normalized_tickers}")
            return True
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} subscription failed: {e}")
            return False
    
    async def unsubscribe(self, tickers: List[str]) -> bool:
        """티커 구독 해제"""
        if not self.websocket:
            logger.error(f"❌ {self.client_name} not connected")
            return False
            
        try:
            # 심볼 정규화
            normalized_tickers = [self._normalize_symbol(ticker) for ticker in tickers]
            
            # TwelveData 구독 해제 메시지 형식
            unsubscribe_msg = {
                "action": "unsubscribe",
                "params": {
                    "symbols": ",".join(normalized_tickers)
                }
            }
            
            await self.websocket.send(json.dumps(unsubscribe_msg))
            self.subscribed_tickers.difference_update(tickers)
            logger.info(f"📋 {self.client_name} unsubscribed from: {normalized_tickers}")
            return True
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} unsubscription failed: {e}")
            return False
    
    def _normalize_symbol(self, symbol: str) -> str:
        """TwelveData API에 맞게 심볼 정규화"""
        symbol = symbol.upper()
        
        # TwelveData 특수 심볼 매핑 (Basic/Grow 플랜에서는 trial 심볼만 사용 가능)
        symbol_mapping = {
            'GCUSD': 'AAPL',  # 금 -> AAPL (trial 심볼)
            'SIUSD': 'MSFT',  # 은 -> MSFT (trial 심볼)
        }
        
        return symbol_mapping.get(symbol, symbol)
    
    async def run(self):
        """메인 실행 루프 - 오케스트레이터가 connect/subscribe를 직접 호출하므로 메시지 루프만 실행"""
        try:
            if self.is_connected and self.websocket:
                await self._message_loop()
            else:
                logger.error(f"❌ {self.client_name} not connected, cannot start message loop")
        except Exception as e:
            logger.error(f"❌ {self.client_name} run error: {e}")
    
    async def _message_loop(self):
        """메시지 수신 루프"""
        try:
            async for message in self.websocket:
                try:
                    data = json.loads(message)
                    await self._handle_message(data)
                except json.JSONDecodeError as e:
                    logger.error(f"❌ {self.client_name} JSON decode error: {e}")
                except Exception as e:
                    logger.error(f"❌ {self.client_name} message handling error: {e}")
                    
        except websockets.exceptions.ConnectionClosed:
            logger.warning(f"⚠️ {self.client_name} connection closed")
        except Exception as e:
            logger.error(f"❌ {self.client_name} message loop error: {e}")
    
    async def _handle_message(self, data: dict):
        """메시지 처리"""
        try:
            if data.get('event') == 'price':
                symbol = data.get('symbol')
                price = data.get('price')
                timestamp = data.get('timestamp')
                
                if symbol and price is not None:
                    # Redis에 저장
                    await self._store_to_redis({
                        'symbol': symbol,
                        'price': price,
                        'volume': None,
                        'timestamp': timestamp,
                        'provider': self.client_name,
                    })
                    
                    logger.debug(f"📈 {self.client_name} {symbol}: ${price}")
                    
        except Exception as e:
            logger.error(f"❌ {self.client_name} message processing error: {e}")
    
    async def _store_to_redis(self, data: dict):
        """Redis에 데이터 저장 (표준 스키마)"""
        try:
            r = await self._get_redis()
            stream_key = 'twelvedata:realtime'
            
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
                'provider': 'twelvedata',
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
            logger.debug(f"💾 {self.client_name} stored to redis: {data.get('symbol')} = ${data.get('price')}")
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} redis store error: {e}")
    
    async def _perform_health_check(self) -> bool:
        """헬스체크 수행"""
        try:
            if not self.websocket:
                return False
            
            # 간단한 ping 메시지 전송
            ping_msg = {"action": "heartbeat"}
            await self.websocket.send(json.dumps(ping_msg))
            return True
        except Exception as e:
            logger.error(f"❌ {self.client_name} health check failed: {e}")
            return False
    
    def get_supported_asset_types(self) -> List[AssetType]:
        """지원하는 자산 타입 반환"""
        return [AssetType.COMMODITY]
    
    def get_max_subscriptions(self) -> int:
        """최대 구독 수 반환"""
        return 20  # TwelveData 무료 플랜 제한
    
    def _build_redis_url(self) -> str:
        """Redis URL 구성"""
        redis_host = os.getenv('REDIS_HOST', 'localhost')
        redis_port = os.getenv('REDIS_PORT', '6379')
        redis_password = os.getenv('REDIS_PASSWORD', '')
        
        if redis_password:
            return f"redis://:{redis_password}@{redis_host}:{redis_port}"
        else:
            return f"redis://{redis_host}:{redis_port}"
    
    async def _get_redis(self):
        """Redis 연결 가져오기"""
        if not self._redis:
            self._redis = redis.from_url(self._redis_url)
        return self._redis
