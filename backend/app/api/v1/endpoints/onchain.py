# backend_temp/app/api/v1/endpoints/onchain.py
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any, Callable
from pydantic import BaseModel
from datetime import datetime, date, timedelta
from sqlalchemy import func, desc
import statistics

from ....core.database import get_db
from ....models.asset import Asset, OnchainMetricsInfo, CryptoMetric
from ....schemas.common import (
    OnchainMetricCategoryResponse, OnchainMetricToggleResponse, 
    OnchainMetricRunResponse, OnchainMetricStatusResponse
)
# from ....collectors.onchain_collector import OnchainCollector  # Temporarily disabled in v2 pipeline

logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic models
class OnchainMetricInfo(BaseModel):
    id: str
    name: str
    description: str
    category: str
    current_range: Optional[str]
    last_update: Optional[datetime]
    status: str
    collect_interval: str
    data_count: int
    is_enabled: bool

class MetricRunRequest(BaseModel):
    force_update: bool = False
    collection_type: str = "recent"  # "all" 또는 "recent"

class MetricDataRange(BaseModel):
    metric_id: str
    start_date: Optional[date]
    end_date: Optional[date]
    data_count: int

# 데이터 조회 API 모델들
class MetricDataPoint(BaseModel):
    date: date
    value: float
    change: Optional[float] = None
    change_percent: Optional[float] = None

class MetricDataResponse(BaseModel):
    metric_id: str
    metric_name: str
    data: List[MetricDataPoint]
    metadata: Dict[str, Any]

class ChartDataPoint(BaseModel):
    date: date
    values: Dict[str, float]

class ChartDataResponse(BaseModel):
    chart_type: str
    data: List[ChartDataPoint]
    options: Dict[str, Any]

class MetricStats(BaseModel):
    min_value: float
    max_value: float
    avg_value: float
    median_value: float
    volatility: float
    period: str

class MetricStatsResponse(BaseModel):
    metric_id: str
    metric_name: str
    stats: MetricStats
    period: str

class CorrelationResponse(BaseModel):
    metrics: List[str]
    correlation_matrix: Dict[str, Dict[str, float]]
    period: str

class DashboardSummary(BaseModel):
    total_metrics: int
    active_metrics: int
    latest_updates: List[Dict[str, Any]]
    alerts: List[Dict[str, Any]]

class AlertInfo(BaseModel):
    metric_id: str
    severity: str
    message: str
    timestamp: datetime
    active: bool

# 헬퍼 함수들
def get_metric_definition(metric_id: str, db: Session) -> OnchainMetricsInfo:
    """데이터베이스에서 메트릭 정의를 조회합니다."""
    metric_def = db.query(OnchainMetricsInfo).filter(OnchainMetricsInfo.metric_id == metric_id).first()
    if not metric_def:
        raise HTTPException(status_code=404, detail=f"Metric '{metric_id}' not found")
    return metric_def

