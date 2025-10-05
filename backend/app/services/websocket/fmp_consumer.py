"""
FMP WebSocket Consumer 구현 (실시간 데이터)
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

logger = logging.getLogger(__name__)

class FMPWSConsumer(BaseWSConsumer):
    """FMP WebSocket Consumer"""
    
    def __init__(self, config: ConsumerConfig):
        super().__init__(config)
        self.api_key = GLOBAL_APP_CONFIGS.get('FMP_API_KEY') or os.getenv('FMP_API_KEY')
        # FMP는 WebSocket을 지원하지 않으므로 REST API 폴링 방식 사용
        self.ws_url = None  # WebSocket URL 없음
        self.websocket = None
        self._redis = None
        self._redis_url = self._build_redis_url()
        self._polling_interval = 15  # 15초마다 폴링
    
    @property
    def client_name(self) -> str:
        return "fmp"
    
    @property
    def api_key(self) -> Optional[str]:
        return self._api_key
    
    @api_key.setter
    def api_key(self, value: str):
        self._api_key = value
    
    async def connect(self) -> bool:
        """연결 (FMP는 WebSocket이 없으므로 항상 성공)"""
        try:
            if not self.api_key:
                logger.error("FMP API key not configured")
                return False
            
            self.is_connected = True
            self.connection_errors = 0
            logger.info(f"✅ {self.client_name} connected (REST API mode)")
            return True
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} connection failed: {e}")
            self.connection_errors += 1
            return False
    
    async def disconnect(self):
        """연결 해제"""
        try:
            self.is_connected = False
            logger.info(f"🔌 {self.client_name} disconnected")
        except Exception as e:
            logger.error(f"❌ {self.client_name} disconnect error: {e}")
    
    async def subscribe(self, tickers: List[str]) -> bool:
        """티커 구독 (메모리에 저장)"""
        try:
            if not self.is_connected:
                logger.error(f"❌ {self.client_name} not connected")
                return False
            
            for ticker in tickers:
                self.subscribed_tickers.add(ticker)
                logger.info(f"📋 {self.client_name} subscribed to {ticker}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} subscription failed: {e}")
            return False
    
    async def unsubscribe(self, tickers: List[str]) -> bool:
        """티커 구독 해제"""
        try:
            if not self.is_connected:
                return False
            
            for ticker in tickers:
                self.subscribed_tickers.discard(ticker)
                logger.info(f"📋 {self.client_name} unsubscribed from {ticker}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} unsubscription failed: {e}")
            return False
    
    async def run(self):
        """메인 실행 루프 - REST API 폴링 방식"""
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
            while self.is_running:
                if self.subscribed_tickers:
                    await self._poll_prices()
                
                await asyncio.sleep(self._polling_interval)
                
        except Exception as e:
            logger.error(f"❌ {self.client_name} run error: {e}")
        finally:
            self.is_running = False
            logger.info(f"🛑 {self.client_name} stopped")
    
    async def _poll_prices(self):
        """REST API로 가격 데이터 폴링"""
        try:
            import httpx
            
            # 구독된 티커들을 배치로 처리
            ticker_list = list(self.subscribed_tickers)
            if not ticker_list:
                return
            
            # FMP 실시간 가격 API 호출
            symbols = ','.join(ticker_list)
            url = f"https://financialmodelingprep.com/api/v3/quote/{symbols}"
            params = {"apikey": self.api_key}
            
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                
                if isinstance(data, list):
                    for quote in data:
                        await self._process_quote(quote)
                elif isinstance(data, dict) and 'Error Message' in data:
                    logger.error(f"❌ {self.client_name} API error: {data['Error Message']}")
                
        except Exception as e:
            logger.error(f"❌ {self.client_name} polling error: {e}")
    
    async def _process_quote(self, quote: dict):
        """가격 데이터 처리"""
        try:
            symbol = quote.get('symbol')
            price = quote.get('price')
            volume = quote.get('volume', 0)
            timestamp = int(time.time() * 1000)  # 현재 시간을 밀리초로
            
            if symbol and price is not None:
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
            logger.error(f"❌ {self.client_name} quote processing error: {e}")
    
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
            stream_key = 'fmp:realtime'
            
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
                'provider': 'fmp',
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
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} redis store error: {e}")
            logger.error(f"🔍 Data that failed to store: {data}")
            # Redis 연결 재설정
            self._redis = None
    
    async def _perform_health_check(self) -> bool:
        """헬스체크 수행"""
        try:
            if not self.is_connected:
                return False
            
            # API 키가 설정되어 있고 구독된 티커가 있으면 정상
            return bool(self.api_key and self.subscribed_tickers)
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} health check error: {e}")
            return False
