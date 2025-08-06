# app/main.py
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from fastapi import HTTPException
from datetime import datetime

from .core.config import load_and_set_global_configs, initialize_bitcoin_asset_id, setup_scheduler_jobs
from .core.database import test_database_connection
from .core.websocket import sio, scheduler
from .core.cache import setup_cache
from .api.v1.api import api_router
from .schemas.common import HealthCheckResponse, ApiV1RootResponse
from .middleware.logging_middleware import APILoggingMiddleware

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- FastAPI 애플리케이션 생성 ---
app = FastAPI(
    title="Market Analyzer API (Clean Architecture)",
    description="과거 데이터 및 지표를 바탕으로 미래 시장 예측 및 자산 상품 개발 지원",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
    # root_path 제거 - Nginx가 /api 경로를 직접 전달하므로 불필요
)

# --- 미들웨어 설정 ---
origins = [
    "http://localhost", "http://localhost:3000", "http://localhost:8000",
    "http://127.0.0.1:3000", "http://127.0.0.1:8000",
    "ws://localhost:3000", "ws://localhost:8000",
    "ws://127.0.0.1:3000", "ws://127.0.0.1:8000",
    # 프로덕션 도메인 추가
    "https://firemarkets.net", "http://firemarkets.net",
    "wss://firemarkets.net", "ws://firemarkets.net",
]

# API 로깅 미들웨어 추가
app.add_middleware(APILoggingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API 라우터 포함 ---
app.include_router(api_router, prefix="/api/v1")

# --- Socket.IO를 FastAPI에 마운트 ---
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

# --- 애플리케이션 생명주기 이벤트 ---

@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 실행되는 이벤트"""
    try:
        logger.info("애플리케이션 시작...")

        # 1. 데이터베이스 연결 테스트
        if not test_database_connection():
            raise Exception("데이터베이스 연결에 실패했습니다.")
        logger.info("데이터베이스 연결 확인 완료")

        # 2. 데이터베이스에서 설정값 로드
        load_and_set_global_configs()
        logger.info("전역 설정 로드 완료")

        # 3. 비트코인 Asset ID 초기화
        initialize_bitcoin_asset_id()
        logger.info("비트코인 Asset ID 초기화 완료")

        # 4. 캐시 초기화
        await setup_cache()
        logger.info("캐시 초기화 완료")

        # 5. 스케줄러 시작 및 작업 등록 (설정에 따라)
        # 스케줄러 자동 시작 비활성화 - 수동으로만 시작하도록 변경
        # if not scheduler.running:
        #     scheduler.start()
        #     logger.info("스케줄러 시작 완료")
        #     setup_scheduler_jobs()
        #     logger.info("스케줄러 작업 등록 완료")
        logger.info("스케줄러 자동 시작 비활성화됨. 관리자 페이지에서 수동으로 시작하세요.")

        logger.info("애플리케이션 시작 프로세스 완료. Config 페이지에서 스케줄러를 제어하세요.")

    except Exception as e:
        logger.critical(f"애플리케이션 시작 중 심각한 오류 발생: {e}", exc_info=True)
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """애플리케이션 종료 시 실행되는 이벤트"""
    logger.info("애플리케이션 종료 중...")
    if scheduler.running:
        scheduler.shutdown()
        logger.info("스케줄러 종료 완료")
    logger.info("애플리케이션 종료 완료.")

# --- 기본 경로 ---
@app.get("/", response_model=ApiV1RootResponse)
def read_root():
    return {"message": "Welcome to Market Analyzer API! (Clean Architecture)", "version": "1.0.0", "endpoints": {}}

@app.get("/api/", response_model=ApiV1RootResponse)
def read_api_root():
    return {"message": "Welcome to Market Analyzer API! (Clean Architecture)", "version": "1.0.0", "endpoints": {}}

@app.get("/health", response_model=HealthCheckResponse)
def health_check():
    try:
        # 데이터베이스 연결 상태 확인
        db_status = "connected" if test_database_connection() else "disconnected"
        
        return {
            "status": "healthy", 
            "service": "Market Analyzer API",
            "version": "1.0.0",
            "database": db_status,
            "timestamp": datetime.now()
        }
    except Exception as e:
        import traceback
        logger.error(f"Health check failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@app.get("/api/health", response_model=HealthCheckResponse)
def health_check_api():
    return health_check()

# --- Socket.IO 이벤트 핸들러 ---
@sio.on('connect')
async def connect(sid, environ):
    logger.info(f"Socket.IO 클라이언트 연결됨: {sid}")
    await sio.emit('scheduler_log', {'message': '백엔드와 실시간 로그 연결 성공.'}, to=sid)

@sio.on('disconnect')
async def disconnect(sid):
    logger.info(f"Socket.IO 클라이언트 연결 끊김: {sid}")

# Socket.IO 앱을 메인 앱으로 사용
app = socket_app
