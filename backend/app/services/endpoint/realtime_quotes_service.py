"""
Realtime Quotes Service
실시간 가격 데이터 조회 서비스
"""
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, and_
from typing import List, Optional, Union
from datetime import datetime, timedelta
import logging

from ...models.asset import RealtimeQuote, RealtimeQuoteTimeDelay, Asset

logger = logging.getLogger(__name__)


class RealtimeQuotesService:
    """실시간 가격 데이터 조회 서비스"""
    
    @staticmethod
    async def get_latest_quotes_by_asset_id(
        db: Session, 
        asset_id: int, 
        limit: int = 100
    ) -> List[RealtimeQuote]:
        """
        Asset ID로 최신 실시간 가격 데이터 조회 (거의 라이브)
        """
        try:
            quotes = db.query(RealtimeQuote)\
                .filter(RealtimeQuote.asset_id == asset_id)\
                .order_by(desc(RealtimeQuote.timestamp_utc))\
                .limit(limit)\
                .all()
            
            return quotes
            
        except Exception as e:
            logger.error(f"Error getting latest quotes by asset_id {asset_id}: {e}")
            raise
    
    @staticmethod
    async def get_latest_quotes_by_ticker(
        db: Session, 
        ticker: str, 
        limit: int = 100
    ) -> List[RealtimeQuote]:
        """
        Ticker로 최신 실시간 가격 데이터 조회 (거의 라이브)
        """
        try:
            # 먼저 Asset을 찾아서 asset_id를 가져옴
            asset = db.query(Asset).filter(Asset.ticker == ticker.upper()).first()
            if not asset:
                logger.warning(f"Asset not found for ticker: {ticker}")
                return []
            
            return await RealtimeQuotesService.get_latest_quotes_by_asset_id(db, asset.asset_id, limit)
            
        except Exception as e:
            logger.error(f"Error getting latest quotes by ticker {ticker}: {e}")
            raise
    
    @staticmethod
    async def get_delay_quotes_by_asset_id(
        db: Session, 
        asset_id: int, 
        data_interval: str = "15m",
        limit: int = 100,
        days: int = 1
    ) -> List[RealtimeQuoteTimeDelay]:
        """
        Asset ID로 지연 가격 데이터 조회 (15분 지연)
        """
        try:
            # 최신 값 우선 반환: 타임존 불일치로 인한 누락 방지를 위해 날짜 범위 필터 제거
            # 데이터 간격은 유지하고 updated_at DESC로 정렬해 가장 최근 DB 반영 순서를 보장
            quotes = (
                db.query(RealtimeQuoteTimeDelay)
                .filter(
                    and_(
                        RealtimeQuoteTimeDelay.asset_id == asset_id,
                        RealtimeQuoteTimeDelay.data_interval == data_interval,
                    )
                )
                .order_by(desc(RealtimeQuoteTimeDelay.updated_at), desc(RealtimeQuoteTimeDelay.timestamp_utc))
                .limit(limit)
                .all()
            )

            return quotes
            
        except Exception as e:
            logger.error(f"Error getting delay quotes by asset_id {asset_id}: {e}")
            raise
    
    @staticmethod
    async def get_delay_quotes_by_ticker(
        db: Session, 
        ticker: str, 
        data_interval: str = "15m",
        limit: int = 100,
        days: int = 1
    ) -> List[RealtimeQuoteTimeDelay]:
        """
        Ticker로 지연 가격 데이터 조회 (15분 지연)
        """
        try:
            # 먼저 Asset을 찾아서 asset_id를 가져옴
            asset = db.query(Asset).filter(Asset.ticker == ticker.upper()).first()
            if not asset:
                logger.warning(f"Asset not found for ticker: {ticker}")
                return []
            
            return await RealtimeQuotesService.get_delay_quotes_by_asset_id(
                db, asset.asset_id, data_interval, limit, days
            )
            
        except Exception as e:
            logger.error(f"Error getting delay quotes by ticker {ticker}: {e}")
            raise
    
    @staticmethod
    async def get_quotes_by_time_range(
        db: Session,
        asset_identifier: Union[int, str],
        start_time: datetime,
        end_time: datetime,
        is_delay: bool = False,
        data_interval: str = "15m"
    ) -> List[Union[RealtimeQuote, RealtimeQuoteTimeDelay]]:
        """
        시간 범위로 가격 데이터 조회
        """
        try:
            # asset_identifier가 문자열이면 Asset ID로 변환
            if isinstance(asset_identifier, str):
                if asset_identifier.isdigit():
                    asset_id = int(asset_identifier)
                else:
                    asset = db.query(Asset).filter(Asset.ticker == asset_identifier.upper()).first()
                    if not asset:
                        return []
                    asset_id = asset.asset_id
            else:
                asset_id = asset_identifier
            
            if is_delay:
                quotes = db.query(RealtimeQuoteTimeDelay)\
                    .filter(
                        and_(
                            RealtimeQuoteTimeDelay.asset_id == asset_id,
                            RealtimeQuoteTimeDelay.data_interval == data_interval,
                            RealtimeQuoteTimeDelay.timestamp_utc >= start_time,
                            RealtimeQuoteTimeDelay.timestamp_utc <= end_time
                        )
                    )\
                    .order_by(RealtimeQuoteTimeDelay.timestamp_utc)\
                    .all()
            else:
                quotes = db.query(RealtimeQuote)\
                    .filter(
                        and_(
                            RealtimeQuote.asset_id == asset_id,
                            RealtimeQuote.timestamp_utc >= start_time,
                            RealtimeQuote.timestamp_utc <= end_time
                        )
                    )\
                    .order_by(RealtimeQuote.timestamp_utc)\
                    .all()
            
            return quotes
            
        except Exception as e:
            logger.error(f"Error getting quotes by time range: {e}")
            raise
    
    @staticmethod
    def format_quotes_for_chart(quotes: List[Union[RealtimeQuote, RealtimeQuoteTimeDelay]]) -> List[dict]:
        """
        차트용 데이터 포맷으로 변환
        """
        try:
            chart_data = []
            for quote in quotes:
                chart_data.append({
                    'timestamp': quote.timestamp_utc.isoformat(),
                    'price': float(quote.price),
                    'volume': float(quote.volume) if quote.volume else None,
                    'change_amount': float(quote.change_amount) if quote.change_amount else None,
                    'change_percent': float(quote.change_percent) if quote.change_percent else None,
                    'data_source': quote.data_source
                })
            
            return chart_data
            
        except Exception as e:
            logger.error(f"Error formatting quotes for chart: {e}")
            raise
