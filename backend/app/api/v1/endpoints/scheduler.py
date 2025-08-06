# backend_temp/app/api/v1/endpoints/scheduler.py
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

from ....core.database import get_db
from ....models import SchedulerLog
from ....core.websocket import scheduler
from ....core.config import setup_scheduler_jobs, GLOBAL_APP_CONFIGS

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

def get_scheduler_status() -> SchedulerStatus:
    """실제 스케줄러 상태를 반환합니다."""
    try:
        # 스케줄러가 실제로 시작되었는지 확인
        # 작업이 등록되어 있고 스케줄러가 실행 중일 때만 Running으로 판단
        is_running = False
        
        if scheduler:
            # 스케줄러가 시작되었고 실제로 작업이 등록되어 있는지 확인
            jobs = scheduler.get_jobs()
            if scheduler.running and jobs:
                is_running = True
            else:
                # 작업이 없거나 스케줄러가 시작되지 않았으면 Stopped
                is_running = False
        
        status = "Running" if is_running else "Stopped"
        
        # 작업 수 계산
        total_jobs = len(scheduler.get_jobs()) if scheduler else 0
        
        # 다음 실행 시간 계산
        next_run = None
        if scheduler and scheduler.get_jobs():
            next_job = scheduler.get_jobs()[0]
            next_run = next_job.next_run_time
        
        return SchedulerStatus(
            isRunning=is_running,
            status=status,
            lastRun=None,  # 로그에서 가져올 예정
            nextRun=next_run,
            totalJobs=total_jobs,
            completedJobs=0,
            failedJobs=0
        )
    except Exception as e:
        logger.error(f"Error getting scheduler status: {e}")
        return SchedulerStatus()

@router.get("/scheduler/status", response_model=SchedulerStatus)
def get_scheduler_status_endpoint(db: Session = Depends(get_db)):
    """스케줄러 상태를 조회합니다."""
    try:
        from datetime import datetime, timedelta
        
        # 실제 스케줄러 상태 확인
        is_running = False
        next_run = None
        total_jobs = 0
        
        if scheduler:
            # 스케줄러가 실제로 실행 중인지 확인
            is_running = scheduler.running
            total_jobs = len(scheduler.get_jobs())
            
            # 다음 실행 시간 계산
            if scheduler.get_jobs():
                next_job = scheduler.get_jobs()[0]
                next_run = next_job.next_run_time
        
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
            
            # 현재 실행 중인 작업 정보
            if pending_jobs > 0:
                running_jobs = [log for log in recent_logs if log.status == "running"]
                current_job = running_jobs[0] if running_jobs else None
                if current_job:
                    status.currentJob = current_job.job_name
                    status.currentJobProgress = 50
            
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

@router.get("/scheduler/status/{period}", response_model=SchedulerStatus)
def get_scheduler_status_by_period(period: str, db: Session = Depends(get_db)):
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
            
            # 현재 실행 중인 작업 정보
            if pending_jobs > 0:
                current_job = running_jobs[0] if running_jobs else None
                if current_job:
                    status.currentJob = current_job.job_name
                    status.currentJobProgress = 50
            
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

@router.post("/scheduler/start", response_model=SchedulerActionResponse)
def start_scheduler(db: Session = Depends(get_db)):
    """스케줄러를 시작합니다."""
    try:
        logger.info("Starting scheduler")
        
        # 스케줄러가 이미 실행 중인지 확인
        if scheduler and scheduler.running:
            return SchedulerActionResponse(
                success=True,
                message="Scheduler is already running",
                job_count=len(scheduler.get_jobs())
            )
        
        # 작업 등록 (스케줄러 시작 전에 등록)
        setup_scheduler_jobs()
        logger.info("Scheduler jobs configured")
        
        # 스케줄러 시작
        if not scheduler.running:
            scheduler.start()
            logger.info("Scheduler started")
        
        # 스케줄러가 실제로 실행 중인지 확인
        if not scheduler.running:
            raise Exception("Failed to start scheduler")
        
        # 로그 기록
        log = SchedulerLog(
            job_name="scheduler_start",
            status="completed",
            start_time=datetime.now(),
            end_time=datetime.now(),
            duration_seconds=0,
            data_points_added=0
        )
        db.add(log)
        db.commit()
        
        job_count = len(scheduler.get_jobs()) if scheduler else 0
        
        return SchedulerActionResponse(
            success=True,
            message="Scheduler started successfully",
            job_count=job_count
        )
    except Exception as e:
        logger.error(f"Failed to start scheduler: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start scheduler: {str(e)}")

