# backend/app/api/v2/endpoints/assets/widgets.py
"""
Widgets Module - 대시보드 위젯용 경량 API
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any
from datetime import datetime, timedelta
import logging

from app.core.database import get_postgres_db
from app.models import OHLCVData, Asset, AssetType
from .shared.resolvers import get_asset_by_ticker

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# Ticker Summary Endpoint
# ============================================================================

@router.get("/ticker-summary")
def get_ticker_summary_v2(
    tickers: str = Query(..., description="쉼표로 구분된 티커 목록"),
    db: Session = Depends(get_postgres_db)
):
    """
    다중 티커 요약 데이터 조회
    
    대시보드 위젯에서 여러 티커의 요약 정보를 한 번에 조회
    """
    try:
        ticker_list = [t.strip().upper() for t in tickers.split(',') if t.strip()]
        
        if not ticker_list:
            return {"data": [], "count": 0}
        
        if len(ticker_list) > 50:
            raise HTTPException(
                status_code=400, 
                detail="Maximum 50 tickers allowed per request"
            )
        
        results = []
        
        for ticker in ticker_list:
            asset = get_asset_by_ticker(db, ticker)
            if not asset:
                # 접미사 변형으로 시도
                for suffix in ['USDT', 'USD', '-USD']:
                    asset = get_asset_by_ticker(db, f"{ticker}{suffix}")
                    if asset:
                        break
                
                # 접미사 제거로 시도
                if not asset:
                    for suffix in ['USDT', '-USD', 'USD']:
                        if ticker.endswith(suffix):
                            normalized = ticker[:-len(suffix)]
                            asset = get_asset_by_ticker(db, normalized)
                            if asset:
                                break
            
            if not asset:
                results.append({
                    "ticker": ticker,
                    "found": False,
                    "error": "Asset not found"
                })
                continue
            
            # 최신 OHLCV 조회
            latest_ohlcv = db.query(OHLCVData).filter(
                OHLCVData.asset_id == asset.asset_id,
                OHLCVData.data_interval.in_(['1d', '1day', None])
            ).order_by(OHLCVData.timestamp_utc.desc()).first()
            
            # 이전 OHLCV 조회
            prev_ohlcv = None
            if latest_ohlcv:
                prev_ohlcv = db.query(OHLCVData).filter(
                    OHLCVData.asset_id == asset.asset_id,
                    OHLCVData.timestamp_utc < latest_ohlcv.timestamp_utc,
                    OHLCVData.data_interval.in_(['1d', '1day', None])
                ).order_by(OHLCVData.timestamp_utc.desc()).first()
            
            current_price = None
            prev_close = None
            change_percent = None
            volume = None
            
            if latest_ohlcv:
                current_price = float(latest_ohlcv.close_price) if latest_ohlcv.close_price else None
                volume = float(latest_ohlcv.volume) if latest_ohlcv.volume else None
                
                if latest_ohlcv.change_percent:
                    change_percent = float(latest_ohlcv.change_percent)
                elif prev_ohlcv and prev_ohlcv.close_price and float(prev_ohlcv.close_price) > 0:
                    prev_close = float(prev_ohlcv.close_price)
                    change_percent = ((current_price - prev_close) / prev_close) * 100
            
            # AssetType 조회
            asset_type = db.query(AssetType).filter(
                AssetType.asset_type_id == asset.asset_type_id
            ).first()
            
            results.append({
                "ticker": ticker,
                "found": True,
                "asset_id": asset.asset_id,
                "name": asset.name,
                "type_name": asset_type.type_name if asset_type else None,
                "exchange": asset.exchange,
                "current_price": current_price,
                "prev_close": prev_close,
                "change_percent": round(change_percent, 2) if change_percent else None,
                "volume": volume,
                "last_updated": latest_ohlcv.timestamp_utc if latest_ohlcv else None,
            })
        
        return {
            "data": results,
            "count": len([r for r in results if r.get("found")])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get ticker summary")
        raise HTTPException(status_code=500, detail=f"Failed to get ticker summary: {str(e)}")


# ============================================================================
# Market Movers Endpoint
# ============================================================================

@router.get("/market-movers")
def get_market_movers_v2(
    type_name: str = Query("Stocks", description="자산 타입"),
    direction: str = Query("gainers", description="gainers 또는 losers"),
    limit: int = Query(10, ge=1, le=50, description="최대 결과 수"),
    db: Session = Depends(get_postgres_db)
):
    """
    상승/하락 상위 종목 조회
    """
    try:
        from app.models import WorldAssetsRanking
        
        today = datetime.now().date()
        
        order_clause = "daily_change_percent DESC" if direction == "gainers" else "daily_change_percent ASC"
        
        query = f"""
            SELECT 
                war.asset_id,
                war.ticker,
                war.name,
                war.price_usd,
                war.daily_change_percent,
                war.market_cap_usd,
                at.type_name
            FROM world_assets_ranking war
            JOIN asset_types at ON war.asset_type_id = at.asset_type_id
            WHERE war.ranking_date = :today
            AND war.daily_change_percent IS NOT NULL
            AND at.type_name = :type_name
            ORDER BY {order_clause}
            LIMIT :limit
        """
        
        result = db.execute(text(query), {
            "today": today,
            "type_name": type_name,
            "limit": limit
        })
        
        rows = result.fetchall()
        
        data = []
        for row in rows:
            row_dict = dict(row._mapping)
            data.append({
                "asset_id": row_dict.get("asset_id"),
                "ticker": row_dict.get("ticker"),
                "name": row_dict.get("name"),
                "price": float(row_dict.get("price_usd")) if row_dict.get("price_usd") else None,
                "change_percent": float(row_dict.get("daily_change_percent")) if row_dict.get("daily_change_percent") else None,
                "market_cap": float(row_dict.get("market_cap_usd")) if row_dict.get("market_cap_usd") else None,
                "type_name": row_dict.get("type_name"),
            })
        
        return {
            "direction": direction,
            "type_name": type_name,
            "data": data,
            "count": len(data)
        }
        
    except Exception as e:
        logger.exception(f"Failed to get market movers")
        raise HTTPException(status_code=500, detail=f"Failed to get market movers: {str(e)}")


# ============================================================================
# Quick Stats Endpoint
# ============================================================================

@router.get("/quick-stats")
def get_quick_stats_v2(
    db: Session = Depends(get_postgres_db)
):
    """
    시장 빠른 통계 조회
    
    전체 시장 요약 정보
    """
    try:
        from app.models import WorldAssetsRanking
        
        today = datetime.now().date()
        
        # 타입별 통계
        result = db.execute(text("""
            SELECT 
                at.type_name,
                COUNT(DISTINCT war.asset_id) as asset_count,
                SUM(war.market_cap_usd) as total_market_cap,
                AVG(war.daily_change_percent) as avg_change
            FROM world_assets_ranking war
            JOIN asset_types at ON war.asset_type_id = at.asset_type_id
            WHERE war.ranking_date = :today
            AND war.market_cap_usd IS NOT NULL
            GROUP BY at.type_name
        """), {"today": today})
        
        stats_by_type = {}
        for row in result.fetchall():
            row_dict = dict(row._mapping)
            stats_by_type[row_dict["type_name"]] = {
                "asset_count": row_dict["asset_count"],
                "total_market_cap": float(row_dict["total_market_cap"]) if row_dict["total_market_cap"] else 0,
                "avg_change_percent": round(float(row_dict["avg_change"]), 2) if row_dict["avg_change"] else 0,
            }
        
        # 전체 통계
        total_result = db.execute(text("""
            SELECT 
                COUNT(DISTINCT asset_id) as total_assets,
                SUM(market_cap_usd) as total_market_cap
            FROM world_assets_ranking
            WHERE ranking_date = :today
            AND market_cap_usd IS NOT NULL
        """), {"today": today}).fetchone()
        
        return {
            "date": today.isoformat(),
            "total_assets": total_result[0] if total_result else 0,
            "total_market_cap": float(total_result[1]) if total_result and total_result[1] else 0,
            "by_type": stats_by_type
        }
        
    except Exception as e:
        logger.exception(f"Failed to get quick stats")
        raise HTTPException(status_code=500, detail=f"Failed to get quick stats: {str(e)}")
