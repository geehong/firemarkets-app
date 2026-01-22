# backend/app/api/v2/endpoints/assets/core.py
"""
Core Module - 자산 메타데이터 및 목록 관리
대상 테이블: assets, asset_types
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.sql import exists
from typing import Optional, List, Dict, Any
import logging

from .....core.database import get_postgres_db
from .....models import Asset, AssetType, OHLCVData
from .....schemas.asset import AssetsListResponse, AssetTypesResponse, AssetDetailResponse
from .shared.resolvers import resolve_asset_identifier, get_asset_type, get_asset_with_type

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# Asset Types Endpoints
# ============================================================================

@router.get("/types", response_model=AssetTypesResponse)
def get_asset_types_v2(
    db: Session = Depends(get_postgres_db),
    has_data: bool = Query(False, description="데이터가 있는 자산 유형만 필터링"),
    include_description: bool = Query(True, description="description 필드 포함 여부")
):
    """
    자산 타입 목록 조회
    
    - **has_data**: True이면 OHLCV 데이터가 있는 타입만 반환
    - **include_description**: 설명 필드 포함 여부
    """
    try:
        query = db.query(AssetType)
        
        if has_data:
            # EXISTS 서브쿼리로 성능 최적화
            has_data_subquery = db.query(Asset.asset_id)\
                .join(OHLCVData, OHLCVData.asset_id == Asset.asset_id)\
                .filter(Asset.asset_type_id == AssetType.asset_type_id)\
                .exists()
            query = query.filter(has_data_subquery)
        
        asset_types = query.all()
        
        asset_type_responses = []
        for asset_type in asset_types:
            asset_type_dict = {
                'asset_type_id': asset_type.asset_type_id,
                'type_name': asset_type.type_name,
                'created_at': asset_type.created_at,
                'updated_at': asset_type.updated_at,
            }
            
            if include_description:
                asset_type_dict['description'] = asset_type.description
            
            asset_type_responses.append(asset_type_dict)
        
        return AssetTypesResponse(data=asset_type_responses)
        
    except Exception as e:
        logger.exception("Failed to get asset types")
        raise HTTPException(status_code=500, detail=f"Failed to get asset types: {str(e)}")


# ============================================================================
# Assets List Endpoints
# ============================================================================

@router.get("", response_model=AssetsListResponse)
def get_assets_list_v2(
    type_name: Optional[str] = Query(None, description="필터링할 자산 유형 이름"),
    has_ohlcv_data: bool = Query(False, description="OHLCV 데이터가 있는 자산만 필터링"),
    search: Optional[str] = Query(None, description="검색어 (티커 또는 이름)"),
    limit: int = Query(1000, ge=1, le=10000, description="페이지당 자산 개수"),
    offset: int = Query(0, ge=0, description="데이터 시작 오프셋"),
    db: Session = Depends(get_postgres_db)
):
    """
    자산 목록 조회
    
    - **type_name**: 자산 유형으로 필터링 (예: "Stocks", "Crypto")
    - **has_ohlcv_data**: OHLCV 데이터 존재 여부로 필터링
    - **search**: 티커 또는 이름으로 검색
    - **limit/offset**: 페이지네이션
    """
    try:
        base_query = db.query(Asset, AssetType.type_name) \
            .join(AssetType, Asset.asset_type_id == AssetType.asset_type_id)

        if has_ohlcv_data:
            base_query = base_query.filter(
                db.query(OHLCVData).filter(OHLCVData.asset_id == Asset.asset_id).exists()
            )

        if type_name:
            base_query = base_query.filter(AssetType.type_name == type_name)
        
        if search:
            search_pattern = f"%{search}%"
            base_query = base_query.filter(
                (Asset.ticker.ilike(search_pattern)) | 
                (Asset.name.ilike(search_pattern))
            )

        total_count = base_query.count()
        assets_with_type = base_query.offset(offset).limit(limit).all()
        
        result_data = []
        for asset, type_name in assets_with_type:
            collection_settings = asset.collection_settings or {}
            
            asset_dict = {
                'asset_id': asset.asset_id,
                'ticker': asset.ticker,
                'asset_type_id': asset.asset_type_id,
                'name': asset.name,
                'exchange': asset.exchange,
                'currency': asset.currency,
                'is_active': asset.is_active,
                'description': asset.description,
                'data_source': asset.data_source,
                'created_at': asset.created_at,
                'updated_at': asset.updated_at,
                'type_name': type_name,
                'collect_price': collection_settings.get('collect_price', True),
                'collect_assets_info': collection_settings.get('collect_assets_info', True),
                'collect_financials': collection_settings.get('collect_financials', True),
                'collect_estimates': collection_settings.get('collect_estimates', True),
                'collect_onchain': collection_settings.get('collect_onchain', False),
                'collect_technical_indicators': collection_settings.get('collect_technical_indicators', False),
                'collection_settings': collection_settings,
            }
            result_data.append(asset_dict)
        
        return {"data": result_data, "total_count": total_count}
        
    except Exception as e:
        logger.exception("Failed to get assets list")
        raise HTTPException(status_code=500, detail=f"Failed to get assets: {str(e)}")


# ============================================================================
# Asset Metadata Endpoint
# ============================================================================

@router.get("/{asset_identifier}/metadata")
def get_asset_metadata_v2(
    asset_identifier: str = Path(..., description="Asset ID (integer) or Ticker (string)"),
    db: Session = Depends(get_postgres_db)
):
    """
    자산 메타데이터 조회 (단순화된 응답)
    
    OHLCV 데이터 없이 기본 정보만 반환
    """
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        
        result = get_asset_with_type(db, asset_id)
        if not result:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        asset, type_name = result
        
        return {
            "asset_id": asset.asset_id,
            "ticker": asset.ticker,
            "name": asset.name,
            "type_name": type_name,
            "asset_type_id": asset.asset_type_id,
            "exchange": asset.exchange,
            "currency": asset.currency,
            "is_active": asset.is_active,
            "description": asset.description,
            "data_source": asset.data_source,
            "created_at": asset.created_at,
            "updated_at": asset.updated_at,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get asset metadata for {asset_identifier}")
        raise HTTPException(status_code=500, detail=f"Failed to get asset metadata: {str(e)}")


# ============================================================================
# Search Endpoint
# ============================================================================

@router.get("/search")
def search_assets_v2(
    query: str = Query(..., min_length=1, description="검색어"),
    type_name: Optional[str] = Query(None, description="자산 유형으로 필터링"),
    limit: int = Query(20, ge=1, le=100, description="최대 결과 수"),
    db: Session = Depends(get_postgres_db)
):
    """
    자산 검색
    
    티커와 이름에서 검색어를 찾습니다.
    """
    try:
        search_pattern = f"%{query}%"
        
        base_query = db.query(Asset, AssetType.type_name) \
            .join(AssetType, Asset.asset_type_id == AssetType.asset_type_id) \
            .filter(
                (Asset.ticker.ilike(search_pattern)) | 
                (Asset.name.ilike(search_pattern))
            )
        
        if type_name:
            base_query = base_query.filter(AssetType.type_name == type_name)
        
        # 정확한 티커 매칭 우선 정렬
        results = base_query.limit(limit).all()
        
        # 정확 매칭 우선 정렬
        exact_matches = []
        partial_matches = []
        
        for asset, asset_type_name in results:
            item = {
                "asset_id": asset.asset_id,
                "ticker": asset.ticker,
                "name": asset.name,
                "type_name": asset_type_name,
                "exchange": asset.exchange,
            }
            
            if asset.ticker.upper() == query.upper():
                exact_matches.append(item)
            else:
                partial_matches.append(item)
        
        return {
            "query": query,
            "results": exact_matches + partial_matches,
            "total": len(results)
        }
        
    except Exception as e:
        logger.exception(f"Failed to search assets with query: {query}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
