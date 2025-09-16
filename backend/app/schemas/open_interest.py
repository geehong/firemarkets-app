from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from datetime import datetime, date

class ExchangeData(BaseModel):
    """거래소별 데이터 모델"""
    exchange: str
    value: float
    percentage: float
    change_24h: Optional[float] = None
    change_percent_24h: Optional[float] = None

class OpenInterestDataPoint(BaseModel):
    """Open Interest 데이터 포인트 모델"""
    timestamp: datetime
    total: float
    exchanges: Dict[str, float]
    leverage_ratio: Optional[float] = None
    market_concentration: float
    volatility_24h: Optional[float] = None
    change_24h: Optional[float] = None
    change_percent_24h: Optional[float] = None

class OpenInterestAnalysisResponse(BaseModel):
    """Open Interest 분석 응답 모델"""
    data: List[OpenInterestDataPoint]
    summary: Dict[str, Any]
    metadata: Dict[str, Any]

class ExchangeAnalysisResponse(BaseModel):
    """거래소별 분석 응답 모델"""
    exchanges: List[ExchangeData]
    market_share_trend: List[Dict[str, Any]]
    concentration_index: float
    total_exchanges: int
    metadata: Dict[str, Any]

class LeverageAnalysisResponse(BaseModel):
    """레버리지 분석 응답 모델"""
    leverage_data: List[Dict[str, Any]]
    risk_level: str
    average_leverage: float
    max_leverage: float
    min_leverage: float
    metadata: Dict[str, Any]

class OpenInterestStatsResponse(BaseModel):
    """Open Interest 통계 응답 모델"""
    total_stats: Dict[str, Any]
    exchange_stats: Dict[str, Dict[str, Any]]
    period_stats: Dict[str, Dict[str, Any]]
    metadata: Dict[str, Any]
