"""
Logging Helper for Collectors
컬렉터들의 로그 기능을 통합하는 헬퍼 클래스
"""
import json
import logging
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from ..models.asset import SchedulerLog
from ..core.database import SessionLocal

logger = logging.getLogger(__name__)


def create_structured_log(
    db: Session,
    collector_name: str,
    status: str,
    details: dict = None,
    job_name: str = None,
    start_time: datetime = None,
    end_time: datetime = None,
    duration_seconds: int = None,
    assets_processed: int = None,
    data_points_added: int = None,
    error_message: str = None,
    current_task: str = None,
    strategy_used: str = None,
    retry_count: int = 0
):
    """
    구조화된 로그를 데이터베이스에 저장합니다.

    :param db: SQLAlchemy DB 세션
    :param collector_name: 로그를 생성한 수집기 이름
    :param status: 작업 상태 ('success', 'failure', 'partial_success', 'running', 'completed')
    :param message: 기본 로그 메시지
    :param details: 추가 정보 (JSON 형태로 저장될 dict)
    :param job_name: 작업 이름
    :param start_time: 시작 시간
    :param end_time: 종료 시간
    :param duration_seconds: 소요 시간 (초)
    :param assets_processed: 처리된 자산 수
    :param data_points_added: 추가된 데이터 포인트 수
    :param error_message: 오류 메시지
    """
    try:
        # SchedulerLog 생성
        scheduler_log = SchedulerLog(
            job_name=job_name or collector_name,
            status=status,
            start_time=start_time or datetime.now(),
            end_time=end_time,
            duration_seconds=duration_seconds,
            assets_processed=assets_processed or 0,
            data_points_added=data_points_added or 0,
            error_message=error_message,
            current_task=current_task,
            strategy_used=strategy_used,
            retry_count=retry_count,
            details=details
        )
        
        db.add(scheduler_log)
        db.commit()
        db.refresh(scheduler_log)
        
        logger.info(f"📋 Scheduler log created for {collector_name} - {status} (ID: {scheduler_log.log_id})")
        return scheduler_log
        
    except Exception as e:
        logger.error(f"Failed to create scheduler log for {collector_name}: {e}")
        try:
            db.rollback()
        except Exception as rollback_error:
            logger.error(f"Failed to rollback transaction: {rollback_error}")
        return None


def create_collection_summary_log(
    collector_name: str,
    total_assets: int,
    success_count: int,
    failure_count: int,
    added_records: int = 0,
    failed_assets: List[Dict] = None,
    api_provider: str = None,
    collection_type: str = None,
    intervals_processed: int = None,
    duration_seconds: int = None,
    start_time: datetime = None,
    end_time: datetime = None
):
    """
    수집 작업 완료 후 요약 로그를 생성합니다.

    :param collector_name: 수집기 이름
    :param total_assets: 전체 대상 자산 수
    :param success_count: 성공한 자산 수
    :param failure_count: 실패한 자산 수
    :param added_records: 추가된 레코드 수
    :param failed_assets: 실패한 자산 목록
    :param api_provider: 사용한 API 제공자
    :param collection_type: 수집 유형
    :param duration_seconds: 소요 시간
    :param start_time: 시작 시간
    :param end_time: 종료 시간
    """
    db = SessionLocal()
    try:
        # 상태 결정
        if failure_count == 0:
            status = "success"
        elif success_count > 0:
            status = "partial_success"
        else:
            status = "failure"
        
        # 메시지 생성
        message = f"{collector_name} collection completed. Success: {success_count}, Failure: {failure_count}"
        if added_records > 0:
            message += f", Records added: {added_records}"
        
        # 상세 정보 구성
        details = {
            "total_assets": total_assets,
            "success_count": success_count,
            "failure_count": failure_count,
            "success_rate": round((success_count / total_assets) * 100, 2) if total_assets > 0 else 0,
            "added_records": added_records,
            "api_provider": api_provider,
            "collection_type": collection_type,
            "intervals_processed": intervals_processed,
            "failed_assets": failed_assets or [],
            "collection_metadata": {
                "start_time": start_time.isoformat() if start_time else None,
                "end_time": end_time.isoformat() if end_time else None,
                "duration_seconds": duration_seconds
            }
        }
        
        return create_structured_log(
            db=db,
            collector_name=collector_name,
            status=status,
            current_task=f"{collector_name} collection completed",
            strategy_used=api_provider,
            details=details,
            start_time=start_time,
            end_time=end_time,
            duration_seconds=duration_seconds,
            assets_processed=total_assets,
            data_points_added=added_records,
            error_message=None if status != "failure" else f"Collection failed with {failure_count} failures"
        )
        
    except Exception as e:
        logger.error(f"Failed to create collection summary log: {e}")
        try:
            db.rollback()
        except Exception as rollback_error:
            logger.error(f"Failed to rollback transaction: {rollback_error}")
        return None
    finally:
        try:
            db.close()
        except Exception as close_error:
            logger.error(f"Failed to close database session: {close_error}")


