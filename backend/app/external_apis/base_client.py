"""
Base API client for external APIs with common functionality.
"""
import logging
import asyncio
from typing import Optional, Dict, Any, List
from abc import ABC, abstractmethod

import httpx
import backoff
from datetime import datetime

from ..core.config import API_REQUEST_TIMEOUT_SECONDS, MAX_API_RETRY_ATTEMPTS

logger = logging.getLogger(__name__)


class BaseAPIClient(ABC):
    """Base class for all external API clients"""
    
    def __init__(self):
        self.api_timeout = API_REQUEST_TIMEOUT_SECONDS
        self.max_retries = MAX_API_RETRY_ATTEMPTS
        self.max_time = self.api_timeout * 2
    
    @backoff.on_exception(
        backoff.expo,
        (httpx.RequestError, httpx.HTTPStatusError),
        max_tries=3,
        max_time=60
    )
    async def _fetch_async(self, client: httpx.AsyncClient, url: str, api_name: str, ticker: str = None) -> Dict[str, Any]:
        """Common async fetch method with retry logic and error handling"""
        ticker_info = f"[{ticker}] " if ticker else ""
        
        logger.info(f"{ticker_info}{api_name} API 호출 시도: {url}")
        
        start_time = datetime.now()
        success = False
        status_code = None
        error_message = None
        
        try:
            response = await client.get(url, timeout=self.api_timeout)
            status_code = response.status_code
            
            if response.status_code == 429:  # Too Many Requests
                logger.warning(f"{ticker_info}{api_name} API 호출 제한 도달. 재시도합니다.")
                response.raise_for_status()
            
            response.raise_for_status()
            success = True
            return response.json()
            
        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code if e.response else None
            error_message = str(e)
            logger.error(f"{ticker_info}{api_name} API 오류 ({status_code}): {e}")
            raise
        except Exception as e:
            error_message = str(e)
            logger.error(f"{ticker_info}{api_name} API 호출 실패: {e}")
            raise
        finally:
            # API 호출 로그 기록
            await self._log_api_call(api_name, url, status_code, start_time, success, error_message, ticker)
    
    async def _log_api_call(self, api_name: str, url: str, status_code: int, start_time: datetime, success: bool, error_message: str = None, ticker: str = None):
        """외부 API 호출을 데이터베이스에 로그"""
        try:
            from ..core.database import get_db
            from ..models.system import ApiCallLog
            
            end_time = datetime.now()
            response_time_ms = int((end_time - start_time).total_seconds() * 1000)
            
            db = next(get_db())
            try:
                api_log = ApiCallLog(
                    api_name=f"External {api_name}",
                    endpoint=url,
                    asset_ticker=ticker,
                    status_code=status_code or 0,
                    response_time_ms=response_time_ms,
                    success=success,
                    error_message=error_message
                )
                db.add(api_log)
                db.commit()
            except Exception as e:
                logger.error(f"Failed to log external API call: {e}")
                db.rollback()
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error in API call logging: {e}")
    
    @backoff.on_exception(
        backoff.expo,
        (httpx.RequestError, httpx.HTTPStatusError),
        max_tries=3,
        max_time=60
    )
    async def _fetch_async_with_headers(self, client: httpx.AsyncClient, url: str, api_name: str, headers: dict = None, ticker: str = None) -> Dict[str, Any]:
        """Common async fetch method with custom headers and retry logic"""
        ticker_info = f"[{ticker}] " if ticker else ""
        
        logger.info(f"{ticker_info}{api_name} API 호출 시도: {url}")
        
        try:
            response = await client.get(url, headers=headers, timeout=self.api_timeout)
            
            if response.status_code == 429:  # Too Many Requests
                logger.warning(f"{ticker_info}{api_name} API 호출 제한 도달. 재시도합니다.")
                response.raise_for_status()
            
            response.raise_for_status()
            return response.json()
            
        except httpx.HTTPStatusError as e:
            logger.error(f"{ticker_info}{api_name} API 오류 ({e.response.status_code if e.response else 'Unknown'}): {e}")
            raise
        except Exception as e:
            logger.error(f"{ticker_info}{api_name} API 호출 실패: {e}")
            raise
    
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
        """Safely parse date string with multiple format support"""
        if not date_str:
            return None
        
        # 여러 날짜 형식 지원
        formats = [
            '%Y-%m-%d',  # 2025-08-22
            '%Y-%m-%dT%H:%M:%S.%fZ',  # 2025-08-22T00:00:00.000Z (Tiingo)
            '%Y-%m-%dT%H:%M:%SZ',     # 2025-08-22T00:00:00Z
            '%Y-%m-%d %H:%M:%S',      # 2025-08-22 00:00:00
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        
        # 모든 형식 실패 시 None 반환
        logger.warning(f"Unable to parse date: {date_str}")
        return None
    
    @abstractmethod
    async def test_connection(self) -> bool:
        """Test API connection"""
        pass
    
    @abstractmethod
    def get_rate_limit_info(self) -> Dict[str, Any]:
        """Get API rate limit information"""
        pass