def get_metric_data_range(metric_def: OnchainMetricsInfo, db: Session) -> Any:
    """메트릭의 데이터 범위를 조회합니다."""
    # 비트코인 자산 ID 조회 (BTC 또는 BTCUSDT 지원)
    bitcoin_asset = get_bitcoin_asset(db)
    if not bitcoin_asset:
        return None
    
    # HODL Waves Supply 특별 처리
    if metric_def.metric_id == 'hodl_waves_supply':
        # HODL Waves는 여러 필드 중 하나라도 있으면 데이터가 있다고 간주
        result = db.query(
            func.min(CryptoMetric.timestamp_utc).label('min_date'),
            func.max(CryptoMetric.timestamp_utc).label('max_date'),
            func.count(CryptoMetric.hodl_age_0d_1d).label('count')
        ).filter(
            CryptoMetric.asset_id == bitcoin_asset.asset_id,
            CryptoMetric.hodl_age_0d_1d.isnot(None)
        ).first()
        return result
    
    # 데이터베이스 필드명 매핑 (실제 데이터베이스의 metric_id에 맞춤)
    db_field_map = {
        'mvrv_z_score': 'mvrv_z_score',
        'sopr': 'sopr',
        'nupl': 'nupl',
        'realized_price': 'realized_price',
        'hashrate': 'hashrate',
        'difficulty': 'difficulty',
        'miner_reserves': 'miner_reserves',
        'etf_btc_total': 'etf_btc_total',
        'etf_btc_flow': 'etf_btc_flow',
        'open_interest_futures': 'open_interest_futures',
        'realized_cap': 'realized_cap',
        'cdd_90dma': 'cdd_90dma',
        'true_market_mean': 'true_market_mean',
        'nrpl_btc': 'nrpl_btc',
        'thermo_cap': 'thermo_cap',
        'hodl_waves_supply': 'hodl_waves_supply'
    }
    
    db_field = db_field_map.get(metric_def.metric_id)
    if not db_field:
        return None
    
    # 데이터 범위 조회
    result = db.query(
        func.min(CryptoMetric.timestamp_utc).label('min_date'),
        func.max(CryptoMetric.timestamp_utc).label('max_date'),
        func.count(getattr(CryptoMetric, db_field)).label('count')
    ).filter(
        CryptoMetric.asset_id == bitcoin_asset.asset_id,
        getattr(CryptoMetric, db_field).isnot(None)
    ).first()
    
    return result

def is_metric_enabled(metric_id: str, db: Session) -> bool:
    """메트릭이 활성화되어 있는지 확인합니다."""
    metric = db.query(OnchainMetricsInfo).filter(OnchainMetricsInfo.metric_id == metric_id).first()
    return metric.is_enabled if metric else False

def to_date(dt) -> Optional[date]:
    """datetime을 date로 변환합니다."""
    if dt is None:
        return None
    if isinstance(dt, date):
        return dt
    return dt.date() if hasattr(dt, 'date') else dt

def get_period_dates(period: str) -> tuple[Optional[date], date]:
    """기간에 따른 시작/종료 날짜를 반환합니다."""
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
    elif period == "all":
        start_date = None
    else:
        start_date = end_date - timedelta(days=30)  # 기본값
    
    return start_date, end_date

def create_data_points(records: List, metric_def: OnchainMetricsInfo) -> List[MetricDataPoint]:
    """데이터베이스 레코드를 데이터 포인트로 변환합니다."""
    db_field_map = {
        'mvrv_z_score': 'mvrv_z_score',
        'sopr': 'sopr',
        'nupl': 'nupl',
        'realized_price': 'realized_price',
        'hashrate': 'hashrate',
        'difficulty': 'difficulty',
        'miner_reserves': 'miner_reserves',
        'etf_btc_total': 'etf_btc_total',
        'etf_btc_flow': 'etf_btc_flow',
        'open_interest_futures': 'open_interest_futures',
        'realized_cap': 'realized_cap',
        'cdd_90dma': 'cdd_90dma',
        'true_market_mean': 'true_market_mean',
        'nrpl_btc': 'nrpl_btc',
        'thermo_cap': 'thermo_cap',
        'hodl_waves_supply': 'hodl_waves_supply'
    }
    
    db_field = db_field_map.get(metric_def.metric_id)
    if not db_field:
        return []
    
    data_points = []
    for i, record in enumerate(records):
        value = getattr(record, db_field)
        if value is None:
            continue
            
        # 변화량 계산
        change = None
        change_percent = None
        if i < len(records) - 1:
            prev_value = getattr(records[i + 1], db_field)
            if prev_value is not None:
                change = float(value) - float(prev_value)
                change_percent = (change / float(prev_value)) * 100 if prev_value != 0 else None
        
        data_points.append(MetricDataPoint(
            date=record.timestamp_utc,
            value=float(value),
            change=change,
            change_percent=change_percent
        ))
    
    return data_points

