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

from app.core.config import API_REQUEST_TIMEOUT_SECONDS

logger = logging.getLogger(__name__)


class BaseAPIClient(ABC):
    """Base class for all external API clients"""
    
    def __init__(self):
        """Initialize base API client with common settings"""
        self.api_timeout = API_REQUEST_TIMEOUT_SECONDS
        # Note: API retry is handled by @backoff decorator (hardcoded to 3 attempts)
        # self.max_retries is kept for compatibility but not used in actual retry logic
        self.max_retries = 3
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
            
            # endpoint 추론: api_name과 URL로부터 컨텍스트 파악
            endpoint = self._infer_endpoint_from_api_name(api_name, url, ticker)
            
            # ApiLoggingHelper 사용
            logging_helper = ApiLoggingHelper()
            
            if success:
                # 성공 로그
                logging_helper.log_api_call_success(api_name.lower(), ticker or "unknown", endpoint=endpoint)
            else:
                # 실패 로그
                error_exception = Exception(error_message) if error_message else Exception("Unknown error")
                logging_helper.log_api_call_failure(api_name.lower(), ticker or "unknown", error_exception, endpoint=endpoint)
                
        except Exception as e:
            logger.error(f"Error in API call logging: {e}")
    
    def _infer_endpoint_from_api_name(self, api_name: str, url: str, ticker: str = None) -> str:
        """API 이름과 URL로부터 엔드포인트 컨텍스트를 추론합니다."""
        api_lower = api_name.lower()
        ticker_part = f" for {ticker}" if ticker else ""
        
        # 이름 기반 매핑
        if 'profile' in api_lower:
            return f"Company profile data{ticker_part}"
        elif 'quote' in api_lower:
            return f"Real-time quote data{ticker_part}"
        elif 'ohlcv' in api_lower or 'historical' in api_lower or 'price' in api_lower:
            return f"OHLCV data collection{ticker_part}"
        elif 'financial' in api_lower or 'statement' in api_lower:
            return f"Financial statements{ticker_part}"
        elif 'estimate' in api_lower or 'analyst' in api_lower:
            return f"Analyst estimates{ticker_part}"
        elif 'etf' in api_lower:
            return f"ETF information{ticker_part}"
        elif 'crypto' in api_lower:
            return f"Crypto information{ticker_part}"
        elif 'onchain' in api_lower or 'metric' in api_lower:
            return f"Onchain metrics{ticker_part}"
        elif 'technical' in api_lower or 'indicator' in api_lower:
            return f"Technical indicators{ticker_part}"
        else:
            # URL로부터 추론
            if '/profile' in url:
                return f"Company profile data{ticker_part}"
            elif '/quote' in url:
                return f"Real-time quote data{ticker_part}"
            elif '/historical' in url or '/chart' in url:
                return f"OHLCV data collection{ticker_part}"
            else:
                return f"API data collection{ticker_part}"
    
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
