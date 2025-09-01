"""
Base collector class providing common functionality for all data collectors.
"""
import logging
import asyncio
import httpx
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session

from app.core.database import get_db
from ..core.config import GLOBAL_APP_CONFIGS
from ..models.system import SchedulerLog
from ..utils.retry import retry_with_backoff, classify_api_error, TransientAPIError, PermanentAPIError

logger = logging.getLogger(__name__)


class BaseCollector(ABC):
    """Base class for all data collectors"""
    
    def __init__(self, db: Session = None):
        self.db = db
        self.collector_name = self.__class__.__name__
        
        # API 설정
        self.api_timeout = GLOBAL_APP_CONFIGS.get("API_REQUEST_TIMEOUT_SECONDS", 30)
        self.max_retries = GLOBAL_APP_CONFIGS.get("MAX_API_RETRY_ATTEMPTS", 3)
        
        # 세마포어 기능 설정 기반 활성화
        self.enable_semaphore = GLOBAL_APP_CONFIGS.get("ENABLE_SEMAPHORE", True)
        if self.enable_semaphore:
            # Use a more balanced default and clamp to a sane range
            raw_limit = GLOBAL_APP_CONFIGS.get("SEMAPHORE_LIMIT", 8)
            try:
                semaphore_limit = int(raw_limit) if raw_limit is not None else 8
            except (TypeError, ValueError):
                semaphore_limit = 8
            semaphore_limit = max(1, min(16, semaphore_limit))
            self.semaphore = asyncio.Semaphore(semaphore_limit)
            logger.info(f"{self.collector_name}: Semaphore enabled with limit {semaphore_limit}")
        else:
            self.semaphore = None
            logger.info(f"{self.collector_name}: Semaphore disabled")
    
    async def collect(self) -> Dict[str, Any]:
        """Main collection method with error handling and logging"""
        start_time = datetime.now()
        logger.info(f"Starting {self.collector_name} collection")
        
        # Create scheduler log entry
        db = self.get_db_session()
        scheduler_log = SchedulerLog(
            job_name=f"{self.collector_name.lower()}_collection",
            start_time=start_time,
            status="running"
        )
        db.add(scheduler_log)
        db.commit()
        
        try:
            result = await self._collect_data()
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            # Update scheduler log with success
            scheduler_log.end_time = end_time
            scheduler_log.duration_seconds = int(duration)
            scheduler_log.status = "completed"
            scheduler_log.assets_processed = result.get("processed_assets", 0)
            scheduler_log.data_points_added = result.get("total_added_records", 0)
            db.commit()
            
            logger.info(f"{self.collector_name} collection completed in {duration:.2f}s")
            return {
                "success": True,
                "collector": self.collector_name,
                "duration": duration,
                "data": result
            }
            
        except Exception as e:
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            # Update scheduler log with error
            scheduler_log.end_time = end_time
            scheduler_log.duration_seconds = int(duration)
            scheduler_log.status = "failed"
            scheduler_log.error_message = str(e)
            db.commit()
            
            logger.error(f"{self.collector_name} collection failed after {duration:.2f}s: {e}")
            
            return {
                "success": False,
                "collector": self.collector_name,
                "duration": duration,
                "error": str(e)
            }
    
    async def process_with_semaphore(self, coro):
        """세마포어가 활성화된 경우에만 동시성 제어 적용"""
        if self.enable_semaphore and self.semaphore:
            async with self.semaphore:
                return await coro
        else:
            return await coro
    
    @abstractmethod
    async def _collect_data(self) -> Dict[str, Any]:
        """Abstract method that must be implemented by subclasses"""
        pass
    
    def get_db_session(self) -> Session:
        """Get database session if not already provided"""
        if not self.db:
            self.db = next(get_db())
        return self.db
    
    async def safe_emit(self, event: str, data: Dict[str, Any]):
        """Safely emit websocket events"""
        try:
            from ..core.websocket import safe_emit
            await safe_emit(event, data)
        except Exception as e:
            logger.warning(f"Failed to emit {event}: {e}")
    
    def log_progress(self, message: str, level: str = "info"):
        """Log progress with consistent formatting"""
        log_message = f"[{self.collector_name}] {message}"
        if level == "info":
            logger.info(log_message)
        elif level == "warning":
            logger.warning(log_message)
        elif level == "error":
            logger.error(log_message)
        elif level == "debug":
            logger.debug(log_message)

    # --- Logging helper hooks used by CollectorLoggingHelper ---
    def log_task_progress(self, message: str, details: dict | None = None):
        """Structured progress log and websocket emit for UI."""
        payload = {"message": f"[{self.collector_name}] {message}", "type": "info"}
        if details:
            payload["details"] = details
        try:
            # plain log
            logger.info(json_safe(payload))
        except Exception:
            logger.info(payload["message"])  # fallback
        # best-effort websocket emit
        asyncio.create_task(self.safe_emit('scheduler_log', payload))

    def log_api_call(self, api_name: str, action: str, success: bool, extra: dict | None = None):
        """Structured API call log for audit/diagnostics."""
        status = "success" if success else "failure"
        payload = {
            "message": f"[{self.collector_name}] {api_name} {action} {status}",
            "type": "info" if success else "warning",
            "api_name": api_name,
            "status": status,
        }
        if extra:
            payload.update(extra)
        try:
            logger.info(json_safe(payload))
        except Exception:
            logger.info(payload["message"])  # fallback
        asyncio.create_task(self.safe_emit('scheduler_log', payload))

    def log_error_with_context(self, error: Exception, context: str = ""):
        """Standardized error logging with optional context."""
        msg = f"[{self.collector_name}] {context}: {error}" if context else f"[{self.collector_name}] {error}"
        logger.error(msg)
        payload = {
            "message": msg,
            "type": "error",
            "error_type": type(error).__name__,
        }
        asyncio.create_task(self.safe_emit('scheduler_log', payload))

    # --- 공통 API 요청 메소드들 ---
    async def _make_request(
        self, 
        client: httpx.AsyncClient, 
        url: str, 
        api_name: str, 
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, Any]] = None,
        ticker: str = None
    ) -> Optional[Dict[str, Any]]:
        """
        공통 API 요청 메소드 - 재시도 로직과 예외 처리 포함
        
        Args:
            client: httpx.AsyncClient 인스턴스
            url: 요청할 URL
            api_name: API 이름 (로깅용)
            params: URL 파라미터
            headers: HTTP 헤더
            ticker: 자산 티커 (로깅용)
            
        Returns:
            API 응답 JSON 데이터 또는 None (실패 시)
        """
        async def api_call():
            response = await client.get(
                url, 
                params=params, 
                headers=headers, 
                timeout=self.api_timeout
            )
            
            # API 응답 상태 코드에 따른 오류 분류
            if response.status_code == 429:
                raise TransientAPIError(f"Rate limit exceeded for {api_name}")
            elif response.status_code >= 500:
                raise TransientAPIError(f"Server error {response.status_code} for {api_name}")
            elif response.status_code == 404:
                raise PermanentAPIError(f"Resource not found for {api_name}")
            elif response.status_code in [401, 403]:
                raise PermanentAPIError(f"Authentication failed for {api_name}")
            
            response.raise_for_status()
            return response.json()
        
        try:
            # 고도화된 재시도 로직 적용
            return await retry_with_backoff(
                api_call,
                max_retries=self.max_retries,
                base_delay=1.0,
                max_delay=30.0,
                jitter=True
            )
        except Exception as e:
            ticker_info = f"[{ticker}] " if ticker else ""
            logger.error(f"{ticker_info}{api_name} API 호출 실패: {e}")
            return None

    async def _make_request_with_retry(
        self, 
        client: httpx.AsyncClient, 
        url: str, 
        api_name: str, 
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, Any]] = None,
        ticker: str = None,
        max_retries: int = None
    ) -> Optional[Dict[str, Any]]:
        """
        커스텀 재시도 횟수로 API 요청하는 메소드
        
        Args:
            client: httpx.AsyncClient 인스턴스
            url: 요청할 URL
            api_name: API 이름 (로깅용)
            params: URL 파라미터
            headers: HTTP 헤더
            ticker: 자산 티커 (로깅용)
            max_retries: 최대 재시도 횟수 (None이면 기본값 사용)
            
        Returns:
            API 응답 JSON 데이터 또는 None (실패 시)
        """
        if max_retries is None:
            max_retries = self.max_retries
            
        async def api_call():
            response = await client.get(
                url, 
                params=params, 
                headers=headers, 
                timeout=self.api_timeout
            )
            
            # API 응답 상태 코드에 따른 오류 분류
            if response.status_code == 429:
                raise TransientAPIError(f"Rate limit exceeded for {api_name}")
            elif response.status_code >= 500:
                raise TransientAPIError(f"Server error {response.status_code} for {api_name}")
            elif response.status_code == 404:
                raise PermanentAPIError(f"Resource not found for {api_name}")
            elif response.status_code in [401, 403]:
                raise PermanentAPIError(f"Authentication failed for {api_name}")
            
            response.raise_for_status()
            return response.json()
        
        try:
            return await retry_with_backoff(
                api_call,
                max_retries=max_retries,
                base_delay=1.0,
                max_delay=30.0,
                jitter=True
            )
        except Exception as e:
            ticker_info = f"[{ticker}] " if ticker else ""
            logger.error(f"{ticker_info}{api_name} API 호출 실패: {e}")
            return None

    def _safe_float(self, value: Any, default: float = None) -> Optional[float]:
        """Safely convert value to float, treating 0 values as invalid"""
        if value is None:
            return default
        
        # 0, "0", 0.0 등은 None으로 처리 (가격 데이터에서 0은 유효하지 않음)
        if value == 0 or value == "0" or value == 0.0:
            return None
            
        try:
            result = float(value)
            # 변환된 결과가 0이면 None 반환
            if result == 0:
                return None
            return result
        except (ValueError, TypeError):
            return default
    
    def _safe_int(self, value: Any, default: int = None) -> Optional[int]:
        """Safely convert value to integer"""
        if value is None:
            return default
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return default
    
    def _safe_date_parse(self, date_str: str) -> Optional[datetime]:
        """Safely parse date string"""
        if not date_str:
            return None
        try:
            # 다양한 날짜 형식 지원
            date_formats = [
                '%Y-%m-%d',
                '%Y-%m-%d %H:%M:%S',
                '%Y-%m-%dT%H:%M:%S',
                '%Y-%m-%dT%H:%M:%SZ',
                '%Y-%m-%dT%H:%M:%S.%fZ'
            ]
            
            for fmt in date_formats:
                try:
                    return datetime.strptime(date_str, fmt)
                except ValueError:
                    continue
            
            # 모든 형식이 실패하면 None 반환
            return None
        except Exception:
            return None

    async def _make_html_request(
        self, 
        client: httpx.AsyncClient, 
        url: str, 
        api_name: str, 
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, Any]] = None,
        ticker: str = None
    ) -> Optional[str]:
        """
        HTML 응답을 위한 공통 API 요청 메소드
        
        Args:
            client: httpx.AsyncClient 인스턴스
            url: 요청할 URL
            api_name: API 이름 (로깅용)
            params: URL 파라미터
            headers: HTTP 헤더
            ticker: 자산 티커 (로깅용)
            
        Returns:
            HTML 응답 텍스트 또는 None (실패 시)
        """
        async def api_call():
            response = await client.get(
                url, 
                params=params, 
                headers=headers, 
                timeout=self.api_timeout
            )
            
            # API 응답 상태 코드에 따른 오류 분류
            if response.status_code == 429:
                raise TransientAPIError(f"Rate limit exceeded for {api_name}")
            elif response.status_code >= 500:
                raise TransientAPIError(f"Server error {response.status_code} for {api_name}")
            elif response.status_code == 404:
                raise PermanentAPIError(f"Resource not found for {api_name}")
            elif response.status_code in [401, 403]:
                raise PermanentAPIError(f"Authentication failed for {api_name}")
            
            response.raise_for_status()
            return response.text
        
        try:
            # 고도화된 재시도 로직 적용
            return await retry_with_backoff(
                api_call,
                max_retries=self.max_retries,
                base_delay=1.0,
                max_delay=30.0,
                jitter=True
            )
        except Exception as e:
            ticker_info = f"[{ticker}] " if ticker else ""
            logger.error(f"{ticker_info}{api_name} API 호출 실패: {e}")
            return None


def json_safe(obj: dict) -> str:
    try:
        import json
        return json.dumps(obj, ensure_ascii=False, default=str)
    except Exception:
        return str(obj)