def handle_metric_operation(operation: Callable, metric_id: str, *args, **kwargs):
    """메트릭 작업을 처리합니다."""
    try:
        result = operation(metric_id, *args, **kwargs)
        return {"success": True, "message": f"Operation completed for {metric_id}", "data": result}
    except Exception as e:
        logger.error(f"Error in metric operation for {metric_id}: {e}")
        return {"success": False, "message": f"Operation failed for {metric_id}: {str(e)}"}

def get_bitcoin_asset(db: Session) -> Optional[Asset]:
    """비트코인 자산을 조회합니다."""
    return db.query(Asset).filter(
        Asset.ticker.in_(['BTC', 'BTCUSDT'])
    ).first()

@router.get("/onchain/metrics", response_model=List[OnchainMetricInfo])
async def get_onchain_metrics(db: Session = Depends(get_db)):
    """모든 온체인 메트릭 정보를 조회합니다."""
    try:
        # 데이터베이스에서 메트릭 정보 조회
        metrics = db.query(OnchainMetricsInfo).filter(
            OnchainMetricsInfo.status == 'active'
        ).all()
        
        metrics_info = []
        for metric in metrics:
            data_range = get_metric_data_range(metric, db)
            is_enabled = metric.is_enabled
            
            # 데이터 범위 문자열 생성
            current_range = None
            if data_range and data_range.min_date and data_range.max_date:
                current_range = f"{data_range.min_date.strftime('%Y/%m/%d')} - {data_range.max_date.strftime('%Y/%m/%d')}"
            
            metrics_info.append(OnchainMetricInfo(
                id=metric.metric_id,
                name=metric.name,
                description=metric.description,
                category=metric.category,
                current_range=current_range,
                last_update=data_range.max_date if data_range and data_range.max_date else None,
                status='active' if is_enabled else 'inactive',
                collect_interval='24h',  # 기본값
                data_count=data_range.count if data_range else 0,
                is_enabled=is_enabled
            ))
        
        return metrics_info
        
    except Exception as e:
        logger.error(f"Error getting onchain metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get onchain metrics: {str(e)}")

@router.get("/onchain/metrics/{metric_id}/data-range", response_model=MetricDataRange)
async def get_metric_data_range_endpoint(metric_id: str, db: Session = Depends(get_db)):
    """특정 메트릭의 데이터 범위를 조회합니다."""
    metric_def = get_metric_definition(metric_id, db)
    data_range = get_metric_data_range(metric_def, db)
    
    return MetricDataRange(
        metric_id=metric_id,
        start_date=to_date(data_range.min_date) if data_range and data_range.min_date else None,
        end_date=to_date(data_range.max_date) if data_range and data_range.max_date else None,
        data_count=data_range.count if data_range else 0
    )

@router.get("/onchain/metrics/categories", response_model=OnchainMetricCategoryResponse)
async def get_metric_categories(db: Session = Depends(get_db)):
    """온체인 메트릭 카테고리 목록을 조회합니다."""
    categories = db.query(OnchainMetricsInfo.category).distinct().all()
    return {"categories": [cat[0] for cat in categories]}

# --- 데이터 조회 API들 ---

