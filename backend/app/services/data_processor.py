"""
Data Processor Service - 중앙화된 데이터 처리 서비스
Redis Stream과 Queue에서 데이터를 읽어 검증하고 PostgreSQL DB에 저장
"""
import asyncio
import json
import logging
import time
import datetime
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from contextlib import asynccontextmanager, contextmanager

import redis.asyncio as redis
from sqlalchemy.orm import Session

from ..core.config import GLOBAL_APP_CONFIGS
from ..models.asset import RealtimeQuote, RealtimeQuoteTimeDelay
from ..models.asset import Asset, OHLCVData, WorldAssetsRanking
from ..crud.asset import crud_ohlcv, crud_asset
from ..utils.logger import logger
from ..utils.redis_queue_manager import RedisQueueManager
from ..utils.helpers import safe_float

logger.info("DataProcessor 모듈 import 완료")

class DataProcessor:
    """
    중앙화된 데이터 처리 서비스
    - Redis Stream에서 실시간 데이터 처리
    - Redis Queue에서 배치 데이터 처리
    - 데이터 검증 및 변환
    - PostgreSQL DB 저장
    - 외부 WebSocket 오류 대응 (다중 백업 소스)
    """
    
    def __init__(self, config_manager=None, redis_queue_manager=None):
        logger.info("DataProcessor 인스턴스 생성 중...")
        self.redis_client: Optional[redis.Redis] = None
        self.running = False
        self.config_manager = config_manager # config_manager is now passed from run_data_processor
        self.redis_queue_manager = redis_queue_manager
        
        # 초기 설정 로드
        self._load_initial_configs()
        
        # 처리 통계 (먼저 초기화)
        self.stats = {
            "realtime_processed": 0,
            "batch_processed": 0,
            "errors": 0,
            "last_processed": None
        }

        
        # Redis 설정
        self.redis_host = GLOBAL_APP_CONFIGS.get("REDIS_HOST", "redis")
        self.redis_port = GLOBAL_APP_CONFIGS.get("REDIS_PORT", 6379)
        self.redis_db = GLOBAL_APP_CONFIGS.get("REDIS_DB", 0)
        self.redis_password = GLOBAL_APP_CONFIGS.get("REDIS_PASSWORD")
        # Redis 비밀번호가 빈 문자열이면 None으로 설정
        if self.redis_password == "":
            self.redis_password = None
        
        # 처리 설정 (DB 설정 우선, 기본값 fallback)
        self.batch_size = int(GLOBAL_APP_CONFIGS.get("REALTIME_BATCH_SIZE", 1000))
        
        # 외부 WebSocket 오류 대응 설정
        self.backup_sources = [
            "binance_websocket",
            "coinbase_websocket", 
            "kraken_websocket",
            "api_fallback"
        ]
        self.current_source_index = 0
        self.source_failures = {}
        self.max_failures_per_source = 5
        self.fallback_interval = 30  # 30초마다 백업 소스 시도 (현재 미사용)
        self.processing_interval = float(GLOBAL_APP_CONFIGS.get("REALTIME_PROCESSING_INTERVAL_SECONDS", 0.1)) # 1초 -> 0.1초 (100ms)
        self.time_window_minutes = int(GLOBAL_APP_CONFIGS.get("WEBSOCKET_TIME_WINDOW_MINUTES", 15))
        self.stream_block_ms = int(GLOBAL_APP_CONFIGS.get("REALTIME_STREAM_BLOCK_MS", 50)) # 100ms -> 50ms
        
        # 현재 설정값 로그 출력
        logger.info(f"⚙️ DataProcessor 설정 로드 완료 - 실시간 처리 간격: {self.processing_interval}초, 시간 윈도우: {self.time_window_minutes}분, 스트림 블록: {self.stream_block_ms}ms")
        
        # Redis Queue Manager (for batch queue + DLQ)
        self.queue_manager = self.redis_queue_manager
        
        # 가격 범위 검증 설정
        self.price_ranges = self._initialize_price_ranges()
        # 우선 순위: DB(ConfigManager) > GLOBAL_APP_CONFIGS
        self.max_retries = (config_manager.get_retry_attempts() if config_manager else GLOBAL_APP_CONFIGS.get("BATCH_PROCESSING_RETRY_ATTEMPTS", 5))
        try:
            self.max_retries = int(self.max_retries)
        except Exception:
            self.max_retries = 5
        self.retry_delay = 5  # 초
        
        # 스트림 및 큐 설정 (실시간 스트림 활성화)
        self.realtime_streams = {
            "finnhub:realtime": "finnhub_processor_group",
            "alpaca:realtime": "alpaca_processor_group",
            "binance:realtime": "binance_processor_group",
            "coinbase:realtime": "coinbase_processor_group",
            "twelvedata:realtime": "twelvedata_processor_group",
            "swissquote:realtime": "swissquote_processor_group",
            # "tiingo:realtime": "tiingo_processor_group",  # 비활성화
        }
        
        # 암호화폐 소스 우선순위 정의 (1=최고 우선순위)
        self.crypto_source_priority = {
            'binance': 1,    # 바이낸스: 거래량 1위, 데이터 갱신 빠름
            'coinbase': 2,   # 코인베이스: 거래량 2위, 안정적
        }
        
        # 소스별 마지막 데이터 수신 시간 추적
        self.source_last_seen = {}
        self.source_health_timeout = 30  # 30초 이상 데이터 없으면 비활성으로 간주 (5초 → 30초로 증가)
        self.batch_queue = "batch_data_queue"
        logger.info("DataProcessor 인스턴스 생성 완료")
    
    def _load_initial_configs(self):
        """초기 설정을 로드합니다."""
        try:
            # GLOBAL_APP_CONFIGS 로드
            from ..core.config import load_and_set_global_configs
            load_and_set_global_configs()
            logger.info("✅ 초기 설정 로드 완료")
        except Exception as e:
            logger.error(f"❌ 초기 설정 로드 실패: {e}")
            # 기본값으로 계속 진행
    
    def get_current_source(self):
        """현재 활성 데이터 소스 반환"""
        return self.backup_sources[self.current_source_index]
    
    def mark_source_failure(self, source):
        """데이터 소스 실패 기록"""
        if source not in self.source_failures:
            self.source_failures[source] = 0
        self.source_failures[source] += 1
        logger.warning(f"🚨 데이터 소스 실패: {source} (실패 횟수: {self.source_failures[source]})")
        
        # 최대 실패 횟수 초과 시 다음 소스로 전환
        if self.source_failures[source] >= self.max_failures_per_source:
            self.switch_to_next_source()
    
    def mark_source_success(self, source):
        """데이터 소스 성공 기록"""
        if source in self.source_failures:
            self.source_failures[source] = 0
        logger.info(f"✅ 데이터 소스 복구: {source}")
    
    def switch_to_next_source(self):
        """다음 백업 소스로 전환"""
        old_source = self.get_current_source()
        self.current_source_index = (self.current_source_index + 1) % len(self.backup_sources)
        new_source = self.get_current_source()
        logger.warning(f"🔄 데이터 소스 전환: {old_source} → {new_source}")
        
        logger.info(f"🔄 데이터 소스 전환: {old_source} → {new_source}")
    
    async def get_backup_data(self, symbols):
        """백업 데이터 소스에서 데이터 가져오기"""
        current_source = self.get_current_source()
        
        try:
            if current_source == "api_fallback":
                # API 폴백: REST API로 데이터 가져오기
                return await self._fetch_from_api_fallback(symbols)
            else:
                # API 폴백 소스들
                return await self._fetch_from_api_fallback(symbols)
                
        except Exception as e:
            logger.error(f"❌ 백업 데이터 소스 실패 ({current_source}): {e}")
            self.mark_source_failure(current_source)
            return None
    
    async def _fetch_from_api_fallback(self, symbols):
        """API 폴백으로 데이터 가져오기"""
        import aiohttp
        
        results = {}
        async with aiohttp.ClientSession() as session:
            for symbol in symbols:
                try:
                    # Binance API 폴백
                    url = f"https://api.binance.com/api/v3/ticker/24hr?symbol={symbol}"
                    async with session.get(url, timeout=5) as response:
                        if response.status == 200:
                            data = await response.json()
                            results[symbol] = {
                                'price': float(data['lastPrice']),
                                'change_amount': float(data['priceChange']),
                                'change_percent': float(data['priceChangePercent']),
                                'timestamp_utc': datetime.now(timezone.utc).isoformat(),
                                'data_source': 'binance_api_fallback'
                            }
                except Exception as e:
                    logger.warning(f"API 폴백 실패 ({symbol}): {e}")
        
        if results:
            self.mark_source_success("api_fallback")
        return results
    

    def _update_source_health(self, source_name: str):
        """소스별 마지막 데이터 수신 시간 업데이트"""
        self.source_last_seen[source_name] = time.time()
        logger.info(f"📊 {source_name} 소스 헬스 업데이트: {datetime.now()}")
    
    def _get_active_crypto_source(self) -> str:
        """현재 활성화된 암호화폐 소스 결정 (페일오버 로직)"""
        current_time = time.time()
        
        logger.debug(f"🔍 페일오버 로직 시작 - 현재 시간: {current_time}")
        logger.debug(f"📊 소스 헬스 상태: {self.source_last_seen}")
        
        # 우선순위 순으로 소스 상태 확인
        for source_name, priority in sorted(self.crypto_source_priority.items(), key=lambda x: x[1]):
            last_seen = self.source_last_seen.get(source_name, 0)
            time_since_last_seen = current_time - last_seen
            
            logger.debug(f"🔍 {source_name} 체크 - 마지막 수신: {last_seen}, 경과 시간: {time_since_last_seen:.1f}초")
            
            # 30초 이내에 데이터를 받았다면 활성 상태
            if time_since_last_seen <= self.source_health_timeout:
                logger.info(f"✅ {source_name} 활성 소스로 선택 (우선순위: {priority}, 마지막 수신: {time_since_last_seen:.1f}초 전)")
                return source_name
            else:
                logger.debug(f"⚠️ {source_name} 비활성 상태 (마지막 수신: {time_since_last_seen:.1f}초 전, 임계값: {self.source_health_timeout}초)")
        
        # 모든 소스가 비활성인 경우, 우선순위가 가장 높은 소스 반환
        fallback_source = min(self.crypto_source_priority.items(), key=lambda x: x[1])[0]
        logger.warning(f"🚨 모든 암호화폐 소스 비활성, {fallback_source}로 페일오버")
        return fallback_source

    async def _connect_redis(self) -> bool:
        """Redis 연결 초기화"""
        try:
            if self.redis_client:
                await self.redis_client.ping()
                return True
                
            # Redis 연결을 비밀번호 없이 시도
            redis_url = f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"
            
            self.redis_client = await redis.from_url(redis_url)
            await self.redis_client.ping()
            logger.info(f"Redis 연결 성공: {self.redis_host}:{self.redis_port}")
            return True
            
        except Exception as e:
            logger.error(f"Redis 연결 실패: {e}")
            return False

    def _initialize_price_ranges(self) -> Dict[str, tuple]:
        """자산별 가격 범위 초기화 (최소값, 최대값)"""
        return {
            # ETF
            'QQQ': (400, 800),      # QQQ: 400-800달러
            'SPY': (300, 700),      # SPY: 300-700달러
            'IWM': (150, 300),      # IWM: 150-300달러
            'VTI': (200, 300),      # VTI: 200-300달러
            
            # Tech Stocks
            'AAPL': (100, 300),     # AAPL: 100-300달러
            'MSFT': (200, 500),     # MSFT: 200-500달러
            'GOOGL': (100, 200),    # GOOGL: 100-200달러
            'AMZN': (100, 200),     # AMZN: 100-200달러
            'META': (200, 500),     # META: 200-500달러
            'NVDA': (100, 1000),    # NVDA: 100-1000달러
            'TSLA': (100, 500),     # TSLA: 100-500달러
            'NFLX': (300, 800),     # NFLX: 300-800달러
            
            # Financial
            'JPM': (100, 200),      # JPM: 100-200달러
            'BAC': (20, 50),        # BAC: 20-50달러
            'WFC': (30, 80),        # WFC: 30-80달러
            
            # Healthcare
            'JNJ': (140, 200),      # JNJ: 140-200달러
            'PFE': (20, 60),        # PFE: 20-60달러
            'UNH': (400, 600),      # UNH: 400-600달러
            
            # Energy
            'XOM': (80, 150),       # XOM: 80-150달러
            'CVX': (100, 200),      # CVX: 100-200달러
            
            # Consumer
            'WMT': (120, 200),      # WMT: 120-200달러
            'PG': (130, 180),       # PG: 130-180달러
            'KO': (50, 80),         # KO: 50-80달러
            
            # Crypto (USD 기준)
            'BTC': (20000, 100000), # BTC: 20K-100K달러
            'ETH': (1000, 10000),   # ETH: 1K-10K달러
            
            # Commodities
            'GOLD': (1800, 2500),   # GOLD: 1800-2500달러
            'SILVER': (20, 50),     # SILVER: 20-50달러
        }
    
    def _get_asset_ticker(self, asset_id: int) -> Optional[str]:
        """자산 ID로 티커 조회"""
        try:
            # PostgreSQL에서 직접 조회
            from ..core.database import get_postgres_db
            pg_db = next(get_postgres_db())
            try:
                asset = pg_db.query(Asset).filter(Asset.asset_id == asset_id).first()
                return asset.ticker if asset else None
            finally:
                pg_db.close()
        except Exception as e:
            logger.warning(f"자산 티커 조회 실패 asset_id={asset_id}: {e}")
            return None
    
    def _validate_price_range(self, asset_id: int, price: float, ticker: str = None) -> bool:
        """자산별 가격 범위 검증"""
        try:
            # 티커가 없으면 조회
            if not ticker:
                ticker = self._get_asset_ticker(asset_id)
                if not ticker:
                    logger.warning(f"🚨 자산 정보 없음: asset_id={asset_id}")
                    return False
            
            # 가격 범위 확인
            if ticker in self.price_ranges:
                min_price, max_price = self.price_ranges[ticker]
                if price < min_price or price > max_price:
                    logger.warning(f"🚨 가격 범위 초과: {ticker}={price:.2f}, "
                                  f"정상범위={min_price}-{max_price}")
                    return False
                else:
                    logger.debug(f"✅ 가격 범위 검증 통과: {ticker}={price:.2f}")
            else:
                # 정의되지 않은 자산은 기본 검증 (양수)
                if price <= 0:
                    logger.warning(f"🚨 가격이 0 이하: {ticker}={price}")
                    return False
                logger.debug(f"✅ 기본 가격 검증 통과: {ticker}={price:.2f}")
            
            return True
            
        except Exception as e:
            logger.error(f"가격 범위 검증 실패 asset_id={asset_id}, price={price}: {e}")
            return False
    
    def _validate_realtime_quote(self, record_data: Dict[str, Any]) -> bool:
        """실시간 인용 데이터 종합 검증"""
        try:
            asset_id = record_data.get('asset_id')
            price = record_data.get('price')
            data_source = record_data.get('data_source', 'unknown')
            
            # 기본 데이터 검증
            if not asset_id or price is None:
                logger.warning(f"🚨 필수 데이터 누락: asset_id={asset_id}, price={price}")
                return False
            
            # 가격 범위 검증
            if not self._validate_price_range(asset_id, price):
                return False
            
            logger.debug(f"✅ 실시간 인용 검증 통과: asset_id={asset_id}, price={price:.2f}, source={data_source}")
            return True
            
        except Exception as e:
            logger.error(f"실시간 인용 검증 실패: {e}")
            return False

    def _get_time_window(self, timestamp: datetime, interval_minutes: int = None) -> datetime:
        """지정된 분 단위로 시간 윈도우 계산 (설정값 또는 기본 15분 단위로 반올림)"""
        try:
            if interval_minutes is None:
                interval_minutes = self.time_window_minutes
            
            # 분 단위로 반올림 (12:07 -> 12:00, 12:22 -> 12:15)
            minute = (timestamp.minute // interval_minutes) * interval_minutes
            return timestamp.replace(minute=minute, second=0, microsecond=0)
        except Exception as e:
            logger.warning(f"시간 윈도우 계산 실패: {e}")
            return timestamp

    def _parse_timestamp(self, timestamp_str: str, provider: str = None) -> datetime:
        """타임스탬프 문자열을 파싱하고 UTC로 변환합니다."""
        try:
            # 먼저 표준 ISO 형식으로 시도
            parsed_time = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            # UTC로 변환
            if parsed_time.tzinfo is not None:
                return parsed_time.astimezone(timezone.utc).replace(tzinfo=None)
            return parsed_time
        except ValueError:
            try:
                # Unix timestamp (milliseconds) 형태인지 확인
                if timestamp_str.isdigit() and len(timestamp_str) >= 10:
                    # 밀리초 단위 Unix timestamp를 초 단위로 변환
                    timestamp_ms = int(timestamp_str)
                    if len(timestamp_str) > 10:  # 밀리초가 포함된 경우
                        timestamp_seconds = timestamp_ms / 1000.0
                    else:  # 초 단위인 경우
                        timestamp_seconds = timestamp_ms
                    # Unix timestamp는 이미 UTC 기준이므로 그대로 사용
                    return datetime.fromtimestamp(timestamp_seconds)
                
                # 마이크로초가 6자리를 초과하는 경우 처리
                if '.' in timestamp_str and len(timestamp_str.split('.')[1]) > 6:
                    # 마이크로초를 6자리로 자르기
                    parts = timestamp_str.split('.')
                    if len(parts) == 2:
                        base_time = parts[0]
                        microseconds = parts[1][:6]  # 6자리로 자르기
                        timezone_part = ''
                        if '-' in microseconds or '+' in microseconds:
                            # 타임존 정보가 마이크로초에 포함된 경우
                            for i, char in enumerate(microseconds):
                                if char in ['-', '+']:
                                    microseconds = microseconds[:i]
                                    timezone_part = parts[1][i:]
                                    break
                        timestamp_str = f"{base_time}.{microseconds}{timezone_part}"
                        parsed_time = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                        # UTC로 변환
                        if parsed_time.tzinfo is not None:
                            return parsed_time.astimezone(timezone.utc).replace(tzinfo=None)
                        return parsed_time
            except (ValueError, OSError):
                pass
            
            # 모든 파싱이 실패하면 현재 UTC 시간 반환
            logger.warning(f"타임스탬프 파싱 실패: {timestamp_str}, 현재 UTC 시간 사용")
            return datetime.utcnow()

    def _determine_actual_interval(self, current_ts: datetime, items: List[Dict], current_index: int) -> Optional[str]:
        """timestamp_utc를 분석해서 실제 주기를 판단합니다."""
        try:
            if not isinstance(current_ts, datetime):
                return None
            
            # 일봉 데이터의 경우 기본적으로 1d 반환
            # 주봉/월봉은 별도의 로직으로 판단해야 함
            
            # 현재 데이터가 월말인지 확인 (월의 마지막 날)
            from calendar import monthrange
            year, month = current_ts.year, current_ts.month
            last_day_of_month = monthrange(year, month)[1]
            is_month_end = current_ts.day == last_day_of_month
            
            # 현재 데이터가 주말인지 확인 (금요일)
            is_friday = current_ts.weekday() == 4  # 4 = 금요일
            
            # 주봉/월봉 판단은 더 정교한 로직이 필요
            # 현재는 일봉 데이터만 처리하므로 기본적으로 1d 반환
            # TODO: 향후 주봉/월봉 데이터 수집 시 별도 로직 구현
            
            # 월말이면서 금요일인 경우에만 월봉으로 판단
            if is_month_end and is_friday:
                return "1m"  # 월말 금요일이면 월봉
            # 금요일이지만 월말이 아닌 경우는 일봉으로 처리
            elif is_friday:
                return "1d"  # 금요일이지만 월말이 아니면 일봉
            else:
                return "1d"  # 기본 일봉
                
        except Exception as e:
            logger.warning(f"주기 판단 실패: {e}")
            return "1d"  # 실패 시에도 기본값으로 1d 반환

    @asynccontextmanager
    async def get_db_session(self):
        """데이터베이스 세션 비동기 컨텍스트 매니저"""
        from ..core.database import get_postgres_db
        db = next(get_postgres_db())
        try:
            yield db
        except Exception as e:
            db.rollback()
            raise
        finally:
            db.close()


    async def _process_realtime_streams(self) -> int:
        """실시간 스트림 데이터 처리 - Consumer Group 사용"""
        logger.debug("🚀 _process_realtime_streams 시작")

        
        
        # WebSocket 전송 테스트 (스트림 처리 시작 시)
        logger.info("🧪 WebSocket 전송 테스트 - 스트림 처리 시작")
        
        if not self.redis_client:
            logger.info("Redis client not available for realtime streams")
            return 0
            
        processed_count = 0
        logger.info(f"Processing realtime streams: {list(self.realtime_streams.keys())}")
        
        try:
            logger.debug("✅ try 블록 진입")
            logger.debug("🔧 Consumer Group 생성 시작")
            # Consumer Group 생성 및 TTL 설정 (각 스트림별)
            for stream_name in self.realtime_streams.keys():
                try:
                    group_name = self.realtime_streams[stream_name]
                    logger.debug(f"🔧 Consumer Group 생성 시도: {stream_name} -> {group_name}")
                    await self.redis_client.xgroup_create(
                        name=stream_name, 
                        groupname=group_name, 
                        id="0", 
                        mkstream=True
                    )
                    logger.info(f"✅ Created consumer group {group_name} on {stream_name}")
                    
                    # 생산자 측에서 MAXLEN을 적용하므로 소비자 측 트림은 제거
                    
                except Exception as e:
                    if "BUSYGROUP" not in str(e):
                        logger.warning(f"⚠️ xgroup_create skip {stream_name}: {e}")
                    else:
                        logger.debug(f"ℹ️ Consumer group {group_name} already exists on {stream_name}")
                        # 생산자 측에서 MAXLEN을 적용하므로 소비자 측 트림은 제거
            
            logger.debug("📖 Consumer Group으로 데이터 읽기 시작")
            # Consumer Group으로 데이터 읽기 (각 스트림별로 개별 처리)
            all_stream_data = []
            for stream_name in self.realtime_streams.keys():
                group_name = self.realtime_streams[stream_name]
                try:
                    logger.debug(f"📖 스트림 {stream_name} 읽기 시도 (group: {group_name})")
                    
                    # 스트림 존재 여부 확인
                    stream_exists = await self.redis_client.exists(stream_name)
                    if not stream_exists:
                        logger.debug(f"📭 스트림 {stream_name}이 존재하지 않음, 건너뜀")
                        continue
                    
                    stream_data = await self.redis_client.xreadgroup(
                        groupname=group_name,
                        consumername="data_processor_worker",
                        streams={stream_name: ">"},
                        count=self.batch_size,
                        block=self.stream_block_ms  # 설정 가능한 블록 시간
                    )
                    logger.info(f"📖 스트림 {stream_name} 읽기 결과: {len(stream_data) if stream_data else 0}개 메시지")
                    if stream_data:
                        all_stream_data.extend(stream_data)
                except Exception as e:
                    import traceback
                    logger.error(f"❌ 스트림 {stream_name} 읽기 실패: {e}")
                    logger.error(f"🔍 오류 상세: {traceback.format_exc()}")
                    # 스트림별 오류를 개별적으로 처리하고 계속 진행
                    continue
            
            if not all_stream_data:
                return 0
                
            records_to_save = []
            ack_items = []
            
            # 자산 정보 캐시 (성능 최적화)
            from ..core.database import get_postgres_db
            pg_db = next(get_postgres_db())
            try:
                assets = pg_db.query(Asset.ticker, Asset.asset_id).all()
                ticker_to_asset_id = {ticker: asset_id for ticker, asset_id in assets}
            finally:
                pg_db.close()
            
            # 현재 활성화된 암호화폐 소스 결정
            active_crypto_source = self._get_active_crypto_source()
            logger.info(f"🎯 현재 활성 암호화폐 소스: {active_crypto_source}")

            # 메시지 처리 (스트리밍 방식으로 변경)
            for stream_name_bytes, messages in all_stream_data:
                stream_name_str = stream_name_bytes.decode('utf-8') if isinstance(stream_name_bytes, bytes) else stream_name_bytes
                stream_name_str = stream_name.decode('utf-8') if isinstance(stream_name, bytes) else stream_name
                group_name = self.realtime_streams[stream_name_str]
                source_name = stream_name_str.split(':')[0]  # 'binance:realtime' -> 'binance'
                
                logger.info(f"📥 스트림 {stream_name_str}에서 {len(messages)}개 메시지 처리 시작")
                
                # 실제 메시지가 있을 때만 마지막 수신 시간 업데이트
                if messages:
                    self._update_source_health(source_name)
                    logger.info(f"📊 {source_name} 소스 헬스 업데이트: {self.source_last_seen.get(source_name)}")
                else:
                    logger.info(f"📭 {source_name} 소스에 메시지 없음, 헬스 업데이트 안함")
                
                # 암호화폐 스트림인 경우, 활성 소스의 데이터만 처리
                if source_name in self.crypto_source_priority:
                    if source_name != active_crypto_source:
                        # 활성 소스가 아니면 메시지는 소비하되, 데이터 처리는 건너뜀 (중복 방지)
                        logger.info(f"⏭️ {source_name} 비활성 소스, 메시지 소비만 수행 (활성: {active_crypto_source})")
                        if messages:
                            # 메시지 ACK만 수행하고 데이터 처리는 건너뜀
                            for message_id, _ in messages:
                                ack_items.append((stream_name_str, group_name, message_id))
                        continue  # 다음 스트림으로 넘어감
                    else:
                        logger.info(f"✅ {source_name} 활성 소스, 데이터 처리 진행")
                
                for message_id, message_data in messages:
                    try: # 개별 메시지 처리 루프
                        logger.debug(f"🔍 메시지 {message_id} 처리 시작")
                        logger.debug(f"📋 원본 메시지 데이터: {message_data}")
                        
                        # Redis 스트림 데이터 파싱 (프로바이더별 형식 처리)
                        symbol = None
                        price = None
                        volume = None
                        raw_timestamp = None
                        provider = None
                        
                        # 표준 필드 스키마 (모든 프로바이더 동일)
                        symbol = message_data.get(b'symbol', b'').decode('utf-8').upper()
                        price = safe_float(message_data.get(b'price', b'').decode('utf-8'))
                        volume = safe_float(message_data.get(b'volume', b'').decode('utf-8'))
                        raw_timestamp = message_data.get(b'raw_timestamp', b'').decode('utf-8')
                        provider = message_data.get(b'provider', b'unknown').decode('utf-8')
                        
                        logger.debug(f"📊 파싱된 데이터 - symbol: {symbol}, price: {price}, volume: {volume}, provider: {provider}")
                        
                        # 이전 형식 호환성 (data 필드가 있는 경우)
                        if not symbol and b'data' in message_data:
                            logger.debug("🔄 이전 형식 데이터 감지, JSON 파싱 시도")
                            try:
                                data_json = json.loads(message_data[b'data'].decode('utf-8'))
                                symbol = data_json.get('symbol', '').upper()
                                price = safe_float(data_json.get('price'))
                                volume = safe_float(data_json.get('volume'))
                                raw_timestamp = str(data_json.get('raw_timestamp', ''))
                                provider = message_data.get(b'provider', b'finnhub').decode('utf-8')
                                logger.debug(f"✅ JSON 파싱 성공 - symbol: {symbol}, price: {price}")
                            except (json.JSONDecodeError, KeyError) as e:
                                logger.warning(f"❌ Legacy data JSON 파싱 실패: {e}")
                                continue
                        
                        if not symbol or price is None:
                            logger.warning(f"⚠️ 필수 데이터 누락 - symbol: {symbol}, price: {price}")
                            continue
                            
                        # 심볼 정규화 (BINANCE:BTCUSDT -> BTCUSDT)
                        original_symbol = symbol
                        if ':' in symbol:
                            symbol = symbol.split(':')[-1]
                            logger.debug(f"🔄 심볼 정규화: {original_symbol} -> {symbol}")
                        
                        # Coinbase provider의 경우 심볼 형식 변환 (ETH-USD -> ETHUSDT, DOGE-USD -> DOGEUSDT)
                        if provider == 'coinbase':
                            # 일반 규칙: XXX-USD -> XXXUSDT, 예외는 개별 매핑
                            if symbol.endswith('-USD') and len(symbol) > 4:
                                base = symbol[:-4]
                                symbol = f"{base}USDT"
                                logger.debug(f"🔄 Coinbase 심볼 일반 변환: {original_symbol} -> {symbol}")
                            # 필요시 예외 매핑 추가
                            coinbase_overrides = {
                                'WBTC-USD': 'WBTCUSDT',
                                'PAXG-USD': 'PAXGUSDT'
                            }
                            if original_symbol in coinbase_overrides:
                                symbol = coinbase_overrides[original_symbol]
                                logger.debug(f"🔄 Coinbase 심볼 예외 변환: {original_symbol} -> {symbol}")
                        
                        # 공통 보정: 베이스 심볼을 USDT 페어로 보정 (예: BTC -> BTCUSDT)
                        # - 대상: binance, coinbase
                        # - 조건: 이미 USDT 접미사가 아니고, 코인베이스의 -USD 규칙이 적용되지 않은 경우
                        if provider in ('binance', 'coinbase'):
                            if not symbol.endswith('USDT') and '-' not in symbol:
                                candidate_usdt = f"{symbol}USDT"
                                if candidate_usdt in ticker_to_asset_id:
                                    logger.debug(f"🔄 베이스→USDT 보정: {symbol} -> {candidate_usdt}")
                                    symbol = candidate_usdt
                        
                        # Swissquote provider의 경우 심볼 역정규화 (XAU/USD -> GCUSD, XAG/USD -> SIUSD)
                        if provider == 'swissquote':
                            swissquote_mapping = {
                                'XAU/USD': 'GCUSD',
                                'XAG/USD': 'SIUSD'
                            }
                            if symbol in swissquote_mapping:
                                symbol = swissquote_mapping[symbol]
                                logger.debug(f"🔄 Swissquote 심볼 역정규화: {original_symbol} -> {symbol}")
                            
                        asset_id = ticker_to_asset_id.get(symbol)
                        if not asset_id:
                            # Fallbacks for crypto symbols: try base/USDT/-USD forms
                            if provider in ('binance', 'coinbase'):
                                fallback_candidates = []
                                if symbol.endswith('USDT'):
                                    base = symbol[:-4]
                                    fallback_candidates = [base, f"{base}-USD"]
                                elif symbol.endswith('-USD'):
                                    base = symbol[:-4]
                                    fallback_candidates = [f"{base}USDT", base]
                                else:
                                    base = symbol
                                    fallback_candidates = [f"{base}USDT", f"{base}-USD", base]

                                for cand in fallback_candidates:
                                    if cand in ticker_to_asset_id:
                                        logger.debug(f"🔄 Fallback symbol mapping: {symbol} -> {cand}")
                                        symbol = cand
                                        asset_id = ticker_to_asset_id[cand]
                                        break

                        if not asset_id:
                            logger.warning(f"❌ 자산 매칭 실패 - symbol: {symbol} (사용 가능한 자산: {list(ticker_to_asset_id.keys())[:10]}...)")
                            continue
                            
                        logger.debug(f"✅ 자산 매칭 성공 - symbol: {symbol} -> asset_id: {asset_id}")
                        
                        # 타임스탬프 파싱 (UTC로 변환)
                        timestamp_utc = self._parse_timestamp(raw_timestamp, provider) if raw_timestamp else datetime.utcnow()
                        logger.debug(f"⏰ 타임스탬프: {timestamp_utc}")
                        

                        # --- 즉시 발행 로직 (Streaming) ---
                        websocket_data = {
                            "asset_id": asset_id,
                            "ticker": symbol,
                            "timestamp_utc": timestamp_utc,
                            "price": price,
                            "volume": volume,
                            "data_source": provider[:32]  # 32자 제한
                        }
                        
                        # DB 저장용 데이터 준비 (ticker 필드 제외)
                        db_quote_data = websocket_data.copy()
                        del db_quote_data['ticker']
                        
                        # DB 저장 목록에 추가
                        records_to_save.append(db_quote_data)
                        ack_items.append((stream_name_str, group_name, message_id))
                        logger.debug(f"✅ 메시지 {message_id} 처리 완료 및 저장 대기")

                    except Exception as e:
                        import traceback
                        logger.error(f"❌ 스트림 메시지 {message_id} 처리 실패: {e}")
                        logger.error(f"🔍 오류 상세: {traceback.format_exc()}")
                        self.stats["errors"] += 1

            # 데이터베이스에 저장
            if records_to_save:
                logger.info(f"💾 {len(records_to_save)}개 레코드를 DB에 저장 시작")
                save_success = await self._bulk_save_realtime_quotes(records_to_save)
                if save_success:
                    processed_count = len(records_to_save)
                    logger.info(f"✅ DB 저장 성공: {processed_count}개 레코드")
                else:
                    logger.error("❌ DB 저장 실패")
            else:
                logger.info("📭 저장할 레코드가 없음")
            
            # 모든 메시지 ACK (활성/비활성 소스 구분 없이)
            if ack_items:
                ack_count = 0
                for stream_name, group_name, message_id in ack_items:
                    try:
                        await self.redis_client.xack(stream_name, group_name, message_id)
                        ack_count += 1
                    except Exception as e:
                        logger.warning(f"❌ ACK 실패 {stream_name}:{message_id}: {e}")
                logger.info(f"✅ ACK 완료: {ack_count}/{len(ack_items)}개 메시지")
            
            # 주기적 Stream TTL 정리는 생산자 MAXLEN 적용으로 불필요
                    
        except Exception as e:
            import traceback
            # 예외 메시지가 스트림 이름인 경우 특별 처리
            error_msg = str(e)
            if error_msg.startswith("b'") and error_msg.endswith("'"):
                logger.error(f"실시간 스트림 처리 중 스트림 이름 오류: {error_msg}")
                logger.error("이는 스트림 데이터 형식 오류일 가능성이 높습니다.")
            else:
                logger.error(f"실시간 스트림 처리 중 오류: {error_msg}")
            logger.error(f"오류 상세: {traceback.format_exc()}")
            self.stats["errors"] += 1
            
        return processed_count

    async def _process_batch_queue(self) -> int:
        """배치 큐 데이터 처리"""
        if not self.redis_client:
            return 0
            
        processed_count = 0
        
        try:
            # 큐에서 데이터 가져오기 (최대 100개씩)
            for _ in range(100):
                # Prefer RedisQueueManager pop; fallback to direct BLPOP
                task_wrapper = None
                if self.queue_manager:
                    task_wrapper = await self.queue_manager.pop_batch_task(timeout_seconds=1)
                else:
                    result = await self.redis_client.blpop(self.batch_queue, timeout=0.5)
                    if result:
                        _, task_data = result
                        try:
                            task_wrapper = json.loads(task_data)
                        except json.JSONDecodeError:
                            task_wrapper = None

                if not task_wrapper:
                    break
                
                # 태스크 정보 로깅
                task_type = task_wrapper.get("task_type", "unknown")
                logger.info(f"배치 큐에서 태스크 수신: {task_type}")
                    
                # Retry loop per task
                attempts = 0
                while attempts <= self.max_retries:
                    attempts += 1
                    try:
                        success = await self._process_batch_task(task_wrapper)
                        if success:
                            logger.info(f"Task {task_wrapper.get('type')} processed successfully.")
                            processed_count += 1
                            break  # 성공 시 루프 종료
                        else:
                            # 처리 로직에서 False를 반환한 경우 (일시적 오류일 수 있음)
                            raise RuntimeError(f"Task processing for {task_wrapper.get('type')} returned False.")
                    except Exception as e:
                        logger.warning(f"Attempt {attempts}/{self.max_retries} failed for task {task_wrapper.get('type')}: {e}")
                        if attempts > self.max_retries:
                            # 최대 재시도 횟수 초과 시 DLQ로 이동
                            try:
                                raw_json = json.dumps(task_wrapper, ensure_ascii=False)
                            except Exception:
                                raw_json = str(task_wrapper)
                            if self.queue_manager:
                                await self.queue_manager.move_to_dlq(raw_json, str(e))
                            logger.error(f"Task failed after max retries, moving to DLQ: {e}")
                            self.stats["errors"] += 1
                            break
                        # 재시도 전 잠시 대기
                        await asyncio.sleep(self.retry_delay)
                    
        except Exception as e:
            logger.error(f"배치 큐 처리 중 오류: {e}")
            self.stats["errors"] += 1
            
        return processed_count

    async def _process_batch_task(self, task: Dict[str, Any]) -> bool:
        """배치 태스크 처리"""
        try:
            task_type = task.get("type")
            payload = task.get("payload")
            
            if not task_type or not payload:
                return False
                
            # 표준 페이로드: {"items": [...]} 우선 사용, 아니면 기존 payload를 리스트로 래핑
            items = payload.get("items") if isinstance(payload, dict) else None
            if items is None:
                items = payload if isinstance(payload, list) else [payload]

            # 태스크 타입별 처리 로직 (신/구 키 모두 지원)
            if task_type == "stock_profile":
                return await self._save_stock_profile(items)
            elif task_type == "stock_financials":
                return await self._save_stock_financials(items)
            elif task_type == "stock_estimate":
                return await self._save_stock_estimate(items)
            elif task_type == "etf_info":
                return await self._save_etf_info(items)
            elif task_type in ("crypto_info", "crypto_data"):
                return await self._save_crypto_data(items)
            elif task_type in ("ohlcv_data", "ohlcv_day_data", "ohlcv_intraday_data"):
                # metadata 정보 추출
                metadata = payload.get("metadata", {}) if isinstance(payload, dict) else {}
                logger.info(f"Processing {task_type} task: items_count={len(items)}, metadata={metadata}")
                return await self._save_ohlcv_data(items, metadata)
            elif task_type == "index_data":
                return await self._save_index_data(items)
            elif task_type == "technical_indicators":
                return await self._save_technical_indicators(items)
            elif task_type == "onchain_metric":
                return await self._save_onchain_metric(items)
            elif task_type == "world_assets_ranking":
                # metadata 정보 추출
                metadata = payload.get("metadata", {}) if isinstance(payload, dict) else {}
                data_source = metadata.get('data_source', 'unknown')
                logger.info(f"배치 태스크 처리 시작: world_assets_ranking, data_source: {data_source}, items: {len(items)}개")
                return await self._save_world_assets_ranking(items, metadata)
            elif task_type == "asset_settings_update":
                return await self._update_asset_settings(payload)
            else:
                logger.warning(f"알 수 없는 태스크 타입: {task_type}")
                return False
                
        except Exception as e:
            logger.error(f"배치 태스크 처리 실패: {e}")
            return False


    async def _bulk_save_realtime_quotes(self, records: List[Dict[str, Any]]) -> bool:
        """실시간 인용 데이터 일괄 저장 - PostgreSQL"""
        try:
            logger.info(f"💾 RealtimeQuote 저장 시작: {len(records)}개 레코드")
            
            # PostgreSQL 세션 생성
            from ..core.database import get_postgres_db
            logger.debug("🔗 PostgreSQL 데이터베이스 세션 생성 중...")
            postgres_db = next(get_postgres_db())
            logger.debug("✅ PostgreSQL 데이터베이스 세션 생성 완료")
            
            try:
                # 데이터 검증 및 필터링
                validated_records = []
                validation_failed_count = 0
                
                for i, record_data in enumerate(records):
                    if self._validate_realtime_quote(record_data):
                        validated_records.append(record_data)
                    else:
                        validation_failed_count += 1
                        logger.warning(f"🚨 검증 실패로 제외: asset_id={record_data.get('asset_id')}, "
                                      f"price={record_data.get('price')}, source={record_data.get('data_source')}")
                
                logger.info(f"✅ 검증 완료: {len(validated_records)}/{len(records)}개 레코드 통과 "
                           f"(실패: {validation_failed_count}개)")
                
                if not validated_records:
                    logger.warning("🚨 검증을 통과한 레코드가 없습니다.")
                    return False
                
                # ----- 벌크 UPSERT로 리팩터링 -----
                from sqlalchemy.dialects.postgresql import insert
                from sqlalchemy import func
                # 환경설정: 배치 크기
                import os, time as _time
                BULK_UPSERT_ENABLED = os.getenv("BULK_UPSERT_ENABLED", "true").lower() == "true"
                BATCH_SIZE = int(os.getenv("BULK_BATCH_SIZE", "1000"))

                success_count = 0
                if not BULK_UPSERT_ENABLED:
                    logger.info("ℹ️ BULK_UPSERT_ENABLED=false: 기존 로직 유지가 설정되어 있습니다.")
                    BATCH_SIZE = 1

                # 지연 테이블 모델 임포트
                from ..models.asset import RealtimeQuoteTimeDelay as PGRealtimeQuoteTimeDelay

                # 유틸: 숫자값 정규화(오버플로 방지)
                def _sanitize_number(val, min_abs=0.0, max_abs=1e9, digits=8):
                    try:
                        if val is None:
                            return None
                        f = float(val)
                        if not (f == f) or f == float('inf') or f == float('-inf'):
                            return None
                        if abs(f) < min_abs:
                            f = 0.0
                        if abs(f) > max_abs:
                            return None
                        return round(f, digits)
                    except Exception:
                        return None

                # 배치 단위로 분할 처리
                for start_idx in range(0, len(validated_records), BATCH_SIZE):
                    batch = validated_records[start_idx:start_idx + BATCH_SIZE]
                    if not batch:
                        continue

                    # 실시간 테이블용 데이터(중복 asset_id는 마지막 레코드로 덮어쓰기)
                    dedup_rt = {}
                    for rec in batch:
                        r = rec.copy()
                        r['price'] = _sanitize_number(r.get('price'))
                        r['volume'] = _sanitize_number(r.get('volume'))
                        r['change_amount'] = _sanitize_number(r.get('change_amount'))
                        r['change_percent'] = _sanitize_number(r.get('change_percent'))
                        if r['price'] is None:
                            continue
                        dedup_rt[r['asset_id']] = r
                    realtime_rows = list(dedup_rt.values())

                    # 지연 테이블용 데이터 (timestamp 윈도우 적용 + 중복 키 제거)
                    delay_dedup = {}
                    for rec in batch:
                        d = rec.copy()
                        tw = self._get_time_window(rec['timestamp_utc'])
                        d['timestamp_utc'] = tw
                        d['data_interval'] = f"{self.time_window_minutes}m"
                        d['price'] = _sanitize_number(d.get('price'))
                        d['volume'] = _sanitize_number(d.get('volume'))
                        d['change_amount'] = _sanitize_number(d.get('change_amount'))
                        d['change_percent'] = _sanitize_number(d.get('change_percent'))
                        if d['price'] is None:
                            continue
                        key = (d['asset_id'], d['timestamp_utc'], d['data_source'])
                        delay_dedup[key] = d
                    delay_rows = list(delay_dedup.values())

                    start_ts = _time.time()
                    try:
                        # 실시간 테이블 벌크 UPSERT
                        realtime_stmt = insert(RealtimeQuote).values(realtime_rows)
                        realtime_stmt = realtime_stmt.on_conflict_do_update(
                            index_elements=['asset_id'],
                            set_={
                                'timestamp_utc': realtime_stmt.excluded.timestamp_utc,
                                'price': realtime_stmt.excluded.price,
                                'volume': realtime_stmt.excluded.volume,
                                'change_amount': realtime_stmt.excluded.change_amount,
                                'change_percent': realtime_stmt.excluded.change_percent,
                                'data_source': realtime_stmt.excluded.data_source,
                                'updated_at': func.now()
                            }
                        )
                        postgres_db.execute(realtime_stmt)

                        # 지연 테이블 벌크 UPSERT
                        delay_stmt = insert(PGRealtimeQuoteTimeDelay).values(delay_rows)
                        delay_stmt = delay_stmt.on_conflict_do_update(
                            index_elements=['asset_id', 'timestamp_utc', 'data_source'],
                            set_={
                                'price': delay_stmt.excluded.price,
                                'volume': delay_stmt.excluded.volume,
                                'change_amount': delay_stmt.excluded.change_amount,
                                'change_percent': delay_stmt.excluded.change_percent,
                                'updated_at': func.now()
                            }
                        )
                        postgres_db.execute(delay_stmt)

                        postgres_db.commit()
                        batch_dur = _time.time() - start_ts
                        success_count += len(batch)
                        logger.info(f"✅ Bulk upsert 완료 size={len(batch)} took={batch_dur:.3f}s rps={len(batch)/batch_dur if batch_dur>0 else float('inf'):.1f}")
                    except Exception as e:
                        import traceback
                        logger.error(f"❌ Bulk upsert 실패(size={len(batch)}): {e}")
                        logger.error(f"🔍 오류 상세: {traceback.format_exc()}")
                        postgres_db.rollback()
                        # 배치 실패 시 개별 재시도(간단한 폴백)
                        for i, record_data in enumerate(batch):
                            try:
                                single_stmt = insert(RealtimeQuote).values(**record_data)
                                single_stmt = single_stmt.on_conflict_do_update(
                                    index_elements=['asset_id'],
                                    set_={
                                        'timestamp_utc': single_stmt.excluded.timestamp_utc,
                                        'price': single_stmt.excluded.price,
                                        'volume': single_stmt.excluded.volume,
                                        'change_amount': single_stmt.excluded.change_amount,
                                        'change_percent': single_stmt.excluded.change_percent,
                                        'data_source': single_stmt.excluded.data_source,
                                        'updated_at': func.now()
                                    }
                                )
                                postgres_db.execute(single_stmt)

                                tw = self._get_time_window(record_data['timestamp_utc'])
                                delay_data = record_data.copy()
                                delay_data['timestamp_utc'] = tw
                                delay_data['data_interval'] = f"{self.time_window_minutes}m"
                                single_delay = insert(PGRealtimeQuoteTimeDelay).values(**delay_data)
                                single_delay = single_delay.on_conflict_do_update(
                                    index_elements=['asset_id', 'timestamp_utc', 'data_source'],
                                    set_={
                                        'price': single_delay.excluded.price,
                                        'volume': single_delay.excluded.volume,
                                        'change_amount': single_delay.excluded.change_amount,
                                        'change_percent': single_delay.excluded.change_percent,
                                        'updated_at': func.now()
                                    }
                                )
                                postgres_db.execute(single_delay)
                                postgres_db.commit()
                                success_count += 1
                            except Exception as se:
                                logger.error(f"❌ 폴백 단건 저장 실패: {se}")
                                postgres_db.rollback()
                        
            finally:
                logger.debug("🔗 PostgreSQL 데이터베이스 세션 종료 중...")
                postgres_db.close()
                logger.debug("✅ PostgreSQL 데이터베이스 세션 종료 완료")
                        
            logger.info(f"✅ RealtimeQuote PostgreSQL 저장 완료: {success_count}/{len(records)}개 성공")
            return success_count > 0
        except Exception as e:
            import traceback
            logger.error(f"❌ RealtimeQuote PostgreSQL 저장 실패: {e}")
            logger.error(f"🔍 오류 상세: {traceback.format_exc()}")
            return False

    async def _save_stock_profile(self, items: List[Dict[str, Any]]) -> bool:
        """주식 프로필 데이터 저장 (PostgreSQL만 사용)"""
        try:
            if not items:
                return True

            logger.info(f"주식 프로필 데이터 저장: {len(items)}개 레코드")

            # PostgreSQL 저장
            from ..core.database import get_postgres_db
            pg_db = next(get_postgres_db())
            try:
                from ..models.asset import StockProfile as PGStockProfile
                from sqlalchemy.dialects.postgresql import insert as pg_insert
                from sqlalchemy import func
                
                for item in items:
                    try:
                        asset_id = item.get("asset_id") or item.get("assetId") or item.get("asset_id".lower())
                        data = item.get("data") if "data" in item else item
                        if not asset_id or not isinstance(data, dict):
                            continue

                        # 매핑: CompanyProfileData -> StockProfile 컬럼
                        company_name = data.get("name") or data.get("company_name")
                        # Descriptions (prefer explicit bilingual fields if provided)
                        description_en = data.get("description_en") or data.get("description")
                        description_ko = data.get("description_ko")
                        sector = data.get("sector")
                        industry = data.get("industry")
                        website = data.get("website")
                        employees_count = data.get("employees") or data.get("fullTimeEmployees")
                        country = data.get("country")
                        address = data.get("address")
                        city = data.get("city")
                        state = data.get("state")  # 주/도
                        zip_code = data.get("zip_code") or data.get("zip")  # 우편번호
                        ceo = data.get("ceo") or data.get("CEO")
                        phone = data.get("phone")
                        logo_image_url = data.get("logo_image_url") or data.get("image") or data.get("logo")
                        market_cap = data.get("market_cap") or data.get("marketCap")
                        # 거래소 및 식별자 정보
                        exchange = data.get("exchange")
                        exchange_full_name = data.get("exchange_full_name") or data.get("exchangeFullName")
                        cik = data.get("cik")
                        isin = data.get("isin")
                        cusip = data.get("cusip")
                        # ipo_date 파싱
                        ipo_date_val = data.get("ipoDate") or data.get("ipo_date")
                        ipo_date = None
                        if ipo_date_val:
                            try:
                                if isinstance(ipo_date_val, str):
                                    ipo_date = datetime.strptime(ipo_date_val.split("T")[0], "%Y-%m-%d").date()
                            except Exception:
                                ipo_date = None

                        # PostgreSQL UPSERT
                        pg_data = {
                            'asset_id': asset_id,
                            'company_name': company_name or "",
                            'description_en': description_en,
                            'description_ko': description_ko,
                            'sector': sector,
                            'industry': industry,
                            'website': website,
                            'employees_count': employees_count,
                            'country': country,
                            'address': address,
                            'city': city,
                            'state': state,
                            'zip_code': zip_code,
                            'ceo': ceo,
                            'phone': phone,
                            'logo_image_url': logo_image_url,
                            'market_cap': market_cap,
                            'ipo_date': ipo_date,
                            'exchange': exchange,
                            'exchange_full_name': exchange_full_name,
                            'cik': cik,
                            'isin': isin,
                            'cusip': cusip,
                        }
                        
                        # None 값 제거
                        pg_data = {k: v for k, v in pg_data.items() if v is not None}
                        
                        stmt = pg_insert(PGStockProfile).values(**pg_data)
                        stmt = stmt.on_conflict_do_update(
                            index_elements=['asset_id'],
                            set_={
                                'company_name': stmt.excluded.company_name,
                                'description_en': stmt.excluded.description_en,
                                'description_ko': stmt.excluded.description_ko,
                                'sector': stmt.excluded.sector,
                                'industry': stmt.excluded.industry,
                                'website': stmt.excluded.website,
                                'employees_count': stmt.excluded.employees_count,
                                'country': stmt.excluded.country,
                                'address': stmt.excluded.address,
                                'city': stmt.excluded.city,
                                'state': stmt.excluded.state,
                                'zip_code': stmt.excluded.zip_code,
                                'ceo': stmt.excluded.ceo,
                                'phone': stmt.excluded.phone,
                                'logo_image_url': stmt.excluded.logo_image_url,
                                'market_cap': stmt.excluded.market_cap,
                                'ipo_date': stmt.excluded.ipo_date,
                                'exchange': stmt.excluded.exchange,
                                'exchange_full_name': stmt.excluded.exchange_full_name,
                                'cik': stmt.excluded.cik,
                                'isin': stmt.excluded.isin,
                                'cusip': stmt.excluded.cusip,
                                'updated_at': func.now()
                            }
                        )
                        pg_db.execute(stmt)
                        logger.debug(f"[StockProfile] PostgreSQL 저장 완료: asset_id={asset_id}")
                        
                    except Exception as e:
                        logger.warning(f"개별 주식 프로필 저장 실패(asset_id={item.get('asset_id')}): {e}")
                        continue
                
                pg_db.commit()
                logger.info(f"[StockProfile] PostgreSQL 저장 완료: {len(items)}개 레코드")
                
            except Exception as e:
                pg_db.rollback()
                logger.error(f"[StockProfile] PostgreSQL 저장 실패: {e}")
                return False
            finally:
                pg_db.close()

            return True
        except Exception as e:
            logger.error(f"주식 프로필 데이터 저장 실패: {e}")
            return False

    async def _save_etf_info(self, items: List[Dict[str, Any]]) -> bool:
        """ETF 정보 데이터 저장 (PostgreSQL만 사용)"""
        try:
            if not items:
                return True

            logger.info(f"ETF 정보 데이터 저장: {len(items)}개 레코드")

            # PostgreSQL 저장
            from ..core.database import get_postgres_db
            pg_db = next(get_postgres_db())
            try:
                from ..models.asset import ETFInfo as PGETFInfo
                from sqlalchemy.dialects.postgresql import insert as pg_insert
                from sqlalchemy import func
                from datetime import datetime, date

                for item in items:
                    try:
                        asset_id = item.get("asset_id") or item.get("assetId")
                        data = item.get("data") if isinstance(item, dict) and "data" in item else item
                        if not asset_id or not isinstance(data, dict):
                            continue

                        # snapshot_date 파싱
                        snapshot = data.get("snapshot_date") or data.get("snapshotDate")
                        parsed_snapshot = None
                        if snapshot:
                            try:
                                if isinstance(snapshot, str):
                                    s = snapshot.split("T")[0]
                                    parsed_snapshot = datetime.strptime(s, "%Y-%m-%d").date()
                                elif isinstance(snapshot, datetime):
                                    parsed_snapshot = snapshot.date()
                            except Exception:
                                parsed_snapshot = None
                        if parsed_snapshot is None:
                            parsed_snapshot = datetime.utcnow().date()

                        # PostgreSQL UPSERT
                        pg_data = {
                            'asset_id': asset_id,
                            'snapshot_date': parsed_snapshot,
                            'net_assets': data.get("net_assets"),
                            'net_expense_ratio': data.get("net_expense_ratio"),
                            'portfolio_turnover': data.get("portfolio_turnover"),
                            'dividend_yield': data.get("dividend_yield"),
                            'inception_date': data.get("inception_date"),
                            'leveraged': data.get("leveraged"),
                            'sectors': data.get("sectors"),
                            'holdings': data.get("holdings")
                        }
                        
                        # None 값 제거
                        pg_data = {k: v for k, v in pg_data.items() if v is not None}
                        
                        stmt = pg_insert(PGETFInfo).values(**pg_data)
                        stmt = stmt.on_conflict_do_update(
                            index_elements=['asset_id'],
                            set_={
                                'snapshot_date': stmt.excluded.snapshot_date,
                                'net_assets': stmt.excluded.net_assets,
                                'net_expense_ratio': stmt.excluded.net_expense_ratio,
                                'portfolio_turnover': stmt.excluded.portfolio_turnover,
                                'dividend_yield': stmt.excluded.dividend_yield,
                                'inception_date': stmt.excluded.inception_date,
                                'leveraged': stmt.excluded.leveraged,
                                'sectors': stmt.excluded.sectors,
                                'holdings': stmt.excluded.holdings,
                                'updated_at': func.now()
                            }
                        )
                        pg_db.execute(stmt)
                        logger.debug(f"[ETFInfo] PostgreSQL 저장 완료: asset_id={asset_id}")
                        
                    except Exception as e:
                        logger.warning(f"개별 ETF 정보 저장 실패(asset_id={item.get('asset_id')}): {e}")
                        continue

                pg_db.commit()
                logger.info(f"[ETFInfo] PostgreSQL 저장 완료: {len(items)}개 레코드")
                return True
                
            except Exception as e:
                pg_db.rollback()
                logger.error(f"[ETFInfo] PostgreSQL 저장 실패: {e}")
                return False
            finally:
                pg_db.close()
                
        except Exception as e:
            logger.error(f"ETF 정보 데이터 저장 실패: {e}")
            return False

    async def _save_crypto_data(self, items: List[Dict[str, Any]]) -> bool:
        """크립토 데이터 저장 (PostgreSQL만 사용)"""
        if not items:
            return True
            
        try:
            logger.info(f"크립토 데이터 저장: {len(items)}개 레코드")
            
            # PostgreSQL 저장
            from ..core.database import get_postgres_db
            pg_db = next(get_postgres_db())
            try:
                from ..models.asset import CryptoData as PGCryptoData
                from sqlalchemy.dialects.postgresql import insert as pg_insert
                from sqlalchemy import func
                
                saved_count = 0
                for item in items:
                    try:
                        # asset_id 추출
                        asset_id = item.get('asset_id')
                        if not asset_id:
                            logger.warning(f"crypto_data 저장 실패: asset_id 없음 - {item}")
                            continue
                        
                        # CryptoData 스키마에 맞게 데이터 변환
                        crypto_data_dict = {
                            'asset_id': asset_id,
                            'symbol': item.get('symbol', ''),
                            'name': item.get('name', ''),
                            'market_cap': item.get('market_cap'),
                            'circulating_supply': item.get('circulating_supply'),
                            'total_supply': item.get('total_supply'),
                            'max_supply': item.get('max_supply'),
                            'current_price': item.get('price') or item.get('current_price'),
                            'volume_24h': item.get('volume_24h'),
                            'percent_change_1h': item.get('percent_change_1h'),
                            'percent_change_24h': item.get('change_24h') or item.get('percent_change_24h'),
                            'percent_change_7d': item.get('percent_change_7d'),
                            'percent_change_30d': item.get('percent_change_30d'),
                            'cmc_rank': item.get('rank'),
                            'category': item.get('category'),
                            'description': item.get('description'),
                            'logo_url': item.get('logo_url'),
                            'website_url': item.get('website_url'),
                            'price': item.get('price'),
                            'slug': item.get('slug'),
                            'date_added': item.get('date_added'),
                            'platform': item.get('platform'),
                            'explorer': item.get('explorer'),
                            'source_code': item.get('source_code'),
                            'tags': item.get('tags'),
                            'is_active': True
                        }
                        
                        # None 값 제거
                        crypto_data_dict = {k: v for k, v in crypto_data_dict.items() if v is not None}
                        
                        # PostgreSQL UPSERT
                        stmt = pg_insert(PGCryptoData).values(**crypto_data_dict)
                        stmt = stmt.on_conflict_do_update(
                            index_elements=['asset_id'],
                            set_={
                                'symbol': stmt.excluded.symbol,
                                'name': stmt.excluded.name,
                                'market_cap': stmt.excluded.market_cap,
                                'circulating_supply': stmt.excluded.circulating_supply,
                                'total_supply': stmt.excluded.total_supply,
                                'max_supply': stmt.excluded.max_supply,
                                'current_price': stmt.excluded.current_price,
                                'volume_24h': stmt.excluded.volume_24h,
                                'percent_change_1h': stmt.excluded.percent_change_1h,
                                'percent_change_24h': stmt.excluded.percent_change_24h,
                                'percent_change_7d': stmt.excluded.percent_change_7d,
                                'percent_change_30d': stmt.excluded.percent_change_30d,
                                'cmc_rank': stmt.excluded.cmc_rank,
                                'category': stmt.excluded.category,
                                'description': stmt.excluded.description,
                                'logo_url': stmt.excluded.logo_url,
                                'website_url': stmt.excluded.website_url,
                                'price': stmt.excluded.price,
                                'slug': stmt.excluded.slug,
                                'date_added': stmt.excluded.date_added,
                                'platform': stmt.excluded.platform,
                                'explorer': stmt.excluded.explorer,
                                'source_code': stmt.excluded.source_code,
                                'tags': stmt.excluded.tags,
                                'is_active': stmt.excluded.is_active,
                                'last_updated': func.now()
                            }
                        )
                        pg_db.execute(stmt)
                        saved_count += 1
                        logger.debug(f"[CryptoData] PostgreSQL 저장 완료: asset_id={asset_id}, symbol={item.get('symbol')}")
                            
                    except Exception as e:
                        logger.error(f"crypto_data 저장 중 오류: asset_id={item.get('asset_id')}, error={e}")
                        continue
                
                pg_db.commit()
                logger.info(f"[CryptoData] PostgreSQL 저장 완료: {saved_count}/{len(items)}개 레코드")
                return saved_count > 0
                
            except Exception as e:
                pg_db.rollback()
                logger.error(f"[CryptoData] PostgreSQL 저장 실패: {e}")
                return False
            finally:
                pg_db.close()
            
        except Exception as e:
            logger.error(f"crypto_data 저장 중 전체 오류: {e}")
            return False

    async def _save_ohlcv_data(self, items: List[Dict[str, Any]], metadata: Dict[str, Any] = None) -> bool:
        """OHLCV 데이터 저장 - 일봉과 인트라데이 데이터를 적절한 테이블에 분리 저장"""
        if not items:
            return True
        
        # metadata에서 asset_id, interval, is_backfill 추출
        asset_id = metadata.get("asset_id") if metadata else None
        interval = metadata.get("interval") if metadata else None
        is_backfill = metadata.get("is_backfill", False) if metadata else False
        
        if not asset_id or not interval:
            logger.warning(f"OHLCV 데이터 저장 실패: asset_id={asset_id}, interval={interval} 정보 부족")
            return False
        
        # interval에 따라 저장할 테이블 결정 (요청 주기 기반, 이후 실제 주기 검증로직에서 재조정)
        # 1d, 1w, 1m는 ohlcv_day_data, 나머지는 ohlcv_intraday_data
        is_daily_request = interval in ["1d", "daily", "1w", "1m"] or interval is None
        table_name = "ohlcv_day_data" if is_daily_request else "ohlcv_intraday_data"
        
        logger.info(f"OHLCV 데이터 저장 시작: asset_id={asset_id}, interval={interval}, table={table_name}, records={len(items)}")
        
        async with self.get_db_session() as db:
            try:
                # 0) 사전 방어: items 내 timestamp_utc를 먼저 표준화 (UTC naive datetime)
                from datetime import datetime, timezone
                from app.utils.helpers import normalize_timestamp_to_date, normalize_timestamp_to_trading_hour
                
                def _normalize_ts_val(val: Any, is_daily_data: bool = False) -> Any:
                    try:
                        if isinstance(val, datetime):
                            if val.tzinfo is not None and val.tzinfo.utcoffset(val) is not None:
                                val = val.astimezone(timezone.utc).replace(tzinfo=None)
                            
                            # 일봉 데이터의 경우 날짜만으로 정규화 (00:00:00)
                            if is_daily_data:
                                return normalize_timestamp_to_date(val)
                            else:
                                return val.replace(microsecond=0)
                        
                        s = str(val)
                        if not s:
                            return val
                        if s.endswith('Z'):
                            s = s[:-1]
                        s = s.replace('T', ' ')
                        if '+' in s:
                            s = s.split('+')[0]
                        if '.' in s:
                            s = s.split('.', 1)[0]
                        
                        parsed_dt = datetime.strptime(s, "%Y-%m-%d %H:%M:%S")
                        
                        # 일봉 데이터의 경우 날짜만으로 정규화 (00:00:00)
                        if is_daily_data:
                            return normalize_timestamp_to_date(parsed_dt)
                        else:
                            return parsed_dt
                    except Exception:
                        return val

                for it in items:
                    if isinstance(it, dict) and 'timestamp_utc' in it:
                        it['timestamp_utc'] = _normalize_ts_val(it.get('timestamp_utc'), is_daily_data=is_daily_request)

                # DB 저장을 위해 Pydantic 모델 객체 리스트로 변환
                from app.external_apis.base.schemas import OhlcvDataPoint
                ohlcv_list = [OhlcvDataPoint(**item) for item in items]

                # OHLCV 데이터에 asset_id와 data_interval 추가
                # PostgreSQL TIMESTAMP 컬럼과 호환되도록 timestamp_utc는 "YYYY-MM-DD HH:MM:SS" 또는 naive UTC datetime으로 전달
                from datetime import datetime, timezone

                ohlcv_data_list = []
                # 인트라데이 요청시 실제 주기 불일치 감지를 위한 플래그
                intraday_request = not is_daily_request
                wrong_interval_count = 0
                for i, ohlcv_item in enumerate(ohlcv_list):
                    # model_dump(mode='python')을 사용하여 datetime을 그대로 유지
                    item_dict = ohlcv_item.model_dump(mode='python')

                    ts = item_dict.get('timestamp_utc')
                    # Pydantic에서 datetime으로 유지된 경우만 처리
                    if isinstance(ts, datetime):
                        # tz-aware이면 UTC로 변환 후 naive로 만들기
                        if ts.tzinfo is not None and ts.tzinfo.utcoffset(ts) is not None:
                            ts = ts.astimezone(timezone.utc).replace(tzinfo=None)
                        # 초 단위로 맞추기 (마이크로초 제거)
                        ts = ts.replace(microsecond=0)
                        item_dict['timestamp_utc'] = ts
                    else:
                        # 혹시 문자열로 들어온 경우 안전하게 파싱해 UTC naive로 변환
                        try:
                            # 지원 포맷: 2025-08-05T04:00:00Z, 2025-08-05 04:00:00+00:00, 등
                            s = str(ts)
                            if s.endswith('Z'):
                                s = s[:-1]
                            # 공백/"T" 모두 허용
                            s = s.replace('T', ' ')
                            # 타임존 제거
                            if '+' in s:
                                s = s.split('+')[0]
                            if '.' in s:
                                base, frac = s.split('.', 1)
                                s = base
                            parsed = datetime.strptime(s, "%Y-%m-%d %H:%M:%S")
                            item_dict['timestamp_utc'] = parsed
                        except Exception:
                            # 마지막 수단: 그대로 두되, 뒤의 CRUD에서 실패하면 스킵될 것
                            pass

                    item_dict['asset_id'] = asset_id
                    
                    # 일봉 데이터는 항상 '1d'로 설정 (주봉/월봉은 별도 배치 작업에서 생성)
                    if is_daily_request:
                        item_dict['data_interval'] = '1d'
                    else:
                        # 인트라데이 데이터의 경우 원래 interval 사용
                        item_dict['data_interval'] = interval if interval else '1h'

                    ohlcv_data_list.append(item_dict)

                    # 인트라데이 요청인데 실제가 1d/1w/1m면 카운트
                    if intraday_request and item_dict['data_interval'] in ["1d", "daily", "1w", "1m"]:
                        wrong_interval_count += 1

                # 인트라데이 요청에 대한 가드: 전체의 과반이 일봉/주봉이면 리라우팅
                if intraday_request and wrong_interval_count > 0:
                    if wrong_interval_count >= max(1, len(ohlcv_data_list) // 2):
                        logger.warning(
                            f"인트라데이 요청(interval={interval})이지만 실제 데이터의 과반({wrong_interval_count}/{len(ohlcv_data_list)})가 일봉/주봉입니다. 일봉 테이블로 리라우팅합니다.")
                        table_name = "ohlcv_day_data"
                        is_daily_request = True
                
                # CRUD를 사용하여 데이터 저장 - PostgreSQL
                from app.crud.asset import crud_ohlcv
                logger.debug("[OHLCV] PostgreSQL upsert 시작: count=%s, daily=%s", len(ohlcv_data_list), is_daily_request)
                if is_daily_request:
                    added_count = crud_ohlcv.bulk_upsert_ohlcv_daily(db, ohlcv_data_list)
                else:
                    added_count = crud_ohlcv.bulk_upsert_ohlcv_intraday(db, ohlcv_data_list)
                logger.info(f"[OHLCV] PostgreSQL 저장 완료: asset_id={asset_id}, interval={interval}, table={table_name}, added={added_count}개")
                
                # PostgreSQL 이중 저장
                try:
                    from ..core.database import get_postgres_db
                    pg_db = next(get_postgres_db())
                    try:
                        # 모델 및 충돌 키 결정
                        if is_daily_request:
                            from ..models.asset import OHLCVData as PGDay
                            model = PGDay
                            conflict_cols = ['asset_id', 'timestamp_utc']
                        else:
                            from ..models.asset import OHLCVIntradayData as PGIntraday
                            model = PGIntraday
                            conflict_cols = ['asset_id', 'timestamp_utc', 'data_interval']

                        from sqlalchemy.dialects.postgresql import insert as pg_insert
                        from sqlalchemy import func

                        # 허용 컬럼(모델 스키마) 집합
                        allowed_columns = set(model.__table__.columns.keys())

                        upserted = 0
                        for row in ohlcv_data_list:
                            logger.debug("[OHLCV] PostgreSQL UPSERT row: keys=%s", {k: row.get(k) for k in ('asset_id','timestamp_utc','data_interval') if k in row})

                            # 모델 스키마에 존재하는 컬럼만 사용
                            filtered_row = {k: v for k, v in row.items() if k in allowed_columns}
                            # 누락 컬럼이 있으면 디버그 기록
                            if len(filtered_row) != len(row):
                                missing = [k for k in row.keys() if k not in allowed_columns]
                                logger.debug(f"[OHLCV] PostgreSQL 모델에 없는 컬럼 제외: {missing}")

                            stmt = pg_insert(model).values(**filtered_row)
                            # 업데이트 컬럼: 충돌 키를 제외한 나머지(모델에 존재하는 컬럼만) + updated_at
                            update_set = {}
                            for k in filtered_row.keys():
                                if k in conflict_cols:
                                    continue
                                try:
                                    update_set[k] = getattr(stmt.excluded, k)
                                except AttributeError:
                                    # 모델에 실제로 없거나 excluded 접근 불가
                                    logger.debug(f"[OHLCV] PostgreSQL excluded에 없는 컬럼 스킵: {k}")
                            update_set['updated_at'] = func.now()

                            stmt = stmt.on_conflict_do_update(index_elements=conflict_cols, set_=update_set)
                            pg_db.execute(stmt)
                            upserted += 1
                        pg_db.commit()
                        logger.info(f"[OHLCV] PostgreSQL 저장 완료: upserted={upserted} rows, daily={is_daily_request}")
                    except Exception as e:
                        pg_db.rollback()
                        logger.warning(f"[OHLCV] PostgreSQL 저장 실패, 롤백 수행: {e}")
                        # DLQ 적재 (원본 목록을 축약하여 기록)
                        try:
                            if self.queue_manager:
                                payload = {
                                    'type': 'ohlcv_postgresql_failed',
                                    'items': ohlcv_data_list[:50],
                                    'meta': {
                                        'is_daily': is_daily_request,
                                        'interval': interval,
                                        'reason': str(e)
                                    }
                                }
                                import json as _json
                                self.queue_manager.move_to_dlq(_json.dumps(payload, ensure_ascii=False, default=str), str(e))
                                logger.error("[OHLCV] DLQ 적재 완료 (PostgreSQL 실패)")
                        except Exception as de:
                            logger.error(f"[OHLCV] DLQ 적재 실패: {de}")
                    finally:
                        pg_db.close()
                except Exception as e:
                    logger.warning(f"[OHLCV] PostgreSQL 연결/경로 초기화 실패(무시): {e}")

                return True
                
            except Exception as e:
                logger.error(f"OHLCV 데이터 저장 실패: asset_id={asset_id}, interval={interval}, table={table_name}, error={e}", exc_info=True)
                return False

    async def _save_stock_financials(self, items: List[Dict[str, Any]]) -> bool:
        """주식 재무 데이터 저장 (스냅샷, 병합 업서트)

        규칙:
        - 동일한 asset_id + snapshot_date 레코드가 있으면 제공된 컬럼만 덮어씀(None/없음은 무시)
        - 없던 레코드는 새로 생성
        """
        try:
            if not items:
                return True

            logger.info(f"주식 재무 데이터 저장: {len(items)}개 레코드")

            # PostgreSQL 저장
            from ..core.database import get_postgres_db
            pg_db = next(get_postgres_db())
            try:
                from ..models.asset import StockFinancial as PGStockFinancial
                from sqlalchemy.dialects.postgresql import insert as pg_insert
                from sqlalchemy import func
                from datetime import datetime, date

                updatable_fields = {
                    "currency",
                    "market_cap",
                    "ebitda",
                    "shares_outstanding",
                    "pe_ratio",
                    "peg_ratio",
                    "beta",
                    "eps",
                    "dividend_yield",
                    "dividend_per_share",
                    "profit_margin_ttm",
                    "return_on_equity_ttm",
                    "revenue_ttm",
                    "price_to_book_ratio",
                    "week_52_high",
                    "week_52_low",
                    "day_50_moving_avg",
                    "day_200_moving_avg",
                    # 추가 재무 지표
                    "book_value",
                    "revenue_per_share_ttm",
                    "operating_margin_ttm",
                    "return_on_assets_ttm",
                    "gross_profit_ttm",
                    "quarterly_earnings_growth_yoy",
                    "quarterly_revenue_growth_yoy",
                    "analyst_target_price",
                    "trailing_pe",
                    "forward_pe",
                    "price_to_sales_ratio_ttm",
                    "ev_to_revenue",
                    "ev_to_ebitda",
                }

                for item in items:
                    try:
                        asset_id = item.get("asset_id") or item.get("assetId")
                        data = item.get("data") if isinstance(item, dict) and "data" in item else item
                        if not asset_id or not isinstance(data, dict):
                            continue

                        # 의미 있는 값이 하나도 없으면 스킵 (통화 제외)
                        meaningful_keys = [
                            "market_cap", "ebitda", "shares_outstanding", "pe_ratio", "peg_ratio",
                            "beta", "eps", "dividend_yield", "dividend_per_share", "profit_margin_ttm",
                            "return_on_equity_ttm", "revenue_ttm", "price_to_book_ratio",
                            "week_52_high", "week_52_low", "day_50_moving_avg", "day_200_moving_avg",
                        ]
                        if not any((data.get(k) is not None) for k in meaningful_keys):
                            # 저장할 실질 값이 없으면 건너뜀
                            continue

                        # snapshot_date 파싱(가능하면 날짜만 저장)
                        snapshot = data.get("snapshot_date") or data.get("snapshotDate")
                        parsed_snapshot = None
                        if snapshot:
                            try:
                                if isinstance(snapshot, str):
                                    # YYYY-MM-DD 혹은 ISO
                                    s = snapshot.split("T")[0]
                                    parsed_snapshot = datetime.strptime(s, "%Y-%m-%d").date()
                                elif isinstance(snapshot, datetime):
                                    parsed_snapshot = snapshot.date()
                            except Exception:
                                parsed_snapshot = None
                        if parsed_snapshot is None:
                            parsed_snapshot = datetime.utcnow().date()

                        # PostgreSQL UPSERT
                        pg_data = {
                            'asset_id': asset_id,
                            'snapshot_date': parsed_snapshot,
                            'currency': data.get('currency'),
                            'market_cap': data.get('market_cap'),
                            'ebitda': data.get('ebitda'),
                            'shares_outstanding': data.get('shares_outstanding'),
                            'pe_ratio': data.get('pe_ratio'),
                            'peg_ratio': data.get('peg_ratio'),
                            'beta': data.get('beta'),
                            'eps': data.get('eps'),
                            'dividend_yield': data.get('dividend_yield'),
                            'dividend_per_share': data.get('dividend_per_share'),
                            'profit_margin_ttm': data.get('profit_margin_ttm'),
                            'return_on_equity_ttm': data.get('return_on_equity_ttm'),
                            'revenue_ttm': data.get('revenue_ttm'),
                            'price_to_book_ratio': data.get('price_to_book_ratio'),
                            'week_52_high': data.get('week_52_high'),
                            'week_52_low': data.get('week_52_low'),
                            'day_50_moving_avg': data.get('day_50_moving_avg'),
                            'day_200_moving_avg': data.get('day_200_moving_avg'),
                            'book_value': data.get('book_value'),
                            'revenue_per_share_ttm': data.get('revenue_per_share_ttm'),
                            'operating_margin_ttm': data.get('operating_margin_ttm'),
                            'return_on_assets_ttm': data.get('return_on_assets_ttm'),
                            'gross_profit_ttm': data.get('gross_profit_ttm'),
                            'quarterly_earnings_growth_yoy': data.get('quarterly_earnings_growth_yoy'),
                            'quarterly_revenue_growth_yoy': data.get('quarterly_revenue_growth_yoy'),
                            'analyst_target_price': data.get('analyst_target_price'),
                            'trailing_pe': data.get('trailing_pe'),
                            'forward_pe': data.get('forward_pe'),
                            'price_to_sales_ratio_ttm': data.get('price_to_sales_ratio_ttm'),
                            'ev_to_revenue': data.get('ev_to_revenue'),
                            'ev_to_ebitda': data.get('ev_to_ebitda'),
                        }
                        
                        # None 값 제거
                        pg_data = {k: v for k, v in pg_data.items() if v is not None}
                        
                        stmt = pg_insert(PGStockFinancial).values(**pg_data)
                        stmt = stmt.on_conflict_do_update(
                            index_elements=['asset_id'],
                            set_={
                                'snapshot_date': stmt.excluded.snapshot_date,
                                'currency': stmt.excluded.currency,
                                'market_cap': stmt.excluded.market_cap,
                                'ebitda': stmt.excluded.ebitda,
                                'shares_outstanding': stmt.excluded.shares_outstanding,
                                'pe_ratio': stmt.excluded.pe_ratio,
                                'peg_ratio': stmt.excluded.peg_ratio,
                                'beta': stmt.excluded.beta,
                                'eps': stmt.excluded.eps,
                                'dividend_yield': stmt.excluded.dividend_yield,
                                'dividend_per_share': stmt.excluded.dividend_per_share,
                                'profit_margin_ttm': stmt.excluded.profit_margin_ttm,
                                'return_on_equity_ttm': stmt.excluded.return_on_equity_ttm,
                                'revenue_ttm': stmt.excluded.revenue_ttm,
                                'price_to_book_ratio': stmt.excluded.price_to_book_ratio,
                                'week_52_high': stmt.excluded.week_52_high,
                                'week_52_low': stmt.excluded.week_52_low,
                                'day_50_moving_avg': stmt.excluded.day_50_moving_avg,
                                'day_200_moving_avg': stmt.excluded.day_200_moving_avg,
                                'book_value': stmt.excluded.book_value,
                                'revenue_per_share_ttm': stmt.excluded.revenue_per_share_ttm,
                                'operating_margin_ttm': stmt.excluded.operating_margin_ttm,
                                'return_on_assets_ttm': stmt.excluded.return_on_assets_ttm,
                                'gross_profit_ttm': stmt.excluded.gross_profit_ttm,
                                'quarterly_earnings_growth_yoy': stmt.excluded.quarterly_earnings_growth_yoy,
                                'quarterly_revenue_growth_yoy': stmt.excluded.quarterly_revenue_growth_yoy,
                                'analyst_target_price': stmt.excluded.analyst_target_price,
                                'trailing_pe': stmt.excluded.trailing_pe,
                                'forward_pe': stmt.excluded.forward_pe,
                                'price_to_sales_ratio_ttm': stmt.excluded.price_to_sales_ratio_ttm,
                                'ev_to_revenue': stmt.excluded.ev_to_revenue,
                                'ev_to_ebitda': stmt.excluded.ev_to_ebitda,
                                'updated_at': func.now()
                            }
                        )
                        pg_db.execute(stmt)
                        logger.debug(f"[StockFinancial] PostgreSQL 저장 완료: asset_id={asset_id}")
                        
                    except Exception as e:
                        logger.warning(f"개별 주식 재무 저장 실패(asset_id={item.get('asset_id')}): {e}")
                        continue

                pg_db.commit()
                logger.info(f"[StockFinancial] PostgreSQL 저장 완료: {len(items)}개 레코드")
                return True
                
            except Exception as e:
                pg_db.rollback()
                logger.error(f"[StockFinancial] PostgreSQL 저장 실패: {e}")
                return False
            finally:
                pg_db.close()
                
        except Exception as e:
            logger.error(f"주식 재무 데이터 저장 실패: {e}")
            return False

    async def _save_stock_estimate(self, items: List[Dict[str, Any]]) -> bool:
        """주식 추정치 데이터 저장 (병합 업서트)

        규칙:
        - 동일한 asset_id + fiscal_date 레코드가 있으면 제공된 컬럼만 덮어씀(None/없음은 무시)
        - 없던 레코드는 새로 생성
        """
        try:
            if not items:
                return True

            logger.info(f"주식 추정치 데이터 저장: {len(items)}개 레코드")

            # PostgreSQL 저장
            from ..core.database import get_postgres_db
            pg_db = next(get_postgres_db())
            try:
                from ..models.asset import StockAnalystEstimate as PGStockAnalystEstimate
                from sqlalchemy.dialects.postgresql import insert as pg_insert
                from sqlalchemy import func
                from datetime import datetime, date

                # DB 컬럼 스키마 기준의 필드 집합
                updatable_fields = {
                    "revenue_avg", "revenue_low", "revenue_high",
                    "eps_avg", "eps_low", "eps_high",
                    "revenue_analysts_count", "eps_analysts_count",
                    "ebitda_avg", "ebitda_low", "ebitda_high",
                    "ebit_avg", "ebit_low", "ebit_high",
                    "net_income_avg", "net_income_low", "net_income_high",
                    "sga_expense_avg", "sga_expense_low", "sga_expense_high",
                }

                for item in items:
                    try:
                        asset_id = item.get("asset_id") or item.get("assetId")
                        data = item.get("data") if isinstance(item, dict) and "data" in item else item
                        if not asset_id or not isinstance(data, dict):
                            continue

                        # 다양한 키 케이스 허용
                        fiscal_date = (
                            data.get("fiscal_date") or data.get("fiscalDate") or data.get("date")
                        )
                        parsed_date = None
                        if fiscal_date:
                            try:
                                if isinstance(fiscal_date, str):
                                    s = fiscal_date.split("T")[0]
                                    parsed_date = datetime.strptime(s, "%Y-%m-%d").date()
                                elif isinstance(fiscal_date, datetime):
                                    parsed_date = fiscal_date.date()
                            except Exception:
                                parsed_date = None
                        if parsed_date is None:
                            # 날짜가 없으면 스킵 (추정치는 날짜 기준 병합 필요)
                            continue

                        # PostgreSQL UPSERT
                        pg_data = {
                            'asset_id': asset_id,
                            'fiscal_date': parsed_date,
                            'revenue_avg': data.get('revenue_avg'),
                            'revenue_low': data.get('revenue_low'),
                            'revenue_high': data.get('revenue_high'),
                            'eps_avg': data.get('eps_avg'),
                            'eps_low': data.get('eps_low'),
                            'eps_high': data.get('eps_high'),
                            'revenue_analysts_count': data.get('revenue_analysts_count'),
                            'eps_analysts_count': data.get('eps_analysts_count'),
                            'ebitda_avg': data.get('ebitda_avg'),
                            'ebitda_low': data.get('ebitda_low'),
                            'ebitda_high': data.get('ebitda_high'),
                            'ebit_avg': data.get('ebit_avg'),
                            'ebit_low': data.get('ebit_low'),
                            'ebit_high': data.get('ebit_high'),
                            'net_income_avg': data.get('net_income_avg'),
                            'net_income_low': data.get('net_income_low'),
                            'net_income_high': data.get('net_income_high'),
                            'sga_expense_avg': data.get('sga_expense_avg'),
                            'sga_expense_low': data.get('sga_expense_low'),
                            'sga_expense_high': data.get('sga_expense_high'),
                        }
                        
                        # None 값 제거
                        pg_data = {k: v for k, v in pg_data.items() if v is not None}
                        
                        stmt = pg_insert(PGStockAnalystEstimate).values(**pg_data)
                        stmt = stmt.on_conflict_do_update(
                            index_elements=['asset_id', 'fiscal_date'],
                            set_={
                                'revenue_avg': stmt.excluded.revenue_avg,
                                'revenue_low': stmt.excluded.revenue_low,
                                'revenue_high': stmt.excluded.revenue_high,
                                'eps_avg': stmt.excluded.eps_avg,
                                'eps_low': stmt.excluded.eps_low,
                                'eps_high': stmt.excluded.eps_high,
                                'revenue_analysts_count': stmt.excluded.revenue_analysts_count,
                                'eps_analysts_count': stmt.excluded.eps_analysts_count,
                                'ebitda_avg': stmt.excluded.ebitda_avg,
                                'ebitda_low': stmt.excluded.ebitda_low,
                                'ebitda_high': stmt.excluded.ebitda_high,
                                'ebit_avg': stmt.excluded.ebit_avg,
                                'ebit_low': stmt.excluded.ebit_low,
                                'ebit_high': stmt.excluded.ebit_high,
                                'net_income_avg': stmt.excluded.net_income_avg,
                                'net_income_low': stmt.excluded.net_income_low,
                                'net_income_high': stmt.excluded.net_income_high,
                                'sga_expense_avg': stmt.excluded.sga_expense_avg,
                                'sga_expense_low': stmt.excluded.sga_expense_low,
                                'sga_expense_high': stmt.excluded.sga_expense_high,
                                'updated_at': func.now()
                            }
                        )
                        pg_db.execute(stmt)
                        logger.debug(f"[StockAnalystEstimate] PostgreSQL 저장 완료: asset_id={asset_id}")
                        
                    except Exception as e:
                        logger.warning(f"개별 주식 추정치 저장 실패(asset_id={item.get('asset_id')}): {e}")
                        continue

                pg_db.commit()
                logger.info(f"[StockAnalystEstimate] PostgreSQL 저장 완료: {len(items)}개 레코드")
                return True
                
            except Exception as e:
                pg_db.rollback()
                logger.error(f"[StockAnalystEstimate] PostgreSQL 저장 실패: {e}")
                return False
            finally:
                pg_db.close()
                
        except Exception as e:
            logger.error(f"주식 추정치 데이터 저장 실패: {e}")
            return False

    async def _save_index_data(self, items: List[Dict[str, Any]]) -> bool:
        """지수 데이터 저장 - PostgreSQL"""
        try:
            if not items:
                return True
                
            logger.info(f"지수 데이터 저장: {len(items)}개 레코드")
            
            # PostgreSQL 저장
            async with self.get_db_session() as db:
                # TODO: IndexData 모델이 구현되면 실제 저장 로직 추가
                logger.debug(f"[IndexData] PostgreSQL 저장 준비: {len(items)}개 레코드")
                db.commit()
            
            return True
        except Exception as e:
            logger.error(f"지수 데이터 저장 실패: {e}")
            return False

    async def _save_world_assets_ranking(self, items: List[Dict[str, Any]], metadata: Dict[str, Any]) -> bool:
        """세계 자산 랭킹 데이터 저장 - PostgreSQL"""
        try:
            if not items:
                logger.warning("세계 자산 랭킹 데이터가 비어있습니다.")
                return True
                
            data_source = metadata.get('data_source', 'unknown')
            collection_date = metadata.get('collection_date', 'unknown')
            logger.info(f"세계 자산 랭킹 데이터 저장 시작: {len(items)}개 레코드, data_source: {data_source}, collection_date: {collection_date}")
            
            # PostgreSQL 저장 (UPSERT 로직)
            async with self.get_db_session() as db:
                saved_count = 0
                failed_count = 0
                for item in items:
                    try:
                        ranking_date = metadata.get('collection_date', datetime.now().date())
                        if isinstance(ranking_date, str):
                            ranking_date = datetime.fromisoformat(ranking_date).date()
                        
                        data_source = metadata.get('data_source', 'unknown')
                        ticker = item.get('ticker')
                        
                        # asset_id가 없으면 assets 테이블에서 찾기
                        asset_id = item.get('asset_id')
                        asset_type_id = item.get('asset_type_id')
                        if not asset_id and ticker and asset_type_id:
                            try:
                                from ..models.asset import Asset
                                existing_asset = db.query(Asset).filter(
                                    Asset.ticker == ticker,
                                    Asset.asset_type_id == asset_type_id
                                ).first()
                                if existing_asset:
                                    asset_id = existing_asset.asset_id
                                    logger.debug(f"Found asset_id {asset_id} for ticker {ticker}")
                            except Exception as e:
                                logger.error(f"Error looking up asset_id for {ticker}: {e}")
                        
                        # PostgreSQL UPSERT using INSERT ... ON CONFLICT DO UPDATE
                        try:
                            # INSERT 시도
                            world_asset = WorldAssetsRanking(
                                rank=item.get('rank'),
                                name=item.get('name'),
                                ticker=item.get('ticker'),
                                market_cap_usd=item.get('market_cap_usd'),
                                price_usd=item.get('price_usd'),
                                daily_change_percent=item.get('daily_change_percent'),
                                country=item.get('country'),
                                asset_type_id=asset_type_id,
                                asset_id=asset_id,
                                ranking_date=ranking_date,
                                data_source=data_source
                            )
                            db.add(world_asset)
                            db.commit()
                            logger.debug(f"[WorldAssetsRanking] 삽입: {ticker} ({data_source})")
                        except Exception as e:
                            # 중복 키 에러인 경우 UPDATE
                            if "Duplicate entry" in str(e) or "1062" in str(e):
                                db.rollback()
                                existing = db.query(WorldAssetsRanking).filter(
                                    WorldAssetsRanking.ranking_date == ranking_date,
                                    WorldAssetsRanking.ticker == ticker,
                                    WorldAssetsRanking.data_source == data_source
                                ).first()
                                
                                if existing:
                                    existing.rank = item.get('rank')
                                    existing.name = item.get('name')
                                    existing.market_cap_usd = item.get('market_cap_usd')
                                    existing.price_usd = item.get('price_usd')
                                    existing.daily_change_percent = item.get('daily_change_percent')
                                    existing.country = item.get('country')
                                    existing.asset_type_id = asset_type_id
                                    existing.asset_id = asset_id
                                    existing.last_updated = datetime.now()
                                    db.commit()
                                    logger.debug(f"[WorldAssetsRanking] 업데이트: {ticker} ({data_source})")
                            else:
                                db.rollback()
                                raise e
                        
                        saved_count += 1
                        
                    except Exception as e:
                        failed_count += 1
                        logger.error(f"WorldAssetsRanking 저장 중 오류: {e}, item: {item}")
                        continue
                
                db.commit()
                logger.info(f"[WorldAssetsRanking] PostgreSQL 저장 완료: {saved_count}개 성공, {failed_count}개 실패")
            
                # PostgreSQL 이중 저장
                try:
                    from ..core.database import get_postgres_db
                    pg_db = next(get_postgres_db())
                    try:
                        pg_saved_count = 0
                        pg_failed_count = 0
                        for item in items:
                            try:
                                ranking_date = metadata.get('collection_date', datetime.now().date())
                                if isinstance(ranking_date, str):
                                    ranking_date = datetime.fromisoformat(ranking_date).date()
                                
                                data_source = metadata.get('data_source', 'unknown')
                                ticker = item.get('ticker')
                                
                                # PostgreSQL UPSERT using ON CONFLICT
                                from sqlalchemy.dialects.postgresql import insert as pg_insert
                                
                                pg_data = {
                                    'rank': item.get('rank'),
                                    'name': item.get('name'),
                                    'ticker': item.get('ticker'),
                                    'market_cap_usd': item.get('market_cap_usd'),
                                    'price_usd': item.get('price_usd'),
                                    'daily_change_percent': item.get('daily_change_percent'),
                                    'country': item.get('country'),
                                    'asset_type_id': item.get('asset_type_id'),
                                    'asset_id': item.get('asset_id'),
                                    'ranking_date': ranking_date,
                                    'data_source': data_source,
                                    'last_updated': datetime.now()
                                }
                                
                                stmt = pg_insert(WorldAssetsRanking).values(**pg_data)
                                stmt = stmt.on_conflict_do_update(
                                    index_elements=['ranking_date', 'ticker', 'data_source'],
                                    set_={
                                        'rank': stmt.excluded.rank,
                                        'name': stmt.excluded.name,
                                        'market_cap_usd': stmt.excluded.market_cap_usd,
                                        'price_usd': stmt.excluded.price_usd,
                                        'daily_change_percent': stmt.excluded.daily_change_percent,
                                        'country': stmt.excluded.country,
                                        'asset_type_id': stmt.excluded.asset_type_id,
                                        'asset_id': stmt.excluded.asset_id,
                                        'last_updated': stmt.excluded.last_updated
                                    }
                                )
                                pg_db.execute(stmt)
                                logger.debug(f"[WorldAssetsRanking PG] UPSERT: {ticker} ({data_source})")
                                
                                pg_saved_count += 1
                                
                            except Exception as e:
                                pg_failed_count += 1
                                logger.error(f"PostgreSQL WorldAssetsRanking 저장 중 오류: {e}, item: {item}")
                                continue
                        
                        pg_db.commit()
                        logger.info(f"[WorldAssetsRanking] PostgreSQL 저장 완료: {pg_saved_count}개 성공, {pg_failed_count}개 실패")
                        
                    except Exception as e:
                        logger.error(f"PostgreSQL WorldAssetsRanking 저장 실패: {e}")
                        pg_db.rollback()
                    finally:
                        pg_db.close()
                except Exception as e:
                    logger.error(f"PostgreSQL 연결 실패: {e}")
            
            return True
            
        except Exception as e:
            logger.error(f"WorldAssetsRanking 저장 중 오류: {e}")
            return False

    async def _save_technical_indicators(self, items: List[Dict[str, Any]]) -> bool:
        """기술적 지표 데이터 저장 - PostgreSQL만 사용"""
        try:
            if not items:
                return True
                
            logger.info(f"기술적 지표 데이터 저장: {len(items)}개 레코드")
            
            # PostgreSQL만 사용
            logger.debug(f"[TechnicalIndicator] PostgreSQL 저장 준비: {len(items)}개 레코드")
            
            # PostgreSQL 이중 저장
            try:
                from ..core.database import get_postgres_db
                pg_db = next(get_postgres_db())
                try:
                    # TODO: TechnicalIndicator 모델이 구현되면 실제 저장 로직 추가
                    logger.debug(f"[TechnicalIndicator] PostgreSQL 저장 준비: {len(items)}개 레코드")
                    pg_db.commit()
                    logger.debug(f"[TechnicalIndicator] PostgreSQL 저장 완료")
                except Exception as e:
                    pg_db.rollback()
                    logger.warning(f"[TechnicalIndicator] PostgreSQL 저장 실패: {e}")
                finally:
                    pg_db.close()
            except Exception as e:
                logger.warning(f"[TechnicalIndicator] PostgreSQL 연결 실패: {e}")
            
            return True
        except Exception as e:
            logger.error(f"기술적 지표 데이터 저장 실패: {e}")
            return False

    async def _save_onchain_metric(self, items: List[Dict[str, Any]]) -> bool:
        """온체인 메트릭 데이터 저장 - PostgreSQL만 사용"""
        try:
            if not items:
                logger.info("[OnchainMetric] 저장할 데이터가 없습니다.")
                return True
                
            logger.info(f"[OnchainMetric] 데이터 저장 시작: {len(items)}개 레코드")
            
            # 데이터 검증 및 통계 수집
            valid_items = 0
            invalid_items = 0
            missing_asset_id = 0
            missing_timestamp = 0
            metric_stats = {}
            
            for item in items:
                # 필수 필드 검증
                if not item.get('asset_id'):
                    missing_asset_id += 1
                    logger.warning(f"[OnchainMetric] asset_id 누락: {item}")
                    continue
                    
                if not item.get('timestamp_utc'):
                    missing_timestamp += 1
                    logger.warning(f"[OnchainMetric] timestamp_utc 누락: {item}")
                    continue
                
                # 메트릭별 통계 수집
                for key in ['mvrv_z_score', 'nupl', 'sopr', 'hashrate', 'difficulty']:
                    if key in item and item[key] is not None:
                        if key not in metric_stats:
                            metric_stats[key] = {'count': 0, 'min': float('inf'), 'max': float('-inf')}
                        metric_stats[key]['count'] += 1
                        metric_stats[key]['min'] = min(metric_stats[key]['min'], float(item[key]))
                        metric_stats[key]['max'] = max(metric_stats[key]['max'], float(item[key]))
                
                valid_items += 1
            
            invalid_items = len(items) - valid_items
            
            # 검증 결과 로그
            logger.info(f"[OnchainMetric] 데이터 검증 완료:")
            logger.info(f"  - 총 레코드: {len(items)}개")
            logger.info(f"  - 유효한 레코드: {valid_items}개")
            logger.info(f"  - 무효한 레코드: {invalid_items}개")
            logger.info(f"  - asset_id 누락: {missing_asset_id}개")
            logger.info(f"  - timestamp 누락: {missing_timestamp}개")
            
            # 메트릭별 통계 로그
            for metric, stats in metric_stats.items():
                logger.info(f"  - {metric}: {stats['count']}개 (범위: {stats['min']:.4f} ~ {stats['max']:.4f})")
            
            if valid_items == 0:
                logger.error("[OnchainMetric] 유효한 데이터가 없어 저장을 중단합니다.")
                return False
            
            # PostgreSQL만 사용
            
            # PostgreSQL 저장
            logger.info(f"[OnchainMetric] PostgreSQL 저장 시작...")
            try:
                from ..core.database import get_postgres_db
                pg_db = next(get_postgres_db())
                try:
                    from ..models.asset import CryptoMetric as PGCryptoMetric
                    from sqlalchemy.dialects.postgresql import insert as pg_insert
                    from sqlalchemy import func
                    
                    pg_saved_count = 0
                    pg_failed_count = 0
                    
                    for i, item in enumerate(items):
                        try:
                            # 필수 필드 재검증
                            if not item.get('asset_id') or not item.get('timestamp_utc'):
                                pg_failed_count += 1
                                continue
                            
                            # HODL Age 분포를 JSON으로 변환
                            hodl_age_distribution = {}
                            hodl_age_keys = [
                                'hodl_age_0d_1d', 'hodl_age_1d_1w', 'hodl_age_1w_1m', 'hodl_age_1m_3m',
                                'hodl_age_3m_6m', 'hodl_age_6m_1y', 'hodl_age_1y_2y', 'hodl_age_2y_3y',
                                'hodl_age_3y_4y', 'hodl_age_4y_5y', 'hodl_age_5y_7y', 'hodl_age_7y_10y',
                                'hodl_age_10y'
                            ]
                            
                            hodl_age_count = 0
                            for key in hodl_age_keys:
                                if key in item and item[key] is not None:
                                    json_key = key.replace('hodl_age_', '')
                                    hodl_age_distribution[json_key] = float(item[key])
                                    hodl_age_count += 1
                            
                            logger.debug(f"[OnchainMetric PG] 레코드 {i+1}/{len(items)}: asset_id={item.get('asset_id')}, "
                                       f"timestamp={item.get('timestamp_utc')}, hodl_age_points={hodl_age_count}")
                            
                            # PostgreSQL UPSERT
                            pg_data = {
                                'asset_id': item.get('asset_id'),
                                'timestamp_utc': item.get('timestamp_utc'),
                                'hodl_age_distribution': hodl_age_distribution if hodl_age_distribution else None,
                                'hashrate': item.get('hashrate'),
                                'difficulty': item.get('difficulty'),
                                'miner_reserves': item.get('miner_reserves'),
                                'realized_cap': item.get('realized_cap'),
                                'mvrv_z_score': item.get('mvrv_z_score'),
                                'realized_price': item.get('realized_price'),
                                'sopr': item.get('sopr'),
                                'nupl': item.get('nupl'),
                                'cdd_90dma': item.get('cdd_90dma'),
                                'true_market_mean': item.get('true_market_mean'),
                                'nrpl_btc': item.get('nrpl_btc'),
                                'aviv': item.get('aviv'),
                                'thermo_cap': item.get('thermo_cap'),
                                'hodl_waves_supply': item.get('hodl_waves_supply'),
                                'etf_btc_total': item.get('etf_btc_total'),
                                'etf_btc_flow': item.get('etf_btc_flow'),
                                
                                # Futures 데이터 (JSON 형태: {"total": ..., "exchanges": {...}})
                                'open_interest_futures': item.get('open_interest_futures')
                            }
                            
                            # None 값 제거
                            pg_data = {k: v for k, v in pg_data.items() if v is not None}
                            
                            stmt = pg_insert(PGCryptoMetric).values(**pg_data)
                            stmt = stmt.on_conflict_do_update(
                                index_elements=['asset_id', 'timestamp_utc'],
                                set_={
                                    'hodl_age_distribution': stmt.excluded.hodl_age_distribution,
                                    'hashrate': stmt.excluded.hashrate,
                                    'difficulty': stmt.excluded.difficulty,
                                    'miner_reserves': stmt.excluded.miner_reserves,
                                    'realized_cap': stmt.excluded.realized_cap,
                                    'mvrv_z_score': stmt.excluded.mvrv_z_score,
                                    'realized_price': stmt.excluded.realized_price,
                                    'sopr': stmt.excluded.sopr,
                                    'nupl': stmt.excluded.nupl,
                                    'cdd_90dma': stmt.excluded.cdd_90dma,
                                    'true_market_mean': stmt.excluded.true_market_mean,
                                    'nrpl_btc': stmt.excluded.nrpl_btc,
                                    'aviv': stmt.excluded.aviv,
                                    'thermo_cap': stmt.excluded.thermo_cap,
                                    'hodl_waves_supply': stmt.excluded.hodl_waves_supply,
                                    'etf_btc_total': stmt.excluded.etf_btc_total,
                                    'etf_btc_flow': stmt.excluded.etf_btc_flow,
                                    'open_interest_futures': stmt.excluded.open_interest_futures,
                                    'updated_at': func.now()
                                }
                            )
                            pg_db.execute(stmt)
                            pg_saved_count += 1
                            
                        except Exception as e:
                            pg_failed_count += 1
                            logger.error(f"[OnchainMetric PG] 레코드 {i+1} 저장 실패: {e}, 데이터: {item}")
                            continue
                    
                    pg_db.commit()
                    logger.info(f"[OnchainMetric] PostgreSQL 저장 완료: {pg_saved_count}개 성공, {pg_failed_count}개 실패")
                    
                except Exception as e:
                    logger.error(f"[OnchainMetric PG] 저장 실패: {e}")
                    pg_db.rollback()
                finally:
                    pg_db.close()
            except Exception as e:
                logger.error(f"[OnchainMetric PG] 연결 실패: {e}")
            
            # 최종 결과 요약
            logger.info(f"[OnchainMetric] 저장 완료 요약:")
            logger.info(f"  - MySQL: 삭제됨")
            logger.info(f"  - PostgreSQL: {pg_saved_count}개 성공, {pg_failed_count}개 실패")
            logger.info(f"  - 전체 성공률: {(pg_saved_count / len(items) * 100):.1f}%")
            
            return True
        except Exception as e:
            logger.error(f"[OnchainMetric] 저장 중 치명적 오류: {e}")
            return False

    async def _update_asset_settings(self, payload: Dict[str, Any]) -> bool:
        """자산 설정 업데이트 (큐를 통한 간단 설정 반영)"""
        logger.info(f"자산 설정 업데이트 태스크 처리: {payload}")
        return True

    async def _log_stats(self):
        """처리 통계 로깅"""
        if self.stats["last_processed"]:
            logger.info(
                f"Data Processor 통계 - "
                f"실시간: {self.stats['realtime_processed']}, "
                f"배치: {self.stats['batch_processed']}, "
                f"오류: {self.stats['errors']}"
            )

    async def start(self):
        """Data Processor 시작"""
        logger.info("Data Processor 서비스 시작")
        logger.info("Data Processor start() 메서드 호출됨")
        self.running = True
        
        # Redis 연결
        if not await self._connect_redis():
            logger.error("Redis 연결 실패로 서비스 종료")
            return
            
        logger.info("Redis 연결 성공, 메인 루프 시작")
        try:
            logger.info("Data Processor main loop started")
            while self.running:
                start_time = time.time()
                logger.debug("Processing cycle started")
                
                # 실시간 및 배치 데이터 동시 처리
                logger.debug("🔄 실시간 스트림 처리 시작")
                try:
                    logger.debug("🔄 asyncio.gather 호출 전")
                    gather_result = await asyncio.gather(
                        self._process_realtime_streams(),
                        self._process_batch_queue(),
                        return_exceptions=True
                    )
                    # Ensure tuple unpack with defaults and numeric types
                    realtime_count = 0
                    batch_count = 0
                    if isinstance(gather_result, (list, tuple)):
                        if len(gather_result) > 0 and not isinstance(gather_result[0], Exception):
                            realtime_count = int(gather_result[0] or 0)
                        if len(gather_result) > 1 and not isinstance(gather_result[1], Exception):
                            batch_count = int(gather_result[1] or 0)
                    logger.debug(f"🔄 실시간 스트림 처리 완료: {realtime_count}")
                except Exception as e:
                    import traceback
                    logger.error(f"❌ asyncio.gather 오류: {e}")
                    logger.error(f"🔍 오류 상세: {traceback.format_exc()}")
                    realtime_count, batch_count = 0, 0
                
                # 결과 처리
                if isinstance(realtime_count, Exception):
                    logger.error(f"실시간 처리 오류: {realtime_count}")
                    realtime_count = 0
                if isinstance(batch_count, Exception):
                    logger.error(f"배치 처리 오류: {batch_count}")
                    batch_count = 0
                
                # 통계 업데이트
                self.stats["realtime_processed"] += realtime_count
                self.stats["batch_processed"] += batch_count
                self.stats["last_processed"] = datetime.utcnow()
                
                # 처리 시간 계산 및 대기
                processing_time = time.time() - start_time
                if processing_time < self.processing_interval:
                    await asyncio.sleep(self.processing_interval - processing_time)
                    
        except KeyboardInterrupt:
            logger.info("Data Processor 서비스 종료 요청")
        except Exception as e:
            logger.error(f"Data Processor 서비스 오류: {e}")
        finally:
            self.running = False
            if self.redis_client:
                await self.redis_client.close()
            logger.info("Data Processor 서비스 종료")

    async def stop(self):
        """Data Processor 중지"""
        self.running = False
        await self._log_stats()

# 전역 인스턴스
try:
    logger.info("DataProcessor 전역 인스턴스 생성 시작...")
    data_processor = DataProcessor()
    logger.info("DataProcessor 전역 인스턴스 생성 완료")
except Exception as e:
    logger.error(f"DataProcessor 전역 인스턴스 생성 실패: {e}")
    raise

async def main():
    """메인 실행 함수"""
    logger.info("DataProcessor main() 함수 시작")
    await data_processor.start()

if __name__ == "__main__":
    asyncio.run(main())
