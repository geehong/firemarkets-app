"""
API v1 router initialization.
"""
from fastapi import APIRouter

from .endpoints.world_assets import router as world_assets_router
from .external_apis import router as external_apis_router

# Create main v1 router
router = APIRouter(prefix="/v1")

# Include all sub-routers
router.include_router(world_assets_router)
router.include_router(external_apis_router)
