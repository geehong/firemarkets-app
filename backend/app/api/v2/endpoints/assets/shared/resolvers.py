# backend/app/api/v2/endpoints/assets/shared/resolvers.py
"""
Asset Identifier 해석 및 타입 조회 유틸리티
- resolve_asset_identifier: ID 또는 Ticker를 asset_id로 변환
- get_asset_type: 자산 타입 조회
- get_asset_by_ticker: Ticker로 자산 조회
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)


def resolve_asset_identifier(db: Session, asset_identifier: str) -> int:
    """
    Asset ID 또는 Ticker를 asset_id로 변환 (중앙화된 로직)
    
    Args:
        db: 데이터베이스 세션
        asset_identifier: ID (숫자) 또는 Ticker (문자열)
    
    Returns:
        asset_id (int)
    
    Raises:
        HTTPException(404): 자산을 찾을 수 없는 경우
    """
    from app.models import Asset
    
    # 숫자인 경우 먼저 ID로 시도
    if asset_identifier.isdigit():
        asset_id = int(asset_identifier)
        # ID 유효성 검증
        exists = db.query(Asset).filter(Asset.asset_id == asset_id).first()
        if exists:
            return asset_id
        # ID가 없더라도 바로 에러를 내지 않고 티커 검색으로 넘어감 (예: 600519 등 숫자 티커 대응)
    
    # 1차 시도: 정확한 티커 매칭
    asset = get_asset_by_ticker(db, asset_identifier)
    if asset:
        return asset.asset_id
    
    # 2차 시도: USDT/USD 접미사 제거 후 재시도 (예: SOLUSDT -> SOL, SOL-USD -> SOL)
    normalized_ticker = asset_identifier
    if normalized_ticker.endswith('USDT'):
        normalized_ticker = normalized_ticker[:-4]  # Remove 'USDT'
    elif normalized_ticker.endswith('-USD'):
        normalized_ticker = normalized_ticker[:-4]  # Remove '-USD'
    elif normalized_ticker.endswith('USD'):
        normalized_ticker = normalized_ticker[:-3]  # Remove 'USD'
    
    if normalized_ticker != asset_identifier:
        asset = get_asset_by_ticker(db, normalized_ticker)
        if asset:
            return asset.asset_id
    
    # 3차 시도: 접미사 추가 (예: BTC -> BTCUSDT, BTC -> BTC-USD)
    suffixes = ['USDT', 'USD', '-USD']
    for suffix in suffixes:
        suffixed_ticker = f"{asset_identifier}{suffix}"
        asset = get_asset_by_ticker(db, suffixed_ticker)
        if asset:
            return asset.asset_id
    
    raise HTTPException(
        status_code=404, 
        detail=f"Asset not found: {asset_identifier}",
        headers={"X-Error-Code": "ASSET_NOT_FOUND"}
    )


def get_asset_type(db: Session, asset_id: int) -> str:
    """
    자산 타입명 조회
    
    Args:
        db: 데이터베이스 세션
        asset_id: 자산 ID
    
    Returns:
        타입명 (예: "Stocks", "Crypto", "ETFs")
    """
    result = db.execute(text("""
        SELECT at.type_name 
        FROM assets a 
        JOIN asset_types at ON a.asset_type_id = at.asset_type_id 
        WHERE a.asset_id = :id
    """), {"id": asset_id})
    row = result.fetchone()
    return row[0] if row else "Unknown"


def get_asset_by_ticker(db: Session, ticker: str):
    """
    Ticker로 자산 조회
    
    Args:
        db: 데이터베이스 세션
        ticker: 티커 심볼
    
    Returns:
        Asset 객체 또는 None
    """
    from app.models import Asset
    return db.query(Asset).filter(Asset.ticker == ticker).first()


def get_asset_with_type(db: Session, asset_id: int):
    """
    자산과 타입 정보를 함께 조회
    
    Args:
        db: 데이터베이스 세션
        asset_id: 자산 ID
    
    Returns:
        (Asset, type_name) 튜플 또는 None
    """
    from app.models import Asset, AssetType
    
    result = db.query(Asset, AssetType.type_name) \
        .join(AssetType, Asset.asset_type_id == AssetType.asset_type_id) \
        .filter(Asset.asset_id == asset_id) \
        .first()
    
    return result
