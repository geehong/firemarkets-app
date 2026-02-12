# backend/app/api/v2/endpoints/assets/__init__.py
"""
Assets API v2 - 모듈화된 자산 API

모듈 구성:
- core: 자산 메타데이터, 목록, 타입 (GET /assets/core/*)
- market: OHLCV, 가격, 히스토리 (GET /assets/market/*)
- detail: 프로필, 재무, 타입별 상세 (GET /assets/detail/*)
- analysis: 기술지표, 예측, 트리맵 (GET /assets/analysis/*)
- overview: View 기반 통합 조회 (GET /assets/overview/*)
- widgets: 대시보드 위젯용 (GET /assets/widgets/*)
"""

from fastapi import APIRouter
from . import core, market, detail, analysis, overview, widgets, identity

router = APIRouter()

# 모듈별 라우터 등록
router.include_router(core.router, prefix="/core", tags=["assets-core"])
router.include_router(market.router, prefix="/market", tags=["assets-market"])
router.include_router(detail.router, prefix="/detail", tags=["assets-detail"])
router.include_router(analysis.router, prefix="/analysis", tags=["assets-analysis"])
router.include_router(overview.router, prefix="/overview", tags=["assets-overview"])
router.include_router(widgets.router, prefix="/widgets", tags=["assets-widgets"])
router.include_router(identity.router, tags=["assets-identity"])

__all__ = ["router"]