@router.post("/scheduler/restart", response_model=SchedulerActionResponse)
def restart_scheduler(db: Session = Depends(get_db)):
    """스케줄러를 재시작합니다."""
    try:
        logger.info("Restarting scheduler")
        
        # 기존 스케줄러 중지
        if scheduler and scheduler.running:
            scheduler.shutdown()
            logger.info("Existing scheduler stopped")
        
        # 작업 등록 (스케줄러 시작 전에 등록)
        setup_scheduler_jobs()
        logger.info("Scheduler jobs configured")
        
        # 스케줄러 시작
        if not scheduler.running:
            scheduler.start()
            logger.info("Scheduler started")
        
        # 스케줄러가 실제로 실행 중인지 확인
        if not scheduler.running:
            raise Exception("Failed to start scheduler")
        
        # 로그 기록
        log = SchedulerLog(
            job_name="scheduler_restart",
            status="completed",
            start_time=datetime.now(),
            end_time=datetime.now(),
            duration_seconds=0,
            data_points_added=0
        )
        db.add(log)
        db.commit()
        
        job_count = len(scheduler.get_jobs()) if scheduler else 0
        
        return SchedulerActionResponse(
            success=True,
            message="Scheduler restarted successfully",
            job_count=job_count
        )
    except Exception as e:
        logger.error(f"Failed to restart scheduler: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to restart scheduler: {str(e)}")

@router.post("/scheduler/stop", response_model=SchedulerActionResponse)
def stop_scheduler(db: Session = Depends(get_db)):
    """스케줄러를 중지합니다."""
    try:
        logger.info("Stopping scheduler")
        
        # 스케줄러 중지
        if scheduler and scheduler.running:
            scheduler.shutdown()
            logger.info("Scheduler stopped")
        
        # 로그 기록
        log = SchedulerLog(
            job_name="scheduler_stop",
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
            message="Scheduler stopped successfully"
        )
    except Exception as e:
        logger.error(f"Failed to stop scheduler: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to stop scheduler: {str(e)}")

@router.post("/scheduler/pause", response_model=SchedulerActionResponse)
def pause_scheduler(db: Session = Depends(get_db)):
    """스케줄러를 일시정지합니다."""
    try:
        logger.info("Pausing scheduler")
        
        # 스케줄러 일시정지 (모든 작업 일시정지)
        if scheduler and scheduler.running:
            scheduler.pause()
            logger.info("Scheduler paused")
        
        # 로그 기록
        log = SchedulerLog(
            job_name="scheduler_pause",
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
            message="Scheduler paused successfully"
        )
    except Exception as e:
        logger.error(f"Failed to pause scheduler: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to pause scheduler: {str(e)}")

