# app/main.py
import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# from app.api import auth  <-- Removed legacy import
from app.api.v1.endpoints import (
    realtime, scheduler, collectors, world_assets, crypto, 
    onchain, etf, dashboard, configurations, admin, logs, metrics, 
    open_interest, tickers, navigation, posts,
    auth, analysis
)
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

# Socket.IO 애플리케이션 생성
socket_app = socketio.ASGIApp(sio, app)

# 인증 API 엔드포인트
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])

# v1 API 엔드포인트들
app.include_router(realtime.router, prefix="/api/v1/realtime", tags=["realtime"])
app.include_router(scheduler.router, prefix="/api/v1/scheduler", tags=["scheduler"])
app.include_router(collectors.router, prefix="/api/v1/collectors", tags=["collectors"])
# app.include_router(assets.router, prefix="/api/v1/assets", tags=["assets"]) # Removed
app.include_router(world_assets.router, prefix="/api/v1/world-assets", tags=["world-assets"])
app.include_router(crypto.router, prefix="/api/v1/crypto", tags=["crypto"])
app.include_router(onchain.router, prefix="/api/v1/onchain", tags=["onchain"])
app.include_router(etf.router, prefix="/api/v1/etf", tags=["etf"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])
app.include_router(configurations.router, prefix="/api/v1/configurations", tags=["configurations"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])
app.include_router(logs.router, prefix="/api/v1/logs", tags=["logs"])
app.include_router(metrics.router, prefix="/api/v1/metrics", tags=["metrics"])
app.include_router(open_interest.router, prefix="/api/v1/open-interest", tags=["open-interest"])
app.include_router(tickers.router, prefix="/api/v1/tickers", tags=["tickers"])
app.include_router(navigation.router, prefix="/api/v1/navigation", tags=["navigation"])
app.include_router(posts.router, prefix="/api/v1/posts", tags=["posts"])
# app.include_router(asset_overviews.router, prefix="/api/v1/asset-overviews", tags=["asset-overviews"]) # Removed
app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["analysis"])
app.include_router(external_apis.router, prefix="/api/v1/external-apis", tags=["external-apis"])

# v2 API 엔드포인트 (모듈화된 자산 API)
app.include_router(api_v2_router, prefix="/api/v2", tags=["v2"])

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
