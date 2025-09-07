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

from app.core.config import API_REQUEST_TIMEOUT_SECONDS, MAX_API_RETRY_ATTEMPTS

logger = logging.getLogger(__name__)


class BaseAPIClient(ABC):
    """Base class for all external API clients"""
    
    def __init__(self):
        """Initialize base API client with common settings"""
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
            self._log_api_call(api_name, url, status_code, start_time, success, error_message, ticker)
    
    def _log_api_call(self, api_name: str, url: str, status_code: int, start_time: datetime, success: bool, error_message: str = None, ticker: str = None):
        """외부 API 호출을 데이터베이스에 로그 - ApiLoggingHelper 사용"""
        try:
            from app.utils.logging_helper import ApiLoggingHelper
            
            end_time = datetime.now()
            response_time_ms = int((end_time - start_time).total_seconds() * 1000)
            
            # ApiLoggingHelper 사용
            logging_helper = ApiLoggingHelper()
            
            if success:
                # 성공 로그
                logging_helper.log_api_call_success(api_name.lower(), ticker or "unknown")
            else:
                # 실패 로그
                error_exception = Exception(error_message) if error_message else Exception("Unknown error")
                logging_helper.log_api_call_failure(api_name.lower(), ticker or "unknown", error_exception)
                
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
    
    @abstractmethod
    async def test_connection(self) -> bool:
        """Test API connection"""
        pass
    
    @abstractmethod
    def get_rate_limit_info(self) -> Dict[str, Any]:
        """Get API rate limit information"""
        pass
