"""
Swissquote WebSocket Consumer 구현 (실시간 외환/커머디티 데이터)
"""
import asyncio
import json
import logging
import time
import websockets
from typing import List, Optional
import os
import redis.asyncio as redis
import httpx
from app.services.websocket.base_consumer import BaseWSConsumer, ConsumerConfig, AssetType
from app.core.config import GLOBAL_APP_CONFIGS
from app.core.websocket_logging import WebSocketLogger
from app.services.websocket_log_service import websocket_log_service

logger = logging.getLogger(__name__)

class SwissquoteWSConsumer(BaseWSConsumer):
    """Swissquote WebSocket Consumer - REST API 폴링 방식"""
    
    def __init__(self, config: ConsumerConfig):
        super().__init__(config)
        # Swissquote는 무료 공개 API를 제공하므로 API 키 불필요
        self.api_key = None
        self.base_url = "https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument"
        self._redis = None
        self._redis_url = self._build_redis_url()
        self._polling_interval = 900  # 15분마다 폴링 (REST API이므로 과도한 요청 방지)
        # 새로운 로깅 시스템
        self.ws_logger = WebSocketLogger("swissquote")
        # 재연결을 위한 원래 티커 목록 저장
        self.original_tickers = set()
        self.subscribed_tickers = []  # 구독 순서 보장을 위해 List 사용
    
    @property
    def client_name(self) -> str:
        return "swissquote"
    
    @property
    def api_key(self) -> Optional[str]:
        return self._api_key
    
    @api_key.setter
    def api_key(self, value: str):
        self._api_key = value
    
    async def connect(self) -> bool:
        """연결 (Swissquote는 REST API이므로 항상 성공)"""
        try:
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
    
    def _normalize_symbol(self, ticker: str) -> str:
        """Swissquote 심볼 규격으로 정규화
        - XAU/USD: 금/달러
        - XAG/USD: 은/달러  
        - EUR/USD: 유로/달러
        - GBP/USD: 파운드/달러
        """
        t = (ticker or '').upper().strip()
        
        # 커머디티 심볼 매핑
        commodity_mapping = {
            'GOLD': 'XAU/USD',
            'SILVER': 'XAG/USD',
            'GC': 'XAU/USD',
            'SI': 'XAG/USD',
            'GCUSD': 'XAU/USD',
            'SIUSD': 'XAG/USD'
        }
        
        # 매핑된 심볼이 있으면 사용
        if t in commodity_mapping:
            return commodity_mapping[t]
        
        # 이미 Swissquote 형식이면 그대로 반환
        if '/' in t:
            return t
        
        return t
    
    async def subscribe(self, tickers: List[str], skip_normalization: bool = False) -> bool:
        """티커 구독 (메모리에 저장)"""
        try:
            if not self.is_connected:
                logger.error(f"❌ {self.client_name} not connected")
                return False
            
            # 원래 티커 목록 저장 (정규화 전)
            if not skip_normalization:
                self.original_tickers = set(tickers)
                self.subscribed_tickers = []  # 재구독 시 초기화
            
            for ticker in tickers:
                if skip_normalization:
                    # 재연결 시에는 정규화 건너뛰기
                    normalized_ticker = ticker
                else:
                    # 처음 구독 시에는 정규화 수행
                    normalized_ticker = self._normalize_symbol(ticker)
                
                self.subscribed_tickers.append(normalized_ticker)  # List로 순서 보장
                logger.info(f"📋 {self.client_name} subscribed to {normalized_ticker}")
            
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
                normalized_ticker = self._normalize_symbol(ticker)
                # List에서 제거
                if normalized_ticker in self.subscribed_tickers:
                    self.subscribed_tickers.remove(normalized_ticker)
                logger.info(f"📋 {self.client_name} unsubscribed from {normalized_ticker}")
            
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
        
        # 수신 주기 설정 (기본 15분)
        self.consumer_interval = int(GLOBAL_APP_CONFIGS.get("WEBSOCKET_CONSUMER_INTERVAL_SECONDS", 900))
        self.last_save_time = time.time()
        logger.info(f"⏰ {self.client_name} 폴링 주기: {self._polling_interval}초 (15분)")
        
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
            # 구독된 티커들을 개별적으로 처리
            for ticker in list(self.subscribed_tickers):
                await self._fetch_ticker_data(ticker)
                
        except Exception as e:
            logger.error(f"❌ {self.client_name} polling error: {e}")
    
    async def _fetch_ticker_data(self, ticker: str):
        """개별 티커 데이터 가져오기"""
        try:
            url = f"{self.base_url}/{ticker}"
            
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
                
                if isinstance(data, list) and data:
                    # 여러 플랫폼 데이터 중 첫 번째 사용
                    platform_data = data[0]
                    await self._process_platform_data(ticker, platform_data)
                else:
                    logger.warning(f"⚠️ {self.client_name} unexpected data format for {ticker}: {data}")
                
        except httpx.HTTPError as e:
            logger.error(f"❌ {self.client_name} HTTP error for {ticker}: {e}")
        except Exception as e:
            logger.error(f"❌ {self.client_name} fetch error for {ticker}: {e}")
    
    async def _process_platform_data(self, ticker: str, platform_data: dict):
        """플랫폼 데이터 처리"""
        try:
            spread_profiles = platform_data.get('spreadProfilePrices', [])
            if not spread_profiles:
                logger.warning(f"⚠️ {self.client_name} no spread profile data for {ticker}")
                return
            
            # Premium 프로필 사용 (가장 일반적인 스프레드)
            premium_profile = None
            for profile in spread_profiles:
                if profile.get('spreadProfile') == 'premium':
                    premium_profile = profile
                    break
            
            if not premium_profile:
                # Premium이 없으면 첫 번째 프로필 사용
                premium_profile = spread_profiles[0]
            
            bid = premium_profile.get('bid')
            ask = premium_profile.get('ask')
            timestamp = platform_data.get('ts')
            
            if bid is not None and ask is not None:
                # 중간 가격 계산
                mid_price = (float(bid) + float(ask)) / 2.0
                
                # Redis에 데이터 저장
                await self._store_to_redis({
                    'symbol': ticker,
                    'price': mid_price,
                    'bid': bid,
                    'ask': ask,
                    'volume': None,  # Swissquote는 볼륨 정보 제공 안함
                    'timestamp': timestamp,
                    'provider': self.client_name
                })
                
                logger.debug(f"📈 {self.client_name} {ticker}: ${mid_price:.2f} (Bid: ${bid}, Ask: ${ask})")
                
        except Exception as e:
            logger.error(f"❌ {self.client_name} platform data processing error for {ticker}: {e}")
    
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
            stream_key = 'swissquote:realtime'
            
            # 데이터 유효성 검사
            if not data.get('symbol') or data.get('price') is None:
                logger.warning(f"⚠️ {self.client_name} invalid data for redis store: {data}")
                return
            
            # 표준 필드 스키마로 정규화
            entry = {
                'symbol': str(data.get('symbol', '')),
                'price': str(data.get('price', '')),
                'bid': str(data.get('bid', '')),
                'ask': str(data.get('ask', '')),
                'volume': str(data.get('volume', '')),
                'raw_timestamp': str(data.get('timestamp', '')),
                'provider': 'swissquote',
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
            if not self.is_connected:
                return False
            
            # API 키가 없어도 정상 (무료 공개 API)
            # 구독된 티커가 있으면 정상
            return bool(self.subscribed_tickers)
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} health check error: {e}")
            return False
