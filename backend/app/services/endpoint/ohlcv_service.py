"""
OHLCV Service
OHLCV 데이터 조회 서비스
"""
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, func
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
from collections import defaultdict

from ...models.asset import OHLCVData, OHLCVIntradayData, Asset

logger = logging.getLogger(__name__)


class OHLCVService:
    """OHLCV 데이터 조회 서비스"""
    
    @staticmethod
    async def get_ohlcv_data(
        db: Session,
        asset_id: int,
        data_interval: str = "4h",
        include_ohlcv: bool = True,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        OHLCV 데이터 조회
        data_interval에 따라 적절한 테이블을 조회합니다:
        - 1d: ohlcv_day_data 테이블
        - 1h, 4h 등: ohlcv_intraday_data 테이블
        """
        try:
            # data_interval에 따라 적절한 모델 선택
            if data_interval == "1d":
                # 일봉 데이터는 ohlcv_day_data 테이블에서 조회
                ohlcv_records = db.query(OHLCVData)\
                    .filter(
                        and_(
                            OHLCVData.asset_id == asset_id,
                            OHLCVData.data_interval == data_interval
                        )
                    )\
                    .order_by(desc(OHLCVData.timestamp_utc))\
                    .limit(limit)\
                    .all()
            else:
                # 인트라데이 데이터 (1h, 4h 등)는 ohlcv_intraday_data 테이블에서 조회
                ohlcv_records = db.query(OHLCVIntradayData)\
                    .filter(
                        and_(
                            OHLCVIntradayData.asset_id == asset_id,
                            OHLCVIntradayData.data_interval == data_interval
                        )
                    )\
                    .order_by(desc(OHLCVIntradayData.timestamp_utc))\
                    .limit(limit)\
                    .all()
            
            if not ohlcv_records:
                logger.warning(f"No OHLCV data found for asset_id {asset_id} with interval {data_interval}")
                return []
            
            # 데이터 포맷팅
            formatted_data = []
            for record in ohlcv_records:
                # data_source 필드가 있는지 확인 (OHLCVData에는 있지만 OHLCVIntradayData에는 없음)
                data_source = getattr(record, 'data_source', None)
                
                if include_ohlcv:
                    formatted_data.append({
                        'timestamp': record.timestamp_utc.isoformat(),
                        'open': float(record.open_price),
                        'high': float(record.high_price),
                        'low': float(record.low_price),
                        'close': float(record.close_price),
                        'volume': float(record.volume) if record.volume else None,
                        'data_interval': record.data_interval,
                        'data_source': data_source
                    })
                else:
                    # close price만 반환
                    formatted_data.append({
                        'timestamp': record.timestamp_utc.isoformat(),
                        'close': float(record.close_price),
                        'data_interval': record.data_interval,
                        'data_source': data_source
                    })
            
            return formatted_data
            
        except Exception as e:
            logger.error(f"Error getting OHLCV data for asset_id {asset_id}: {e}")
            raise
    
    @staticmethod
    def _aggregate_ohlcv_data(
        records: List[Any],
        target_interval_minutes: int,
        include_ohlcv: bool = True
    ) -> List[Dict[str, Any]]:
        """
        더 작은 간격의 OHLCV 데이터를 집계하여 큰 간격의 데이터 생성
        예: 1m 데이터를 15m로 집계, 5m 데이터를 30m로 집계
        
        Args:
            records: OHLCV 레코드 리스트 (시간순 정렬 필요)
            target_interval_minutes: 목표 간격 (분 단위, 예: 15, 30)
            include_ohlcv: OHLCV 전체 데이터 반환 여부
        
        Returns:
            집계된 OHLCV 데이터 리스트
        """
        if not records:
            return []
        
        # 시간순으로 정렬 (오래된 것부터)
        sorted_records = sorted(records, key=lambda x: x.timestamp_utc)
        
        # 시간 기반으로 그룹화
        buckets = defaultdict(list)
        
        for record in sorted_records:
            timestamp = record.timestamp_utc
            if isinstance(timestamp, str):
                timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            
            # 버킷 키 계산: target_interval_minutes의 배수로 정렬된 시간
            # 예: 15m 간격이면 0, 15, 30, 45분으로 정렬
            minutes = timestamp.minute
            aligned_minutes = (minutes // target_interval_minutes) * target_interval_minutes
            
            # 버킷 키: 년-월-일-시-정렬된분
            bucket_key = timestamp.replace(minute=aligned_minutes, second=0, microsecond=0)
            buckets[bucket_key].append(record)
        
        # 각 버킷 집계
        aggregated = []
        for bucket_time in sorted(buckets.keys()):
            bucket = buckets[bucket_time]
            agg_record = OHLCVService._aggregate_bucket(
                bucket, target_interval_minutes, include_ohlcv
            )
            if agg_record:
                aggregated.append(agg_record)
        
        # 최신 데이터가 먼저 오도록 역순 정렬
        return list(reversed(aggregated))
    
    @staticmethod
    def _aggregate_bucket(
        bucket: List[Any],
        target_interval: int,
        include_ohlcv: bool = True
    ) -> Optional[Dict[str, Any]]:
        """
        단일 버킷의 OHLCV 데이터 집계
        """
        if not bucket:
            return None
        
        # 시간순 정렬
        sorted_bucket = sorted(bucket, key=lambda x: x.timestamp_utc)
        
        first = sorted_bucket[0]
        last = sorted_bucket[-1]
        
        # OHLCV 집계
        opens = [float(r.open_price) for r in sorted_bucket if r.open_price is not None]
        highs = [float(r.high_price) for r in sorted_bucket if r.high_price is not None]
        lows = [float(r.low_price) for r in sorted_bucket if r.low_price is not None]
        closes = [float(r.close_price) for r in sorted_bucket if r.close_price is not None]
        volumes = [float(r.volume) for r in sorted_bucket if r.volume is not None]
        
        if not opens or not closes:
            return None
        
        data_source = getattr(first, 'data_source', None)
        
        if include_ohlcv:
            return {
                'timestamp': last.timestamp_utc.isoformat(),
                'open': opens[0] if opens else None,
                'high': max(highs) if highs else None,
                'low': min(lows) if lows else None,
                'close': closes[-1] if closes else None,
                'volume': sum(volumes) if volumes else None,
                'data_interval': f"{target_interval}m",
                'data_source': data_source
            }
        else:
            return {
                'timestamp': last.timestamp_utc.isoformat(),
                'close': closes[-1] if closes else None,
                'data_interval': f"{target_interval}m",
                'data_source': data_source
            }
    
    @staticmethod
    async def get_ohlcv_data_with_fallback(
        db: Session,
        asset_id: int,
        data_interval: str = "4h",
        include_ohlcv: bool = True,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        OHLCV 데이터 조회 (폴백 지원)
        요청된 간격의 데이터가 없으면 더 작은 간격의 데이터를 집계하여 반환
        - 15m: 1m 또는 5m 데이터 집계
        - 30m: 1m 또는 5m 데이터 집계
        """
        try:
            # 먼저 요청된 간격의 데이터 조회
            ohlcv_data = await OHLCVService.get_ohlcv_data(
                db, asset_id, data_interval, include_ohlcv, limit
            )
            
            if ohlcv_data:
                return ohlcv_data
            
            # 데이터가 없고 집계 가능한 간격인 경우 폴백 시도
            interval_fallbacks = {
                "15m": [
                    ("5m", 3),  # 5m 데이터 3개로 15m 생성
                    ("1m", 15),  # 1m 데이터 15개로 15m 생성
                ],
                "30m": [
                    ("5m", 6),  # 5m 데이터 6개로 30m 생성
                    ("1m", 30),  # 1m 데이터 30개로 30m 생성
                ]
            }
            
            if data_interval not in interval_fallbacks:
                return []
            
            # 폴백 간격 시도
            for fallback_interval, multiplier in interval_fallbacks[data_interval]:
                logger.info(f"Trying to aggregate {fallback_interval} data for {data_interval} (multiplier: {multiplier})")
                
                # 폴백 간격의 데이터 조회 (더 많은 데이터 필요)
                fallback_limit = limit * multiplier + multiplier  # 여유분 포함
                fallback_data = await OHLCVService.get_ohlcv_data(
                    db, asset_id, fallback_interval, include_ohlcv, fallback_limit
                )
                
                if fallback_data:
                    # 데이터를 레코드 형식으로 변환 (집계 함수 사용)
                    from ...models.asset import OHLCVIntradayData
                    
                    # 문자열 timestamp를 datetime으로 변환
                    records = []
                    for item in fallback_data:
                        # 역순으로 정렬된 데이터를 시간순으로 변환
                        timestamp_str = item['timestamp']
                        if isinstance(timestamp_str, str):
                            timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                        else:
                            timestamp = timestamp_str
                        
                        # 임시 객체 생성
                        class TempRecord:
                            def __init__(self, data, ts):
                                self.timestamp_utc = ts
                                self.open_price = data.get('open')
                                self.high_price = data.get('high')
                                self.low_price = data.get('low')
                                self.close_price = data.get('close')
                                self.volume = data.get('volume')
                                self.data_source = data.get('data_source')
                        
                        records.append(TempRecord(item, timestamp))
                    
                    # 집계 수행
                    target_minutes = int(data_interval.replace('m', ''))
                    aggregated = OHLCVService._aggregate_ohlcv_data(
                        records, target_minutes, include_ohlcv
                    )
                    
                    if aggregated:
                        # limit 적용
                        aggregated = aggregated[:limit]
                        logger.info(f"Successfully aggregated {len(aggregated)} {data_interval} records from {fallback_interval} data")
                        return aggregated
            
            return []
            
        except Exception as e:
            logger.error(f"Error getting OHLCV data with fallback for asset_id {asset_id}: {e}")
            raise
    
    @staticmethod
    async def get_ohlcv_by_ticker(
        db: Session,
        ticker: str,
        data_interval: str = "4h",
        include_ohlcv: bool = True,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Ticker로 OHLCV 데이터 조회
        """
        try:
            # Asset 조회
            asset = db.query(Asset).filter(Asset.ticker == ticker.upper()).first()
            if not asset:
                logger.warning(f"Asset not found for ticker: {ticker}")
                return []
            
            return await OHLCVService.get_ohlcv_data(
                db, asset.asset_id, data_interval, include_ohlcv, limit
            )
            
        except Exception as e:
            logger.error(f"Error getting OHLCV data for ticker {ticker}: {e}")
            raise
    
    @staticmethod
    async def get_ohlcv_by_time_range(
        db: Session,
        asset_id: int,
        start_time: datetime,
        end_time: datetime,
        data_interval: str = "4h",
        include_ohlcv: bool = True
    ) -> List[Dict[str, Any]]:
        """
        시간 범위로 OHLCV 데이터 조회
        """
        try:
            ohlcv_records = db.query(OHLCVData)\
                .filter(
                    and_(
                        OHLCVData.asset_id == asset_id,
                        OHLCVData.data_interval == data_interval,
                        OHLCVData.timestamp_utc >= start_time,
                        OHLCVData.timestamp_utc <= end_time
                    )
                )\
                .order_by(OHLCVData.timestamp_utc)\
                .all()
            
            if not ohlcv_records:
                return []
            
            # 데이터 포맷팅
            formatted_data = []
            for record in ohlcv_records:
                if include_ohlcv:
                    formatted_data.append({
                        'timestamp': record.timestamp_utc.isoformat(),
                        'open': float(record.open_price),
                        'high': float(record.high_price),
                        'low': float(record.low_price),
                        'close': float(record.close_price),
                        'volume': float(record.volume) if record.volume else None,
                        'data_interval': record.data_interval,
                        'data_source': record.data_source
                    })
                else:
                    formatted_data.append({
                        'timestamp': record.timestamp_utc.isoformat(),
                        'close': float(record.close_price),
                        'data_interval': record.data_interval,
                        'data_source': record.data_source
                    })
            
            return formatted_data
            
        except Exception as e:
            logger.error(f"Error getting OHLCV data by time range: {e}")
            raise
    
    @staticmethod
    def format_ohlcv_for_highcharts(
        ohlcv_data: List[Dict[str, Any]], 
        include_ohlcv: bool = True
    ) -> List[List[Any]]:
        """
        HighCharts용 OHLCV 데이터 포맷으로 변환
        """
        try:
            chart_data = []
            for record in ohlcv_data:
                timestamp = int(datetime.fromisoformat(record['timestamp'].replace('Z', '+00:00')).timestamp() * 1000)
                
                if include_ohlcv:
                    # OHLCV 데이터: [timestamp, open, high, low, close, volume]
                    chart_data.append([
                        timestamp,
                        record['open'],
                        record['high'],
                        record['low'],
                        record['close'],
                        record.get('volume', 0)
                    ])
                else:
                    # Close price만: [timestamp, close]
                    chart_data.append([timestamp, record['close']])
            
            return chart_data
            
        except Exception as e:
            logger.error(f"Error formatting OHLCV for HighCharts: {e}")
            raise
