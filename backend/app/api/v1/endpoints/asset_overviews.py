"""
Asset Overview API endpoints
새로 생성된 뷰들을 활용한 자산 개요 정보 조회 API
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import Optional, Dict, Any, List
from datetime import date, datetime, timedelta
from decimal import Decimal
import logging

from ....core.database import get_postgres_db
from ....models import OHLCVData, Asset, AssetType
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# Helper Functions
# ============================================================================

def resolve_asset_identifier(db: Session, asset_identifier: str) -> int:
    """Asset ID 또는 Ticker를 asset_id로 변환"""
    if asset_identifier.isdigit():
        return int(asset_identifier)
    
    # 1차 시도: 정확한 티커 매칭
    asset = db.query(Asset).filter(Asset.ticker == asset_identifier).first()
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
        asset = db.query(Asset).filter(Asset.ticker == normalized_ticker).first()
        if asset:
            return asset.asset_id
    
    raise HTTPException(status_code=404, detail=f"Asset not found: {asset_identifier}")



# ============================================================================
# Pydantic Schemas
# ============================================================================

class AssetInfoResponse(BaseModel):
    """Asset Info 응답 모델 (ohlcv_day_data 기반 계산)"""
    asset_id: int = Field(..., description="Asset ID")
    prev_close: Optional[float] = Field(None, description="이전 종가")
    current_price: Optional[float] = Field(None, description="현재(최신) 가격")
    price_change: Optional[float] = Field(None, description="가격 변동폭")
    price_change_percent: Optional[float] = Field(None, description="가격 변동률 (%)")
    week_52_high: Optional[float] = Field(None, description="52주 최고가")
    week_52_low: Optional[float] = Field(None, description="52주 최저가")
    volume: Optional[int] = Field(None, description="최근 거래량")
    average_vol_3m: Optional[float] = Field(None, description="3개월 평균 거래량")
    market_cap: Optional[float] = Field(None, description="시가총액")
    day_50_moving_avg: Optional[float] = Field(None, description="50일 이동평균")
    day_200_moving_avg: Optional[float] = Field(None, description="200일 이동평균")
    last_updated: Optional[datetime] = Field(None, description="마지막 업데이트 시간")
    post_id: Optional[int] = Field(None, description="Associated post ID")



class StockInfoResponse(BaseModel):
    """Stock Info 응답 모델"""
    asset_id: int
    post_overview: Optional[Dict[str, Any]] = None
    numeric_overview: Optional[Dict[str, Any]] = None
    estimates_overview: Optional[Dict[str, Any]] = None


class CryptoInfoResponse(BaseModel):
    """Crypto Info 응답 모델"""
    asset_id: int
    post_overview: Optional[Dict[str, Any]] = None
    numeric_overview: Optional[Dict[str, Any]] = None


class ETFInfoResponse(BaseModel):
    """ETF Info 응답 모델"""
    asset_id: int
    post_overview: Optional[Dict[str, Any]] = None
    numeric_overview: Optional[Dict[str, Any]] = None


# ============================================================================
# Asset Info Service (ohlcv_day_data 기반 계산)
# ============================================================================

def calculate_asset_info(db: Session, asset_id: int) -> AssetInfoResponse:
    """ohlcv_day_data 기반으로 asset_info 계산"""
    try:
        # 1. 최신 2개의 OHLCV 데이터 조회 (변동률 계산용)
        ohlcv_latest_two = db.query(OHLCVData).filter(
            OHLCVData.asset_id == asset_id,
            OHLCVData.data_interval.in_(['1d', '1day', None])
        ).order_by(OHLCVData.timestamp_utc.desc()).limit(2).all()
        
        if not ohlcv_latest_two:
            return AssetInfoResponse(asset_id=asset_id)
        
        latest_ohlcv = ohlcv_latest_two[0]
        current_price = float(latest_ohlcv.close_price) if latest_ohlcv.close_price else None
        volume = int(latest_ohlcv.volume) if latest_ohlcv.volume else None
        last_updated = latest_ohlcv.timestamp_utc
        
        prev_close = None
        price_change = None
        price_change_percent = None
        
        if len(ohlcv_latest_two) > 1:
            prev_ohlcv = ohlcv_latest_two[1]
            prev_close = float(prev_ohlcv.close_price) if prev_ohlcv.close_price else None
            
            if current_price is not None and prev_close is not None and prev_close != 0:
                price_change = current_price - prev_close
                price_change_percent = (price_change / prev_close) * 100
        else:
            # 데이터가 하나뿐이면 prev_close는 현재 가격과 동일하게 보거나 None 유지
            prev_close = current_price
            price_change = 0.0
            price_change_percent = 0.0
        
        # 2. 52주 범위 계산 (약 252 거래일)
        one_year_ago = latest_ohlcv.timestamp_utc - timedelta(days=365)
        ohlcv_52w = db.query(
            func.max(OHLCVData.high_price).label('max_high'),
            func.min(OHLCVData.low_price).label('min_low')
        ).filter(
            OHLCVData.asset_id == asset_id,
            OHLCVData.timestamp_utc >= one_year_ago,
            OHLCVData.data_interval.in_(['1d', '1day', None])
        ).first()
        
        week_52_high = float(ohlcv_52w.max_high) if ohlcv_52w and ohlcv_52w.max_high else None
        week_52_low = float(ohlcv_52w.min_low) if ohlcv_52w and ohlcv_52w.min_low else None
        
        # 3. 3개월 평균 거래량 계산
        three_months_ago = latest_ohlcv.timestamp_utc - timedelta(days=90)
        avg_vol_result = db.query(
            func.avg(OHLCVData.volume).label('avg_volume')
        ).filter(
            OHLCVData.asset_id == asset_id,
            OHLCVData.timestamp_utc >= three_months_ago,
            OHLCVData.data_interval.in_(['1d', '1day', None])
        ).first()
        
        average_vol_3m = float(avg_vol_result.avg_volume) if avg_vol_result and avg_vol_result.avg_volume else None
        
        # 4. 이동평균 계산
        # 50일 이동평균
        ohlcv_50d = db.query(OHLCVData).filter(
            OHLCVData.asset_id == asset_id,
            OHLCVData.timestamp_utc <= latest_ohlcv.timestamp_utc,
            OHLCVData.data_interval.in_(['1d', '1day', None])
        ).order_by(OHLCVData.timestamp_utc.desc()).limit(50).all()
        
        day_50_moving_avg = None
        if ohlcv_50d and len(ohlcv_50d) == 50:
            closes = [float(d.close_price) for d in ohlcv_50d if d.close_price]
            if closes:
                day_50_moving_avg = sum(closes) / len(closes)
        
        # 200일 이동평균
        ohlcv_200d = db.query(OHLCVData).filter(
            OHLCVData.asset_id == asset_id,
            OHLCVData.timestamp_utc <= latest_ohlcv.timestamp_utc,
            OHLCVData.data_interval.in_(['1d', '1day', None])
        ).order_by(OHLCVData.timestamp_utc.desc()).limit(200).all()
        
        day_200_moving_avg = None
        if ohlcv_200d and len(ohlcv_200d) == 200:
            closes = [float(d.close_price) for d in ohlcv_200d if d.close_price]
            if closes:
                day_200_moving_avg = sum(closes) / len(closes)
        
        # 5. Market Cap 조회 (stock_financials 또는 crypto_data에서)
        market_cap = None
        try:
            # stock_financials에서 시도
            stock_financial = db.execute(
                text("SELECT market_cap FROM stock_financials WHERE asset_id = :asset_id ORDER BY snapshot_date DESC LIMIT 1"),
                {"asset_id": asset_id}
            ).fetchone()
            if stock_financial and stock_financial.market_cap:
                market_cap = float(stock_financial.market_cap)
            else:
                # crypto_data에서 시도
                crypto_data = db.execute(
                    text("SELECT market_cap FROM crypto_data WHERE asset_id = :asset_id LIMIT 1"),
                    {"asset_id": asset_id}
                ).fetchone()
                if crypto_data and crypto_data.market_cap:
                    market_cap = float(crypto_data.market_cap)
        except Exception as e:
            logger.warning(f"Failed to get market cap for asset_id {asset_id}: {e}")
        
        # 6. Post ID 조회 (Edit 링크용)
        post_id = None
        try:
            from ....models import Post
            post = db.query(Post).filter(Post.asset_id == asset_id).first()
            if post:
                post_id = post.id
        except Exception as e:
            logger.warning(f"Failed to get post_id for asset_id {asset_id}: {e}")

        return AssetInfoResponse(
            asset_id=asset_id,
            current_price=current_price,
            prev_close=prev_close,
            price_change=price_change,
            price_change_percent=price_change_percent,
            week_52_high=week_52_high,
            week_52_low=week_52_low,
            volume=volume,
            average_vol_3m=average_vol_3m,
            market_cap=market_cap,
            day_50_moving_avg=day_50_moving_avg,
            day_200_moving_avg=day_200_moving_avg,
            last_updated=last_updated,
            post_id=post_id
        )

        
    except Exception as e:
        logger.error(f"Error calculating asset info for asset_id {asset_id}: {e}")
        return AssetInfoResponse(asset_id=asset_id)


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("/stock/{asset_identifier}", response_model=StockInfoResponse)
def get_stock_info(
    asset_identifier: str = Path(..., description="Asset ID (integer) or Ticker (string)"),
    db: Session = Depends(get_postgres_db)
):
    """주식 정보 조회 (stock_info_view 사용)"""
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        
        # stock_info_view에서 데이터 조회
        result = db.execute(
            text("SELECT * FROM stock_info_view WHERE asset_id = :asset_id LIMIT 1"),
            {"asset_id": asset_id}
        ).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail=f"Stock info not found for {asset_identifier}")
        
        # 결과를 딕셔너리로 변환
        row_dict = dict(result._mapping) if hasattr(result, '_mapping') else dict(result)
        
        # post_overview 구성
        post_overview = {
            "post_id": row_dict.get("post_id"),
            "title": row_dict.get("title"),
            "slug": row_dict.get("slug"),
            "description": row_dict.get("post_description"),
            "excerpt": row_dict.get("excerpt"),
            "content": row_dict.get("content"),
            "content_ko": row_dict.get("content_ko"),
            "cover_image": row_dict.get("cover_image"),
            "status": row_dict.get("post_status"),
            "published_at": row_dict.get("published_at"),
            "updated_at": row_dict.get("post_updated_at"),
            "company_name": row_dict.get("company_name"),
            "sector": row_dict.get("sector"),
            "industry": row_dict.get("industry"),
            "country": row_dict.get("country"),
            "ceo": row_dict.get("ceo"),
            "employees_count": row_dict.get("employees_count"),
            "ipo_date": row_dict.get("ipo_date"),
            "logo_image_url": row_dict.get("logo_image_url"),
            "description_en": row_dict.get("description_en"),
            "description_ko": row_dict.get("description_ko"),
            "website": row_dict.get("website"),
            "exchange": row_dict.get("exchange"),
            "exchange_full_name": row_dict.get("exchange_full_name"),
        }
        
        # numeric_overview 구성
        numeric_overview = {
            "ticker": row_dict.get("ticker"),
            "stock_financials_data": row_dict.get("stock_financials_data"),
            "income_json": row_dict.get("income_json"),
            "balance_json": row_dict.get("balance_json"),
            "cash_flow_json": row_dict.get("cash_flow_json"),
            "ratios_json": row_dict.get("ratios_json"),
        }
        
        # estimates_overview 구성
        estimates_overview = {
            "fiscal_date": row_dict.get("estimate_fiscal_date"),
            "name": row_dict.get("estimate_name"),
            "revenue_avg": row_dict.get("revenue_avg"),
            "revenue_low": row_dict.get("revenue_low"),
            "revenue_high": row_dict.get("revenue_high"),
            "revenue_analysts_count": row_dict.get("revenue_analysts_count"),
            "eps_avg": row_dict.get("eps_avg"),
            "eps_low": row_dict.get("eps_low"),
            "eps_high": row_dict.get("eps_high"),
            "eps_analysts_count": row_dict.get("eps_analysts_count"),
            "ebitda_avg": row_dict.get("ebitda_avg"),
            "ebitda_low": row_dict.get("ebitda_low"),
            "ebitda_high": row_dict.get("ebitda_high"),
            "ebit_avg": row_dict.get("ebit_avg"),
            "ebit_low": row_dict.get("ebit_low"),
            "ebit_high": row_dict.get("ebit_high"),
            "net_income_avg": row_dict.get("net_income_avg"),
            "net_income_low": row_dict.get("net_income_low"),
            "net_income_high": row_dict.get("net_income_high"),
            "sga_expense_avg": row_dict.get("sga_expense_avg"),
            "sga_expense_low": row_dict.get("sga_expense_low"),
            "sga_expense_high": row_dict.get("sga_expense_high"),
        }
        
        return StockInfoResponse(
            asset_id=asset_id,
            post_overview=post_overview,
            numeric_overview=numeric_overview,
            estimates_overview=estimates_overview
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting stock info for {asset_identifier}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get stock info: {str(e)}")


@router.get("/crypto/{asset_identifier}", response_model=CryptoInfoResponse)
def get_crypto_info(
    asset_identifier: str = Path(..., description="Asset ID (integer) or Ticker (string)"),
    db: Session = Depends(get_postgres_db)
):
    """암호화폐 정보 조회 (crypto_info_view 사용)"""
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        
        # crypto_info_view에서 데이터 조회
        result = db.execute(
            text("SELECT * FROM crypto_info_view WHERE asset_id = :asset_id LIMIT 1"),
            {"asset_id": asset_id}
        ).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail=f"Crypto info not found for {asset_identifier}")
        
        # 결과를 딕셔너리로 변환
        row_dict = dict(result._mapping) if hasattr(result, '_mapping') else dict(result)
        
        # post_overview 구성
        post_overview = {
            "post_id": row_dict.get("post_id"),
            "title": row_dict.get("title"),
            "slug": row_dict.get("slug"),
            "description": row_dict.get("post_description"),
            "excerpt": row_dict.get("excerpt"),
            "content": row_dict.get("content"),
            "content_ko": row_dict.get("content_ko"),
            "cover_image": row_dict.get("cover_image"),
            "status": row_dict.get("post_status"),
            "published_at": row_dict.get("published_at"),
            "updated_at": row_dict.get("post_updated_at"),
            "logo_url": row_dict.get("logo_url"),
            "website_url": row_dict.get("website_url"),
            "explorer": row_dict.get("explorer"),
            "tags": row_dict.get("tags"),
            "cmc_rank": row_dict.get("cmc_rank"),
            "category": row_dict.get("category"),
            "description": row_dict.get("crypto_description"),
        }
        
        # numeric_overview 구성
        def safe_float(value):
            """안전하게 float 변환"""
            if value is None:
                return None
            try:
                return float(value)
            except (ValueError, TypeError):
                return None
        
        numeric_overview = {
            "market_cap": safe_float(row_dict.get("market_cap")),
            "circulating_supply": safe_float(row_dict.get("circulating_supply")),
            "total_supply": safe_float(row_dict.get("total_supply")),
            "max_supply": safe_float(row_dict.get("max_supply")),
            "current_price": safe_float(row_dict.get("current_price")),
            "volume_24h": safe_float(row_dict.get("volume_24h")),
            "percent_change_1h": safe_float(row_dict.get("percent_change_1h")),
            "percent_change_24h": safe_float(row_dict.get("percent_change_24h")),
            "percent_change_7d": safe_float(row_dict.get("percent_change_7d")),
            "percent_change_30d": safe_float(row_dict.get("percent_change_30d")),
            "symbol": row_dict.get("symbol"),
            "name": row_dict.get("crypto_name"),
            "last_updated": row_dict.get("last_updated"),
        }
        
        return CryptoInfoResponse(
            asset_id=asset_id,
            post_overview=post_overview,
            numeric_overview=numeric_overview
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting crypto info for {asset_identifier}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get crypto info: {str(e)}")


@router.get("/etf/{asset_identifier}", response_model=ETFInfoResponse)
def get_etf_info(
    asset_identifier: str = Path(..., description="Asset ID (integer) or Ticker (string)"),
    db: Session = Depends(get_postgres_db)
):
    """ETF 정보 조회 (etf_info_view 사용)"""
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        
        # etf_info_view에서 데이터 조회
        result = db.execute(
            text("SELECT * FROM etf_info_view WHERE asset_id = :asset_id LIMIT 1"),
            {"asset_id": asset_id}
        ).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail=f"ETF info not found for {asset_identifier}")
        
        # 결과를 딕셔너리로 변환
        row_dict = dict(result._mapping) if hasattr(result, '_mapping') else dict(result)
        
        # post_overview 구성
        post_overview = {
            "post_id": row_dict.get("post_id"),
            "title": row_dict.get("title"),
            "slug": row_dict.get("slug"),
            "description": row_dict.get("post_description"),
            "excerpt": row_dict.get("excerpt"),
            "content": row_dict.get("content"),
            "content_ko": row_dict.get("content_ko"),
            "cover_image": row_dict.get("cover_image"),
            "status": row_dict.get("post_status"),
            "published_at": row_dict.get("published_at"),
            "updated_at": row_dict.get("post_updated_at"),
        }
        
        # numeric_overview 구성
        def safe_float(value):
            """안전하게 float 변환"""
            if value is None:
                return None
            try:
                return float(value)
            except (ValueError, TypeError):
                return None
        
        numeric_overview = {
            "etf_info_id": row_dict.get("etf_info_id"),
            "snapshot_date": row_dict.get("snapshot_date"),
            "net_assets": safe_float(row_dict.get("net_assets")),
            "net_expense_ratio": safe_float(row_dict.get("net_expense_ratio")),
            "portfolio_turnover": safe_float(row_dict.get("portfolio_turnover")),
            "dividend_yield": safe_float(row_dict.get("dividend_yield")),
            "inception_date": row_dict.get("inception_date"),
            "leveraged": row_dict.get("leveraged"),
            "sectors": row_dict.get("sectors"),
            "holdings": row_dict.get("holdings"),
            "updated_at": row_dict.get("etf_updated_at"),
        }
        
        return ETFInfoResponse(
            asset_id=asset_id,
            post_overview=post_overview,
            numeric_overview=numeric_overview
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting ETF info for {asset_identifier}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get ETF info: {str(e)}")


@router.get("/common/{asset_identifier}", response_model=AssetInfoResponse)
def get_asset_info(
    asset_identifier: str = Path(..., description="Asset ID (integer) or Ticker (string)"),
    db: Session = Depends(get_postgres_db)
):
    """공통 자산 정보 조회 (ohlcv_day_data 기반 계산)"""
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        return calculate_asset_info(db, asset_id)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting asset info for {asset_identifier}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get asset info: {str(e)}")

