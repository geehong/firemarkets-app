# backend/app/api/v1/endpoints/metrics.py
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
import pandas as pd
from scipy.stats import pearsonr
from sqlalchemy import func

from ....core.database import get_postgres_db
from ....models.asset import OHLCVData, Asset, OnchainMetricsInfo, CryptoMetric
from ....schemas.asset import PriceDataPoint, PriceResponse
from ....api.v1.endpoints.assets import resolve_asset_identifier, get_asset_by_ticker

logger = logging.getLogger(__name__)

router = APIRouter()

def get_metric_definition(metric_id: str, db: Session) -> OnchainMetricsInfo:
    """데이터베이스에서 메트릭 정의 조회"""
    # price는 특별히 처리 (온체인 메트릭이 아님)
    if metric_id == 'price':
        raise HTTPException(status_code=400, detail="'price' is not an onchain metric")
    
    metric = db.query(OnchainMetricsInfo).filter(
        OnchainMetricsInfo.metric_id == metric_id,
        OnchainMetricsInfo.status == 'active'
    ).first()
    
    if not metric:
        raise HTTPException(status_code=404, detail=f"Metric not found: {metric_id}")
    
    return metric

def get_price_data_for_asset(db: Session, asset_id: int, start_date: Optional[date], end_date: Optional[date], limit: int) -> List[Dict]:
    """자산의 가격 데이터 조회 (1d 간격만)"""
    query = db.query(
        OHLCVData.timestamp_utc,
        OHLCVData.close_price,
        OHLCVData.change_percent
    ).filter(
        OHLCVData.asset_id == asset_id
        # data_interval 필터링 제거 - 모든 일봉 데이터 조회 (주말/월말 포함)
    )

    if start_date:
        # datetime 객체와 date 객체 비교를 위해 명시적으로 처리
        start_datetime = datetime.combine(start_date, datetime.min.time())
        query = query.filter(OHLCVData.timestamp_utc >= start_datetime)
    if end_date:
        # datetime 객체와 date 객체 비교를 위해 명시적으로 처리
        end_datetime = datetime.combine(end_date, datetime.max.time())
        query = query.filter(OHLCVData.timestamp_utc <= end_datetime)

    data = query.order_by(OHLCVData.timestamp_utc.desc()).limit(limit).all()
    
    return [
        {
            "timestamp_utc": item.timestamp_utc.strftime("%Y-%m-%dT%H:%M:%S"),
            "close_price": float(item.close_price) if item.close_price else None,
            "change_percent": float(item.change_percent) if item.change_percent else None
        }
        for item in data
    ]

def get_onchain_metric_data(db: Session, metric_id: str, asset_id: int, start_date: Optional[date], end_date: Optional[date], limit: int) -> List[Dict]:
    """온체인 메트릭 데이터 조회"""
    # 메트릭 정의 확인 (존재하는지 체크)
    metric_def = get_metric_definition(metric_id, db)
    
    # metric_id를 직접 데이터베이스 필드명으로 사용
    field_name = metric_id
    
    query = db.query(
        CryptoMetric.timestamp_utc,
        getattr(CryptoMetric, field_name)
    ).filter(
        CryptoMetric.asset_id == asset_id,
        getattr(CryptoMetric, field_name).isnot(None)
    )

    if start_date:
        # datetime 객체와 date 객체 비교를 위해 명시적으로 처리
        start_datetime = datetime.combine(start_date, datetime.min.time())
        query = query.filter(CryptoMetric.timestamp_utc >= start_datetime)
    if end_date:
        # datetime 객체와 date 객체 비교를 위해 명시적으로 처리
        end_datetime = datetime.combine(end_date, datetime.max.time())
        query = query.filter(CryptoMetric.timestamp_utc <= end_datetime)

    data = query.order_by(CryptoMetric.timestamp_utc.desc()).limit(limit).all()
    
    return [
        {
            "timestamp_utc": item.timestamp_utc.strftime("%Y-%m-%dT%H:%M:%S") if hasattr(item.timestamp_utc, 'strftime') else str(item.timestamp_utc),
            "value": float(getattr(item, field_name)) if getattr(item, field_name) else None
        }
        for item in data
    ]

