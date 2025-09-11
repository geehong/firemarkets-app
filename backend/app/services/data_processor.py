"""
Data Processor Service - 중앙화된 데이터 처리 서비스
Redis Stream과 Queue에서 데이터를 읽어 검증하고 MySQL DB에 저장
"""
import asyncio
import json
import logging
import time
from datetime import datetime
from typing import Dict, Any, Optional, List
from contextlib import asynccontextmanager

import redis.asyncio as redis
from sqlalchemy.orm import Session

from ..core.database import SessionLocal
from ..core.config import GLOBAL_APP_CONFIGS, config_manager
from ..models.asset import RealtimeQuote, RealtimeQuoteTimeDelay
from ..models.asset import Asset, OHLCVData
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
    - MySQL DB 저장
    """
    
    def __init__(self, config_manager=None, redis_queue_manager=None):
        logger.info("DataProcessor 인스턴스 생성 중...")
        self.redis_client: Optional[redis.Redis] = None
        self.running = False
        self.config_manager = config_manager
        self.redis_queue_manager = redis_queue_manager
        
        # Redis 설정
        self.redis_host = GLOBAL_APP_CONFIGS.get("REDIS_HOST", "redis")
        self.redis_port = GLOBAL_APP_CONFIGS.get("REDIS_PORT", 6379)
        self.redis_db = GLOBAL_APP_CONFIGS.get("REDIS_DB", 0)
        self.redis_password = GLOBAL_APP_CONFIGS.get("REDIS_PASSWORD")
        
        # 처리 설정 (DB 설정 우선, 기본값 fallback)
        self.batch_size = int(GLOBAL_APP_CONFIGS.get("REALTIME_BATCH_SIZE", 1000))
        self.processing_interval = float(GLOBAL_APP_CONFIGS.get("REALTIME_PROCESSING_INTERVAL_SECONDS", 1.0))
        self.time_window_minutes = int(GLOBAL_APP_CONFIGS.get("WEBSOCKET_TIME_WINDOW_MINUTES", 15))
        self.stream_block_ms = int(GLOBAL_APP_CONFIGS.get("REALTIME_STREAM_BLOCK_MS", 100))
        # 우선 순위: DB(ConfigManager) > GLOBAL_APP_CONFIGS
        self.max_retries = (config_manager.get_retry_attempts() if config_manager else GLOBAL_APP_CONFIGS.get("MAX_API_RETRY_ATTEMPTS", 3))
        try:
            self.max_retries = int(self.max_retries)
        except Exception:
            self.max_retries = 3
        self.retry_delay = 5  # 초
        
        # 스트림 및 큐 설정 (실시간 스트림 활성화)
        self.realtime_streams = {
            "finnhub:realtime": "finnhub_processor_group",
            "alpaca:realtime": "alpaca_processor_group",
            "binance:realtime": "binance_processor_group",
            "fmp:realtime": "fmp_processor_group",
            "twelvedata:realtime": "twelvedata_processor_group",
            # "tiingo:realtime": "tiingo_processor_group",  # 대역폭 한도로 비활성화
        }
        self.batch_queue = "batch_data_queue"
        logger.info("DataProcessor 인스턴스 생성 완료")

        # Redis Queue Manager (for batch queue + DLQ)
        self.queue_manager = RedisQueueManager(config_manager=config_manager) if config_manager else None
        
        # 처리 통계
        self.stats = {
            "realtime_processed": 0,
            "batch_processed": 0,
            "errors": 0,
            "last_processed": None
        }

    async def _connect_redis(self) -> bool:
        """Redis 연결 초기화"""
        try:
            if self.redis_client:
                await self.redis_client.ping()
                return True
                
            redis_url = f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"
            if self.redis_password:
                redis_url = f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"
            
            self.redis_client = await redis.from_url(redis_url)
            await self.redis_client.ping()
            logger.info(f"Redis 연결 성공: {self.redis_host}:{self.redis_port}")
            return True
            
        except Exception as e:
            logger.error(f"Redis 연결 실패: {e}")
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
                return parsed_time.astimezone(datetime.timezone.utc).replace(tzinfo=None)
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
                            return parsed_time.astimezone(datetime.timezone.utc).replace(tzinfo=None)
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
                
            # 현재 데이터가 월말인지 확인 (월의 마지막 날)
            from calendar import monthrange
            year, month = current_ts.year, current_ts.month
            last_day_of_month = monthrange(year, month)[1]
            is_month_end = current_ts.day == last_day_of_month
            
            # 현재 데이터가 주말인지 확인 (금요일)
            is_weekend = current_ts.weekday() == 4  # 4 = 금요일
            
            # 단순한 날짜 패턴 판단
            if is_month_end:
                return "1m"  # 월말이면 월봉
            elif is_weekend:
                return "1w"  # 주말이면 주봉
            else:
                return None  # 기본 일봉
                
        except Exception as e:
            logger.warning(f"주기 판단 실패: {e}")
            return None

    @asynccontextmanager
    async def get_db_session(self):
        """데이터베이스 세션 컨텍스트 매니저"""
        db = SessionLocal()
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
        
        if not self.redis_client:
            logger.info("Redis client not available for realtime streams")
            return 0
            
        processed_count = 0
        logger.info(f"Processing realtime streams: {list(self.realtime_streams.keys())}")
        
        try:
            logger.debug("✅ try 블록 진입")
            logger.debug("🔧 Consumer Group 생성 시작")
            # Consumer Group 생성 (각 스트림별)
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
                except Exception as e:
                    if "BUSYGROUP" not in str(e):
                        logger.warning(f"⚠️ xgroup_create skip {stream_name}: {e}")
                    else:
                        logger.debug(f"ℹ️ Consumer group {group_name} already exists on {stream_name}")
            
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
                    logger.debug(f"📖 스트림 {stream_name} 읽기 결과: {len(stream_data) if stream_data else 0}개 메시지")
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
            async with self.get_db_session() as db:
                assets = db.query(Asset.ticker, Asset.asset_id).all()
                ticker_to_asset_id = {ticker: asset_id for ticker, asset_id in assets}
            
            # 메시지 처리
            for stream_name, messages in all_stream_data:
                # Redis에서 반환되는 스트림 이름이 bytes 타입일 수 있으므로 문자열로 변환
                stream_name_str = stream_name.decode('utf-8') if isinstance(stream_name, bytes) else stream_name
                group_name = self.realtime_streams[stream_name_str]
                logger.info(f"📥 스트림 {stream_name_str}에서 {len(messages)}개 메시지 처리 시작")
                
                for message_id, message_data in messages:
                    try:
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
                            
                        asset_id = ticker_to_asset_id.get(symbol)
                        if not asset_id:
                            logger.warning(f"❌ 자산 매칭 실패 - symbol: {symbol} (사용 가능한 자산: {list(ticker_to_asset_id.keys())[:10]}...)")
                            continue
                            
                        logger.debug(f"✅ 자산 매칭 성공 - symbol: {symbol} -> asset_id: {asset_id}")
                        
                        # 타임스탬프 파싱 (UTC로 변환)
                        timestamp_utc = self._parse_timestamp(raw_timestamp, provider) if raw_timestamp else datetime.utcnow()
                        logger.debug(f"⏰ 타임스탬프: {timestamp_utc}")
                        
                        # Change 계산 (prev_close 조회)
                        change_amount, change_percent = await self._calculate_change(db, asset_id, price)
                        logger.debug(f"📈 Change 계산 - amount: {change_amount}, percent: {change_percent}")
                        
                        quote_data = {
                            "asset_id": asset_id,
                            "timestamp_utc": timestamp_utc,
                            "price": price,
                            "volume": volume,
                            "change_amount": change_amount,
                            "change_percent": change_percent,
                            "data_source": provider[:32]  # 32자 제한
                        }
                        
                        logger.debug(f"💾 저장할 데이터: {quote_data}")
                        records_to_save.append(quote_data)
                        ack_items.append((stream_name_str, group_name, message_id))
                        logger.debug(f"✅ 메시지 {message_id} 처리 완료")
                        
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
                    
                    # 성공한 메시지들 ACK
                    ack_count = 0
                    for stream_name, group_name, message_id in ack_items:
                        try:
                            await self.redis_client.xack(stream_name, group_name, message_id)
                            ack_count += 1
                        except Exception as e:
                            logger.warning(f"❌ ACK 실패 {stream_name}:{message_id}: {e}")
                    logger.info(f"✅ ACK 완료: {ack_count}/{len(ack_items)}개 메시지")
                else:
                    logger.error("❌ DB 저장 실패 - ACK하지 않음")
            else:
                logger.info("📭 저장할 레코드가 없음")
                    
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
            elif task_type == "asset_settings_update":
                return await self._update_asset_settings(payload)
            else:
                logger.warning(f"알 수 없는 태스크 타입: {task_type}")
                return False
                
        except Exception as e:
            logger.error(f"배치 태스크 처리 실패: {e}")
            return False

    async def _calculate_change(self, db: Session, asset_id: int, current_price: float) -> tuple:
        """Change 계산 - prev_close 조회 우선순위"""
        try:
            # 1. 로컬 스냅샷/펀더멘털 테이블의 전일종가 조회
            from ..models.asset import OHLCVData
            from sqlalchemy import desc
            
            # 최근 일봉 데이터에서 전일 종가 조회
            latest_day_data = db.query(OHLCVData).filter(
                OHLCVData.asset_id == asset_id
            ).order_by(desc(OHLCVData.timestamp_utc)).first()
            
            if latest_day_data and latest_day_data.close_price:
                prev_close = float(latest_day_data.close_price)
                change_amount = current_price - prev_close
                change_percent = (change_amount / prev_close) * 100.0 if prev_close != 0 else None
                return change_amount, change_percent
            
            # 2. 외부 API 백업값 (향후 구현)
            # TODO: 외부 API에서 prev_close 조회
            
            # 3. 없으면 null
            return None, None
            
        except Exception as e:
            logger.warning(f"Change 계산 실패 asset_id={asset_id}: {e}")
            return None, None

    async def _bulk_save_realtime_quotes(self, records: List[Dict[str, Any]]) -> bool:
        """실시간 인용 데이터 일괄 저장 - UPSERT 로직 (실시간 + 15분 지연 테이블)"""
        try:
            logger.info(f"💾 RealtimeQuote 저장 시작: {len(records)}개 레코드")
            async with self.get_db_session() as db:
                success_count = 0
                for i, record_data in enumerate(records):
                    try:
                        logger.debug(f"🔍 레코드 {i+1}/{len(records)} 처리: asset_id={record_data.get('asset_id')}, data_source={record_data.get('data_source')}")
                        
                        # 1. 실시간 테이블 저장 (UPSERT) - asset_id만으로 유니크
                        existing_quote = db.query(RealtimeQuote).filter(
                            RealtimeQuote.asset_id == record_data['asset_id']
                        ).first()
                        
                        if existing_quote:
                            # 기존 레코드 업데이트
                            logger.debug(f"🔄 실시간 레코드 업데이트: ID={existing_quote.id}")
                            existing_quote.timestamp_utc = record_data['timestamp_utc']
                            existing_quote.price = record_data['price']
                            existing_quote.volume = record_data['volume']
                            existing_quote.change_amount = record_data['change_amount']
                            existing_quote.change_percent = record_data['change_percent']
                            existing_quote.data_source = record_data['data_source']
                        else:
                            # 새 레코드 생성
                            logger.debug(f"➕ 실시간 새 레코드 생성")
                            quote = RealtimeQuote(**record_data)
                            db.add(quote)
                        
                        # 2. 시간 윈도우 지연 테이블 저장 (UPSERT)
                        time_window = self._get_time_window(record_data['timestamp_utc'])
                        delay_record_data = record_data.copy()
                        delay_record_data['timestamp_utc'] = time_window
                        delay_record_data['data_interval'] = f'{self.time_window_minutes}m'
                        
                        # 기존 지연 레코드 확인
                        existing_delay_quote = db.query(RealtimeQuoteTimeDelay).filter(
                            RealtimeQuoteTimeDelay.asset_id == delay_record_data['asset_id'],
                            RealtimeQuoteTimeDelay.timestamp_utc == time_window,
                            RealtimeQuoteTimeDelay.data_source == delay_record_data['data_source']
                        ).first()
                        
                        if existing_delay_quote:
                            # 기존 레코드 업데이트
                            logger.debug(f"🔄 지연 레코드 업데이트: ID={existing_delay_quote.id}")
                            existing_delay_quote.price = delay_record_data['price']
                            existing_delay_quote.volume = delay_record_data['volume']
                            existing_delay_quote.change_amount = delay_record_data['change_amount']
                            existing_delay_quote.change_percent = delay_record_data['change_percent']
                        else:
                            # 새 레코드 생성
                            logger.debug(f"➕ 지연 새 레코드 생성")
                            delay_quote = RealtimeQuoteTimeDelay(**delay_record_data)
                            db.add(delay_quote)
                        
                        logger.debug(f"📊 {self.time_window_minutes}분 지연 레코드 처리: {time_window}")
                        
                        # 각 레코드마다 개별적으로 커밋하여 race condition 방지
                        db.commit()
                        success_count += 1
                        logger.debug(f"✅ 레코드 {i+1} 저장 성공")
                        
                    except Exception as e:
                        import traceback
                        logger.error(f"❌ 레코드 {i+1} 저장 실패: {e}")
                        logger.error(f"🔍 오류 상세: {traceback.format_exc()}")
                        logger.error(f"📋 실패한 레코드 데이터: {record_data}")
                        db.rollback()
                        continue
                        
            logger.info(f"✅ RealtimeQuote 저장 완료: {success_count}/{len(records)}개 성공")
            return success_count > 0
        except Exception as e:
            import traceback
            logger.error(f"❌ RealtimeQuote 저장 실패: {e}")
            logger.error(f"🔍 오류 상세: {traceback.format_exc()}")
            return False

    async def _save_stock_profile(self, items: List[Dict[str, Any]]) -> bool:
        """주식 프로필 데이터 저장 (업서트)"""
        try:
            if not items:
                return True

            logger.info(f"주식 프로필 데이터 저장: {len(items)}개 레코드")

            async with self.get_db_session() as db:
                from ..models.asset import StockProfile

                for item in items:
                    try:
                        asset_id = item.get("asset_id") or item.get("assetId") or item.get("asset_id".lower())
                        data = item.get("data") if "data" in item else item
                        if not asset_id or not isinstance(data, dict):
                            continue

                        # 매핑: CompanyProfileData -> StockProfile 컬럼
                        company_name = data.get("name") or data.get("company_name")
                        description = data.get("description")
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
                        logo_image_url = data.get("image") or data.get("logo")
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

                        profile: StockProfile = db.query(StockProfile).filter(StockProfile.asset_id == asset_id).first()
                        if profile:
                            if company_name is not None:
                                profile.company_name = company_name
                            if description is not None:
                                profile.description = description
                            if sector is not None:
                                profile.sector = sector
                            if industry is not None:
                                profile.industry = industry
                            if website is not None:
                                profile.website = website
                            if employees_count is not None:
                                profile.employees_count = employees_count
                            if country is not None:
                                profile.country = country
                            if address is not None:
                                profile.address = address
                            if city is not None:
                                profile.city = city
                            if ceo is not None:
                                profile.ceo = ceo
                            if phone is not None:
                                profile.phone = phone
                            if logo_image_url is not None:
                                profile.logo_image_url = logo_image_url
                            if ipo_date is not None:
                                profile.ipo_date = ipo_date
                            # 새로운 주소 필드들
                            if state is not None:
                                profile.state = state
                            if zip_code is not None:
                                profile.zip_code = zip_code
                            # 새로운 거래소 필드들
                            if exchange is not None:
                                profile.exchange = exchange
                            if exchange_full_name is not None:
                                profile.exchange_full_name = exchange_full_name
                            if cik is not None:
                                profile.cik = cik
                            if isin is not None:
                                profile.isin = isin
                            if cusip is not None:
                                profile.cusip = cusip
                        else:
                            profile = StockProfile(
                                asset_id=asset_id,
                                company_name=company_name or "",
                                description=description,
                                sector=sector,
                                industry=industry,
                                website=website,
                                employees_count=employees_count,
                                country=country,
                                address=address,
                                city=city,
                                state=state,  # 주/도
                                zip_code=zip_code,  # 우편번호
                                ceo=ceo,
                                phone=phone,
                                logo_image_url=logo_image_url,
                                ipo_date=ipo_date,
                                # 거래소 및 식별자 정보
                                exchange=exchange,
                                exchange_full_name=exchange_full_name,
                                cik=cik,
                                isin=isin,
                                cusip=cusip,
                            )
                            db.add(profile)

                        db.commit()
                    except Exception as e:
                        logger.warning(f"개별 주식 프로필 저장 실패(asset_id={item.get('asset_id')}): {e}")
                        db.rollback()
                        continue

            return True
        except Exception as e:
            logger.error(f"주식 프로필 데이터 저장 실패: {e}")
            return False

    async def _save_etf_info(self, items: List[Dict[str, Any]]) -> bool:
        """ETF 정보 데이터 저장 (UPSERT 로직)"""
        try:
            if not items:
                return True

            logger.info(f"ETF 정보 데이터 저장: {len(items)}개 레코드")

            async with self.get_db_session() as db:
                from ..models.asset import ETFInfo
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

                        # 기존 ETF 정보 조회 (asset_id로만 조회 - unique constraint)
                        existing: ETFInfo = (
                            db.query(ETFInfo)
                            .filter(ETFInfo.asset_id == asset_id)
                            .first()
                        )

                        if existing:
                            # 기존 레코드 업데이트
                            if data.get("net_assets") is not None:
                                existing.net_assets = data.get("net_assets")
                            if data.get("net_expense_ratio") is not None:
                                existing.net_expense_ratio = data.get("net_expense_ratio")
                            if data.get("portfolio_turnover") is not None:
                                existing.portfolio_turnover = data.get("portfolio_turnover")
                            if data.get("dividend_yield") is not None:
                                existing.dividend_yield = data.get("dividend_yield")
                            if data.get("inception_date") is not None:
                                existing.inception_date = data.get("inception_date")
                            if data.get("leveraged") is not None:
                                existing.leveraged = data.get("leveraged")
                            if data.get("sectors") is not None:
                                existing.sectors = data.get("sectors")
                            if data.get("holdings") is not None:
                                existing.holdings = data.get("holdings")
                            existing.snapshot_date = parsed_snapshot
                        else:
                            # 새 레코드 생성
                            etf_info = ETFInfo(
                                asset_id=asset_id,
                                snapshot_date=parsed_snapshot,
                                net_assets=data.get("net_assets"),
                                net_expense_ratio=data.get("net_expense_ratio"),
                                portfolio_turnover=data.get("portfolio_turnover"),
                                dividend_yield=data.get("dividend_yield"),
                                inception_date=data.get("inception_date"),
                                leveraged=data.get("leveraged"),
                                sectors=data.get("sectors"),
                                holdings=data.get("holdings")
                            )
                            db.add(etf_info)

                        db.commit()
                        logger.info(f"ETF 정보 저장 완료: asset_id={asset_id}")
                        
                    except Exception as e:
                        logger.warning(f"개별 ETF 정보 저장 실패(asset_id={item.get('asset_id')}): {e}")
                        db.rollback()
                        continue

            return True
        except Exception as e:
            logger.error(f"ETF 정보 데이터 저장 실패: {e}")
            return False

    async def _save_crypto_data(self, items: List[Dict[str, Any]]) -> bool:
        """크립토 데이터 저장"""
        if not items:
            return True
            
        try:
            logger.info(f"크립토 데이터 저장: {len(items)}개 레코드")
            
            async with self.get_db_session() as db:
                from app.crud.asset import crud_crypto_data
                
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
                        
                        # 데이터베이스에 저장
                        result = crud_crypto_data.upsert_crypto_data(db, crypto_data_dict)
                        if result:
                            saved_count += 1
                            logger.debug(f"crypto_data 저장 성공: asset_id={asset_id}, symbol={item.get('symbol')}")
                        else:
                            logger.warning(f"crypto_data 저장 실패: asset_id={asset_id}")
                            
                    except Exception as e:
                        logger.error(f"crypto_data 저장 중 오류: asset_id={item.get('asset_id')}, error={e}")
                        continue
                
                logger.info(f"크립토 데이터 저장 완료: {saved_count}/{len(items)}개 레코드")
                return saved_count > 0
            
        except Exception as e:
            logger.error(f"crypto_data 저장 중 전체 오류: {e}")
            return False

    async def _save_ohlcv_data(self, items: List[Dict[str, Any]], metadata: Dict[str, Any] = None) -> bool:
        """OHLCV 데이터 저장 - 일봉과 인트라데이 데이터를 적절한 테이블에 분리 저장"""
        if not items:
            return True
        
        # metadata에서 asset_id와 interval 추출
        asset_id = metadata.get("asset_id") if metadata else None
        interval = metadata.get("interval") if metadata else None
        
        if not asset_id or not interval:
            logger.warning(f"OHLCV 데이터 저장 실패: asset_id={asset_id}, interval={interval} 정보 부족")
            return False
        
        # interval에 따라 저장할 테이블 결정 (실제 주기 기반)
        # 1d, 1w, 1m는 ohlcv_day_data, 나머지는 ohlcv_intraday_data
        is_daily_data = interval in ["1d", "daily", "1w", "1m"] or interval is None
        table_name = "ohlcv_day_data" if is_daily_data else "ohlcv_intraday_data"
        
        logger.info(f"OHLCV 데이터 저장 시작: asset_id={asset_id}, interval={interval}, table={table_name}, records={len(items)}")
        
        async with self.get_db_session() as db:
            try:
                # 0) 사전 방어: items 내 timestamp_utc를 먼저 표준화 (UTC naive datetime)
                from datetime import datetime, timezone
                def _normalize_ts_val(val: Any) -> Any:
                    try:
                        if isinstance(val, datetime):
                            if val.tzinfo is not None and val.tzinfo.utcoffset(val) is not None:
                                val = val.astimezone(timezone.utc).replace(tzinfo=None)
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
                        return datetime.strptime(s, "%Y-%m-%d %H:%M:%S")
                    except Exception:
                        return val

                for it in items:
                    if isinstance(it, dict) and 'timestamp_utc' in it:
                        it['timestamp_utc'] = _normalize_ts_val(it.get('timestamp_utc'))

                # DB 저장을 위해 Pydantic 모델 객체 리스트로 변환
                from app.external_apis.base.schemas import OhlcvDataPoint
                ohlcv_list = [OhlcvDataPoint(**item) for item in items]

                # OHLCV 데이터에 asset_id와 data_interval 추가
                # MySQL DATETIME 컬럼과 호환되도록 timestamp_utc는 "YYYY-MM-DD HH:MM:SS" 또는 naive UTC datetime으로 전달
                from datetime import datetime, timezone

                ohlcv_data_list = []
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
                    
                    # timestamp_utc를 분석해서 실제 주기 판단
                    actual_interval = self._determine_actual_interval(ts, items, i)
                    item_dict['data_interval'] = actual_interval

                    ohlcv_data_list.append(item_dict)
                
                # CRUD를 사용하여 데이터 저장 - 테이블별로 분리
                from app.crud.asset import crud_ohlcv
                if is_daily_data:
                    added_count = crud_ohlcv.bulk_upsert_ohlcv_daily(db, ohlcv_data_list)
                else:
                    added_count = crud_ohlcv.bulk_upsert_ohlcv_intraday(db, ohlcv_data_list)
                
                logger.info(f"OHLCV 데이터 저장 완료: asset_id={asset_id}, interval={interval}, table={table_name}, added={added_count}개 레코드")
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

            async with self.get_db_session() as db:
                from ..models.asset import StockFinancial
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

                        existing: StockFinancial = (
                            db.query(StockFinancial)
                            .filter(StockFinancial.asset_id == asset_id)
                            .first()
                        )

                        if existing:
                            # 선택적 병합 업데이트(None/미존재 키는 무시)
                            for field in updatable_fields:
                                if field in data and data.get(field) is not None and hasattr(existing, field):
                                    setattr(existing, field, data.get(field))
                        else:
                            # 생성 시에도 제공된 필드만 세팅
                            new_kwargs = {"asset_id": asset_id, "snapshot_date": parsed_snapshot}
                            for field in updatable_fields:
                                val = data.get(field)
                                if val is not None:
                                    new_kwargs[field] = val
                            profile = StockFinancial(**new_kwargs)
                            db.add(profile)

                        db.commit()
                    except Exception as e:
                        logger.warning(f"개별 주식 재무 저장 실패(asset_id={item.get('asset_id')}): {e}")
                        db.rollback()
                        continue

            return True
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

            async with self.get_db_session() as db:
                from ..models.asset import StockAnalystEstimate
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

                        existing: StockAnalystEstimate = (
                            db.query(StockAnalystEstimate)
                            .filter(StockAnalystEstimate.asset_id == asset_id, StockAnalystEstimate.fiscal_date == parsed_date)
                            .first()
                        )

                        if existing:
                            for field in updatable_fields:
                                if field in data and data.get(field) is not None and hasattr(existing, field):
                                    setattr(existing, field, data.get(field))
                        else:
                            new_kwargs = {"asset_id": asset_id, "fiscal_date": parsed_date}
                            for field in updatable_fields:
                                val = data.get(field)
                                if val is not None:
                                    new_kwargs[field] = val
                            est = StockAnalystEstimate(**new_kwargs)
                            db.add(est)

                        db.commit()
                    except Exception as e:
                        logger.warning(f"개별 주식 추정치 저장 실패(asset_id={item.get('asset_id')}): {e}")
                        db.rollback()
                        continue

            return True
        except Exception as e:
            logger.error(f"주식 추정치 데이터 저장 실패: {e}")
            return False

    async def _save_index_data(self, items: List[Dict[str, Any]]) -> bool:
        """지수 데이터 저장"""
        logger.info(f"지수 데이터 저장: {len(items)}개 레코드")
        return True

    async def _save_technical_indicators(self, items: List[Dict[str, Any]]) -> bool:
        """기술적 지표 데이터 저장"""
        logger.info(f"기술적 지표 데이터 저장: {len(items)}개 레코드")
        return True

    async def _save_onchain_metric(self, items: List[Dict[str, Any]]) -> bool:
        """온체인 메트릭 데이터 저장"""
        logger.info(f"온체인 메트릭 데이터 저장: {len(items)}개 레코드")
        return True

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
                    realtime_count, batch_count = await asyncio.gather(
                        self._process_realtime_streams(),
                        self._process_batch_queue(),
                        return_exceptions=True
                    )
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
