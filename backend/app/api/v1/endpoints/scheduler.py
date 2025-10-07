# backend_temp/app/api/v1/endpoints/scheduler.py
import logging
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

from ....core.database import get_postgres_db, SessionLocal
from ....models import SchedulerLog
from ....models.asset import AppConfiguration
from ....services.scheduler_service import scheduler_service

logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic models
class SchedulerStatus(BaseModel):
    isRunning: bool = False
    status: str = "Stopped"
    lastRun: Optional[datetime] = None
    nextRun: Optional[datetime] = None
    totalJobs: int = 0
    completedJobs: int = 0
    failedJobs: int = 0
    pendingJobs: int = 0
    # 상세 작업 정보
    priceAssetsProcessed: int = 0
    cryptoPairsCollected: int = 0
    onchainMetricsProcessed: int = 0
    worldAssetsProcessed: int = 0
    worldAssetsFailed: int = 0
    onchainMetricsPending: int = 0
    # 현재 실행 중인 작업
    currentJob: Optional[str] = None
    currentJobProgress: Optional[int] = None

class SchedulerLogResponse(BaseModel):
    log_id: int
    job_name: str
    status: str
    start_time: datetime
    end_time: Optional[datetime]
    duration_seconds: Optional[int]
    assets_processed: Optional[int] = 0
    data_points_added: Optional[int] = 0
    error_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class SchedulerActionResponse(BaseModel):
    success: bool
    message: str
    job_count: Optional[int] = None

class JobDetail(BaseModel):
    job_id: str
    job_name: str
    next_run_time: Optional[datetime]
    trigger: str
    is_enabled: bool
    description: str
    interval: str

class SchedulerJobsResponse(BaseModel):
    jobs: List[JobDetail]
    total_count: int

# Removed RealtimeActionResponse and RealtimeScheduleRequest - no longer needed

def get_scheduler_status() -> SchedulerStatus:
    """실제 스케줄러 상태를 반환합니다."""
    try:
        # 스케줄러가 제거되었으므로 기본 상태 반환
        return SchedulerStatus(
            isRunning=False,
            status="Stopped",
            lastRun=None,
            nextRun=None,
            totalJobs=0,
            completedJobs=0,
            failedJobs=0
        )
    except Exception as e:
        logger.error(f"Error getting scheduler status: {e}")
        return SchedulerStatus()

@router.get("/status", response_model=SchedulerStatus)
def get_scheduler_status_endpoint(db: Session = Depends(get_postgres_db)):
    """스케줄러 상태를 조회합니다."""
    try:
        from datetime import datetime, timedelta
        
        # 스케줄러가 제거되었으므로 기본값 사용
        is_running = False
        total_jobs = 0
        next_run = None
        
        # 현재 시간
        now = datetime.now()
        
        # 하루 기간으로 필터링 (기본값)
        start_date = now - timedelta(days=1)
        
        # 해당 기간의 로그만 조회
        recent_logs = db.query(SchedulerLog).filter(
            SchedulerLog.start_time >= start_date
        ).order_by(SchedulerLog.start_time.desc()).all()
        
        # 기본 상태 생성
        status = SchedulerStatus()
        status.isRunning = is_running
        status.status = "Running" if is_running else "Stopped"
        status.nextRun = next_run
        status.totalJobs = total_jobs
        
        if recent_logs:
            # 최근 실행 시간
            last_run = recent_logs[0].start_time
            status.lastRun = last_run
            
            # 통계 계산
            completed_jobs = len([log for log in recent_logs if log.status == "completed"])
            failed_jobs = len([log for log in recent_logs if log.status == "failed"])
            pending_jobs = len([log for log in recent_logs if log.status == "running"])
            
            status.completedJobs = completed_jobs
            status.failedJobs = failed_jobs
            status.pendingJobs = pending_jobs
            
            # 현재 실행 중인 작업 정보 (실제 진행률 계산 시도)
            if pending_jobs > 0:
                running_jobs = [log for log in recent_logs if log.status == "running"]
                current_job = running_jobs[0] if running_jobs else None
                if current_job:
                    status.currentJob = current_job.job_name
                    progress = None
                    try:
                        checkpoint = current_job.checkpoint_data if hasattr(current_job, 'checkpoint_data') else None
                        if isinstance(checkpoint, str) and checkpoint:
                            checkpoint = json.loads(checkpoint)
                        if isinstance(checkpoint, dict):
                            processed = checkpoint.get('processed_so_far') or checkpoint.get('assets_processed') or current_job.assets_processed
                            total = checkpoint.get('total_assets')
                            if processed is not None and total:
                                progress = max(0, min(100, int((processed / max(1, total)) * 100)))
                    except Exception:
                        progress = None
                    status.currentJobProgress = progress if progress is not None else None
            
            # 상세 작업 정보 추가
            status.priceAssetsProcessed = sum(log.assets_processed or 0 for log in recent_logs if log.job_name and 'price' in log.job_name.lower())
            status.cryptoPairsCollected = sum(log.assets_processed or 0 for log in recent_logs if log.job_name and 'crypto' in log.job_name.lower())
            status.onchainMetricsProcessed = sum(log.assets_processed or 0 for log in recent_logs if log.job_name and 'onchain' in log.job_name.lower())
            status.worldAssetsProcessed = sum(log.assets_processed or 0 for log in recent_logs if log.job_name and 'world' in log.job_name.lower())
            
            # 실패한 작업 수 계산
            status.worldAssetsFailed = len([log for log in recent_logs if log.job_name and 'world' in log.job_name.lower() and log.status == 'failed'])
            status.onchainMetricsPending = len([log for log in recent_logs if log.job_name and 'onchain' in log.job_name.lower() and log.status == 'running'])
        
        return status
    except Exception as e:
        logger.error(f"Error getting scheduler status: {e}")
        return SchedulerStatus()

