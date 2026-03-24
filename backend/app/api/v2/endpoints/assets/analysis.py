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

from fastapi_cache.decorator import cache
from app.core.database import get_postgres_db
from app.models import OHLCVData, Asset, AssetType
from app.models.blog import Post
from .shared.resolvers import resolve_asset_identifier, get_asset_type
from .shared.validators import validate_asset_type_for_endpoint
from .shared.constants import DATA_SOURCE_PRIORITY

from app.analysis.speculative import sentiment_analyzer
from app.analysis.quantitative import calculate_correlation_matrix, calculate_spread_analysis
from app.analysis.technical import calculate_moving_averages

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

@router.get("/treemap")
@cache(expire=60)
async def get_treemap_v2(
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
        # treemap_live_view 사용 (단순화된 뷰, world_assets_ranking 직접 조회, ~50ms)
        query = "SELECT * FROM treemap_live_view WHERE 1=1"
        params = {}
        
        # asset_type_id가 제공되면 type_name을 조회하여 필터링 (뷰에 asset_type_id 없음)
        if asset_type_id:
            asset_type_obj = db.query(AssetType).filter(AssetType.asset_type_id == asset_type_id).first()
            if asset_type_obj:
               query += " AND asset_type = :type_name_from_id"
               params["type_name_from_id"] = asset_type_obj.type_name
            else:
               # 존재하지 않는 ID면 빈 결과 반환
               return {"items": [], "total_count": 0, "summary": {"total_market_cap": 0, "average_change_percent": 0, "assets_count": 0}}
        
        # type_name 직접 제공 시 (뷰 컬럼명은 asset_type)
        if type_name:
            # ILIKE on view is slow. Resolve canonical name first.
            resolved_type = db.query(AssetType.type_name).filter(AssetType.type_name.ilike(type_name)).scalar()
            if resolved_type:
                query += " AND asset_type = :resolved_type_name"
                params["resolved_type_name"] = resolved_type
            else:
                # Type not found
                return {"data": [], "total_count": 0, "summary": {"total_market_cap": 0, "average_change_percent": 0, "assets_count": 0}}
        
        query += " ORDER BY market_cap DESC NULLS LAST LIMIT :limit"
        params["limit"] = limit
        
        result = db.execute(text(query), params)
        rows = result.fetchall()
        
        asset_ids = [row._mapping.get("asset_id") for row in rows if row._mapping.get("asset_id")]
        
        # 2. 최신 시세/변동률 일괄 조회 (병합 로직 적용)
        price_map = {}
        if asset_ids:
            price_stmt = text("""
                WITH latest_prices AS (
                    -- 1. Realtime Quotes
                    SELECT 
                        asset_id, price as close_price, timestamp_utc, change_percent, volume, 'realtime' as source
                    FROM realtime_quotes 
                    WHERE asset_id = ANY(:asset_ids)
                    
                    UNION ALL

                    -- 2. Realtime Bar (웹소켓 집계)
                    SELECT 
                        asset_id, close_price, timestamp_utc, change_percent, volume, 'realtime_bar' as source
                    FROM realtime_quotes_time_bar 
                    WHERE asset_id = ANY(:asset_ids)

                    UNION ALL
                    
                    -- 3. Delayed Quotes
                    SELECT 
                        asset_id, price as close_price, timestamp_utc, change_percent, volume, 'realtime_delay' as source
                    FROM realtime_quotes_time_delay 
                    WHERE asset_id = ANY(:asset_ids)
                    
                    UNION ALL
                    
                    -- 4. Intraday Data (REST API 저장분, 최근 7일만)
                    SELECT DISTINCT ON (asset_id)
                        asset_id, close_price, timestamp_utc, change_percent, volume, 'intraday' as source
                    FROM ohlcv_intraday_data 
                    WHERE asset_id = ANY(:asset_ids)
                      AND timestamp_utc > (now() AT TIME ZONE 'UTC' - INTERVAL '7 days')
                    ORDER BY asset_id, timestamp_utc DESC
                )
                SELECT DISTINCT ON (asset_id) 
                    asset_id, close_price, change_percent, volume, timestamp_utc
                FROM latest_prices
                ORDER BY asset_id, timestamp_utc DESC
            """)
            price_rows = db.execute(price_stmt, {"asset_ids": asset_ids}).fetchall()
            price_map = {row._mapping['asset_id']: row._mapping for row in price_rows}

        items = []
        for row in rows:
            row_dict = dict(row._mapping)
            asset_id = row_dict.get("asset_id")
            p_data = price_map.get(asset_id, {})
            
            items.append({
                "asset_id": asset_id,
                "asset_type_id": row_dict.get("asset_type_id"),
                "ticker": row_dict.get("ticker"),
                "name": row_dict.get("name"),
                "type_name": row_dict.get("asset_type"),
                "logo_url": row_dict.get("logo_url"),
                "current_price": float(p_data.get("close_price")) if p_data.get("close_price") is not None else (float(row_dict.get("current_price")) if row_dict.get("current_price") else None),
                "market_cap": float(row_dict.get("market_cap")) if row_dict.get("market_cap") else None,
                "daily_change_percent": float(p_data.get("change_percent")) if p_data.get("change_percent") is not None else (float(row_dict.get("price_change_percentage_24h")) if row_dict.get("price_change_percentage_24h") is not None else None),
                "price_change_percentage_24h": float(p_data.get("change_percent")) if p_data.get("change_percent") is not None else (float(row_dict.get("price_change_percentage_24h")) if row_dict.get("price_change_percentage_24h") is not None else None),
                "volume_24h": float(p_data.get("volume")) if p_data.get("volume") is not None else (float(row_dict.get("volume")) if row_dict.get("volume") else None),
                "last_updated": p_data.get("timestamp_utc")
            })
        
        # 요약 통계
        total_market_cap = sum(item.get("market_cap") or 0 for item in items)
        avg_change = sum(item.get("daily_change_percent") or 0 for item in items) / len(items) if items else 0
        
        return {
            "data": items,
            "total_count": len(items),
            "summary": {
                "total_market_cap": total_market_cap,
                "average_change_percent": round(avg_change, 2),
                "assets_count": len(items)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to get treemap data")
        raise HTTPException(status_code=500, detail=f"Failed to get treemap: {str(e)}")


# ============================================================================
# Market Caps Endpoint (legacy compatibility)
# ============================================================================

@router.get("/market-caps")
@cache(expire=60)
async def get_market_caps_v2(
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
        from app.models import WorldAssetsRanking
        
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


# ============================================================================
# Migrated v1 Analysis Endpoints
# ============================================================================

@router.get("/ma", response_model=Any)
def get_moving_averages_v2(
    ticker: str = Query(..., description="Asset Ticker"),
    periods: str = Query("10,20,50,111,200,365,700", description="Comma separated periods"),
    days: int = 1000,
    db: Session = Depends(get_postgres_db)
):
    """
    Moving Averages (Migrated from v1)
    """
    try:
        period_list = [int(p) for p in periods.split(",")]
        return calculate_moving_averages(db, ticker, period_list, days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sentiment", response_model=Any)
def analyze_sentiment_text_v2(
    text: str = Query(..., min_length=1, description="Text to analyze sentiment for")
):
    """
    Analyze sentiment of a given text (Migrated from v1)
    """
    return sentiment_analyzer.analyze(text)


@router.post("/sentiment/news", response_model=Any)
def analyze_news_sentiment_v2(
    news_items: List[dict]
):
    """
    Batch analyze sentiment for news items (Migrated from v1)
    """
    results = []
    for item in news_items:
        text = item.get("title", "") + " " + item.get("summary", "")
        # Truncate if too long
        sentiment = sentiment_analyzer.analyze(text[:500])
        results.append({
            "id": item.get("id"),
            "sentiment": sentiment
        })
    return results


@router.get("/correlation", response_model=Any)
def get_asset_correlation_v2(
    tickers: List[str] = Query(..., description="List of tickers to correlate"),
    days: int = Query(90, ge=30, le=10000),
    db: Session = Depends(get_postgres_db)
):
    """
    Correlation Matrix (Migrated from v1)
    """
    if len(tickers) == 1 and "," in tickers[0]:
        tickers = tickers[0].split(",")

    if len(tickers) < 2:
        raise HTTPException(status_code=400, detail="At least 2 tickers required")
    
    return calculate_correlation_matrix(db, tickers, days)


@router.get("/spread", response_model=Any)
def get_spread_analysis_v2(
    ticker1: str,
    ticker2: str,
    days: int = 90,
    db: Session = Depends(get_postgres_db)
):
    """
    Spread Analysis (Migrated from v1)
    """
    return calculate_spread_analysis(db, ticker1, ticker2, days)


@router.get("/sentiment/history", response_model=Any)
def get_sentiment_history_v2(
    period: str = Query("24h", description="Time period (24h, 7d, 30d, 1y)"),
    interval: str = Query("1h", description="Grouping interval (1h, 4h, 1d)"),
    db: Session = Depends(get_postgres_db)
):
    """
    Aggregated News Sentiment History (Migrated from v1 sentiment_stats)
    """
    # Logic copied from v1/endpoints/sentiment_stats.py
    now = datetime.utcnow()
    periods_map = {
        "1h": timedelta(hours=1),
        "4h": timedelta(hours=4),
        "8h": timedelta(hours=8),
        "24h": timedelta(hours=24),
        "7d": timedelta(days=7),
        "30d": timedelta(days=30),
        "1y": timedelta(days=365)
    }
    start_date = now - periods_map.get(period, timedelta(hours=24))

    sql_interval = 'hour'
    needs_aggregation = False
    agg_hours = 1

    if interval == '4h':
        needs_aggregation = True
        agg_hours = 4
    elif interval == '8h':
        needs_aggregation = True
        agg_hours = 8
    elif interval == '1d' or interval == '24h':
        sql_interval = 'day'
    elif interval == '1w' or interval == '7d':
        sql_interval = 'week'
    elif interval == '1M' or interval == '30d':
        sql_interval = 'month'

    query = text(f"""
        SELECT 
            date_trunc(:interval, published_at) as time_bucket,
            AVG(CAST(post_info->'sentiment'->>'score' AS FLOAT)) as avg_score,
            COUNT(*) as total_count,
            SUM(CASE WHEN post_info->'sentiment'->>'label' = 'positive' THEN 1 ELSE 0 END) as pos_count,
            SUM(CASE WHEN post_info->'sentiment'->>'label' = 'negative' THEN 1 ELSE 0 END) as neg_count,
            SUM(CASE WHEN post_info->'sentiment'->>'label' = 'neutral' THEN 1 ELSE 0 END) as neu_count
        FROM posts
        WHERE post_type = 'raw_news'
          AND published_at >= :start_date
          AND post_info->'sentiment' IS NOT NULL
        GROUP BY time_bucket
        ORDER BY time_bucket ASC
    """)
    
    rows = db.execute(query, {"interval": sql_interval, "start_date": start_date}).fetchall()
    
    if not needs_aggregation:
        return [
            {
                "time": r[0].isoformat() if r[0] else None,
                "avg_score": r[1],
                "total_count": r[2],
                "sentiment_counts": {
                    "positive": r[3],
                    "negative": r[4],
                    "neutral": r[5]
                }
            } for r in rows
        ]

    buckets = {}
    for r in rows:
        dt: datetime = r[0]
        if not dt: continue
        base_hour = (dt.hour // agg_hours) * agg_hours
        bucket_dt = dt.replace(hour=base_hour, minute=0, second=0, microsecond=0)
        key = bucket_dt.isoformat()
        
        if key not in buckets:
            buckets[key] = {"score_sum": 0.0, "total_count": 0, "pos": 0, "neg": 0, "neu": 0}
        
        buckets[key]["score_sum"] += (r[1] or 0.5) * r[2]
        buckets[key]["total_count"] += r[2]
        buckets[key]["pos"] += r[3]
        buckets[key]["neg"] += r[4]
        buckets[key]["neu"] += r[5]
        
    return [
        {
            "time": k,
            "avg_score": b["score_sum"] / b["total_count"] if b["total_count"] > 0 else 0.5,
            "total_count": b["total_count"],
            "sentiment_counts": {"positive": b["pos"], "negative": b["neg"], "neutral": b["neu"]}
        } for k, b in sorted(buckets.items())
    ]

