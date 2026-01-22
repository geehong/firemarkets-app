# backend/app/api/v2/endpoints/assets/shared/validators.py
"""
자산 타입별 검증 유틸리티
"""

from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

# 엔드포인트별 허용되는 자산 타입
VALID_TYPES_FOR_ENDPOINT = {
    "financials": ["Stocks"],
    "profile": ["Stocks"],
    "crypto-info": ["Crypto"],
    "etf-info": ["ETFs", "Funds"],
    "index-info": ["Indices"],
    "estimates": ["Stocks"],
    "crypto-metrics": ["Crypto"],
}


def validate_asset_type_for_endpoint(endpoint: str, asset_type: str) -> None:
    """
    자산 타입이 해당 엔드포인트에서 유효한지 검증
    
    Args:
        endpoint: 엔드포인트 이름 (예: "financials", "crypto-info")
        asset_type: 자산 타입명 (예: "Stocks", "Crypto")
    
    Raises:
        HTTPException(400): 유효하지 않은 타입인 경우
    """
    valid_types = VALID_TYPES_FOR_ENDPOINT.get(endpoint)
    
    # 제한이 없는 엔드포인트는 모든 타입 허용
    if valid_types is None:
        return
    
    if asset_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Endpoint '{endpoint}' is not available for asset type '{asset_type}'. Valid types: {valid_types}",
            headers={"X-Error-Code": "INVALID_ASSET_TYPE"}
        )


def validate_data_interval(interval: str) -> None:
    """
    데이터 인터벌이 유효한지 검증
    
    Args:
        interval: 데이터 인터벌 (예: "1d", "1h", "1m")
    
    Raises:
        HTTPException(400): 유효하지 않은 인터벌인 경우
    """
    from .constants import SUPPORTED_INTERVALS
    
    if interval.upper() not in [i.upper() for i in SUPPORTED_INTERVALS]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid data_interval: {interval}. Supported intervals: {SUPPORTED_INTERVALS}",
            headers={"X-Error-Code": "INVALID_INTERVAL"}
        )


def validate_limit(limit: int, max_limit: int = 10000) -> None:
    """
    limit 파라미터 검증
    
    Args:
        limit: 요청된 limit 값
        max_limit: 최대 허용 limit
    
    Raises:
        HTTPException(400): limit이 범위를 벗어난 경우
    """
    if limit < 1:
        raise HTTPException(
            status_code=400,
            detail=f"limit must be at least 1",
            headers={"X-Error-Code": "INVALID_LIMIT"}
        )
    
    if limit > max_limit:
        raise HTTPException(
            status_code=400,
            detail=f"limit cannot exceed {max_limit}",
            headers={"X-Error-Code": "LIMIT_EXCEEDED"}
        )
