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
from ..models.asset import RealtimeQuote
from ..models.asset import Asset, OHLCVData
from ..crud.asset import crud_ohlcv, crud_asset
from ..utils.logger import logger
from ..utils.redis_queue_manager import RedisQueueManager
from ..utils.helpers import safe_float

class DataProcessor:
    """
    중앙화된 데이터 처리 서비스
    - Redis Stream에서 실시간 데이터 처리
    - Redis Queue에서 배치 데이터 처리
    - 데이터 검증 및 변환
    - MySQL DB 저장
    """
    
    def __init__(self, config_manager=None, redis_queue_manager=None):
        self.redis_client: Optional[redis.Redis] = None
        self.running = False
        self.config_manager = config_manager
        self.redis_queue_manager = redis_queue_manager
        
        # Redis 설정
        self.redis_host = GLOBAL_APP_CONFIGS.get("REDIS_HOST", "redis")
        self.redis_port = GLOBAL_APP_CONFIGS.get("REDIS_PORT", 6379)
        self.redis_db = GLOBAL_APP_CONFIGS.get("REDIS_DB", 0)
        self.redis_password = GLOBAL_APP_CONFIGS.get("REDIS_PASSWORD")
        
        # 처리 설정
        self.batch_size = int(GLOBAL_APP_CONFIGS.get("BATCH_SIZE", 1000))
        self.processing_interval = 1.0  # 초
        # 우선 순위: DB(ConfigManager) > GLOBAL_APP_CONFIGS
        self.max_retries = (config_manager.get_retry_attempts() if config_manager else GLOBAL_APP_CONFIGS.get("MAX_API_RETRY_ATTEMPTS", 3))
        try:
            self.max_retries = int(self.max_retries)
        except Exception:
            self.max_retries = 3
        self.retry_delay = 5  # 초
        
        # 스트림 및 큐 설정 (실시간 스트림은 일시적으로 비활성화)
        self.realtime_streams = {
            # "tiingo_realtime_stream": "tiingo_processor_group",
            # "alpaca_realtime_stream": "alpaca_processor_group"
        }
        self.batch_queue = "batch_data_queue"

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

    def _parse_timestamp(self, timestamp_str: str) -> datetime:
        """타임스탬프 문자열을 파싱합니다."""
        try:
            # 먼저 표준 ISO 형식으로 시도
            return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        except ValueError:
            try:
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
                        return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            except ValueError:
                pass
            
            # 모든 파싱이 실패하면 현재 시간 반환
            logger.warning(f"타임스탬프 파싱 실패: {timestamp_str}, 현재 시간 사용")
            return datetime.utcnow()

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
        """실시간 스트림 데이터 처리"""
        if not self.redis_client:
            return 0
            
        processed_count = 0
        
        try:
            # 모든 스트림에서 데이터 읽기
            streams_to_read = {stream: '0-0' for stream in self.realtime_streams.keys()}
            # 스트림이 비어있으면 Redis XREAD 호출을 건너뜁니다
            if not streams_to_read:
                return 0
            stream_data = await self.redis_client.xread(
                streams_to_read, 
                count=self.batch_size,
                block=100  # 100ms 블록
            )
            
            if not stream_data:
                return 0
                
            records_to_save = []
            last_message_ids = {}
            
            # 자산 정보 캐시 (성능 최적화)
            async with self.get_db_session() as db:
                from ..models.asset import AssetType
                assets = db.query(Asset.ticker, Asset.asset_id, AssetType.type_name).join(Asset.asset_type).all()
                ticker_to_asset = {
                    ticker: {"asset_id": asset_id, "asset_type": asset_type} 
                    for ticker, asset_id, asset_type in assets
                }
            
            # 메시지 처리
            for stream_name, messages in stream_data:
                for message_id, message_data in messages:
                    try:
                        trade_data_str = message_data.get(b'data')
                        if not trade_data_str:
                            continue

                        trade_data = json.loads(trade_data_str)
                        ticker = trade_data.get('ticker')
                        asset_info = ticker_to_asset.get(ticker)

                        if asset_info:
                            quote_data = {
                                "ticker": ticker,
                                "asset_type": asset_info["asset_type"],
                                "price": safe_float(trade_data.get('price'), 0.0),
                                "volume_today": safe_float(trade_data.get('volume'), 0.0),
                                "change_percent_today": safe_float(trade_data.get('change_percent'), 0.0),
                                "data_source": trade_data.get('data_source', 'unknown'),
                                "currency": "USD",
                                "fetched_at": self._parse_timestamp(
                                    trade_data.get('timestamp')
                                ) if trade_data.get('timestamp') else datetime.utcnow()
                            }
                            records_to_save.append(quote_data)
                            
                        last_message_ids[stream_name] = message_id
                        
                    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as e:
                        logger.warning(f"스트림 메시지 {message_id} 처리 실패: {e}")
                        self.stats["errors"] += 1

            # 데이터베이스에 저장
            if records_to_save:
                await self._bulk_save_realtime_quotes(records_to_save)
                processed_count = len(records_to_save)
                
                # 처리된 메시지 트림
                for stream_name, last_message_id in last_message_ids.items():
                    await self.redis_client.xtrim(stream_name, minid=last_message_id)
                    
        except Exception as e:
            logger.error(f"실시간 스트림 처리 중 오류: {e}")
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
                            break # 성공 시 루프 종료
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

    async def _bulk_save_realtime_quotes(self, records: List[Dict[str, Any]]) -> bool:
        """실시간 인용 데이터 일괄 저장"""
        try:
            # UPSERT 로직을 사용하여 중복 키 오류 방지
            async with self.get_db_session() as db:
                for record_data in records:
                    try:
                        # 기존 레코드가 있는지 확인
                        existing_quote = db.query(RealtimeQuote).filter(
                            RealtimeQuote.ticker == record_data['ticker'],
                            RealtimeQuote.asset_type == record_data['asset_type']
                        ).first()
                        
                        if existing_quote:
                            # 기존 레코드 업데이트
                            for key, value in record_data.items():
                                if hasattr(existing_quote, key):
                                    setattr(existing_quote, key, value)
                        else:
                            # 새 레코드 생성
                            quote = RealtimeQuote(**record_data)
                            db.add(quote)
                        
                        # 각 레코드마다 개별적으로 커밋하여 race condition 방지
                        db.commit()
                        
                    except Exception as e:
                        logger.warning(f"개별 실시간 인용 데이터 저장 실패: {e}")
                        db.rollback()
                        continue
                        
            return True
        except Exception as e:
            logger.error(f"실시간 인용 데이터 저장 실패: {e}")
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
        """ETF 정보 데이터 저장"""
        # TODO: 실제 CRUD 함수 호출
        logger.info(f"ETF 정보 데이터 저장: {len(items)}개 레코드")
        return True

    async def _save_crypto_data(self, items: List[Dict[str, Any]]) -> bool:
        """크립토 데이터 저장"""
        # TODO: 실제 CRUD 함수 호출
        logger.info(f"크립토 데이터 저장: {len(items)}개 레코드")
        return True

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
        
        # interval에 따라 저장할 테이블 결정
        is_daily_data = interval in ["1d", "daily"]
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
                    item_dict['data_interval'] = interval

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
                            .filter(StockFinancial.asset_id == asset_id, StockFinancial.snapshot_date == parsed_snapshot)
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
        self.running = True
        
        # Redis 연결
        if not await self._connect_redis():
            logger.error("Redis 연결 실패로 서비스 종료")
            return
            
        try:
            while self.running:
                start_time = time.time()
                
                # 실시간 및 배치 데이터 동시 처리
                realtime_count, batch_count = await asyncio.gather(
                    self._process_realtime_streams(),
                    self._process_batch_queue(),
                    return_exceptions=True
                )
                
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
data_processor = DataProcessor()

async def main():
    """메인 실행 함수"""
    await data_processor.start()

if __name__ == "__main__":
    asyncio.run(main())
