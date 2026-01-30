# backend/app/api/v2/api.py
"""
API v2 Router - 모듈화된 API 구조

v1과 병행 운영되며, 점진적으로 프론트엔드를 v2로 마이그레이션합니다.
"""

from fastapi import APIRouter
from pydantic import BaseModel

from .endpoints.assets import router as assets_router
from .endpoints.fred import router as fred_router


class ApiV2RootResponse(BaseModel):
    """API v2 Root Response"""
    message: str
    version: str
    modules: dict


api_router = APIRouter()


@api_router.get("/", response_model=ApiV2RootResponse)
async def api_v2_root():
    """API v2 루트 엔드포인트"""
    return {
        "message": "Market Analyzer API v2 - Modular Structure",
        "version": "2.0.0",
        "modules": {
            "assets": {
                "base": "/api/v2/assets",
                "submodules": {
                    "core": "/api/v2/assets/core",
                    "market": "/api/v2/assets/market",
                    "detail": "/api/v2/assets/detail",
                    "analysis": "/api/v2/assets/analysis",
                    "overview": "/api/v2/assets/overview",
                    "widgets": "/api/v2/assets/widgets",
                }
            }
        }
    }


# Assets 라우터 등록 (prefix: /assets)
api_router.include_router(assets_router, prefix="/assets")
api_router.include_router(fred_router, prefix="/fred", tags=["assets-fred-economic-indicators"])

__all__ = ["api_router"]
