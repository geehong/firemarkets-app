# backend/app/api/v2/endpoints/assets/shared/cache_keys.py
"""
캐시 키 생성 유틸리티
"""

from typing import Any, Dict, Optional


def make_cache_key(
    module: str, 
    asset_id: Optional[int], 
    endpoint: str, 
    **params
) -> str:
    """
    캐시 키 생성
    
    Args:
        module: 모듈 이름 (예: "core", "market", "detail")
        asset_id: 자산 ID (None 가능)
        endpoint: 엔드포인트 이름 (예: "price", "ohlcv")
        **params: 추가 파라미터
    
    Returns:
        캐시 키 문자열
    
    Examples:
        >>> make_cache_key("market", 123, "price", interval="1d")
        "asset:123:market:price:interval=1d"
        
        >>> make_cache_key("core", None, "types", has_data=True)
        "asset:global:core:types:has_data=True"
    """
    # 파라미터 정렬 및 문자열화
    param_str = ":".join(f"{k}={v}" for k, v in sorted(params.items()) if v is not None)
    
    # asset_id가 없으면 'global' 사용
    asset_key = str(asset_id) if asset_id is not None else "global"
    
    # 기본 키 구성
    base_key = f"asset:{asset_key}:{module}:{endpoint}"
    
    # 파라미터가 있으면 추가
    if param_str:
        return f"{base_key}:{param_str}"
    
    return base_key


def parse_cache_key(cache_key: str) -> Dict[str, Any]:
    """
    캐시 키 파싱
    
    Args:
        cache_key: 캐시 키 문자열
    
    Returns:
        파싱된 정보 딕셔너리
    """
    parts = cache_key.split(":")
    
    result = {
        "asset_id": None if parts[1] == "global" else int(parts[1]),
        "module": parts[2] if len(parts) > 2 else None,
        "endpoint": parts[3] if len(parts) > 3 else None,
        "params": {}
    }
    
    # 파라미터 파싱
    for part in parts[4:]:
        if "=" in part:
            key, value = part.split("=", 1)
            result["params"][key] = value
    
    return result


def invalidate_pattern(module: str, asset_id: Optional[int] = None) -> str:
    """
    무효화할 캐시 키 패턴 생성
    
    Args:
        module: 모듈 이름
        asset_id: 자산 ID (None이면 해당 모듈 전체)
    
    Returns:
        Redis SCAN 패턴
    """
    if asset_id is not None:
        return f"asset:{asset_id}:{module}:*"
    return f"asset:*:{module}:*"