@router.get("/onchain/metrics/{metric_id}/data", response_model=MetricDataResponse)
async def get_metric_data(
    metric_id: str,
    start_date: Optional[date] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    limit: int = Query(1000, ge=1, le=10000, description="데이터 개수 제한"),
    format: str = Query("json", regex="^(json|csv)$", description="응답 형식"),
    db: Session = Depends(get_db)
):
    """특정 메트릭의 데이터를 조회합니다."""
    metric_def = get_metric_definition(metric_id, db)
    
    # 비트코인 자산 ID 조회 (BTC 또는 BTCUSDT 지원)
    bitcoin_asset = get_bitcoin_asset(db)
    if not bitcoin_asset:
        raise HTTPException(status_code=404, detail="Bitcoin asset not found (BTC or BTCUSDT)")
    
    # HODL Waves Supply 특별 처리
    if metric_id == 'hodl_waves_supply':
        # HODL Waves는 여러 필드 중 하나라도 있으면 데이터가 있다고 간주
        query = db.query(CryptoMetric).filter(
            CryptoMetric.asset_id == bitcoin_asset.asset_id,
            CryptoMetric.hodl_age_0d_1d.isnot(None)
        )
        
        if start_date:
            query = query.filter(CryptoMetric.timestamp_utc >= start_date)
        if end_date:
            query = query.filter(CryptoMetric.timestamp_utc <= end_date)
        
        records = query.order_by(desc(CryptoMetric.timestamp_utc)).limit(limit).all()
        
        # HODL Waves 데이터 포인트 생성
        data_points = []
        for i, record in enumerate(records):
            # 모든 HODL 필드의 평균값 계산
            hodl_fields = [
                'hodl_age_0d_1d', 'hodl_age_1d_1w', 'hodl_age_1w_1m', 'hodl_age_1m_3m',
                'hodl_age_3m_6m', 'hodl_age_6m_1y', 'hodl_age_1y_2y', 'hodl_age_2y_3y',
                'hodl_age_3y_4y', 'hodl_age_4y_5y', 'hodl_age_5y_7y', 'hodl_age_7y_10y', 'hodl_age_10y'
            ]
            
            values = []
            for field in hodl_fields:
                value = getattr(record, field)
                if value is not None:
                    values.append(float(value))
            
            if values:
                avg_value = sum(values) / len(values)
                
                # 변화량 계산
                change = None
                change_percent = None
                if i < len(records) - 1:
                    prev_record = records[i + 1]
                    prev_values = []
                    for field in hodl_fields:
                        value = getattr(prev_record, field)
                        if value is not None:
                            prev_values.append(float(value))
                    
                    if prev_values:
                        prev_avg = sum(prev_values) / len(prev_values)
                        change = avg_value - prev_avg
                        change_percent = (change / prev_avg) * 100 if prev_avg != 0 else None
                
                data_points.append(MetricDataPoint(
                    date=record.timestamp_utc,
                    value=avg_value,
                    change=change,
                    change_percent=change_percent
                ))
        
        # 메타데이터
        metadata = {
            "total_count": len(data_points),
            "date_range": f"{data_points[-1].date if data_points else 'N/A'} to {data_points[0].date if data_points else 'N/A'}",
            "last_updated": datetime.now().isoformat() + "Z",
            "note": "HODL Waves Supply - Average of all age groups"
        }
        
        return MetricDataResponse(
            metric_id=metric_id,
            metric_name=metric_def.name,
            data=data_points,
            metadata=metadata
        )
    
    # 데이터베이스 필드명 매핑
    db_field_map = {
        'mvrv_z_score': 'mvrv_z_score',
        'sopr': 'sopr',
        'nupl': 'nupl',
        'realized_price': 'realized_price',
        'hashrate': 'hashrate',
        'difficulty': 'difficulty',
        'miner_reserves': 'miner_reserves',
        'etf_btc_total': 'etf_btc_total',
        'etf_btc_flow': 'etf_btc_flow',
        'open_interest_futures': 'open_interest_futures',
        'realized_cap': 'realized_cap',
        'cdd_90dma': 'cdd_90dma',
        'true_market_mean': 'true_market_mean',
        'nrpl_btc': 'nrpl_btc',
        'thermo_cap': 'thermo_cap',
        'hodl_waves_supply': 'hodl_waves_supply'
    }
    
    db_field = db_field_map.get(metric_id)
    if not db_field:
        raise HTTPException(status_code=404, detail=f"Database field not found for metric '{metric_id}'")
    
    # 데이터베이스 쿼리
    query = db.query(CryptoMetric).filter(
        CryptoMetric.asset_id == bitcoin_asset.asset_id,
        getattr(CryptoMetric, db_field).isnot(None)
    )
    
    if start_date:
        query = query.filter(CryptoMetric.timestamp_utc >= start_date)
    if end_date:
        query = query.filter(CryptoMetric.timestamp_utc <= end_date)
    
    records = query.order_by(desc(CryptoMetric.timestamp_utc)).limit(limit).all()
    data_points = create_data_points(records, metric_def)
    
    # 메타데이터
    metadata = {
        "total_count": len(data_points),
        "date_range": f"{data_points[-1].date if data_points else 'N/A'} to {data_points[0].date if data_points else 'N/A'}",
        "last_updated": datetime.now().isoformat() + "Z"
    }
    
    return MetricDataResponse(
        metric_id=metric_id,
        metric_name=metric_def.name,
        data=data_points,
        metadata=metadata
    )