def calculate_correlation(price_data: List[Dict], metric_data: List[Dict]) -> Dict[str, Any]:
    """가격과 메트릭 간의 상관관계 계산"""
    try:
        # 데이터를 DataFrame으로 변환
        price_df = pd.DataFrame(price_data)
        metric_df = pd.DataFrame(metric_data)
        
        # timestamp를 인덱스로 설정
        price_df.set_index('timestamp_utc', inplace=True)
        metric_df.set_index('timestamp_utc', inplace=True)
        
        # 공통 날짜만 추출
        common_dates = price_df.index.intersection(metric_df.index)
        
        if len(common_dates) < 10:
            return {
                "correlation": None,
                "p_value": None,
                "interpretation": "Insufficient data points",
                "data_points": len(common_dates)
            }
        
        # 공통 데이터 추출
        price_series = price_df.loc[common_dates, 'close_price']
        metric_series = metric_df.loc[common_dates, 'value']
        
        # 상관계수 계산
        correlation, p_value = pearsonr(price_series, metric_series)
        
        # 해석
        if abs(correlation) >= 0.7:
            interpretation = "Strong Positive Correlation" if correlation > 0 else "Strong Negative Correlation"
        elif abs(correlation) >= 0.5:
            interpretation = "Moderate Positive Correlation" if correlation > 0 else "Moderate Negative Correlation"
        elif abs(correlation) >= 0.3:
            interpretation = "Weak Positive Correlation" if correlation > 0 else "Weak Negative Correlation"
        else:
            interpretation = "No Significant Correlation"
        
        return {
            "correlation": round(correlation, 3),
            "p_value": round(p_value, 4),
            "interpretation": interpretation,
            "data_points": len(common_dates)
        }
    except Exception as e:
        logger.error(f"Error calculating correlation: {e}")
        return {
            "correlation": None,
            "p_value": None,
            "interpretation": f"Error: {str(e)}",
            "data_points": 0
        }

