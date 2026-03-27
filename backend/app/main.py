# app/main.py
import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
# from app.api import auth  <-- Removed legacy import
from app.api.v1.endpoints import (
    realtime, scheduler, collectors, world_assets, crypto, 
    onchain, etf, dashboard, configurations, admin, logs, metrics, 
    auth, navigation, posts
)
from app.api.v1 import api as v1_api
from app.api.v1 import external_apis
from app.api.v2.api import api_router as api_v2_router  # v2 API
from app.core.database import engine
from app.models.user import User
from app.models.session import UserSession, TokenBlacklist, AuditLog
from app.core.websocket import sio
from app.core.config import GLOBAL_APP_CONFIGS, load_and_set_global_configs, initialize_bitcoin_asset_id
from app.core.cache import setup_cache  # Import setup_cache
from app.services.session_cleanup_scheduler import session_cleanup_scheduler
from app.utils.db_logger import setup_db_logging
import socketio

# 로깅 설정 (DB 로깅 포함)
setup_db_logging()

# 로거 설정
logger = logging.getLogger(__name__)

# 전역 설정 로드
load_and_set_global_configs()
initialize_bitcoin_asset_id()

# 데이터베이스 테이블 생성 코드는 Alembic 마이그레이션으로 대체됨
# User.__table__.create(bind=engine, checkfirst=True)
# UserSession.__table__.create(bind=engine, checkfirst=True)
# TokenBlacklist.__table__.create(bind=engine, checkfirst=True)
# AuditLog.__table__.create(bind=engine, checkfirst=True)

app = FastAPI(
    title="FireMarkets Admin API",
    description="FireMarkets 관리자 권한 시스템 API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Cache Initialization on Startup
@app.on_event("startup")
async def startup_event():
    await setup_cache()

# CORS 설정
origins = [
    "http://localhost", "http://localhost:3000", "http://localhost:3006", "http://localhost:8000", "http://localhost:8001",
    "http://127.0.0.1:3000", "http://127.0.0.1:3006", "http://127.0.0.1:8000", "http://127.0.0.1:8001",
    "ws://localhost:3000", "ws://localhost:3006", "ws://localhost:8000", "ws://localhost:8001",
    "ws://127.0.0.1:3000", "ws://127.0.0.1:3006", "ws://127.0.0.1:8000", "ws://127.0.0.1:8001",
    # 프로덕션 도메인 추가
    "https://firemarkets.net", "http://firemarkets.net",
    "https://www.firemarkets.net", "http://www.firemarkets.net",
    "http://firemarkets.net:3006", "https://firemarkets.net:3006",
    "wss://firemarkets.net", "ws://firemarkets.net",
    "https://backend.firemarkets.net", "http://backend.firemarkets.net",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # 특정 도메인만 허용
    allow_credentials=True,  # credentials 허용
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# GZip 압축 활성화 (큰 JSON 응답 최적화)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Socket.IO 애플리케이션 생성
socket_app = socketio.ASGIApp(sio, app)

# v1 API 엔드포인트
app.include_router(v1_api.api_router, prefix="/api/v1")

# v2 API 엔드포인트 (모듈화된 자산 API)
app.include_router(api_v2_router, prefix="/api/v2")

@app.get("/")
async def root():
    return {"message": "FireMarkets Admin API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Socket.IO 애플리케이션을 메인 앱으로 설정
app = socket_app

# 세션 정리 스케줄러는 별도로 시작 (현재는 비활성화)
# asyncio.create_task(session_cleanup_scheduler.start())
