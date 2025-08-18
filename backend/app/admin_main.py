# app/admin_main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth
from app.api.v1.api import api_router as api_v1_router
from app.database import engine
from app.models.user import User
from app.models.session import UserSession, TokenBlacklist, AuditLog
from app.core.cache import setup_cache

# 데이터베이스 테이블 생성
User.__table__.create(bind=engine, checkfirst=True)
UserSession.__table__.create(bind=engine, checkfirst=True)
TokenBlacklist.__table__.create(bind=engine, checkfirst=True)
AuditLog.__table__.create(bind=engine, checkfirst=True)

app = FastAPI(
    title="FireMarkets Admin API",
    description="FireMarkets 관리자 권한 시스템 API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 실행되는 이벤트"""
    # 캐시 초기화
    await setup_cache()

# 라우터 등록
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(api_v1_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "FireMarkets Admin API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"} 