@router.get("/status/{period}", response_model=SchedulerStatus)
def get_scheduler_status_by_period(period: str, db: Session = Depends(get_postgres_db)):
    """기간별 스케줄러 상태를 조회합니다."""
    try:
        from datetime import datetime, timedelta
        
        # 현재 시간
        now = datetime.now()
        
        # 기간별 필터링
        if period == 'day':
            start_date = now - timedelta(days=1)
        elif period == 'week':
            start_date = now - timedelta(weeks=1)
        elif period == 'month':
            start_date = now - timedelta(days=30)
        else:
            start_date = now - timedelta(days=1)  # 기본값은 하루
        
        # 해당 기간의 로그만 조회
        recent_logs = db.query(SchedulerLog).filter(
            SchedulerLog.start_time >= start_date
        ).order_by(SchedulerLog.start_time.desc()).all()
        
        # 기본 상태 생성
        status = SchedulerStatus()
        
        if recent_logs:
            # 최근 실행 시간
            last_run = recent_logs[0].start_time
            status.lastRun = last_run
            
            # 실행 중인 작업이 있는지 확인
            running_jobs = [log for log in recent_logs if log.status == "running"]
            if running_jobs:
                status.isRunning = True
                status.status = "Running"
            
            # 통계 계산
            total_jobs = len(recent_logs)
            completed_jobs = len([log for log in recent_logs if log.status == "completed"])
            failed_jobs = len([log for log in recent_logs if log.status == "failed"])
            pending_jobs = len([log for log in recent_logs if log.status == "running"])
            
            status.totalJobs = total_jobs
            status.completedJobs = completed_jobs
            status.failedJobs = failed_jobs
            status.pendingJobs = pending_jobs
            
            # 현재 실행 중인 작업 정보 (실제 진행률 계산 시도)
            if pending_jobs > 0:
                current_job = running_jobs[0] if running_jobs else None
                if current_job:
                    status.currentJob = current_job.job_name
                    progress = None
                    try:
                        checkpoint = current_job.checkpoint_data if hasattr(current_job, 'checkpoint_data') else None
                        if isinstance(checkpoint, str) and checkpoint:
                            checkpoint = json.loads(checkpoint)
                        if isinstance(checkpoint, dict):
                            processed = checkpoint.get('processed_so_far') or checkpoint.get('assets_processed') or current_job.assets_processed
                            total = checkpoint.get('total_assets')
                            if processed is not None and total:
                                progress = max(0, min(100, int((processed / max(1, total)) * 100)))
                    except Exception:
                        progress = None
                    status.currentJobProgress = progress if progress is not None else None
            
            # 상세 작업 정보 추가
            status.priceAssetsProcessed = sum(log.assets_processed or 0 for log in recent_logs if log.job_name and 'price' in log.job_name.lower())
            status.cryptoPairsCollected = sum(log.assets_processed or 0 for log in recent_logs if log.job_name and 'crypto' in log.job_name.lower())
            status.onchainMetricsProcessed = sum(log.assets_processed or 0 for log in recent_logs if log.job_name and 'onchain' in log.job_name.lower())
            status.worldAssetsProcessed = sum(log.assets_processed or 0 for log in recent_logs if log.job_name and 'world' in log.job_name.lower())
            
            # 실패한 작업 수 계산
            status.worldAssetsFailed = len([log for log in recent_logs if log.job_name and 'world' in log.job_name.lower() and log.status == 'failed'])
            status.onchainMetricsPending = len([log for log in recent_logs if log.job_name and 'onchain' in log.job_name.lower() and log.status == 'running'])
        
        return status
    except Exception as e:
        logger.error(f"Failed to get scheduler status for period {period}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get scheduler status for period {period}")