@router.get("/onchain/metrics/{metric_id}/latest", response_model=MetricDataResponse)
async def get_latest_metric_data(
    metric_id: str,
    days: int = Query(30, ge=1, le=365, description="최근 N일 데이터"),
    db: Session = Depends(get_db)
):
    """특정 메트릭의 최신 데이터를 조회합니다."""
    end_date = date.today()
    start_date = end_date - timedelta(days=days)
    
    return await get_metric_data(metric_id, start_date, end_date, 1000, "json", db)

@router.get("/onchain/metrics/{metric_id}/stats", response_model=MetricStatsResponse)
async def get_metric_stats(
    metric_id: str,
    period: str = Query("1m", regex="^(1w|1m|3m|6m|1y|all)$", description="분석 기간"),
    include: str = Query("min,max,avg,median,volatility", description="포함할 통계"),
    db: Session = Depends(get_db)
):
    """메트릭의 통계 정보를 조회합니다."""
    start_date, end_date = get_period_dates(period)
    
    # 데이터 조회
    data_response = await get_metric_data(metric_id, start_date, end_date, 10000, "json", db)
    values = [point.value for point in data_response.data if point.value is not None]
    
    if not values:
        raise HTTPException(status_code=404, detail="No data available for statistics")
    
    # 통계 계산
    stats = MetricStats(
        min_value=min(values),
        max_value=max(values),
        avg_value=sum(values) / len(values),
        median_value=statistics.median(values),
        volatility=statistics.stdev(values) if len(values) > 1 else 0,
        period=period
    )
    
    metric_def = get_metric_definition(metric_id, db)
    
    return MetricStatsResponse(
        metric_id=metric_id,
        metric_name=metric_def.name,
        stats=stats,
        period=period
    )

@router.get("/onchain/metrics/dashboard", response_model=DashboardSummary)
async def get_dashboard_summary(
    include: str = Query("latest,stats,trends", description="포함할 정보"),
    refresh: Optional[int] = Query(None, ge=1, description="자동 새로고침 간격 (초)"),
    db: Session = Depends(get_db)
):
    """대시보드 요약 정보를 조회합니다."""
    # 활성 메트릭 수
    active_metrics = sum(1 for metric in OnchainMetricsInfo.query.filter(OnchainMetricsInfo.status == 'active').all() if is_metric_enabled(metric.metric_id, db))
    
    # 최신 업데이트
    latest_updates = []
    for metric in OnchainMetricsInfo.query.filter(OnchainMetricsInfo.status == 'active').all()[:5]:  # 상위 5개만
        try:
            latest_data = await get_latest_metric_data(metric.metric_id, 1, db)
            if latest_data.data:
                latest_updates.append({
                    "metric_id": metric.metric_id,
                    "metric_name": metric.name,
                    "latest_value": latest_data.data[0].value,
                    "latest_date": latest_data.data[0].date.isoformat()
                })
        except:
            continue
    
    # 알림 (간단한 예시)
    alerts = []
    
    return DashboardSummary(
        total_metrics=len(OnchainMetricsInfo.query.all()),
        active_metrics=active_metrics,
        latest_updates=latest_updates,
        alerts=alerts
    )

