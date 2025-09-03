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
from ..core.config import GLOBAL_APP_CONFIGS
from ..models.realtime import RealtimeQuote
from ..models.asset import Asset
from ..utils.logger import logger

class DataProcessor:
    """
    중앙화된 데이터 처리 서비스
    - Redis Stream에서 실시간 데이터 처리
    - Redis Queue에서 배치 데이터 처리
    - 데이터 검증 및 변환
    - MySQL DB 저장
    """
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.running = False
        
        # Redis 설정
        self.redis_host = GLOBAL_APP_CONFIGS.get("REDIS_HOST", "redis")
        self.redis_port = GLOBAL_APP_CONFIGS.get("REDIS_PORT", 6379)
        self.redis_db = GLOBAL_APP_CONFIGS.get("REDIS_DB", 0)
        self.redis_password = GLOBAL_APP_CONFIGS.get("REDIS_PASSWORD")
        
        # 처리 설정
        self.batch_size = 1000
        self.processing_interval = 1.0  # 초
        self.max_retries = 3
        self.retry_delay = 5  # 초
        
        # 스트림 및 큐 설정
        self.realtime_streams = {
            "tiingo_realtime_stream": "tiingo_processor_group",
            "alpaca_realtime_stream": "alpaca_processor_group"
        }
        self.batch_queue = "batch_data_queue"
        
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
                assets = db.query(Asset.ticker, Asset.asset_id, Asset.asset_type).all()
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
                                "price": float(trade_data.get('price', 0)),
                                "volume_today": float(trade_data.get('volume', 0)),
                                "change_percent_today": float(trade_data.get('change_percent', 0)),
                                "data_source": trade_data.get('data_source', 'unknown'),
                                "currency": "USD",
                                "fetched_at": datetime.fromisoformat(
                                    trade_data['timestamp'].replace('Z', '+00:00')
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
                result = await self.redis_client.blpop(self.batch_queue, timeout=0.1)
                if not result:
                    break
                    
                try:
                    _, task_data = result
                    task = json.loads(task_data)
                    
                    # 태스크 타입에 따른 처리
                    success = await self._process_batch_task(task)
                    if success:
                        processed_count += 1
                    else:
                        self.stats["errors"] += 1
                        
                except (json.JSONDecodeError, KeyError) as e:
                    logger.warning(f"배치 태스크 처리 실패: {e}")
                    self.stats["errors"] += 1
                    
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
                
            # 태스크 타입별 처리 로직
            if task_type == "stock_profile":
                return await self._save_stock_profile(payload)
            elif task_type == "etf_info":
                return await self._save_etf_info(payload)
            elif task_type == "crypto_data":
                return await self._save_crypto_data(payload)
            elif task_type == "ohlcv_data":
                return await self._save_ohlcv_data(payload)
            else:
                logger.warning(f"알 수 없는 태스크 타입: {task_type}")
                return False
                
        except Exception as e:
            logger.error(f"배치 태스크 처리 실패: {e}")
            return False

    async def _bulk_save_realtime_quotes(self, records: List[Dict[str, Any]]) -> bool:
        """실시간 인용 데이터 일괄 저장"""
        try:
            async with self.get_db_session() as db:
                for record_data in records:
                    quote = RealtimeQuote(**record_data)
                    db.add(quote)
                db.commit()
            return True
        except Exception as e:
            logger.error(f"실시간 인용 데이터 저장 실패: {e}")
            return False

    async def _save_stock_profile(self, data: List[Dict[str, Any]]) -> bool:
        """주식 프로필 데이터 저장"""
        # TODO: 실제 CRUD 함수 호출
        logger.info(f"주식 프로필 데이터 저장: {len(data)}개 레코드")
        return True

    async def _save_etf_info(self, data: List[Dict[str, Any]]) -> bool:
        """ETF 정보 데이터 저장"""
        # TODO: 실제 CRUD 함수 호출
        logger.info(f"ETF 정보 데이터 저장: {len(data)}개 레코드")
        return True

    async def _save_crypto_data(self, data: List[Dict[str, Any]]) -> bool:
        """크립토 데이터 저장"""
        # TODO: 실제 CRUD 함수 호출
        logger.info(f"크립토 데이터 저장: {len(data)}개 레코드")
        return True

    async def _save_ohlcv_data(self, data: List[Dict[str, Any]]) -> bool:
        """OHLCV 데이터 저장"""
        # TODO: 실제 CRUD 함수 호출
        logger.info(f"OHLCV 데이터 저장: {len(data)}개 레코드")
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