# Legacy scheduler control endpoints - REMOVED
# These endpoints were removed because:
# 1. They use old DB flag-based approach instead of SchedulerService
# 2. They directly manipulate APScheduler instead of using the service layer
# 3. SchedulerService now manages its own lifecycle automatically
# 
# Use these instead:
# - /scheduler/status - Check scheduler status
# - /scheduler/collect-all-now - Manual data collection
# - /scheduler/jobs - View scheduled jobs

# @router.post("/trigger", response_model=SchedulerActionResponse) - DEPRECATED
# 이 엔드포인트는 레거시 코드입니다. 
# 대신 /collect-all-now를 사용하세요.

@router.post("/collect-all-now", response_model=Dict[str, Any])
def collect_all_now_manually():
    """관리자 수동 실행: 스케줄과 상관없이 모든 데이터 수집을 즉시 실행 (실시간 웹소켓 제외)"""
    start_time = datetime.now()
    
    try:
        import asyncio
        # scheduler_service is already imported at the top
        
        logger.info("Starting manual execution of all data collections")
        
        # 비동기 함수를 동기적으로 실행
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(scheduler_service.run_all_collections_once())
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            # 로그 기록을 위한 별도 세션 사용
            log_db = SessionLocal()
            try:
                log = SchedulerLog(
                    job_name="manual_all_collections",
                    status="completed" if result.get("success") else "failed",
                    start_time=start_time,
                    end_time=end_time,
                    duration_seconds=int(duration),
                    data_points_added=sum(r.get("data", {}).get("total_added_records", 0) for r in result.get("results", [])),
                    error_message=None if result.get("success") else result.get("message")
                )
                log_db.add(log)
                log_db.commit()
            except Exception as log_error:
                logger.error(f"Failed to log scheduler result: {log_error}")
                log_db.rollback()
            finally:
                log_db.close()
            
            return result
            
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Failed to run manual collections: {e}")
        
        # 실패 로그 기록을 위한 별도 세션 사용
        end_time = datetime.now()
        log_db = SessionLocal()
        try:
            log = SchedulerLog(
                job_name="manual_all_collections",
                status="failed",
                start_time=start_time,
                end_time=end_time,
                duration_seconds=int((end_time - start_time).total_seconds()),
                data_points_added=0,
                error_message=str(e)
            )
            log_db.add(log)
            log_db.commit()
        except Exception as log_error:
            logger.error(f"Failed to log scheduler error: {log_error}")
            log_db.rollback()
        finally:
            log_db.close()
        
        raise HTTPException(status_code=500, detail=f"Failed to run manual collections: {str(e)}")

@router.post("/enable-test-mode", response_model=SchedulerActionResponse)
def enable_test_mode(db: Session = Depends(get_postgres_db)):
    """테스트 모드를 활성화합니다 (짧은 간격으로 스케줄 실행)"""
    try:
        logger.info("Enabling test mode")
        
        # DB에 테스트 모드 플래그 설정
        config = db.query(AppConfiguration).filter(AppConfiguration.config_key == 'test_mode').first()
        if config:
            config.config_value = 'true'
        else:
            config = AppConfiguration(
                config_key='test_mode',
                config_value='true',
                data_type='string',
                is_active=True
            )
            db.add(config)
        db.commit()
        
        # 로그 기록
        log = SchedulerLog(
            job_name="enable_test_mode",
            status="completed",
            start_time=datetime.now(),
            end_time=datetime.now(),
            duration_seconds=0,
            data_points_added=0
        )
        db.add(log)
        db.commit()
        
        return SchedulerActionResponse(
            success=True,
            message="Test mode enabled. All schedules will run every 3 minutes for testing"
        )
    except Exception as e:
        logger.error(f"Failed to enable test mode: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to enable test mode: {str(e)}")

