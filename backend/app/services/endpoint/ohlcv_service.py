"""
OHLCV Service
OHLCV 데이터 조회 서비스
"""
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging

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
