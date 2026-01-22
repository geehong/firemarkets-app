# backend/app/api/v2/endpoints/assets/detail.py
"""
Detail Module - 자산 상세 정보 (프로필, 재무, 타입별 상세)
대상 테이블: stock_profiles, stock_financials, etf_info, crypto_data, index_info
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List, Dict, Any
import logging

from app.core.database import get_postgres_db
from app.models import Asset, AssetType
from app.schemas.asset import (
    StockProfileResponse, StockFinancialsResponse, 
    ETFInfoResponse, ETFSectorExposureResponse, ETFHoldingsResponse,
    IndexInfoResponse
)
from .shared.resolvers import resolve_asset_identifier, get_asset_type, get_asset_with_type
from .shared.validators import validate_asset_type_for_endpoint

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# Profile Endpoint (자산 타입 자동 감지)
# ============================================================================

@router.get("/{asset_identifier}/profile")
def get_asset_profile_v2(
    asset_identifier: str = Path(..., description="Asset ID or Ticker"),
    db: Session = Depends(get_postgres_db)
):
    """
    자산 프로필 조회 (자산 타입 자동 감지)
    
    주식, 암호화폐, ETF 등 타입에 따라 다른 프로필 정보 반환
    """
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        asset_type = get_asset_type(db, asset_id)
        
        if asset_type == "Stocks":
            return get_stock_profile(db, asset_id)
        elif asset_type == "Crypto":
            return get_crypto_profile(db, asset_id)
        elif asset_type in ["ETFs", "Funds"]:
            return get_etf_profile(db, asset_id)
        elif asset_type == "Indices":
            return get_index_profile(db, asset_id)
        else:
            # 기본 프로필
            result = get_asset_with_type(db, asset_id)
            if result:
                asset, type_name = result
                return {
                    "asset_id": asset.asset_id,
                    "ticker": asset.ticker,
                    "name": asset.name,
                    "type_name": type_name,
                    "description": asset.description,
                    "exchange": asset.exchange,
                }
            raise HTTPException(status_code=404, detail="Asset not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get profile for {asset_identifier}")
        raise HTTPException(status_code=500, detail=f"Failed to get profile: {str(e)}")


# ============================================================================
# Stock Profile
# ============================================================================

def get_stock_profile(db: Session, asset_id: int) -> Dict[str, Any]:
    """주식 프로필 조회"""
    result = db.execute(text("""
        SELECT 
            sp.*,
            a.ticker,
            a.name as asset_name,
            a.exchange,
            a.currency
        FROM stock_profiles sp
        JOIN assets a ON sp.asset_id = a.asset_id
        WHERE sp.asset_id = :asset_id
        LIMIT 1
    """), {"asset_id": asset_id})
    
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Stock profile not found")
    
    row_dict = dict(row._mapping)
    
    return {
        "asset_id": asset_id,
        "ticker": row_dict.get("ticker"),
        "name": row_dict.get("asset_name"),
        "company_name": row_dict.get("company_name"),
        "exchange": row_dict.get("exchange"),
        "exchange_full_name": row_dict.get("exchange_full_name"),
        "currency": row_dict.get("currency"),
        "sector": row_dict.get("sector"),
        "industry": row_dict.get("industry"),
        "country": row_dict.get("country"),
        "ceo": row_dict.get("ceo"),
        "employees_count": row_dict.get("employees_count"),
        "ipo_date": row_dict.get("ipo_date"),
        "website": row_dict.get("website"),
        "description_en": row_dict.get("description_en"),
        "description_ko": row_dict.get("description_ko"),
        "logo_image_url": row_dict.get("logo_image_url"),
        "type": "stock"
    }


def get_crypto_profile(db: Session, asset_id: int) -> Dict[str, Any]:
    """암호화폐 프로필 조회"""
    result = db.execute(text("""
        SELECT 
            cd.*,
            a.ticker,
            a.name as asset_name
        FROM crypto_data cd
        JOIN assets a ON cd.asset_id = a.asset_id
        WHERE cd.asset_id = :asset_id
        LIMIT 1
    """), {"asset_id": asset_id})
    
    row = result.fetchone()
    if not row:
        # 기본 자산 정보로 폴백
        asset_result = db.execute(text("""
            SELECT a.*, at.type_name
            FROM assets a
            JOIN asset_types at ON a.asset_type_id = at.asset_type_id
            WHERE a.asset_id = :asset_id
        """), {"asset_id": asset_id})
        asset_row = asset_result.fetchone()
        if asset_row:
            asset_dict = dict(asset_row._mapping)
            return {
                "asset_id": asset_id,
                "ticker": asset_dict.get("ticker"),
                "name": asset_dict.get("name"),
                "type": "crypto"
            }
        raise HTTPException(status_code=404, detail="Crypto profile not found")
    
    row_dict = dict(row._mapping)
    
    return {
        "asset_id": asset_id,
        "ticker": row_dict.get("ticker"),
        "name": row_dict.get("asset_name") or row_dict.get("name"),
        "symbol": row_dict.get("symbol"),
        "logo_url": row_dict.get("logo_url"),
        "website_url": row_dict.get("website_url"),
        "explorer": row_dict.get("explorer"),
        "description": row_dict.get("description"),
        "tags": row_dict.get("tags"),
        "category": row_dict.get("category"),
        "cmc_rank": row_dict.get("cmc_rank"),
        "type": "crypto"
    }


def get_etf_profile(db: Session, asset_id: int) -> Dict[str, Any]:
    """ETF 프로필 조회"""
    result = db.execute(text("""
        SELECT 
            ei.*,
            a.ticker,
            a.name as asset_name,
            a.exchange
        FROM etf_info ei
        JOIN assets a ON ei.asset_id = a.asset_id
        WHERE ei.asset_id = :asset_id
        ORDER BY ei.snapshot_date DESC
        LIMIT 1
    """), {"asset_id": asset_id})
    
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="ETF profile not found")
    
    row_dict = dict(row._mapping)
    
    return {
        "asset_id": asset_id,
        "etf_info_id": row_dict.get("id"),
        "ticker": row_dict.get("ticker"),
        "name": row_dict.get("asset_name"),
        "exchange": row_dict.get("exchange"),
        "net_assets": float(row_dict.get("net_assets")) if row_dict.get("net_assets") else None,
        "net_expense_ratio": float(row_dict.get("net_expense_ratio")) if row_dict.get("net_expense_ratio") else None,
        "portfolio_turnover": float(row_dict.get("portfolio_turnover")) if row_dict.get("portfolio_turnover") else None,
        "dividend_yield": float(row_dict.get("dividend_yield")) if row_dict.get("dividend_yield") else None,
        "inception_date": row_dict.get("inception_date"),
        "leveraged": row_dict.get("leveraged"),
        "snapshot_date": row_dict.get("snapshot_date"),
        "type": "etf"
    }


def get_index_profile(db: Session, asset_id: int) -> Dict[str, Any]:
    """지수 프로필 조회"""
    result = db.execute(text("""
        SELECT 
            ii.*,
            a.ticker,
            a.name as asset_name
        FROM index_info ii
        JOIN assets a ON ii.asset_id = a.asset_id
        WHERE ii.asset_id = :asset_id
        ORDER BY ii.created_at DESC
        LIMIT 1
    """), {"asset_id": asset_id})
    
    row = result.fetchone()
    if not row:
        # 기본 정보로 폴백
        asset_result = db.execute(text("""
            SELECT a.*, at.type_name
            FROM assets a
            JOIN asset_types at ON a.asset_type_id = at.asset_type_id
            WHERE a.asset_id = :asset_id
        """), {"asset_id": asset_id})
        asset_row = asset_result.fetchone()
        if asset_row:
            asset_dict = dict(asset_row._mapping)
            return {
                "asset_id": asset_id,
                "ticker": asset_dict.get("ticker"),
                "name": asset_dict.get("name"),
                "type": "index"
            }
        raise HTTPException(status_code=404, detail="Index profile not found")
    
    row_dict = dict(row._mapping)
    
    return {
        "asset_id": asset_id,
        "ticker": row_dict.get("ticker"),
        "name": row_dict.get("asset_name"),
        "type": "index"
    }


# ============================================================================
# Financials Endpoint (주식 전용)
# ============================================================================

@router.get("/{asset_identifier}/financials")
def get_financials_v2(
    asset_identifier: str = Path(..., description="Asset ID or Ticker"),
    limit: int = Query(10, ge=1, le=100, description="조회할 데이터 개수"),
    db: Session = Depends(get_postgres_db)
):
    """
    재무제표 조회 (주식 전용)
    """
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        asset_type = get_asset_type(db, asset_id)
        
        validate_asset_type_for_endpoint("financials", asset_type)
        
        result = db.execute(text("""
            SELECT *
            FROM stock_financials
            WHERE asset_id = :asset_id
            ORDER BY snapshot_date DESC
            LIMIT :limit
        """), {"asset_id": asset_id, "limit": limit})
        
        rows = result.fetchall()
        if not rows:
            raise HTTPException(status_code=404, detail="Financial data not found")
        
        data = []
        for row in rows:
            row_dict = dict(row._mapping)
            # Decimal을 float으로 변환
            for key, value in row_dict.items():
                if hasattr(value, '__float__'):
                    row_dict[key] = float(value)
            data.append(row_dict)
        
        return {
            "asset_id": asset_id,
            "count": len(data),
            "data": data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get financials for {asset_identifier}")
        raise HTTPException(status_code=500, detail=f"Failed to get financials: {str(e)}")


# ============================================================================
# Crypto Info Endpoint
# ============================================================================

@router.get("/{asset_identifier}/crypto-info")
def get_crypto_info_v2(
    asset_identifier: str = Path(..., description="Asset ID or Ticker"),
    db: Session = Depends(get_postgres_db)
):
    """
    암호화폐 상세 정보 조회
    """
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        asset_type = get_asset_type(db, asset_id)
        
        validate_asset_type_for_endpoint("crypto-info", asset_type)
        
        result = db.execute(text("""
            SELECT *
            FROM crypto_data
            WHERE asset_id = :asset_id
            LIMIT 1
        """), {"asset_id": asset_id})
        
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Crypto data not found")
        
        row_dict = dict(row._mapping)
        
        # Decimal을 float으로 변환
        for key, value in row_dict.items():
            if hasattr(value, '__float__'):
                row_dict[key] = float(value)
        
        return row_dict
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get crypto info for {asset_identifier}")
        raise HTTPException(status_code=500, detail=f"Failed to get crypto info: {str(e)}")


# ============================================================================
# ETF Info Endpoint
# ============================================================================

@router.get("/{asset_identifier}/etf-info")
def get_etf_info_v2(
    asset_identifier: str = Path(..., description="Asset ID or Ticker"),
    db: Session = Depends(get_postgres_db)
):
    """
    ETF 상세 정보 조회
    """
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        asset_type = get_asset_type(db, asset_id)
        
        validate_asset_type_for_endpoint("etf-info", asset_type)
        
        result = db.execute(text("""
            SELECT *
            FROM etf_info
            WHERE asset_id = :asset_id
            ORDER BY snapshot_date DESC
            LIMIT 1
        """), {"asset_id": asset_id})
        
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="ETF info not found")
        
        row_dict = dict(row._mapping)
        
        # Decimal을 float으로 변환
        for key, value in row_dict.items():
            if hasattr(value, '__float__'):
                row_dict[key] = float(value)
        
        return row_dict
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get ETF info for {asset_identifier}")
        raise HTTPException(status_code=500, detail=f"Failed to get ETF info: {str(e)}")


# ============================================================================
# Index Info Endpoint
# ============================================================================

@router.get("/{asset_identifier}/index-info")
def get_index_info_v2(
    asset_identifier: str = Path(..., description="Asset ID or Ticker"),
    limit: int = Query(10, ge=1, le=100, description="조회할 데이터 개수"),
    db: Session = Depends(get_postgres_db)
):
    """
    지수 상세 정보 조회
    """
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        asset_type = get_asset_type(db, asset_id)
        
        validate_asset_type_for_endpoint("index-info", asset_type)
        
        result = db.execute(text("""
            SELECT *
            FROM index_info
            WHERE asset_id = :asset_id
            ORDER BY created_at DESC
            LIMIT :limit
        """), {"asset_id": asset_id, "limit": limit})
        
        rows = result.fetchall()
        if not rows:
            raise HTTPException(status_code=404, detail="Index info not found")
        
        data = []
        for row in rows:
            row_dict = dict(row._mapping)
            for key, value in row_dict.items():
                if hasattr(value, '__float__'):
                    row_dict[key] = float(value)
            data.append(row_dict)
        
        return {
            "asset_id": asset_id,
            "count": len(data),
            "data": data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get index info for {asset_identifier}")
        raise HTTPException(status_code=500, detail=f"Failed to get index info: {str(e)}")


# ============================================================================
# ETF Sector Exposure & Holdings
# ============================================================================

@router.get("/{asset_identifier}/etf-sectors")
def get_etf_sectors_v2(
    asset_identifier: str = Path(..., description="Asset ID or Ticker"),
    db: Session = Depends(get_postgres_db)
):
    """ETF 섹터 노출도 조회"""
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        
        # 먼저 etf_info에서 ID 조회
        etf_result = db.execute(text("""
            SELECT id FROM etf_info WHERE asset_id = :asset_id ORDER BY snapshot_date DESC LIMIT 1
        """), {"asset_id": asset_id})
        etf_row = etf_result.fetchone()
        
        if not etf_row:
            raise HTTPException(status_code=404, detail="ETF info not found")
        
        etf_info_id = etf_row[0]
        
        result = db.execute(text("""
            SELECT * FROM etf_sector_exposure WHERE etf_info_id = :etf_info_id
        """), {"etf_info_id": etf_info_id})
        
        rows = result.fetchall()
        data = [dict(row._mapping) for row in rows]
        
        return {
            "asset_id": asset_id,
            "etf_info_id": etf_info_id,
            "sectors": data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get ETF sectors for {asset_identifier}")
        raise HTTPException(status_code=500, detail=f"Failed to get ETF sectors: {str(e)}")


@router.get("/{asset_identifier}/etf-holdings")
def get_etf_holdings_v2(
    asset_identifier: str = Path(..., description="Asset ID or Ticker"),
    limit: int = Query(50, ge=1, le=200, description="조회할 보유 종목 개수"),
    db: Session = Depends(get_postgres_db)
):
    """ETF 보유 종목 조회"""
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        
        # 먼저 etf_info에서 ID 조회
        etf_result = db.execute(text("""
            SELECT id FROM etf_info WHERE asset_id = :asset_id ORDER BY snapshot_date DESC LIMIT 1
        """), {"asset_id": asset_id})
        etf_row = etf_result.fetchone()
        
        if not etf_row:
            raise HTTPException(status_code=404, detail="ETF info not found")
        
        etf_info_id = etf_row[0]
        
        result = db.execute(text("""
            SELECT * FROM etf_holdings 
            WHERE etf_info_id = :etf_info_id
            ORDER BY weight_percent DESC
            LIMIT :limit
        """), {"etf_info_id": etf_info_id, "limit": limit})
        
        rows = result.fetchall()
        data = []
        for row in rows:
            row_dict = dict(row._mapping)
            for key, value in row_dict.items():
                if hasattr(value, '__float__'):
                    row_dict[key] = float(value)
            data.append(row_dict)
        
        return {
            "asset_id": asset_id,
            "etf_info_id": etf_info_id,
            "count": len(data),
            "holdings": data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get ETF holdings for {asset_identifier}")
        raise HTTPException(status_code=500, detail=f"Failed to get ETF holdings: {str(e)}")
