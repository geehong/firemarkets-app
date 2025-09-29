"""
Cache configuration for FastAPI application
"""
import redis.asyncio as redis
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.decorator import cache
import logging

logger = logging.getLogger(__name__)

# Redis 연결 설정
REDIS_URL = "redis://redis:6379"

async def setup_cache():
    """캐시 초기화"""
    try:
        # Redis 연결
        redis_client = redis.from_url(REDIS_URL, encoding="utf8", decode_responses=True)
        
        # FastAPI Cache 초기화
        FastAPICache.init(RedisBackend(redis_client), prefix="firemarkets-cache")
        
        logger.info("Cache initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize cache: {e}")
        # Redis 연결 실패 시 메모리 캐시로 폴백
        from fastapi_cache.backends.memory import InMemoryBackend
        FastAPICache.init(InMemoryBackend(), prefix="firemarkets-cache")
        logger.info("Fallback to in-memory cache")

def get_cache():
    """캐시 인스턴스 반환"""
    return FastAPICache.get_backend()

# 캐시 무효화 유틸리티 함수들
async def invalidate_asset_types_cache():
    """asset-types 관련 모든 캐시 무효화"""
    try:
        cache_backend = get_cache()
        # 패턴 매칭으로 관련 캐시 모두 삭제
        await cache_backend.delete_pattern("firemarkets-cache:asset-types:*")
        logger.info("Asset types cache invalidated")
    except Exception as e:
        logger.error(f"Failed to invalidate asset types cache: {e}")

async def invalidate_assets_cache():
    """assets 관련 모든 캐시 무효화"""
    try:
        cache_backend = get_cache()
        await cache_backend.delete_pattern("firemarkets-cache:assets:*")
        logger.info("Assets cache invalidated")
    except Exception as e:
        logger.error(f"Failed to invalidate assets cache: {e}")

async def invalidate_ohlcv_cache(asset_id: int = None):
    """OHLCV 관련 캐시 무효화"""
    try:
        cache_backend = get_cache()
        if asset_id:
            # 특정 자산의 OHLCV 캐시만 삭제
            await cache_backend.delete_pattern(f"firemarkets-cache:ohlcv:{asset_id}:*")
        else:
            # 모든 OHLCV 캐시 삭제
            await cache_backend.delete_pattern("firemarkets-cache:ohlcv:*")
        logger.info(f"OHLCV cache invalidated for asset_id: {asset_id}")
    except Exception as e:
        logger.error(f"Failed to invalidate OHLCV cache: {e}")

# 캐시 데코레이터 유틸리티
def cache_with_invalidation(expire: int = 60, key_builder=None):
    """
    캐시 데코레이터 (TTL + 수동 무효화 지원)
    
    Args:
        expire: 캐시 만료 시간 (초)
        key_builder: 캐시 키 생성 함수
    """
    return cache(expire=expire, key_builder=key_builder)

# 최적화된 캐시 TTL 설정
CACHE_TTL = {
    'realtime': 10,      # 실시간 데이터 (10초)
    'frequent': 60,      # 자주 변경되는 데이터 (1분)
    'normal': 300,       # 일반 데이터 (5분)
    'stable': 1800,      # 안정적인 데이터 (30분)
    'static': 3600,      # 정적 데이터 (1시간)
}

def get_optimized_cache_ttl(data_type: str = 'normal') -> int:
    """데이터 타입에 따른 최적화된 TTL 반환"""
    return CACHE_TTL.get(data_type, CACHE_TTL['normal']) 