# backend_temp/app/api/v1/api.py
from fastapi import APIRouter

from .endpoints import (
    # assets, # Removed
    world_assets, 
    tickers, 
    configurations, 
    crypto, 
    dashboard, 
    etf, 
    logs, 
    onchain, 
    scheduler,
    collectors,
    admin,
    metrics,
    open_interest,
    realtime,
    auth,
    auth,
    analysis,
    auth,
    analysis,
    sentiment_stats,
    posts
)
from .external_apis import router as external_apis_router
from app.schemas.common import ApiV1RootResponse

api_router = APIRouter()

@api_router.get("/", response_model=ApiV1RootResponse)
async def api_v1_root():
    """API v1 루트 엔드포인트"""
    return {
        "message": "Market Analyzer API v1",
        "version": "1.0.0",
        "endpoints": {
            "world_assets": "/api/v1/world-assets",
            "external_apis": "/api/v1/test-connections",
            "assets": "/api/v1/assets",
            "crypto": "/api/v1/crypto",
            "dashboard": "/api/v1/dashboard",
            "metrics": "/api/v1/metrics",
            "realtime": "/api/v1/realtime"
        }
    }

# 라우터 등록
# 라우터 등록
# api_router.include_router(assets.router, tags=["assets"]) # Removed
api_router.include_router(world_assets.router, tags=["world-assets"])
api_router.include_router(tickers.router, tags=["tickers"])
api_router.include_router(configurations.router, prefix="/configurations", tags=["configurations"])
api_router.include_router(crypto.router, prefix="/crypto", tags=["crypto"])
api_router.include_router(dashboard.router, tags=["dashboard"])
api_router.include_router(etf.router, tags=["etf"])
api_router.include_router(logs.router, tags=["logs"])
api_router.include_router(onchain.router, prefix="/onchain", tags=["onchain"])
api_router.include_router(scheduler.router, tags=["scheduler"])
api_router.include_router(collectors.router, tags=["collectors"])
api_router.include_router(admin.router, tags=["admin"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["metrics"])
api_router.include_router(open_interest.router, tags=["open-interest"])
api_router.include_router(realtime.router, prefix="/realtime", tags=["realtime"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
# api_router.include_router(sentiment_stats.router, prefix="/sentiment-check", tags=["sentiment-stats"])
# Remounted to match frontend path /api/v1/analysis/sentiment/history
api_router.include_router(sentiment_stats.router, prefix="/analysis/sentiment", tags=["sentiment-statistics"])

api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
api_router.include_router(posts.router, prefix="/posts", tags=["posts"])


# External APIs router
api_router.include_router(external_apis_router, tags=["external-apis"])
