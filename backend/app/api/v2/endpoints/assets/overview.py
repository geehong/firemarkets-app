# backend/app/api/v2/endpoints/assets/overview.py
"""
Overview Module - View 기반 통합 조회
대상 View: stock_info_view, crypto_info_view, etf_info_view
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
import logging

from .....core.database import get_postgres_db
from .....models import OHLCVData, Asset, AssetType, Post
from .....schemas.asset import AssetOverviewResponse
from .shared.resolvers import resolve_asset_identifier, get_asset_type, get_asset_with_type
from .shared.constants import VIEW_MAP

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# Helper Functions
# ============================================================================

def safe_float(value) -> Optional[float]:
    """안전하게 float 변환"""
    if value is None:
        return None
    try:
        if isinstance(value, Decimal):
            return float(value)
        return float(value)
    except (ValueError, TypeError):
        return None


def get_localized_jsonb(jsonb_field, lang: str) -> Optional[str]:
    """JSONB 필드에서 언어별 값 반환"""
    if not jsonb_field:
        return None
    if isinstance(jsonb_field, dict):
        return jsonb_field.get(lang) or jsonb_field.get('ko') or jsonb_field.get('en')
    return str(jsonb_field) if jsonb_field else None


def calculate_asset_info(db: Session, asset_id: int) -> Dict[str, Any]:
    """OHLCV 데이터 기반 자산 정보 계산"""
    # 최신 2개의 OHLCV 데이터 조회
    ohlcv_latest_two = db.query(OHLCVData).filter(
        OHLCVData.asset_id == asset_id,
        OHLCVData.data_interval.in_(['1d', '1day', None])
    ).order_by(OHLCVData.timestamp_utc.desc()).limit(2).all()
    
    if not ohlcv_latest_two:
        return {}
    
    latest = ohlcv_latest_two[0]
    current_price = safe_float(latest.close_price)
    volume = int(latest.volume) if latest.volume else None
    
    prev_close = None
    price_change = None
    price_change_percent = None
    
    if len(ohlcv_latest_two) > 1:
        prev = ohlcv_latest_two[1]
        prev_close = safe_float(prev.close_price)
        
        if current_price and prev_close and prev_close != 0:
            price_change = current_price - prev_close
            price_change_percent = (price_change / prev_close) * 100
    
    # 52주 범위 계산
    one_year_ago = latest.timestamp_utc - timedelta(days=365)
    ohlcv_52w = db.query(
        func.max(OHLCVData.high_price).label('max_high'),
        func.min(OHLCVData.low_price).label('min_low')
    ).filter(
        OHLCVData.asset_id == asset_id,
        OHLCVData.timestamp_utc >= one_year_ago,
        OHLCVData.data_interval.in_(['1d', '1day', None])
    ).first()
    
    # 이동평균
    ohlcv_50d = db.query(OHLCVData).filter(
        OHLCVData.asset_id == asset_id,
        OHLCVData.data_interval.in_(['1d', '1day', None])
    ).order_by(OHLCVData.timestamp_utc.desc()).limit(50).all()
    
    ohlcv_200d = db.query(OHLCVData).filter(
        OHLCVData.asset_id == asset_id,
        OHLCVData.data_interval.in_(['1d', '1day', None])
    ).order_by(OHLCVData.timestamp_utc.desc()).limit(200).all()
    
    sma_50 = None
    sma_200 = None
    
    if ohlcv_50d and len(ohlcv_50d) >= 50:
        closes = [safe_float(d.close_price) for d in ohlcv_50d if d.close_price]
        if closes:
            sma_50 = sum(closes) / len(closes)
    
    if ohlcv_200d and len(ohlcv_200d) >= 200:
        closes = [safe_float(d.close_price) for d in ohlcv_200d if d.close_price]
        if closes:
            sma_200 = sum(closes) / len(closes)
    
    return {
        "current_price": current_price,
        "prev_close": prev_close,
        "price_change": price_change,
        "price_change_percent": price_change_percent,
        "week_52_high": safe_float(ohlcv_52w.max_high) if ohlcv_52w else None,
        "week_52_low": safe_float(ohlcv_52w.min_low) if ohlcv_52w else None,
        "volume": volume,
        "day_50_moving_avg": sma_50,
        "day_200_moving_avg": sma_200,
        "last_updated": latest.timestamp_utc,
    }


# ============================================================================
# Overview Endpoint (자동 타입 감지)
# ============================================================================

@router.get("/{asset_identifier}")
def get_overview_v2(
    asset_identifier: str = Path(..., description="Asset ID or Ticker"),
    lang: str = Query("ko", description="언어 코드 (ko, en)"),
    db: Session = Depends(get_postgres_db)
):
    """
    자산 개요 조회 (자산 타입 자동 감지)
    
    타입에 따라 적절한 View를 사용하여 통합 정보 반환
    """
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        asset_type = get_asset_type(db, asset_id)
        
        view_name = VIEW_MAP.get(asset_type)
        
        if view_name:
            # View 기반 조회
            result = db.execute(
                text(f"SELECT * FROM {view_name} WHERE asset_id = :asset_id LIMIT 1"),
                {"asset_id": asset_id}
            ).fetchone()
            
            if result:
                row_dict = dict(result._mapping)
                # Decimal을 float으로 변환
                for key, value in row_dict.items():
                    if isinstance(value, Decimal):
                        row_dict[key] = float(value)
                
                return {
                    "asset_id": asset_id,
                    "asset_type": asset_type,
                    "source": view_name,
                    **row_dict
                }
        
        # View가 없거나 데이터가 없으면 기본 조회
        return get_unified_overview(db, asset_id, asset_type, lang)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get overview for {asset_identifier}")
        raise HTTPException(status_code=500, detail=f"Failed to get overview: {str(e)}")


def get_unified_overview(
    db: Session, 
    asset_id: int, 
    asset_type: str, 
    lang: str
) -> Dict[str, Any]:
    """통합 개요 조회 (View가 없는 경우 폴백)"""
    # 기본 자산 정보
    result = get_asset_with_type(db, asset_id)
    if not result:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    asset, type_name = result
    
    # OHLCV 기반 정보
    ohlcv_info = calculate_asset_info(db, asset_id)
    
    # 관련 포스트 조회
    post = db.query(Post).filter(Post.asset_id == asset_id).first()
    post_info = None
    if post:
        post_info = {
            "post_id": post.id,
            "title": get_localized_jsonb(post.title, lang) if hasattr(post.title, 'get') else post.title,
            "slug": post.slug,
            "excerpt": get_localized_jsonb(post.excerpt, lang) if hasattr(post, 'excerpt') and post.excerpt else None,
            "status": post.status,
        }
    
    return {
        "asset_id": asset.asset_id,
        "ticker": asset.ticker,
        "name": asset.name,
        "asset_type": type_name,
        "exchange": asset.exchange,
        "currency": asset.currency,
        "description": asset.description,
        "source": "unified",
        "ohlcv_info": ohlcv_info,
        "post_info": post_info,
    }


# ============================================================================
# Overview Bundle Endpoint
# ============================================================================

@router.get("/{asset_identifier}/bundle")
def get_overview_bundle_v2(
    asset_identifier: str = Path(..., description="Asset ID or Ticker"),
    lang: str = Query("ko", description="언어 코드 (ko, en)"),
    db: Session = Depends(get_postgres_db)
):
    """
    자산 개요 번들 조회 (숫자 데이터 + 포스트 데이터 분리)
    """
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        asset_type = get_asset_type(db, asset_id)
        
        # 기본 자산 정보
        result = get_asset_with_type(db, asset_id)
        if not result:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        asset, type_name = result
        
        # 숫자 데이터
        numeric_data = calculate_asset_info(db, asset_id)
        
        # 포스트 데이터
        post = db.query(Post).filter(Post.asset_id == asset_id).first()
        post_data = None
        if post:
            content = None
            if hasattr(post, 'content_ko') and lang == 'ko' and post.content_ko:
                content = post.content_ko
            elif hasattr(post, 'content') and post.content:
                content = post.content
            
            post_data = {
                "post_id": post.id,
                "title": get_localized_jsonb(post.title, lang) if hasattr(post.title, 'get') else post.title,
                "slug": post.slug,
                "content": content,
                "excerpt": get_localized_jsonb(post.excerpt, lang) if hasattr(post, 'excerpt') and post.excerpt else None,
                "description": get_localized_jsonb(post.description, lang) if hasattr(post, 'description') and post.description else None,
                "cover_image": post.cover_image if hasattr(post, 'cover_image') else None,
                "status": post.status,
                "published_at": post.published_at if hasattr(post, 'published_at') else None,
            }
        
        # 타입별 추가 데이터
        type_specific_data = get_type_specific_data(db, asset_id, asset_type)
        
        return {
            "asset_id": asset.asset_id,
            "ticker": asset.ticker,
            "name": asset.name,
            "asset_type": type_name,
            "exchange": asset.exchange,
            "currency": asset.currency,
            "numeric_data": numeric_data,
            "post_data": post_data,
            "type_specific_data": type_specific_data,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get overview bundle for {asset_identifier}")
        raise HTTPException(status_code=500, detail=f"Failed to get overview bundle: {str(e)}")


def get_type_specific_data(db: Session, asset_id: int, asset_type: str) -> Optional[Dict[str, Any]]:
    """타입별 추가 데이터 조회"""
    try:
        if asset_type == "Stocks":
            # 재무 데이터 요약
            result = db.execute(text("""
                SELECT market_cap, pe_ratio, dividend_yield, eps
                FROM stock_financials
                WHERE asset_id = :asset_id
                ORDER BY snapshot_date DESC
                LIMIT 1
            """), {"asset_id": asset_id})
            row = result.fetchone()
            if row:
                row_dict = dict(row._mapping)
                return {k: safe_float(v) for k, v in row_dict.items()}
        
        elif asset_type == "Crypto":
            result = db.execute(text("""
                SELECT market_cap, circulating_supply, total_supply, max_supply, cmc_rank
                FROM crypto_data
                WHERE asset_id = :asset_id
                LIMIT 1
            """), {"asset_id": asset_id})
            row = result.fetchone()
            if row:
                row_dict = dict(row._mapping)
                return {k: safe_float(v) if k != 'cmc_rank' else v for k, v in row_dict.items()}
        
        elif asset_type in ["ETFs", "Funds"]:
            result = db.execute(text("""
                SELECT net_assets, net_expense_ratio, dividend_yield, inception_date
                FROM etf_info
                WHERE asset_id = :asset_id
                ORDER BY snapshot_date DESC
                LIMIT 1
            """), {"asset_id": asset_id})
            row = result.fetchone()
            if row:
                row_dict = dict(row._mapping)
                return {k: safe_float(v) if k != 'inception_date' else v for k, v in row_dict.items()}
        
        return None
    except Exception as e:
        logger.warning(f"Failed to get type specific data: {e}")
        return None


# ============================================================================
# Type-Specific Overview Endpoints (기존 API 호환)
# ============================================================================

@router.get("/{asset_identifier}/stock")
def get_stock_overview_v2(
    asset_identifier: str = Path(..., description="Asset ID or Ticker"),
    db: Session = Depends(get_postgres_db)
):
    """주식 개요 조회 (stock_info_view 사용)"""
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        
        result = db.execute(
            text("SELECT * FROM stock_info_view WHERE asset_id = :asset_id LIMIT 1"),
            {"asset_id": asset_id}
        ).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Stock info not found")
        
        row_dict = dict(result._mapping)
        
        # Decimal을 float으로 변환
        for key, value in row_dict.items():
            if isinstance(value, Decimal):
                row_dict[key] = float(value)
        
        return {
            "asset_id": asset_id,
            "source": "stock_info_view",
            **row_dict
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get stock overview for {asset_identifier}")
        raise HTTPException(status_code=500, detail=f"Failed to get stock overview: {str(e)}")


@router.get("/{asset_identifier}/crypto")
def get_crypto_overview_v2(
    asset_identifier: str = Path(..., description="Asset ID or Ticker"),
    db: Session = Depends(get_postgres_db)
):
    """암호화폐 개요 조회 (crypto_info_view 사용)"""
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        
        result = db.execute(
            text("SELECT * FROM crypto_info_view WHERE asset_id = :asset_id LIMIT 1"),
            {"asset_id": asset_id}
        ).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Crypto info not found")
        
        row_dict = dict(result._mapping)
        
        for key, value in row_dict.items():
            if isinstance(value, Decimal):
                row_dict[key] = float(value)
        
        return {
            "asset_id": asset_id,
            "source": "crypto_info_view",
            **row_dict
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get crypto overview for {asset_identifier}")
        raise HTTPException(status_code=500, detail=f"Failed to get crypto overview: {str(e)}")


@router.get("/{asset_identifier}/etf")
def get_etf_overview_v2(
    asset_identifier: str = Path(..., description="Asset ID or Ticker"),
    db: Session = Depends(get_postgres_db)
):
    """ETF 개요 조회 (etf_info_view 사용)"""
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        
        result = db.execute(
            text("SELECT * FROM etf_info_view WHERE asset_id = :asset_id LIMIT 1"),
            {"asset_id": asset_id}
        ).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="ETF info not found")
        
        row_dict = dict(result._mapping)
        
        for key, value in row_dict.items():
            if isinstance(value, Decimal):
                row_dict[key] = float(value)
        
        return {
            "asset_id": asset_id,
            "source": "etf_info_view",
            **row_dict
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get ETF overview for {asset_identifier}")
        raise HTTPException(status_code=500, detail=f"Failed to get ETF overview: {str(e)}")


@router.get("/{asset_identifier}/common")
def get_common_overview_v2(
    asset_identifier: str = Path(..., description="Asset ID or Ticker"),
    db: Session = Depends(get_postgres_db)
):
    """공통 개요 조회 (OHLCV 기반)"""
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        
        ohlcv_info = calculate_asset_info(db, asset_id)
        
        # 관련 포스트 ID
        post = db.query(Post).filter(Post.asset_id == asset_id).first()
        
        return {
            "asset_id": asset_id,
            "source": "ohlcv_calculation",
            "post_id": post.id if post else None,
            **ohlcv_info
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get common overview for {asset_identifier}")
        raise HTTPException(status_code=500, detail=f"Failed to get common overview: {str(e)}")