def create_api_call_log(
    api_name: str,
    endpoint: str,
    ticker: str = None,
    status_code: int = None,
    response_time_ms: int = None,
    success: bool = True,
    error_message: str = None,
    additional_data: dict = None
):
    """
    API 호출 로그를 생성합니다 - PostgreSQL에만 저장

    :param api_name: API 이름
    :param endpoint: 호출한 엔드포인트
    :param ticker: 자산 티커
    :param status_code: HTTP 상태 코드
    :param response_time_ms: 응답 시간 (밀리초)
    :param success: 성공 여부
    :param error_message: 오류 메시지
    :param additional_data: 추가 데이터
    """
    from ..models.asset import ApiCallLog
    
    # PostgreSQL에만 저장 (SessionLocal이 이미 PostgreSQL을 사용)
    db = SessionLocal()
    try:
        log_entry = ApiCallLog(
            api_name=api_name,
            endpoint=endpoint,
            asset_ticker=ticker,
            status_code=status_code or 0,
            response_time_ms=response_time_ms or 0,
            success=success,
            error_message=error_message,
            created_at=datetime.now()
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        
        # 추가 데이터가 있으면 SchedulerLog에도 저장
        if additional_data:
            create_structured_log(
                db=db,
                collector_name=f"API_{api_name}",
                status="success" if success else "failure",
                details=additional_data
            )
        
        logger.info(f"[ApiCallLog] PostgreSQL 저장 완료: {api_name} for {ticker}")
        return log_entry
        
    except Exception as e:
        logger.error(f"[ApiCallLog] PostgreSQL 저장 실패: {e}")
        db.rollback()
        return None
    finally:
        db.close()


class CollectorLoggingHelper:
    """컬렉터들의 로그 기능을 통합하는 헬퍼 클래스"""
    
    def __init__(self, collector_name: str, base_collector):
        self.collector_name = collector_name
        self.base_collector = base_collector
        self.collection_start_time = None
        self.current_batch = 0
        self.total_batches = 0
        self.success_count = 0
        self.failure_count = 0
        self.failed_assets = []
        self.added_records = 0
    
    def start_collection(self, collection_type: str, total_assets: int, api_provider: str = None, **kwargs):
        """수집 시작 로그"""
        self.collection_start_time = datetime.now()
        self.current_batch = 0
        self.success_count = 0
        self.failure_count = 0
        self.failed_assets = []
        self.added_records = 0
        
        # 구조화된 로그 생성
        db = SessionLocal()
        try:
            create_structured_log(
                db=db,
                collector_name=self.collector_name,
                status="running",
                current_task=f"Starting {collection_type} collection",
                strategy_used=api_provider,
                assets_processed=total_assets,
                details={
                    "collection_type": collection_type,
                    "total_assets": total_assets,
                    "start_time": self.collection_start_time.isoformat(),
                    "api_provider": api_provider,
                    **kwargs
                },
                start_time=self.collection_start_time
            )
        except Exception as e:
            logger.error(f"Failed to create start collection log: {e}")
            try:
                db.rollback()
            except Exception as rollback_error:
                logger.error(f"Failed to rollback transaction: {rollback_error}")
        finally:
            try:
                db.close()
            except Exception as close_error:
                logger.error(f"Failed to close database session: {close_error}")
        
        self.base_collector.log_task_progress(f"Starting {collection_type} collection", {
            "collector": self.collector_name,
            "collection_type": collection_type,
            "total_assets": total_assets,
            "start_time": self.collection_start_time.isoformat(),
            **kwargs
        })
    
    def log_assets_filtered(self, filtered_count: int, filter_criteria: Dict = None):
        """자산 필터링 결과 로그"""
        self.base_collector.log_task_progress("Assets filtered for collection", {
            "filtered_count": filtered_count,
            "filter_criteria": filter_criteria or {},
            "status": "assets_loaded"
        })
    
    def log_configuration_loaded(self, config_data: Dict):
        """설정 로드 완료 로그"""
        self.base_collector.log_task_progress("Configuration loaded", config_data)
    
    def start_batch_processing(self, batch_number: int, total_batches: int, batch_size: int, 
                             current_assets: List, **kwargs):
        """배치 처리 시작 로그"""
        self.current_batch = batch_number
        self.total_batches = total_batches
        
        self.base_collector.log_task_progress(f"Processing batch {batch_number}/{total_batches}", {
            "batch_number": batch_number,
            "total_batches": total_batches,
            "batch_size": batch_size,
            "assets_in_batch": len(current_assets),
            "asset_tickers": [asset.ticker if hasattr(asset, 'ticker') else str(asset) for asset in current_assets],
            **kwargs
        })
    
    def log_asset_processing_start(self, asset, source: str = None):
        """개별 자산 처리 시작 로그"""
        # Avoid touching relationship fields that may trigger lazy loads
        ticker = getattr(asset, 'ticker', None) or str(asset)
        asset_type = 'unknown'
        
        self.base_collector.log_task_progress(f"Processing asset: {ticker}", {
            "ticker": ticker,
            "asset_type": asset_type,
            "source": source,
            "batch_progress": f"{self.current_batch}/{self.total_batches}"
        })
    
    def log_api_call_start(self, api_name: str, ticker: str, endpoint: str = None):
        """API 호출 시작 로그"""
        self.base_collector.log_task_progress(f"API call: {api_name}", {
            "api_name": api_name,
            "ticker": ticker,
            "endpoint": endpoint,
            "status": "starting"
        })
    
    def log_api_call_success(self, api_name: str, ticker: str, data_points: int = 0, **kwargs):
        """API 호출 성공 로그"""
        self.base_collector.log_api_call(api_name, f"fetch for {ticker}", True, {
            "ticker": ticker,
            "data_points": data_points,
            **kwargs
        })
    
    def log_api_call_failure(self, api_name: str, ticker: str, error: Exception, **kwargs):
        """API 호출 실패 로그"""
        self.base_collector.log_api_call(api_name, f"fetch for {ticker}", False, {
            "ticker": ticker,
            "error": str(error),
            "error_type": type(error).__name__,
            **kwargs
        })
    
    def log_asset_processing_success(self, asset, source: str, added_count: int = 0, **kwargs):
        """자산 처리 성공 로그"""
        ticker = asset.ticker if hasattr(asset, 'ticker') else str(asset)
        self.success_count += 1
        self.added_records += added_count
        
        self.base_collector.log_task_progress(f"Successfully processed {ticker}", {
            "ticker": ticker,
            "source": source,
            "added_count": added_count,
            "batch_progress": f"{self.current_batch}/{self.total_batches}",
            **kwargs
        })
    
    def log_asset_processing_failure(self, asset, error: Exception, sources_tried: List[str] = None):
        """자산 처리 실패 로그"""
        ticker = asset.ticker if hasattr(asset, 'ticker') else str(asset)
        self.failure_count += 1
        
        # 실패 정보 기록
        failed_info = {
            "ticker": ticker,
            "error": str(error),
            "error_type": type(error).__name__,
            "sources_tried": sources_tried or []
        }
        self.failed_assets.append(failed_info)
        
        self.base_collector.log_error_with_context(error, f"Asset processing for {ticker}")
        self.base_collector.log_task_progress(f"Failed to process {ticker}", {
            "ticker": ticker,
            "sources_tried": sources_tried or [],
            "error": str(error),
            "error_type": type(error).__name__,
            "status": "failed"
        })
    
    def log_batch_completion(self, batch_number: int, processed_count: int, added_count: int, **kwargs):
        """배치 완료 로그"""
        self.base_collector.log_task_progress(f"Completed batch {batch_number}", {
            "batch_number": batch_number,
            "total_batches": self.total_batches,
            "processed_in_batch": processed_count,
            "added_in_batch": added_count,
            "progress": f"{batch_number}/{self.total_batches}",
            **kwargs
        })
    
    def log_collection_completion(self, total_processed: int, total_added: int, api_provider: str = None, collection_type: str = None, intervals_processed: int = None, **kwargs):
        """수집 완료 로그 - 구조화된 로그 생성"""
        duration = None
        if self.collection_start_time:
            duration = (datetime.now() - self.collection_start_time).total_seconds()
        
        # 구조화된 로그 생성
        create_collection_summary_log(
            collector_name=self.collector_name,
            total_assets=total_processed,
            success_count=self.success_count,
            failure_count=self.failure_count,
            added_records=self.added_records,
            failed_assets=self.failed_assets,
            api_provider=api_provider,
            collection_type=collection_type,
            duration_seconds=duration,
            start_time=self.collection_start_time,
            end_time=datetime.now(),
            **kwargs
        )
        
        self.base_collector.log_task_progress("Collection completed", {
            "total_processed": total_processed,
            "total_added": total_added,
            "duration_seconds": duration,
            "status": "completed",
            **kwargs
        })
    
    def log_fallback_attempt(self, ticker: str, primary_source: str, fallback_source: str):
        """Fallback 시도 로그"""
        self.base_collector.log_task_progress(f"Trying fallback for {ticker}", {
            "ticker": ticker,
            "primary_source": primary_source,
            "fallback_source": fallback_source,
            "status": "fallback_attempt"
        })
    
    def log_all_sources_failed(self, ticker: str, sources_tried: List[str]):
        """모든 소스 실패 로그"""
        self.base_collector.log_task_progress(f"All sources failed for {ticker}", {
            "ticker": ticker,
            "sources_tried": sources_tried,
            "status": "all_sources_failed"
        })
    
    def log_info(self, message: str):
        """일반 정보 로그"""
        logger.info(f"[{self.collector_name}] {message}")
    
    def log_warning(self, message: str):
        """경고 로그"""
        logger.warning(f"[{self.collector_name}] {message}")
    
    def log_job_failure(self, error: Exception, duration: float):
        """작업 실패 로그"""
        logger.error(f"[{self.collector_name}] Job failed after {duration:.2f}s: {error}")
    
    def log_job_end(self, duration: float, result: Dict[str, Any]):
        """작업 완료 로그"""
        logger.info(f"[{self.collector_name}] Job completed in {duration:.2f}s: {result}")
    
    def log_debug(self, message: str):
        """디버그 로그"""
        logger.debug(f"[{self.collector_name}] {message}")
    
    def log_asset_error(self, asset_id: int, error: Exception):
        """자산별 오류 로그"""
        logger.error(f"[{self.collector_name}] Asset {asset_id} error: {error}")
    
    def log_error(self, message: str):
        """오류 로그"""
        logger.error(f"[{self.collector_name}] {message}")


class BatchProcessor:
    """배치 처리를 위한 헬퍼 클래스"""
    
    def __init__(self, logging_helper: CollectorLoggingHelper, batch_size: int = 3):
        self.logging_helper = logging_helper
        self.batch_size = batch_size
        self.total_processed = 0
        self.total_added = 0
    
    async def process_assets(self, assets: List, process_func, **kwargs):
        """자산들을 배치로 처리"""
        total_batches = (len(assets) + self.batch_size - 1) // self.batch_size
        
        for i in range(0, len(assets), self.batch_size):
            batch = assets[i:i + self.batch_size]
            batch_number = (i // self.batch_size) + 1
            
            # 배치 시작 로그
            self.logging_helper.start_batch_processing(
                batch_number, total_batches, self.batch_size, batch, **kwargs
            )
            
            # 배치 처리
            batch_processed = 0
            batch_added = 0
            
            for asset in batch:
                try:
                    # 자산 처리 시작 로그
                    self.logging_helper.log_asset_processing_start(asset)
                    
                    # 실제 처리 함수 호출
                    result = await process_func(asset)
                    
                    if result.get("success", False):
                        batch_processed += 1
                        batch_added += result.get("added_count", 0)
                        
                        # 성공 로그
                        self.logging_helper.log_asset_processing_success(
                            asset, 
                            result.get("source", "unknown"),
                            result.get("added_count", 0)
                        )
                    else:
                        # 실패 로그
                        self.logging_helper.log_asset_processing_failure(
                            asset,
                            Exception(result.get("error", "Unknown error")),
                            result.get("sources_tried", [])
                        )
                        
                except Exception as e:
                    # 예외 로그
                    self.logging_helper.log_asset_processing_failure(asset, e)
            
            # 배치 완료 로그
            self.logging_helper.log_batch_completion(
                batch_number, batch_processed, batch_added
            )
            
            self.total_processed += batch_processed
            self.total_added += batch_added
            
            # Rate limiting
            if batch_number < total_batches:
                await asyncio.sleep(2)
        
        return {
            "processed_assets": self.total_processed,
            "total_added_records": self.total_added
        }


class ApiLoggingHelper:
    """API 전략 매니저용 로깅 헬퍼 - api_call_logs 테이블에 저장"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def log_api_call_start(self, api_name: str, ticker: str):
        """API 호출 시작 로그"""
        self.logger.info(f"API call started: {api_name} for {ticker}")
    
    def log_api_call_success(self, api_name: str, ticker: str, data_points: int = 0):
        """API 호출 성공 로그 - PostgreSQL에만 저장"""
        try:
            from app.core.database import SessionLocal
            from app.models.asset import ApiCallLog
            
            # PostgreSQL에만 저장 (SessionLocal이 이미 PostgreSQL을 사용)
            db = SessionLocal()
            try:
                log_entry = ApiCallLog(
                    api_name=api_name,
                    endpoint=f'OHLCV data collection for {ticker}',
                    asset_ticker=ticker,
                    status_code=200,
                    response_time_ms=0,  # 실제 응답 시간 측정 필요시 추가
                    success=True,
                    error_message=None,
                    created_at=datetime.now()
                )
                db.add(log_entry)
                db.commit()
                self.logger.info(f"[ApiCallLog] PostgreSQL 저장 완료: {api_name} for {ticker}")
            except Exception as e:
                self.logger.error(f"[ApiCallLog] PostgreSQL 저장 실패: {e}")
                db.rollback()
            finally:
                db.close()
                
        except Exception as e:
            self.logger.error(f"Failed to log API call success: {e}")
    
    def log_api_call_failure(self, api_name: str, ticker: str, error: Exception):
        """API 호출 실패 로그 - PostgreSQL에만 저장"""
        try:
            from app.core.database import SessionLocal
            from app.models.asset import ApiCallLog
            
            # PostgreSQL에만 저장 (SessionLocal이 이미 PostgreSQL을 사용)
            db = SessionLocal()
            try:
                log_entry = ApiCallLog(
                    api_name=api_name,
                    endpoint=f'OHLCV data collection for {ticker}',
                    asset_ticker=ticker,
                    status_code=500,  # 일반적인 에러 코드
                    response_time_ms=0,
                    success=False,
                    error_message=str(error)[:500],  # 에러 메시지 길이 제한
                    created_at=datetime.now()
                )
                db.add(log_entry)
                db.commit()
                self.logger.error(f"[ApiCallLog] PostgreSQL 저장 완료: {api_name} for {ticker}, error: {error}")
            except Exception as e:
                self.logger.error(f"[ApiCallLog] PostgreSQL 저장 실패: {e}")
                db.rollback()
            finally:
                db.close()
                
        except Exception as e:
            self.logger.error(f"Failed to log API call failure: {e}")
