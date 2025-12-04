# backend_temp/app/api/v1/endpoints/logs.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime, timedelta
import logging

from ....core.database import get_postgres_db
from ....models.asset import ApiCallLog
from ....models.asset import SchedulerLog, SystemLog
from ....schemas.common import LogDeleteResponse

logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic models
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

class ApiCallLogResponse(BaseModel):
    log_id: int
    api_name: str
    endpoint: str
    asset_ticker: Optional[str]
    status_code: int
    response_time_ms: int
    success: bool
    error_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class LogSummary(BaseModel):
    total_logs: int
    success_count: int
    error_count: int
    avg_response_time: Optional[float]
    recent_errors: List[Dict[str, Any]]

@router.get("/scheduler", response_model=List[SchedulerLogResponse])
def get_scheduler_logs(
    limit: int = Query(20, ge=1, le=100, description="Number of logs to return"),
    status: Optional[str] = Query(None, description="Filter by status"),
    job_name: Optional[str] = Query(None, description="Filter by job name"),
    db: Session = Depends(get_postgres_db)
):
    """스케줄러 로그를 조회합니다."""
    try:
        query = db.query(SchedulerLog)
        
        # 필터 적용
        if status:
            query = query.filter(SchedulerLog.status == status)
        if job_name:
            query = query.filter(SchedulerLog.job_name.contains(job_name))
        
        # 최신 순으로 정렬하고 제한
        logs = query.order_by(SchedulerLog.start_time.desc()).limit(limit).all()
        
        return [SchedulerLogResponse.from_orm(log) for log in logs]
    except Exception as e:
        logger.error(f"Failed to get scheduler logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to get scheduler logs")

@router.get("/api", response_model=List[ApiCallLogResponse])
def get_api_logs(
    limit: int = Query(20, ge=1, le=100, description="Number of logs to return"),
    endpoint: Optional[str] = Query(None, description="Filter by endpoint"),
    status_code: Optional[int] = Query(None, description="Filter by status code"),
    method: Optional[str] = Query(None, description="Filter by HTTP method"),
    db: Session = Depends(get_postgres_db)
):
    """API 호출 로그를 조회합니다."""
    try:
        query = db.query(ApiCallLog)
        
        # 필터 적용
        if endpoint:
            query = query.filter(ApiCallLog.endpoint.contains(endpoint))
        if status_code:
            query = query.filter(ApiCallLog.status_code == status_code)
        if method:
            query = query.filter(ApiCallLog.method == method.upper())
        
        # 최신 순으로 정렬하고 제한
        logs = query.order_by(ApiCallLog.created_at.desc()).limit(limit).all()
        
        return [ApiCallLogResponse.from_orm(log) for log in logs]
    except Exception as e:
        logger.error(f"Failed to get API logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to get API logs")

@router.get("/scheduler/summary", response_model=LogSummary)
def get_scheduler_logs_summary(
    days: int = Query(7, ge=1, le=30, description="Number of days to analyze"),
    db: Session = Depends(get_postgres_db)
):
    """스케줄러 로그 요약을 조회합니다."""
    try:
        # 지정된 기간의 로그 조회
        start_date = datetime.now() - timedelta(days=days)
        logs = db.query(SchedulerLog).filter(
            SchedulerLog.start_time >= start_date
        ).all()
        
        # 통계 계산
        total_logs = len(logs)
        success_count = len([log for log in logs if log.status == "completed"])
        error_count = len([log for log in logs if log.status == "failed"])
        
        # 평균 응답 시간 계산
        completed_logs = [log for log in logs if log.duration_seconds is not None]
        avg_response_time = None
        if completed_logs:
            avg_response_time = sum(log.duration_seconds for log in completed_logs) / len(completed_logs)
        
        # 최근 오류 조회
        recent_errors = []
        error_logs = [log for log in logs if log.status == "failed"]
        for log in error_logs[:5]:  # 최근 5개 오류만
            recent_errors.append({
                "log_id": log.log_id,
                "job_name": log.job_name,
                "error_message": log.error_message,
                "start_time": log.start_time.isoformat()
            })
        
        return LogSummary(
            total_logs=total_logs,
            success_count=success_count,
            error_count=error_count,
            avg_response_time=avg_response_time,
            recent_errors=recent_errors
        )
    except Exception as e:
        logger.error(f"Failed to get scheduler logs summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to get scheduler logs summary")