@router.post("/scheduler/trigger", response_model=SchedulerActionResponse)
def trigger_scheduler(db: Session = Depends(get_db)):
    """스케줄러 작업을 즉시 실행합니다."""
    try:
        logger.info("Triggering scheduler jobs")
        
        # 스케줄러가 실행 중인지 확인
        if not scheduler:
            raise HTTPException(status_code=400, detail="Scheduler is not initialized")
        
        if not scheduler.running:
            # 스케줄러가 실행되지 않았으면 시작
            scheduler.start()
            logger.info("Scheduler started for trigger")
        
        # 모든 작업을 즉시 실행
        jobs = scheduler.get_jobs()
        if not jobs:
            return SchedulerActionResponse(
                success=True,
                message="No jobs configured",
                job_count=0
            )
        
        # 각 작업을 즉시 실행
        for job in jobs:
            try:
                # APScheduler에서는 run_job 대신 다른 방법을 사용
                # 작업을 즉시 실행하기 위해 함수를 직접 호출
                if hasattr(job.func, '__call__'):
                    job.func()
                    logger.info(f"Triggered job: {job.id}")
                else:
                    logger.warning(f"Job {job.id} has no callable function")
            except Exception as e:
                logger.error(f"Failed to trigger job {job.id}: {e}")
        
        # 로그 기록
        log = SchedulerLog(
            job_name="scheduler_trigger",
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
            message=f"Triggered {len(jobs)} jobs",
            job_count=len(jobs)
        )
    except Exception as e:
        logger.error(f"Failed to trigger scheduler: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to trigger scheduler: {str(e)}")

@router.get("/scheduler/jobs", response_model=SchedulerJobsResponse)
def get_scheduler_jobs_detail():
    """스케줄러에 등록된 작업들의 상세 정보를 조회합니다."""
    try:
        jobs = []
        if scheduler:
            for job in scheduler.get_jobs():
                # 작업 설명 매핑
                job_descriptions = {
                    'periodic_data_fetch': 'OHLCV 가격 데이터 수집',
                    'onchain_data_fetch': '온체인 메트릭 데이터 수집',
                    'company_info_fetch': '회사 정보 데이터 수집',
                    'etf_info_fetch': 'ETF 정보 데이터 수집',
                    'technical_indicators_fetch': '기술적 지표 데이터 수집',
                    'crypto_data_fetch': '암호화폐 데이터 수집',
                    'world_assets_fetch': '세계 자산 데이터 수집'
                }
                
                # 간격 정보 추출
                interval_info = str(job.trigger)
                if 'interval' in interval_info:
                    if 'minutes=' in interval_info:
                        minutes = interval_info.split('minutes=')[1].split(',')[0]
                        interval = f"{minutes}분마다"
                    elif 'hours=' in interval_info:
                        hours = interval_info.split('hours=')[1].split(',')[0]
                        interval = f"{hours}시간마다"
                    elif 'days=' in interval_info:
                        days = interval_info.split('days=')[1].split(',')[0]
                        interval = f"{days}일마다"
                    elif '1 day' in interval_info:
                        interval = "1일마다"
                    elif '4:00:00' in interval_info:
                        interval = "4시간마다"
                    elif '6:00:00' in interval_info:
                        interval = "6시간마다"
                    elif '8:00:00' in interval_info:
                        interval = "8시간마다"
                    else:
                        interval = interval_info.replace('interval[', '').replace(']', '')
                else:
                    interval = "정의되지 않음"
                
                jobs.append(JobDetail(
                    job_id=job.id,
                    job_name=job_descriptions.get(job.id, job.id),
                    next_run_time=job.next_run_time,
                    trigger=str(job.trigger),
                    is_enabled=True,  # 등록된 작업은 모두 활성화된 것으로 간주
                    description=job_descriptions.get(job.id, f"작업 ID: {job.id}"),
                    interval=interval
                ))
        
        return SchedulerJobsResponse(
            jobs=jobs,
            total_count=len(jobs)
        )
    except Exception as e:
        logger.error(f"Failed to get scheduler jobs detail: {e}")
        raise HTTPException(status_code=500, detail="Failed to get scheduler jobs detail")

@router.get("/scheduler/jobs/history", response_model=List[SchedulerLogResponse])
def get_scheduler_jobs_history(db: Session = Depends(get_db)):
    """스케줄러 작업 히스토리를 조회합니다."""
    try:
        # 최근 작업 로그 조회
        jobs = db.query(SchedulerLog).order_by(SchedulerLog.start_time.desc()).limit(50).all()
        return [SchedulerLogResponse.from_orm(job) for job in jobs]
    except Exception as e:
        logger.error(f"Failed to get scheduler jobs history: {e}")
        raise HTTPException(status_code=500, detail="Failed to get scheduler jobs history")