@router.get("/{asset_identifier}")
async def get_integrated_metrics(
    asset_identifier: str = Path(..., description="Asset ID (integer) or Ticker (string)"),
    metrics: str = Query(..., description="쉼표로 구분된 메트릭 목록 (예: price,mvrvZscore,sopr)"),
    start_date: Optional[date] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    limit: int = Query(1000, ge=1, le=10000, description="최대 데이터 포인트 수"),
    compute: Optional[str] = Query(None, description="분석 옵션 (예: correlation)"),
    db: Session = Depends(get_postgres_db)
):
    """온체인 메트릭과 가격 데이터 통합 조회"""
    try:
        # 1. 메트릭 파싱
        metric_list = [m.strip() for m in metrics.split(',')]
        logger.info(f"Requested metrics: {metric_list}")
        
        # 2. 자산 ID 확인
        asset_id = resolve_asset_identifier(db, asset_identifier)
        asset = get_asset_by_ticker(db, asset_identifier) if not asset_identifier.isdigit() else db.query(Asset).filter(Asset.asset_id == int(asset_identifier)).first()
        
        if not asset:
            raise HTTPException(status_code=404, detail=f"Asset not found: {asset_identifier}")
        
        # 3. 공통 날짜 범위 찾기
        common_start_date = None
        common_end_date = None
        
        # 기본적으로 최근 5년 데이터 사용 (더 넓은 범위)
        default_start_date = datetime.now().date() - timedelta(days=10950)  # 5년
        default_end_date = datetime.now().date()
        
        # 가격 데이터의 날짜 범위 확인
        if 'price' in metric_list:
            price_date_range = db.query(
                func.min(OHLCVData.timestamp_utc),
                func.max(OHLCVData.timestamp_utc)
            ).filter(OHLCVData.asset_id == asset_id).first()
            
            if price_date_range[0] and price_date_range[1]:
                # 최근 1년 범위로 제한
                price_start = max(price_date_range[0].date(), default_start_date)
                price_end = price_date_range[1].date()
                common_start_date = price_start
                common_end_date = price_end
                logger.info(f"Price data range (limited): {common_start_date} to {common_end_date}")
        
        # 온체인 메트릭들의 날짜 범위 확인
        for metric in metric_list:
            if metric != 'price':
                try:
                    # metric_id를 직접 DB 필드명으로 사용
                    field_name = metric
                    
                    metric_date_range = db.query(
                        func.min(CryptoMetric.timestamp_utc),
                        func.max(CryptoMetric.timestamp_utc)
                    ).filter(
                        CryptoMetric.asset_id == asset_id,
                        getattr(CryptoMetric, field_name).isnot(None)
                    ).first()
                    
                    if metric_date_range[0] and metric_date_range[1]:
                        # datetime.date 객체인지 확인하고 적절히 처리
                        metric_start = metric_date_range[0].date() if hasattr(metric_date_range[0], 'date') else metric_date_range[0]
                        metric_end = metric_date_range[1].date() if hasattr(metric_date_range[1], 'date') else metric_date_range[1]
                        
                        # 최근 1년 범위로 제한
                        metric_start = max(metric_start, default_start_date)
                        metric_end = min(metric_end, default_end_date)
                        
                        logger.info(f"{metric} data range (limited): {metric_start} to {metric_end}")
                        
                        # 공통 범위 업데이트
                        if common_start_date is None:
                            common_start_date = metric_start
                            common_end_date = metric_end
                        else:
                            common_start_date = max(common_start_date, metric_start)
                            common_end_date = min(common_end_date, metric_end)
                except Exception as e:
                    logger.warning(f"Failed to get date range for {metric}: {e}")
        
        # 사용자 지정 날짜 범위가 있으면 적용
        if start_date:
            common_start_date = max(common_start_date, start_date) if common_start_date else start_date
        if end_date:
            common_end_date = min(common_end_date, end_date) if common_end_date else end_date
        
        logger.info(f"Final common date range: {common_start_date} to {common_end_date}")
        
        # 4. 공통 날짜 범위 내에서 각 메트릭 데이터 수집
        series_data = {}
        
        # 날짜 배열 초기화
        date_data = []
        price_data = []
        metric_data_dict = {}
        
        # 가격 데이터 수집
        if 'price' in metric_list:
            price_raw_data = get_price_data_for_asset(db, asset_id, common_start_date, common_end_date, limit)
            for item in price_raw_data:
                date_data.append({"date": item["timestamp_utc"][:10]})  # YYYY-MM-DD 형식
                price_data.append({
                    "close_price": item["close_price"],
                    "change_percent": item["change_percent"]
                })
            series_data['price'] = price_data
            logger.info(f"Collected {len(price_data)} price records")
        
        # 온체인 메트릭 데이터 수집
        for metric in metric_list:
            if metric != 'price':
                try:
                    metric_raw_data = get_onchain_metric_data(db, metric, asset_id, common_start_date, common_end_date, limit)
                    metric_data = []
                    
                    for i, item in enumerate(metric_raw_data):
                        if i < len(date_data):  # 날짜 배열과 동일한 인덱스
                            metric_data.append({
                                "value": item["value"]
                            })
                        else:
                            # 새로운 날짜가 있다면 추가
                            date_data.append({"date": item["timestamp_utc"][:10]})  # YYYY-MM-DD 형식
                            metric_data.append({
                                "value": item["value"]
                            })
                    
                    metric_data_dict[metric] = metric_data
                    series_data[metric] = metric_data
                    logger.info(f"Collected {len(metric_data)} {metric} records")
                except Exception as e:
                    logger.warning(f"Failed to collect {metric}: {e}")
                    series_data[metric] = []
        
        # 날짜 배열을 series_data에 추가
        series_data['date'] = date_data
        
        # 5. 상관관계 분석 (요청된 경우)
        analysis = {}
        if compute and 'correlation' in compute and 'price' in series_data:
            correlations = {}
            for metric_name, metric_data in series_data.items():
                if metric_name not in ['price', 'date'] and metric_data:
                    # 상관관계 계산을 위해 원래 형식으로 변환
                    price_for_correlation = []
                    metric_for_correlation = []
                    
                    for i in range(min(len(date_data), len(price_data), len(metric_data))):
                        price_for_correlation.append({
                            "timestamp_utc": date_data[i]["date"] + "T00:00:00",  # ISO 형식으로 변환
                            "close_price": price_data[i]["close_price"],
                            "change_percent": price_data[i]["change_percent"]
                        })
                        metric_for_correlation.append({
                            "timestamp_utc": date_data[i]["date"] + "T00:00:00",  # ISO 형식으로 변환
                            "value": metric_data[i]["value"]
                        })
                    
                    correlation_result = calculate_correlation(price_for_correlation, metric_for_correlation)
                    correlations[metric_name] = correlation_result
            analysis['correlation'] = correlations
        
        return {
            "asset_ticker": asset.ticker,
            "series": series_data,
            "analysis": analysis
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in integrated metrics API: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get integrated metrics: {str(e)}") 