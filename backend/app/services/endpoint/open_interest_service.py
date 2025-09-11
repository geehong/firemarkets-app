import json
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
import statistics

from ...models import CryptoMetric, Asset
from ...schemas.open_interest import OpenInterestDataPoint, ExchangeData

logger = logging.getLogger(__name__)

class OpenInterestService:
    """Open Interest 데이터 처리 서비스"""
    
    @staticmethod
    def parse_open_interest_json(json_data: str) -> Optional[Dict]:
        """Open Interest JSON 데이터를 파싱합니다."""
        try:
            if isinstance(json_data, str):
                data = json.loads(json_data)
            else:
                data = json_data
                
            return {
                'total': data.get('total', 0),
                'exchanges': data.get('exchanges', {}),
                'timestamp': data.get('timestamp'),
                'unix_ts': data.get('unix_ts')
            }
        except Exception as e:
            logger.error(f"Failed to parse Open Interest JSON: {e}")
            return None

    @staticmethod
    def calculate_leverage_ratio(open_interest: float, market_cap: float) -> float:
        """레버리지 비율을 계산합니다."""
        if market_cap <= 0:
            return 0
        return (open_interest / market_cap) * 100  # 백분율로 반환

    @staticmethod
    def calculate_market_concentration(exchanges: Dict[str, float]) -> float:
        """시장 집중도를 계산합니다 (Herfindahl-Hirschman Index)."""
        total = sum(exchanges.values())
        if total == 0:
            return 0
        
        concentration = sum((value / total) ** 2 for value in exchanges.values())
        return concentration

    @staticmethod
    def calculate_volatility(values: List[float]) -> float:
        """변동성을 계산합니다."""
        if len(values) < 2:
            return 0
        return statistics.stdev(values)

    @staticmethod
    def get_bitcoin_asset(db: Session) -> Optional[Asset]:
        """비트코인 자산을 조회합니다."""
        # BTC 또는 BTCUSDT 중 하나를 찾음
        bitcoin_asset = db.query(Asset).filter(
            Asset.ticker.in_(['BTC', 'BTCUSDT']),
            Asset.is_active == True
        ).first()
        return bitcoin_asset

    @staticmethod
    def fetch_open_interest_data(
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 1000
    ) -> List[OpenInterestDataPoint]:
        """Open Interest 데이터를 조회하고 처리합니다."""
        bitcoin_asset = OpenInterestService.get_bitcoin_asset(db)
        if not bitcoin_asset:
            logger.error("Bitcoin asset not found")
            return []

        # 쿼리 구성
        query = db.query(CryptoMetric).filter(
            CryptoMetric.asset_id == bitcoin_asset.asset_id,
            CryptoMetric.open_interest_futures.isnot(None)
        )

        if start_date:
            query = query.filter(CryptoMetric.timestamp_utc >= start_date)
        if end_date:
            query = query.filter(CryptoMetric.timestamp_utc <= end_date)

        records = query.order_by(desc(CryptoMetric.timestamp_utc)).limit(limit).all()
        
        data_points = []
        for i, record in enumerate(records):
            try:
                # JSON 파싱
                parsed_data = OpenInterestService.parse_open_interest_json(record.open_interest_futures)
                if not parsed_data:
                    continue

                total = parsed_data['total']
                exchanges = parsed_data['exchanges']

                # 시장 집중도 계산
                market_concentration = OpenInterestService.calculate_market_concentration(exchanges)

                # 24시간 변화량 계산
                change_24h = None
                change_percent_24h = None
                if i < len(records) - 1:
                    prev_record = records[i + 1]
                    prev_parsed = OpenInterestService.parse_open_interest_json(prev_record.open_interest_futures)
                    if prev_parsed:
                        prev_total = prev_parsed['total']
                        change_24h = total - prev_total
                        change_percent_24h = (change_24h / prev_total) * 100 if prev_total > 0 else None

                # 변동성 계산 (최근 7일 데이터 사용)
                volatility_24h = None
                if i < len(records) - 7:
                    recent_totals = []
                    for j in range(i, min(i + 7, len(records))):
                        recent_record = records[j]
                        recent_parsed = OpenInterestService.parse_open_interest_json(recent_record.open_interest_futures)
                        if recent_parsed:
                            recent_totals.append(recent_parsed['total'])
                    if len(recent_totals) > 1:
                        volatility_24h = OpenInterestService.calculate_volatility(recent_totals)

                data_point = OpenInterestDataPoint(
                    timestamp=record.timestamp_utc,
                    total=total,
                    exchanges=exchanges,
                    leverage_ratio=None,  # 시가총액 데이터가 필요
                    market_concentration=market_concentration,
                    volatility_24h=volatility_24h,
                    change_24h=change_24h,
                    change_percent_24h=change_percent_24h
                )
                data_points.append(data_point)

            except Exception as e:
                logger.error(f"Error processing record {i}: {e}")
                continue

        return data_points

    @staticmethod
    def calculate_exchange_analysis(data_points: List[OpenInterestDataPoint]) -> List[ExchangeData]:
        """거래소별 분석을 계산합니다."""
        if not data_points:
            return []

        # 모든 거래소 수집
        all_exchanges = set()
        for point in data_points:
            all_exchanges.update(point.exchanges.keys())

        exchange_analysis = []
        for exchange in all_exchanges:
            # 해당 거래소의 최신 데이터
            latest_value = 0
            latest_percentage = 0
            change_24h = None
            change_percent_24h = None

            if data_points:
                latest_point = data_points[0]
                latest_value = latest_point.exchanges.get(exchange, 0)
                latest_percentage = (latest_value / latest_point.total) * 100 if latest_point.total > 0 else 0

                # 24시간 변화량 계산
                if len(data_points) > 1:
                    prev_point = data_points[1]
                    prev_value = prev_point.exchanges.get(exchange, 0)
                    change_24h = latest_value - prev_value
                    change_percent_24h = (change_24h / prev_value) * 100 if prev_value > 0 else None

            exchange_data = ExchangeData(
                exchange=exchange,
                value=latest_value,
                percentage=latest_percentage,
                change_24h=change_24h,
                change_percent_24h=change_percent_24h
            )
            exchange_analysis.append(exchange_data)

        return sorted(exchange_analysis, key=lambda x: x.value, reverse=True)

    @staticmethod
    def calculate_summary_stats(data_points: List[OpenInterestDataPoint]) -> Dict[str, Any]:
        """요약 통계를 계산합니다."""
        if not data_points:
            return {}

        totals = [point.total for point in data_points if point.total > 0]
        if not totals:
            return {}

        return {
            'current_total': totals[0] if totals else 0,
            'average_total': sum(totals) / len(totals),
            'max_total': max(totals),
            'min_total': min(totals),
            'volatility': OpenInterestService.calculate_volatility(totals),
            'total_records': len(data_points),
            'date_range': {
                'start': data_points[-1].timestamp.isoformat() if data_points else None,
                'end': data_points[0].timestamp.isoformat() if data_points else None
            }
        }












