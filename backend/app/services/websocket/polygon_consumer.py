"""
Polygon.io REST API Consumer 구현
무료 플랜에서는 WebSocket 사용 불가하므로 REST API 폴링 방식 사용
분당 5회 제한 (12초 간격)
"""
import asyncio
import json
import logging
import time
import httpx
from typing import List, Optional, Dict, Any
import os
import redis.asyncio as redis
from app.services.websocket.base_consumer import BaseWSConsumer, ConsumerConfig, AssetType
from app.core.config import GLOBAL_APP_CONFIGS
from app.core.api_key_fallback_manager import APIKeyFallbackManager

logger = logging.getLogger(__name__)


class PolygonWSConsumer(BaseWSConsumer):
    """Polygon.io REST API Consumer (폴링 방식)"""
    
    def __init__(self, config: ConsumerConfig):
        super().__init__(config)
        # API 키 Fallback 매니저 초기화
        self.api_key_manager = APIKeyFallbackManager("polygon")
        self.current_key_info = None
        
        # Polygon.io REST API URLs
        self.base_url = "https://api.polygon.io"
        self.api_timeout = 30
        
        # 폴링 관련 설정
        self._polling_task = None
        self._polling_interval = 30  # 분당 2회 = 30초 간격 (매우 보수적)
        self._last_request_time = 0
        
        # Rate limiting
        self._request_times = []
        self._max_requests_per_minute = 5
        
        # Redis
        self._redis = None
        self._redis_url = self._build_redis_url()
    
    @property
    def client_name(self) -> str:
        return "polygon"
    
    @property
    def api_key(self) -> Optional[str]:
        if self.current_key_info and 'key' in self.current_key_info:
            return self.current_key_info['key']
        return None
    
    async def connect(self) -> bool:
        """REST API 연결 테스트 (API 키 Fallback 지원)"""
        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                # 현재 API 키 정보 가져오기
                self.current_key_info = self.api_key_manager.get_current_key()
                if not self.current_key_info:
                    # 환경 변수에서 직접 읽기
                    import os
                    api_key = os.getenv("POLYGON_API_KEY")
                    if api_key:
                        self.current_key_info = {
                            "key": api_key,
                            "priority": 1,
                            "is_active": True
                        }
                        logger.info(f"🔑 Using Polygon API key from environment variables")
                    else:
                        logger.error("❌ No active Polygon API keys available")
                        return False
                
                if not self.api_key:
                    logger.error("❌ Polygon API key not configured")
                    self.api_key_manager.mark_key_failed(self.current_key_info)
                    retry_count += 1
                    continue
                
                logger.info(f"🔑 Using Polygon API key: {self.api_key_manager.get_key_info_for_logging()}")
                
                # 연결 시도 로그
                from app.services.websocket_orchestrator import log_consumer_connection_attempt
                log_consumer_connection_attempt(self.client_name, retry_count + 1, max_retries)
                
                # API 연결 테스트
                test_url = f"{self.base_url}/v2/aggs/ticker/AAPL/prev"
                params = {"apikey": self.api_key}
                
                async with httpx.AsyncClient() as client:
                    response = await client.get(test_url, params=params, timeout=self.api_timeout)
                    if response.status_code == 200:
                        self.is_connected = True
                        logger.info(f"✅ {self.client_name} REST API connected successfully with key: {self.api_key_manager.get_key_info_for_logging()}")
                        return True
                    else:
                        logger.error(f"❌ Polygon API test failed with status {response.status_code}")
                        failed_key = self.current_key_info['key'] if self.current_key_info else "unknown"
                        self.api_key_manager.mark_key_failed(self.current_key_info)
                        
                        # API 키 fallback 로그
                        from app.services.websocket_orchestrator import log_api_key_fallback, log_consumer_connection_attempt
                        log_api_key_fallback(
                            self.client_name, 
                            failed_key, 
                            "fallback_attempt", 
                            f"API test failed with status {response.status_code}"
                        )
                        log_consumer_connection_attempt(self.client_name, retry_count + 1, max_retries, f"API test failed with status {response.status_code}")
                        
                        retry_count += 1
                        continue
            except Exception as e:
                logger.error(f"❌ {self.client_name} connection test failed: {e}")
                failed_key = self.current_key_info['key'] if self.current_key_info else "unknown"
                self.api_key_manager.mark_key_failed(self.current_key_info)
                
                # API 키 fallback 로그
                from app.services.websocket_orchestrator import log_api_key_fallback, log_consumer_connection_attempt
                log_api_key_fallback(
                    self.client_name, 
                    failed_key, 
                    "fallback_attempt", 
                    f"Connection test failed: {str(e)}"
                )
                log_consumer_connection_attempt(self.client_name, retry_count + 1, max_retries, f"Connection test failed: {str(e)}")
                
                retry_count += 1
                continue
        
        # 모든 재시도 실패
        logger.error(f"❌ {self.client_name} connection failed after {max_retries} attempts")
        return False
    
    async def disconnect(self):
        """REST API 연결 해제"""
        if self._polling_task:
            self._polling_task.cancel()
            try:
                await self._polling_task
            except asyncio.CancelledError:
                pass
        
        self.is_connected = False
        logger.info(f"🔌 {self.client_name} disconnected")
    
    async def subscribe(self, tickers: List[str]) -> bool:
        """티커 구독 (폴링 시작)"""
        if not self.is_connected:
            logger.error(f"❌ {self.client_name} not connected")
            return False
            
        try:
            # 심볼 정규화
            normalized_tickers = [self._normalize_symbol(ticker) for ticker in tickers]
            
            self.subscribed_tickers.update(tickers)
            logger.info(f"📋 {self.client_name} subscribed to: {normalized_tickers}")
            
            # 폴링 태스크 시작
            if not self._polling_task or self._polling_task.done():
                self._polling_task = asyncio.create_task(self._polling_loop())
            
            return True
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} subscription failed: {e}")
            return False
    
    async def unsubscribe(self, tickers: List[str]) -> bool:
        """티커 구독 해제"""
        if not self.is_connected:
            logger.error(f"❌ {self.client_name} not connected")
            return False
            
        try:
            # 심볼 정규화
            normalized_tickers = [self._normalize_symbol(ticker) for ticker in tickers]
            
            self.subscribed_tickers.difference_update(tickers)
            logger.info(f"📋 {self.client_name} unsubscribed from: {normalized_tickers}")
            
            # 구독된 티커가 없으면 폴링 중지
            if not self.subscribed_tickers and self._polling_task:
                self._polling_task.cancel()
                try:
                    await self._polling_task
                except asyncio.CancelledError:
                    pass
            
            return True
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} unsubscription failed: {e}")
            return False
    
    def _normalize_symbol(self, symbol: str) -> str:
        """Polygon.io API에 맞게 심볼 정규화"""
        symbol = symbol.upper()
        
        # Polygon.io 특수 심볼 매핑
        symbol_mapping = {
            'BRK-B': 'BRK.B',  # Berkshire Hathaway Class B
            'BRK-A': 'BRK.A',  # Berkshire Hathaway Class A
        }
        
        return symbol_mapping.get(symbol, symbol)
    
    async def run(self):
        """메인 실행 루프 - 폴링 방식으로 데이터 수집"""
        try:
            if self.is_connected and self.subscribed_tickers:
                await self._polling_loop()
            else:
                logger.error(f"❌ {self.client_name} not connected or no subscriptions")
        except Exception as e:
            logger.error(f"❌ {self.client_name} run error: {e}")
    
    async def _polling_loop(self):
        """폴링 루프 - 분당 5회 제한 (12초 간격)"""
        logger.info(f"🔄 {self.client_name} polling loop started")
        
        while self.is_connected and self.subscribed_tickers:
            try:
                # Rate limiting 체크
                await self._rate_limit()
                
                # 구독된 티커들에 대해 데이터 요청
                for ticker in list(self.subscribed_tickers):
                    await self._fetch_ticker_data(ticker)
                
                # 다음 폴링까지 대기
                await asyncio.sleep(self._polling_interval)
                
            except asyncio.CancelledError:
                logger.info(f"🔄 {self.client_name} polling loop cancelled")
                break
            except Exception as e:
                logger.error(f"❌ {self.client_name} polling loop error: {e}")
                await asyncio.sleep(self._polling_interval)
        
        logger.info(f"🔄 {self.client_name} polling loop ended")
    
    async def _rate_limit(self):
        """Rate limiting - 분당 2회 제한 (매우 보수적)"""
        now = time.time()
        
        # 1분 이전의 요청 기록 제거
        self._request_times = [t for t in self._request_times if now - t < 60]
        
        # 분당 2회 제한 체크 (매우 보수적)
        max_requests = min(self._max_requests_per_minute, 2)
        if len(self._request_times) >= max_requests:
            wait_time = 60 - (now - self._request_times[0]) + 10  # 10초 여유 추가
            if wait_time > 0:
                logger.info(f"⏳ {self.client_name} rate limit reached, waiting {wait_time:.1f}s")
                await asyncio.sleep(wait_time)
                # 대기 후 다시 정리
                now = time.time()
                self._request_times = [t for t in self._request_times if now - t < 60]
        
        # 현재 요청 시간 기록
        self._request_times.append(now)
    
    async def _fetch_ticker_data(self, ticker: str):
        """개별 티커 데이터 가져오기"""
        try:
            # Polygon.io Previous Close API 사용
            url = f"{self.base_url}/v2/aggs/ticker/{ticker}/prev"
            params = {"apikey": self.api_key}
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, timeout=self.api_timeout)
                
                if response.status_code == 200:
                    data = response.json()
                    await self._process_ticker_response(ticker, data)
                else:
                    logger.warning(f"⚠️ {self.client_name} API error for {ticker}: {response.status_code}")
                    
        except Exception as e:
            logger.error(f"❌ {self.client_name} fetch error for {ticker}: {e}")
    
    async def _process_ticker_response(self, ticker: str, data: dict):
        """티커 응답 데이터 처리"""
        try:
            if data.get('status') == 'OK' and data.get('results'):
                result = data['results'][0]
                
                close_price = result.get('c')  # Close price
                volume = result.get('v')       # Volume
                timestamp = result.get('t')    # Timestamp
                
                if close_price is not None:
                    # Redis에 저장
                    await self._store_to_redis({
                        'symbol': ticker,
                        'price': close_price,
                        'volume': volume,
                        'timestamp': timestamp,
                        'provider': self.client_name,
                    })
                    
                    logger.debug(f"📈 {self.client_name} {ticker}: ${close_price} (Vol: {volume})")
            else:
                logger.warning(f"⚠️ {self.client_name} invalid response for {ticker}: {data}")
                
        except Exception as e:
            logger.error(f"❌ {self.client_name} response processing error for {ticker}: {e}")
    
    async def _store_to_redis(self, data: dict):
        """Redis에 데이터 저장 (표준 스키마)"""
        try:
            r = await self._get_redis()
            stream_key = 'polygon:realtime'
            
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
                'provider': 'polygon',
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
            
        except redis.exceptions.BusyLoadingError:
            logger.warning(f"⚠️ [{self.client_name.upper()}] Redis loading, skipping storage for {entry.get('symbol')}")
        except Exception as e:
            logger.error(f"❌ {self.client_name} redis store error: {e}")
    
    async def _perform_health_check(self) -> bool:
        """헬스체크 수행"""
        try:
            if not self.is_connected:
                return False
            
            # API 연결 테스트
            test_url = f"{self.base_url}/v2/aggs/ticker/AAPL/prev"
            params = {"apikey": self.api_key}
            
            async with httpx.AsyncClient() as client:
                response = await client.get(test_url, params=params, timeout=10)
                return response.status_code == 200
                
        except Exception as e:
            logger.error(f"❌ {self.client_name} health check failed: {e}")
            return False
    
    def get_supported_asset_types(self) -> List[AssetType]:
        """지원하는 자산 타입 반환"""
        return [AssetType.STOCK, AssetType.ETF, AssetType.FOREIGN]
    
    def get_max_subscriptions(self) -> int:
        """최대 구독 수 반환"""
        return 5  # Polygon.io 무료 플랜: 분당 5회 API 호출 제한
    
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