@router.post("/disable-test-mode", response_model=SchedulerActionResponse)
def disable_test_mode(db: Session = Depends(get_postgres_db)):
    """테스트 모드를 비활성화합니다 (일반 24시간 간격으로 복원)"""
    try:
        logger.info("Disabling test mode")
        
        # DB에 테스트 모드 플래그 비활성화
        config = db.query(AppConfiguration).filter(AppConfiguration.config_key == 'test_mode').first()
        if config:
            config.config_value = 'false'
        else:
            config = AppConfiguration(
                config_key='test_mode',
                config_value='false',
                data_type='string',
                is_active=True
            )
            db.add(config)
        db.commit()
        
        # 로그 기록
        log = SchedulerLog(
            job_name="disable_test_mode",
            status="completed",
            start_time=datetime.now(),
            end_time=datetime.now(),
            duration_seconds=0,
            data_points_added=0
        )
        db.add(log)
        db.commit()
        
        return SchedulerActionResponse(
            success=True,
            message="Test mode disabled. Scheduler will restart with normal 24-hour intervals"
        )
    except Exception as e:
        logger.error(f"Failed to disable test mode: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to disable test mode: {str(e)}")

@router.post("/fix-running-jobs", response_model=SchedulerActionResponse)
def fix_running_jobs(db: Session = Depends(get_postgres_db)):
    """실행 중인 작업들을 강제로 완료 처리합니다."""
    try:
        logger.info("Fixing running jobs")
        
        # 실행 중인 작업들을 찾아서 완료 처리
        running_jobs = db.query(SchedulerLog).filter(
            SchedulerLog.status == "running"
        ).all()
        
        fixed_count = 0
        for job in running_jobs:
            job.status = "completed"
            job.end_time = datetime.now()
            if job.start_time:
                duration = (job.end_time - job.start_time).total_seconds()
                job.duration_seconds = int(duration)
            else:
                job.duration_seconds = 0
            fixed_count += 1
        
        db.commit()
        
        logger.info(f"Fixed {fixed_count} running jobs")
        
        return SchedulerActionResponse(
            success=True,
            message=f"Fixed {fixed_count} running jobs",
            job_count=fixed_count
        )
    except Exception as e:
        logger.error(f"Failed to fix running jobs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fix running jobs: {str(e)}")

@router.get("/jobs", response_model=SchedulerJobsResponse)
def get_scheduler_jobs_detail():
    """스케줄러에 등록된 작업들의 상세 정보를 조회합니다."""
    try:
        jobs = []
        # 스케줄러가 제거되었으므로 빈 목록 반환
        
        return SchedulerJobsResponse(
            jobs=jobs,
            total_count=len(jobs)
        )
    except Exception as e:
        logger.error(f"Failed to get scheduler jobs detail: {e}")
        raise HTTPException(status_code=500, detail="Failed to get scheduler jobs detail")

@router.get("/jobs/history", response_model=List[SchedulerLogResponse])
def get_scheduler_jobs_history(db: Session = Depends(get_postgres_db)):
    """스케줄러 작업 히스토리를 조회합니다."""
    try:
        # 최근 작업 로그 조회
        jobs = db.query(SchedulerLog).order_by(SchedulerLog.start_time.desc()).limit(50).all()
        return [SchedulerLogResponse.from_orm(job) for job in jobs]
    except Exception as e:
        logger.error(f"Failed to get scheduler jobs history: {e}")
        raise HTTPException(status_code=500, detail="Failed to get scheduler jobs history")



# Realtime control endpoints - REMOVED (Legacy code)
# These endpoints were removed because:
# 1. RealtimeCollector has been removed and integrated into SchedulerService
# 2. Tiingo WebSocket consumer is now managed separately
# 3. Use /scheduler/collect-all-now for manual data collection instead

