import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta

from ....core.database import get_postgres_db
from ....services.endpoint.open_interest_service import OpenInterestService
from ....schemas.open_interest import (
    OpenInterestAnalysisResponse,
    ExchangeAnalysisResponse,
    LeverageAnalysisResponse,
    OpenInterestStatsResponse
)

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/open-interest/analysis", response_model=OpenInterestAnalysisResponse)
async def get_open_interest_analysis(
    start_date: Optional[date] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    limit: int = Query(1000, ge=1, le=10000, description="데이터 개수 제한"),
    include_exchanges: str = Query("all", description="포함할 거래소 (all 또는 comma-separated)"),
    db: Session = Depends(get_postgres_db)
):
    """Open Interest Futures 분석 데이터를 조회합니다."""
    try:
        # 날짜 변환
        start_dt = datetime.combine(start_date, datetime.min.time()) if start_date else None
        end_dt = datetime.combine(end_date, datetime.max.time()) if end_date else None

        # 데이터 조회
        data_points = OpenInterestService.fetch_open_interest_data(
            db=db,
            start_date=start_dt,
            end_date=end_dt,
            limit=limit
        )

        if not data_points:
            raise HTTPException(status_code=404, detail="No Open Interest data found")

        # 거래소 필터링
        if include_exchanges != "all":
            allowed_exchanges = [ex.strip() for ex in include_exchanges.split(",")]
            filtered_points = []
            for point in data_points:
                filtered_exchanges = {k: v for k, v in point.exchanges.items() if k in allowed_exchanges}
                if filtered_exchanges:
                    point.exchanges = filtered_exchanges
                    point.total = sum(filtered_exchanges.values())
                    filtered_points.append(point)
            data_points = filtered_points

        # 요약 통계 계산
        summary = OpenInterestService.calculate_summary_stats(data_points)

        # 메타데이터
        metadata = {
            "total_records": len(data_points),
            "date_range": {
                "start": data_points[-1].timestamp.isoformat() if data_points else None,
                "end": data_points[0].timestamp.isoformat() if data_points else None
            },
            "exchanges_included": list(set().union(*[set(point.exchanges.keys()) for point in data_points])),
            "last_updated": datetime.now().isoformat() + "Z"
        }

        return OpenInterestAnalysisResponse(
            data=data_points,
            summary=summary,
            metadata=metadata
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_open_interest_analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/open-interest/exchanges", response_model=ExchangeAnalysisResponse)
async def get_exchange_analysis(
    exchange: Optional[str] = Query(None, description="특정 거래소"),
    period: str = Query("1m", regex="^(1w|1m|3m|6m|1y|all)$", description="분석 기간"),
    db: Session = Depends(get_postgres_db)
):
    """거래소별 Open Interest 분석을 조회합니다."""
    try:
        # 기간 설정
        end_date = date.today()
        if period == "1w":
            start_date = end_date - timedelta(days=7)
        elif period == "1m":
            start_date = end_date - timedelta(days=30)
        elif period == "3m":
            start_date = end_date - timedelta(days=90)
        elif period == "6m":
            start_date = end_date - timedelta(days=180)
        elif period == "1y":
            start_date = end_date - timedelta(days=365)
        else:  # all
            start_date = None

        # 데이터 조회
        data_points = OpenInterestService.fetch_open_interest_data(
            db=db,
            start_date=datetime.combine(start_date, datetime.min.time()) if start_date else None,
            end_date=datetime.combine(end_date, datetime.max.time()),
            limit=1000
        )

        if not data_points:
            raise HTTPException(status_code=404, detail="No Open Interest data found")

        # 거래소별 분석
        exchange_analysis = OpenInterestService.calculate_exchange_analysis(data_points)

        # 특정 거래소 필터링
        if exchange:
            exchange_analysis = [ex for ex in exchange_analysis if ex.exchange.lower() == exchange.lower()]

        # 시장 점유율 트렌드 계산
        market_share_trend = []
        if data_points:
            # 최근 10개 데이터 포인트에서의 트렌드
            recent_points = data_points[:10]
            for point in recent_points:
                trend_point = {
                    "timestamp": point.timestamp.isoformat(),
                    "total": point.total,
                    "exchanges": point.exchanges
                }
                market_share_trend.append(trend_point)

        # 집중도 지수 계산 (최신 데이터 기준)
        if data_points:
            latest_point = data_points[0]
            concentration_index = latest_point.market_concentration
        else:
            concentration_index = 0

        # 메타데이터
        metadata = {
            "period": period,
            "total_exchanges": len(exchange_analysis),
            "analysis_date": datetime.now().isoformat() + "Z"
        }

        return ExchangeAnalysisResponse(
            exchanges=exchange_analysis,
            market_share_trend=market_share_trend,
            concentration_index=concentration_index,
            total_exchanges=len(exchange_analysis),
            metadata=metadata
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_exchange_analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/open-interest/leverage", response_model=LeverageAnalysisResponse)
async def get_leverage_analysis(
    period: str = Query("1m", regex="^(1w|1m|3m|6m|1y|all)$", description="분석 기간"),
    include_market_cap: bool = Query(True, description="시가총액 포함 여부"),
    db: Session = Depends(get_postgres_db)
):
    """Open Interest 레버리지 분석을 조회합니다."""
    try:
        # 기간 설정
        end_date = date.today()
        if period == "1w":
            start_date = end_date - timedelta(days=7)
        elif period == "1m":
            start_date = end_date - timedelta(days=30)
        elif period == "3m":
            start_date = end_date - timedelta(days=90)
        elif period == "6m":
            start_date = end_date - timedelta(days=180)
        elif period == "1y":
            start_date = end_date - timedelta(days=365)
        else:  # all
            start_date = None

        # 데이터 조회
        data_points = OpenInterestService.fetch_open_interest_data(
            db=db,
            start_date=datetime.combine(start_date, datetime.min.time()) if start_date else None,
            end_date=datetime.combine(end_date, datetime.max.time()),
            limit=1000
        )

        if not data_points:
            raise HTTPException(status_code=404, detail="No Open Interest data found")

        # 레버리지 데이터 계산 (현재는 시가총액 데이터가 없어서 기본값 사용)
        leverage_data = []
        for point in data_points:
            # 임시로 고정된 시가총액 사용 (실제로는 시가총액 API 연동 필요)
            estimated_market_cap = 1_000_000_000_000  # 1조 달러 (예시)
            leverage_ratio = OpenInterestService.calculate_leverage_ratio(point.total, estimated_market_cap)
            
            leverage_point = {
                "timestamp": point.timestamp.isoformat(),
                "open_interest": point.total,
                "market_cap": estimated_market_cap if include_market_cap else None,
                "leverage_ratio": leverage_ratio,
                "risk_level": "High" if leverage_ratio > 5 else "Medium" if leverage_ratio > 2 else "Low"
            }
            leverage_data.append(leverage_point)

        # 통계 계산
        leverage_ratios = [point["leverage_ratio"] for point in leverage_data if point["leverage_ratio"] > 0]
        
        if leverage_ratios:
            average_leverage = sum(leverage_ratios) / len(leverage_ratios)
            max_leverage = max(leverage_ratios)
            min_leverage = min(leverage_ratios)
        else:
            average_leverage = max_leverage = min_leverage = 0

        # 전체 위험 레벨 결정
        if average_leverage > 5:
            risk_level = "High"
        elif average_leverage > 2:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        # 메타데이터
        metadata = {
            "period": period,
            "include_market_cap": include_market_cap,
            "analysis_date": datetime.now().isoformat() + "Z",
            "note": "Market cap is estimated for demonstration purposes"
        }

        return LeverageAnalysisResponse(
            leverage_data=leverage_data,
            risk_level=risk_level,
            average_leverage=average_leverage,
            max_leverage=max_leverage,
            min_leverage=min_leverage,
            metadata=metadata
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_leverage_analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/open-interest/stats", response_model=OpenInterestStatsResponse)
async def get_open_interest_stats(
    period: str = Query("1m", regex="^(1w|1m|3m|6m|1y|all)$", description="분석 기간"),
    db: Session = Depends(get_postgres_db)
):
    """Open Interest 통계 정보를 조회합니다."""
    try:
        # 기간 설정
        end_date = date.today()
        if period == "1w":
            start_date = end_date - timedelta(days=7)
        elif period == "1m":
            start_date = end_date - timedelta(days=30)
        elif period == "3m":
            start_date = end_date - timedelta(days=90)
        elif period == "6m":
            start_date = end_date - timedelta(days=180)
        elif period == "1y":
            start_date = end_date - timedelta(days=365)
        else:  # all
            start_date = None

        # 데이터 조회
        data_points = OpenInterestService.fetch_open_interest_data(
            db=db,
            start_date=datetime.combine(start_date, datetime.min.time()) if start_date else None,
            end_date=datetime.combine(end_date, datetime.max.time()),
            limit=1000
        )

        if not data_points:
            raise HTTPException(status_code=404, detail="No Open Interest data found")

        # 전체 통계
        total_stats = OpenInterestService.calculate_summary_stats(data_points)

        # 거래소별 통계
        exchange_stats = {}
        all_exchanges = set()
        for point in data_points:
            all_exchanges.update(point.exchanges.keys())

        for exchange in all_exchanges:
            exchange_values = []
            for point in data_points:
                if exchange in point.exchanges:
                    exchange_values.append(point.exchanges[exchange])
            
            if exchange_values:
                exchange_stats[exchange] = {
                    "current": exchange_values[0],
                    "average": sum(exchange_values) / len(exchange_values),
                    "max": max(exchange_values),
                    "min": min(exchange_values),
                    "volatility": OpenInterestService.calculate_volatility(exchange_values)
                }

        # 기간별 통계 (주별, 월별)
        period_stats = {
            "weekly": {},
            "monthly": {}
        }

        # 메타데이터
        metadata = {
            "period": period,
            "total_records": len(data_points),
            "total_exchanges": len(all_exchanges),
            "analysis_date": datetime.now().isoformat() + "Z"
        }

        return OpenInterestStatsResponse(
            total_stats=total_stats,
            exchange_stats=exchange_stats,
            period_stats=period_stats,
            metadata=metadata
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_open_interest_stats: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/open-interest/latest", response_model=OpenInterestAnalysisResponse)
async def get_latest_open_interest(
    days: int = Query(7, ge=1, le=30, description="최근 N일 데이터"),
    db: Session = Depends(get_postgres_db)
):
    """최신 Open Interest 데이터를 조회합니다."""
    try:
        end_date = date.today()
        start_date = end_date - timedelta(days=days)

        return await get_open_interest_analysis(
            start_date=start_date,
            end_date=end_date,
            limit=100,
            include_exchanges="all",
            db=db
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_latest_open_interest: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")












