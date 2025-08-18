"""
Advanced retry utilities with exponential backoff and jitter.
"""
import asyncio
import random
import logging
from typing import Callable, Any, Optional
from functools import wraps

logger = logging.getLogger(__name__)


class TransientAPIError(Exception):
    """일시적 API 오류 (429, 5xx 등) - 재시도 가능"""
    pass


class PermanentAPIError(Exception):
    """영구적 API 오류 (404, 401 등) - 재시도 불가"""
    pass


def classify_api_error(status_code: int, error_message: str = "") -> Exception:
    """API 응답을 기반으로 오류 유형을 분류"""
    if status_code == 429:  # Rate Limit
        return TransientAPIError(f"Rate limit exceeded: {error_message}")
    elif status_code >= 500:  # Server Error
        return TransientAPIError(f"Server error {status_code}: {error_message}")
    elif status_code == 404:  # Not Found
        return PermanentAPIError(f"Resource not found: {error_message}")
    elif status_code == 401:  # Unauthorized
        return PermanentAPIError(f"Unauthorized: {error_message}")
    elif status_code == 403:  # Forbidden
        return PermanentAPIError(f"Forbidden: {error_message}")
    else:
        return TransientAPIError(f"HTTP {status_code}: {error_message}")


async def retry_with_backoff(
    api_call_func: Callable,
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    jitter: bool = True
) -> Any:
    """
    지수 백오프와 Jitter를 사용한 재시도 로직
    
    Args:
        api_call_func: 재시도할 비동기 함수
        max_retries: 최대 재시도 횟수
        base_delay: 기본 지연 시간 (초)
        max_delay: 최대 지연 시간 (초)
        jitter: Jitter 적용 여부
    
    Returns:
        API 호출 결과
    
    Raises:
        PermanentAPIError: 영구적 오류 발생 시
        TransientAPIError: 최대 재시도 후에도 실패 시
    """
    last_exception = None
    
    for attempt in range(max_retries + 1):  # +1 for initial attempt
        try:
            return await api_call_func()
            
        except PermanentAPIError as e:
            # 영구적 오류는 즉시 재시도 중단
            logger.error(f"Permanent error on attempt {attempt + 1}: {e}")
            raise
            
        except TransientAPIError as e:
            last_exception = e
            if attempt == max_retries:
                # 최대 재시도 횟수 도달
                logger.error(f"Max retries ({max_retries}) reached. Last error: {e}")
                raise
            
            # 지수 백오프 계산
            delay = min(base_delay * (2 ** attempt), max_delay)
            
            # Jitter 적용 (선택적)
            if jitter:
                jitter_amount = delay * 0.1  # 10% jitter
                delay += random.uniform(-jitter_amount, jitter_amount)
                delay = max(0.1, delay)  # 최소 0.1초 보장
            
            logger.warning(f"Attempt {attempt + 1} failed: {e}. Retrying in {delay:.2f}s")
            await asyncio.sleep(delay)
            
        except Exception as e:
            # 예상치 못한 오류는 TransientAPIError로 처리
            last_exception = TransientAPIError(f"Unexpected error: {e}")
            if attempt == max_retries:
                logger.error(f"Max retries ({max_retries}) reached. Last error: {e}")
                raise last_exception
            
            delay = min(base_delay * (2 ** attempt), max_delay)
            if jitter:
                jitter_amount = delay * 0.1
                delay += random.uniform(-jitter_amount, jitter_amount)
                delay = max(0.1, delay)
            
            logger.warning(f"Attempt {attempt + 1} failed with unexpected error: {e}. Retrying in {delay:.2f}s")
            await asyncio.sleep(delay)


def retry_decorator(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    jitter: bool = True
):
    """
    재시도 로직을 데코레이터로 적용
    
    Usage:
        @retry_decorator(max_retries=3, base_delay=1.0)
        async def my_api_call():
            # API 호출 로직
            pass
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            async def api_call():
                return await func(*args, **kwargs)
            
            return await retry_with_backoff(
                api_call,
                max_retries=max_retries,
                base_delay=base_delay,
                max_delay=max_delay,
                jitter=jitter
            )
        return wrapper
    return decorator


class CircuitBreaker:
    """회로 차단기 패턴 구현"""
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0,
        expected_exception: type = TransientAPIError
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    async def call(self, func: Callable, *args, **kwargs):
        """회로 차단기를 통한 함수 호출"""
        if self.state == "OPEN":
            if self._should_attempt_reset():
                self.state = "HALF_OPEN"
                logger.info("Circuit breaker transitioning to HALF_OPEN")
            else:
                raise TransientAPIError("Circuit breaker is OPEN")
        
        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
            
        except self.expected_exception as e:
            self._on_failure()
            raise
    
    def _on_success(self):
        """성공 시 상태 리셋"""
        self.failure_count = 0
        self.last_failure_time = None
        if self.state == "HALF_OPEN":
            self.state = "CLOSED"
            logger.info("Circuit breaker reset to CLOSED")
    
    def _on_failure(self):
        """실패 시 카운트 증가 및 상태 변경"""
        self.failure_count += 1
        self.last_failure_time = asyncio.get_event_loop().time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"
            logger.warning(f"Circuit breaker opened after {self.failure_count} failures")
    
    def _should_attempt_reset(self) -> bool:
        """리셋 시도 여부 확인"""
        if not self.last_failure_time:
            return True
        
        elapsed = asyncio.get_event_loop().time() - self.last_failure_time
        return elapsed >= self.recovery_timeout 