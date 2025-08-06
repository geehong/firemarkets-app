import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..models.system import ApiCallLog
from ..utils.logger import get_logger

logger = get_logger()

class APILoggingMiddleware(BaseHTTPMiddleware):
    """API 호출을 자동으로 로그하는 미들웨어"""
    
    async def dispatch(self, request: Request, call_next):
        # 시작 시간 기록
        start_time = time.time()
        
        # 요청 처리
        response = await call_next(request)
        
        # 종료 시간 및 응답 시간 계산
        end_time = time.time()
        response_time_ms = int((end_time - start_time) * 1000)
        
        # API 호출 로그 기록
        await self.log_api_call(request, response, response_time_ms)
        
        return response
    
    async def log_api_call(self, request: Request, response: Response, response_time_ms: int):
        """API 호출을 데이터베이스에 로그"""
        try:
            # API 호출 정보 추출
            method = request.method
            url = str(request.url)
            status_code = response.status_code
            success = status_code < 400
            
            # API 이름 추출 (URL에서)
            api_name = self.extract_api_name(url)
            
            # 에러 메시지 추출 (실패한 경우)
            error_message = None
            if not success:
                try:
                    # 응답 본문에서 에러 메시지 추출 시도
                    body = await response.body()
                    if body:
                        error_message = body.decode()[:500]  # 최대 500자
                except:
                    error_message = f"HTTP {status_code}"
            
            # 데이터베이스에 로그 기록
            db = next(get_db())
            try:
                api_log = ApiCallLog(
                    api_name=api_name,
                    endpoint=url,
                    status_code=status_code,
                    response_time_ms=response_time_ms,
                    success=success,
                    error_message=error_message
                )
                db.add(api_log)
                db.commit()
                
                # 성공한 경우에만 info 레벨로 로그
                if success:
                    logger.info(f"API call logged: {method} {url} - {status_code} ({response_time_ms}ms)")
                else:
                    logger.warning(f"API call failed: {method} {url} - {status_code} ({response_time_ms}ms)")
                    
            except Exception as e:
                logger.error(f"Failed to log API call to database: {e}")
                db.rollback()
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Error in API logging middleware: {e}")
    
    def extract_api_name(self, url: str) -> str:
        """URL에서 API 이름을 추출"""
        try:
            # URL 경로에서 API 이름 추출
            path = url.split('?')[0]  # 쿼리 파라미터 제거
            
            # 주요 API 그룹 분류
            if '/api/v1/assets' in path:
                return 'Assets API'
            elif '/api/v1/onchain' in path:
                return 'OnChain API'
            elif '/api/v1/world-assets' in path:
                return 'World Assets API'
            elif '/api/v1/scheduler' in path:
                return 'Scheduler API'
            elif '/api/v1/logs' in path:
                return 'Logs API'
            elif '/api/v1/config' in path:
                return 'Config API'
            elif '/health' in path:
                return 'Health Check'
            else:
                return 'Unknown API'
        except:
            return 'Unknown API' 