@router.get("/api/summary", response_model=LogSummary)
def get_api_logs_summary(
    days: int = Query(7, ge=1, le=30, description="Number of days to analyze"),
    db: Session = Depends(get_postgres_db)
):
    """API 호출 로그 요약을 조회합니다."""
    try:
        # 지정된 기간의 로그 조회
        start_date = datetime.now() - timedelta(days=days)
        logs = db.query(ApiCallLog).filter(
            ApiCallLog.created_at >= start_date
        ).all()
        
        # 통계 계산
        total_logs = len(logs)
        success_count = len([log for log in logs if 200 <= log.status_code < 300])
        error_count = len([log for log in logs if log.status_code >= 400])
        
        # 평균 응답 시간 계산
        logs_with_time = [log for log in logs if log.response_time_ms is not None]
        avg_response_time = None
        if logs_with_time:
            avg_response_time = sum(log.response_time_ms for log in logs_with_time) / len(logs_with_time)
        
        # 최근 오류 조회
        recent_errors = []
        error_logs = [log for log in logs if log.status_code >= 400]
        for log in error_logs[:5]:  # 최근 5개 오류만
            recent_errors.append({
                "log_id": log.log_id,
                "api_name": log.api_name,
                "endpoint": log.endpoint,
                "asset_ticker": log.asset_ticker,
                "status_code": log.status_code,
                "error_message": log.error_message,
                "created_at": log.created_at.isoformat()
            })
        
        return LogSummary(
            total_logs=total_logs,
            success_count=success_count,
            error_count=error_count,
            avg_response_time=avg_response_time,
            recent_errors=recent_errors
        )
    except Exception as e:
        logger.error(f"Failed to get API logs summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to get API logs summary")

@router.delete("/scheduler", response_model=LogDeleteResponse)
def clear_scheduler_logs(
    days: int = Query(30, ge=1, description="Delete logs older than N days"),
    db: Session = Depends(get_postgres_db)
):
    """오래된 스케줄러 로그를 삭제합니다."""
    try:
        cutoff_date = datetime.now() - timedelta(days=days)
        deleted_count = db.query(SchedulerLog).filter(
            SchedulerLog.start_time < cutoff_date
        ).delete()
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Deleted {deleted_count} scheduler logs older than {days} days"
        }
    except Exception as e:
        logger.error(f"Failed to clear scheduler logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear scheduler logs")

@router.delete("/api", response_model=LogDeleteResponse)
def clear_api_logs(
    days: int = Query(30, ge=1, description="Delete logs older than N days"),
    db: Session = Depends(get_postgres_db)
):
    """오래된 API 호출 로그를 삭제합니다."""
    try:
        cutoff_date = datetime.now() - timedelta(days=days)
        deleted_count = db.query(ApiCallLog).filter(
            ApiCallLog.created_at < cutoff_date
        ).delete()
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Deleted {deleted_count} API logs older than {days} days"
        }
    except Exception as e:
        logger.error(f"Failed to clear API logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear API logs")

# System Log Endpoints

class SystemLogResponse(BaseModel):
    id: int
    level: str
    module: Optional[str]
    message: str
    timestamp: datetime

    class Config:
        from_attributes = True

@router.get("/system", response_model=List[SystemLogResponse])
def get_system_logs(
    limit: int = Query(50, ge=1, le=200, description="Number of logs to return"),
    level: Optional[str] = Query(None, description="Filter by log level"),
    module: Optional[str] = Query(None, description="Filter by module"),
    db: Session = Depends(get_postgres_db)
):
    """시스템 로그를 조회합니다."""
    try:
        query = db.query(SystemLog)
        
        if level:
            query = query.filter(SystemLog.level == level)
        if module:
            query = query.filter(SystemLog.module.contains(module))
        
        logs = query.order_by(SystemLog.timestamp.desc()).limit(limit).all()
        
        return [SystemLogResponse.from_orm(log) for log in logs]
    except Exception as e:
        logger.error(f"Failed to get system logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to get system logs")

@router.get("/system/summary", response_model=LogSummary)
def get_system_logs_summary(
    days: int = Query(7, ge=1, le=30, description="Number of days to analyze"),
    db: Session = Depends(get_postgres_db)
):
    """시스템 로그 요약을 조회합니다."""
    try:
        start_date = datetime.now() - timedelta(days=days)
        logs = db.query(SystemLog).filter(
            SystemLog.timestamp >= start_date
        ).all()
        
        total_logs = len(logs)
        error_count = len([log for log in logs if log.level == "ERROR" or log.level == "CRITICAL"])
        success_count = total_logs - error_count # Just a rough estimate
        
        recent_errors = []
        error_logs = [log for log in logs if log.level in ["ERROR", "CRITICAL"]]
        for log in error_logs[:5]:
            recent_errors.append({
                "log_id": log.id,
                "level": log.level,
                "module": log.module,
                "error_message": log.message,
                "created_at": log.timestamp.isoformat()
            })
        
        return LogSummary(
            total_logs=total_logs,
            success_count=success_count,
            error_count=error_count,
            avg_response_time=None,
            recent_errors=recent_errors
        )
    except Exception as e:
        logger.error(f"Failed to get system logs summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to get system logs summary")

@router.delete("/system", response_model=LogDeleteResponse)
def clear_system_logs(
    days: int = Query(30, ge=1, description="Delete logs older than N days"),
    db: Session = Depends(get_postgres_db)
):
    """오래된 시스템 로그를 삭제합니다."""
    try:
        cutoff_date = datetime.now() - timedelta(days=days)
        deleted_count = db.query(SystemLog).filter(
            SystemLog.timestamp < cutoff_date
        ).delete()
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Deleted {deleted_count} system logs older than {days} days"
        }
    except Exception as e:
        logger.error(f"Failed to clear system logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear system logs")