# --- 메트릭 제어 API들 ---

@router.post("/onchain/metrics/{metric_id}/run", response_model=OnchainMetricRunResponse)
async def run_metric(
    metric_id: str,
    request: MetricRunRequest,
    db: Session = Depends(get_db)
):
    """특정 메트릭을 실행합니다."""
    try:
        metric_def = get_metric_definition(metric_id, db)
        
        # OnchainCollector temporarily disabled during v2 transition
        raise HTTPException(status_code=503, detail="Onchain collector is temporarily disabled during v2 transition")
        
        logger.info(f"Metric {metric_id} run completed. Added {data_points_added} data points.")
        
        return {
            "success": True,
            "message": f"Metric '{metric_def.name}' executed successfully",
            "metric_id": metric_id,
            "data_points_added": data_points_added,
            "collection_type": request.collection_type,
            "force_update": request.force_update
        }
    except HTTPException:
        # HTTPException은 그대로 재발생
        raise
    except Exception as e:
        logger.error(f"Failed to run metric {metric_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to run metric: {str(e)}")

@router.post("/onchain/metrics/run-all", response_model=OnchainMetricRunResponse)
async def run_all_metrics(
    collection_type: str = Query("recent", description="Collection type: recent or all"),
    force_update: bool = Query(False, description="Force update existing data"),
    db: Session = Depends(get_db)
):
    """모든 활성 메트릭을 실행합니다."""
    try:
        enabled_metrics = [metric for metric in OnchainMetricsInfo.query.filter(OnchainMetricsInfo.status == 'active').all() if is_metric_enabled(metric.metric_id, db)]
        
        if not enabled_metrics:
            return {
                "success": False,
                "message": "No enabled metrics to run",
                "total_metrics": 0,
                "successful_runs": 0,
                "failed_runs": 0
            }
        
        successful_runs = 0
        failed_runs = 0
        total_data_points = 0
        
        for metric in enabled_metrics:
            try:
                # 각 메트릭 실행
                result = await run_metric(
                    metric.metric_id, 
                    MetricRunRequest(
                        force_update=force_update,
                        collection_type=collection_type
                    ),
                    db
                )
                
                if result.get("success"):
                    successful_runs += 1
                    total_data_points += result.get("data_points_added", 0)
                else:
                    failed_runs += 1
                    
            except Exception as e:
                logger.error(f"Failed to run metric {metric.metric_id}: {e}")
                failed_runs += 1
        
        return {
            "success": True,
            "message": f"Executed {len(enabled_metrics)} metrics",
            "total_metrics": len(enabled_metrics),
            "successful_runs": successful_runs,
            "failed_runs": failed_runs,
            "total_data_points": total_data_points,
            "collection_type": collection_type
        }
    except Exception as e:
        logger.error(f"Failed to run all metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to run all metrics: {str(e)}")

@router.get("/onchain/metrics/{metric_id}/status", response_model=OnchainMetricStatusResponse)
async def get_metric_status(
    metric_id: str,
    db: Session = Depends(get_db)
):
    """특정 메트릭의 상태를 조회합니다."""
    try:
        metric_def = get_metric_definition(metric_id, db)
        data_range = get_metric_data_range(metric_def, db)
        is_enabled = is_metric_enabled(metric_id, db)
        
        return {
            "metric_id": metric_id,
            "metric_name": metric_def.name,
            "is_enabled": is_enabled,
            "status": "active" if is_enabled else "inactive",
            "last_update": data_range.max_date if data_range and data_range.max_date else None,
            "data_count": data_range.count if data_range else 0,
            "collect_interval": "24h" # 기본값
        }
    except Exception as e:
        logger.error(f"Failed to get metric status for {metric_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get metric status: {str(e)}")



