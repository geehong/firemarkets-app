# backend/app/api/v2/endpoints/assets/analysis.py
"""
Analysis Module - 기술적 지표, 예측, 트리맵 데이터
대상 테이블: technical_indicators, crypto_metrics, stock_analyst_estimates
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import Optional, List, Dict, Any
from datetime import date, datetime, timedelta
import logging

from .....core.database import get_postgres_db
from .....models import OHLCVData, Asset, AssetType
from .....schemas.asset import TechnicalIndicatorsResponse, TreemapLiveResponse, TreemapLiveItem
from .shared.resolvers import resolve_asset_identifier, get_asset_type
from .shared.validators import validate_asset_type_for_endpoint
from .shared.constants import DATA_SOURCE_PRIORITY

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# Technical Indicators Endpoint
# ============================================================================

@router.get("/{asset_identifier}/technicals")
def get_technicals_v2(
    asset_identifier: str = Path(..., description="Asset ID or Ticker"),
    indicator_type: Optional[str] = Query(None, description="지표 타입 필터 (SMA, EMA, RSI 등)"),
    data_interval: str = Query("1d", description="데이터 간격"),
    limit: int = Query(100, ge=1, le=1000, description="최대 데이터 개수"),
    db: Session = Depends(get_postgres_db)
):
    """
    기술적 지표 조회
    
    - **indicator_type**: SMA, EMA, RSI, MACD 등
    - **data_interval**: 데이터 간격 (1d, 1h 등)
    """
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        
        # technical_indicators 테이블에서 조회
        query = """
            SELECT *
            FROM technical_indicators
            WHERE asset_id = :asset_id
            AND data_interval = :data_interval
        """
        params = {"asset_id": asset_id, "data_interval": data_interval}
        
        if indicator_type:
            query += " AND indicator_type = :indicator_type"
            params["indicator_type"] = indicator_type
        
        query += " ORDER BY timestamp_utc DESC LIMIT :limit"
        params["limit"] = limit
        
        result = db.execute(text(query), params)
        rows = result.fetchall()
        
        if not rows:
            # 데이터가 없으면 OHLCV에서 실시간 계산
            return calculate_technicals_from_ohlcv(db, asset_id, data_interval, limit)
        
        data = []
        for row in rows:
            row_dict = dict(row._mapping)
            for key, value in row_dict.items():
                if hasattr(value, '__float__'):
                    row_dict[key] = float(value)
            data.append(row_dict)
        
        return {
            "asset_id": asset_id,
            "data_interval": data_interval,
            "count": len(data),
            "data": data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get technicals for {asset_identifier}")
        raise HTTPException(status_code=500, detail=f"Failed to get technicals: {str(e)}")


def calculate_technicals_from_ohlcv(
    db: Session, 
    asset_id: int, 
    data_interval: str, 
    limit: int
) -> Dict[str, Any]:
    """OHLCV 데이터에서 기술적 지표 계산"""
    # 충분한 데이터 조회 (MA 200 계산 위해)
    ohlcv_query = db.query(OHLCVData).filter(
        OHLCVData.asset_id == asset_id,
        OHLCVData.data_interval.in_(['1d', '1day', None])
    ).order_by(OHLCVData.timestamp_utc.desc()).limit(300)
    
    rows = ohlcv_query.all()
    
    if not rows:
        return {
            "asset_id": asset_id,
            "data_interval": data_interval,
            "count": 0,
            "data": [],
            "note": "No OHLCV data available"
        }
    
    # 오래된 순으로 정렬
    rows = list(reversed(rows))
    closes = [float(r.close_price) for r in rows if r.close_price]
    
    if len(closes) < 2:
        return {
            "asset_id": asset_id,
            "data_interval": data_interval,
            "count": 0,
            "data": [],
            "note": "Insufficient data for calculation"
        }
    
    # 이동평균 계산
    def calculate_sma(prices, period):
        if len(prices) < period:
            return None
        return sum(prices[-period:]) / period
    
    # RSI 계산
    def calculate_rsi(prices, period=14):
        if len(prices) < period + 1:
            return None
        
        gains = []
        losses = []
        for i in range(1, len(prices)):
            diff = prices[i] - prices[i-1]
            if diff > 0:
                gains.append(diff)
                losses.append(0)
            else:
                gains.append(0)
                losses.append(abs(diff))
        
        if len(gains) < period:
            return None
        
        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period
        
        if avg_loss == 0:
            return 100
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        return round(rsi, 2)
    
    latest_row = rows[-1]
    current_price = closes[-1]
    
    indicators = {
        "timestamp": latest_row.timestamp_utc,
        "current_price": current_price,
        "sma_20": calculate_sma(closes, 20),
        "sma_50": calculate_sma(closes, 50),
        "sma_200": calculate_sma(closes, 200),
        "rsi_14": calculate_rsi(closes, 14),
    }
    
    # 트렌드 판단
    if indicators["sma_50"] and indicators["sma_200"]:
        indicators["trend"] = "bullish" if indicators["sma_50"] > indicators["sma_200"] else "bearish"
    else:
        indicators["trend"] = None
    
    return {
        "asset_id": asset_id,
        "data_interval": data_interval,
        "count": 1,
        "data": [indicators],
        "source": "calculated"
    }


# ============================================================================
# Estimates Endpoint (주식 전용)
# ============================================================================

@router.get("/{asset_identifier}/estimates")
def get_estimates_v2(
    asset_identifier: str = Path(..., description="Asset ID or Ticker"),
    limit: int = Query(10, ge=1, le=100, description="조회할 데이터 개수"),
    db: Session = Depends(get_postgres_db)
):
    """
    애널리스트 예측 조회 (주식 전용)
    """
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        asset_type = get_asset_type(db, asset_id)
        
        validate_asset_type_for_endpoint("estimates", asset_type)
        
        result = db.execute(text("""
            SELECT *
            FROM stock_analyst_estimates
            WHERE asset_id = :asset_id
            ORDER BY fiscal_date DESC
            LIMIT :limit
        """), {"asset_id": asset_id, "limit": limit})
        
        rows = result.fetchall()
        if not rows:
            raise HTTPException(status_code=404, detail="Estimates not found")
        
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
        logger.exception(f"Failed to get estimates for {asset_identifier}")
        raise HTTPException(status_code=500, detail=f"Failed to get estimates: {str(e)}")


# ============================================================================
# Crypto Metrics Endpoint
# ============================================================================

@router.get("/{asset_identifier}/crypto-metrics")
def get_crypto_metrics_v2(
    asset_identifier: str = Path(..., description="Asset ID or Ticker"),
    db: Session = Depends(get_postgres_db)
):
    """
    암호화폐 메트릭 조회
    """
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        asset_type = get_asset_type(db, asset_id)
        
        validate_asset_type_for_endpoint("crypto-metrics", asset_type)
        
        result = db.execute(text("""
            SELECT *
            FROM crypto_metrics
            WHERE asset_id = :asset_id
            ORDER BY recorded_at DESC
            LIMIT 1
        """), {"asset_id": asset_id})
        
        row = result.fetchone()
        if not row:
            # crypto_data에서 폴백
            fallback_result = db.execute(text("""
                SELECT *
                FROM crypto_data
                WHERE asset_id = :asset_id
                LIMIT 1
            """), {"asset_id": asset_id})
            fallback_row = fallback_result.fetchone()
            
            if fallback_row:
                row_dict = dict(fallback_row._mapping)
                for key, value in row_dict.items():
                    if hasattr(value, '__float__'):
                        row_dict[key] = float(value)
                return {
                    "asset_id": asset_id,
                    "source": "crypto_data",
                    "data": row_dict
                }
            
            raise HTTPException(status_code=404, detail="Crypto metrics not found")
        
        row_dict = dict(row._mapping)
        for key, value in row_dict.items():
            if hasattr(value, '__float__'):
                row_dict[key] = float(value)
        
        return {
            "asset_id": asset_id,
            "source": "crypto_metrics",
            "data": row_dict
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get crypto metrics for {asset_identifier}")
        raise HTTPException(status_code=500, detail=f"Failed to get crypto metrics: {str(e)}")


# ============================================================================
# Treemap Endpoint
# ============================================================================

@router.get("/treemap", response_model=TreemapLiveResponse)
def get_treemap_v2(
    asset_type_id: Optional[int] = Query(None, description="자산 타입 ID로 필터링"),
    type_name: Optional[str] = Query(None, description="자산 타입 이름으로 필터링"),
    limit: int = Query(100, ge=1, le=500, description="최대 결과 수"),
    db: Session = Depends(get_postgres_db)
):
    """
    트리맵 데이터 조회
    
    시가총액 기반 트리맵 시각화용 데이터
    """
    try:
        # treemap_live_view 사용
        query = "SELECT * FROM treemap_live_view WHERE 1=1"
        params = {}
        
        if asset_type_id:
            query += " AND asset_type_id = :asset_type_id"
            params["asset_type_id"] = asset_type_id
        
        if type_name:
            query += " AND type_name = :type_name"
            params["type_name"] = type_name
        
        query += " ORDER BY market_cap DESC NULLS LAST LIMIT :limit"
        params["limit"] = limit
        
        result = db.execute(text(query), params)
        rows = result.fetchall()
        
        items = []
        for row in rows:
            row_dict = dict(row._mapping)
            
            items.append(TreemapLiveItem(
                asset_id=row_dict.get("asset_id"),
                ticker=row_dict.get("ticker"),
                name=row_dict.get("name"),
                type_name=row_dict.get("type_name"),
                current_price=float(row_dict.get("current_price")) if row_dict.get("current_price") else None,
                market_cap=float(row_dict.get("market_cap")) if row_dict.get("market_cap") else None,
                daily_change_percent=float(row_dict.get("daily_change_percent")) if row_dict.get("daily_change_percent") else None,
                volume_24h=float(row_dict.get("volume_24h")) if row_dict.get("volume_24h") else None,
            ))
        
        # 요약 통계
        total_market_cap = sum(item.market_cap or 0 for item in items)
        avg_change = sum(item.daily_change_percent or 0 for item in items) / len(items) if items else 0
        
        return TreemapLiveResponse(
            items=items,
            total_count=len(items),
            summary={
                "total_market_cap": total_market_cap,
                "average_change_percent": round(avg_change, 2),
                "assets_count": len(items)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to get treemap data")
        raise HTTPException(status_code=500, detail=f"Failed to get treemap: {str(e)}")


# ============================================================================
# Market Caps Endpoint (legacy compatibility)
# ============================================================================

@router.get("/market-caps")
def get_market_caps_v2(
    type_name: Optional[str] = Query(None, description="자산 타입 이름"),
    has_ohlcv_data: bool = Query(True, description="OHLCV 데이터가 있는 자산만"),
    limit: int = Query(100, ge=1, le=1000, description="최대 결과 수"),
    offset: int = Query(0, ge=0, description="오프셋"),
    db: Session = Depends(get_postgres_db)
):
    """
    시가총액 데이터 조회 (기존 API 호환)
    
    트리맵 API와 동일한 데이터를 다른 포맷으로 반환
    """
    try:
        from .....models import WorldAssetsRanking
        
        today = datetime.now().date()
        target_data_sources = list(DATA_SOURCE_PRIORITY.keys())
        
        base_query = db.query(WorldAssetsRanking, AssetType.type_name) \
            .join(AssetType, WorldAssetsRanking.asset_type_id == AssetType.asset_type_id) \
            .filter(
                WorldAssetsRanking.market_cap_usd.isnot(None),
                WorldAssetsRanking.asset_id.isnot(None),
                WorldAssetsRanking.ranking_date == today,
                WorldAssetsRanking.data_source.in_(target_data_sources)
            )
        
        if type_name:
            base_query = base_query.filter(AssetType.type_name == type_name)
        
        total_count = base_query.count()
        world_assets = base_query.offset(offset).limit(limit).all()
        
        # 중복 제거
        seen_tickers = set()
        result_data = []
        
        for world_asset, asset_type_name in world_assets:
            if world_asset.ticker in seen_tickers:
                continue
            seen_tickers.add(world_asset.ticker)
            
            result_data.append({
                'asset_id': world_asset.asset_id,
                'ticker': world_asset.ticker,
                'name': world_asset.name,
                'type_name': asset_type_name,
                'current_price': float(world_asset.price_usd) if world_asset.price_usd else None,
                'market_cap': float(world_asset.market_cap_usd) if world_asset.market_cap_usd else None,
                'daily_change_percent': float(world_asset.daily_change_percent) if world_asset.daily_change_percent else None,
                'snapshot_date': world_asset.ranking_date,
            })
        
        return {
            "data": result_data,
            "total_count": total_count,
            "summary": {
                "total_market_cap": sum(item['market_cap'] or 0 for item in result_data),
                "assets_with_market_cap": len([item for item in result_data if item['market_cap']])
            }
        }
        
    except Exception as e:
        logger.exception("Failed to get market caps")
        raise HTTPException(status_code=500, detail=f"Failed to get market caps: {str(e)}")
