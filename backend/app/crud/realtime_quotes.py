"""
RealtimeQuote PostgreSQL CRUD 함수
PostgreSQL에 데이터를 저장하는 함수들
"""

from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import func
from ..models.asset import RealtimeQuote
from ..schemas.realtime_quotes import RealtimeQuoteCreate, RealtimeQuoteUpdate
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

def create_realtime_quote(
    postgres_db: Session, 
    quote_data: RealtimeQuoteCreate
) -> RealtimeQuote:
    """RealtimeQuote 데이터를 PostgreSQL에 저장"""
    
    try:
        # PostgreSQL에 저장 (UPSERT)
        pg_data = quote_data.dict()
        stmt = insert(RealtimeQuote).values(**pg_data)
        stmt = stmt.on_conflict_do_update(
            index_elements=['asset_id'],  # asset_id로 유니크 제약
            set_={
                'timestamp_utc': stmt.excluded.timestamp_utc,
                'price': stmt.excluded.price,
                'volume': stmt.excluded.volume,
                'change_amount': stmt.excluded.change_amount,
                'change_percent': stmt.excluded.change_percent,
                'data_source': stmt.excluded.data_source,
                'updated_at': func.now()
            }
        )
        postgres_db.execute(stmt)
        postgres_db.commit()
        logger.info(f"RealtimeQuote saved to PostgreSQL: asset_id={quote_data.asset_id}, price={quote_data.price}")
        
        # 저장된 데이터 조회하여 반환
        saved_quote = postgres_db.query(RealtimeQuote).filter(
            RealtimeQuote.asset_id == quote_data.asset_id
        ).first()
        
        return saved_quote
        
    except Exception as e:
        logger.error(f"Failed to save RealtimeQuote: {e}")
        postgres_db.rollback()
        raise

def update_realtime_quote(
    postgres_db: Session,
    asset_id: int,
    quote_data: RealtimeQuoteUpdate
) -> Optional[RealtimeQuote]:
    """RealtimeQuote 데이터를 PostgreSQL에서 업데이트"""
    
    try:
        # PostgreSQL에서 업데이트
        pg_update_data = quote_data.dict(exclude_unset=True)
        pg_update_data['updated_at'] = func.now()
        
        updated_count = postgres_db.query(RealtimeQuote).filter(
            RealtimeQuote.asset_id == asset_id
        ).update(pg_update_data)
        
        if updated_count == 0:
            logger.warning(f"RealtimeQuote not found in PostgreSQL: asset_id={asset_id}")
            return None
        
        postgres_db.commit()
        logger.info(f"RealtimeQuote updated in PostgreSQL: asset_id={asset_id}")
        
        # 업데이트된 데이터 조회하여 반환
        updated_quote = postgres_db.query(RealtimeQuote).filter(
            RealtimeQuote.asset_id == asset_id
        ).first()
        
        return updated_quote
        
    except Exception as e:
        logger.error(f"Failed to update RealtimeQuote: {e}")
        postgres_db.rollback()
        raise

def bulk_upsert_realtime_quotes(
    postgres_db: Session,
    quotes_list: List[Dict[str, Any]]
) -> int:
    """RealtimeQuote 데이터를 PostgreSQL에 일괄 저장"""
    
    if not quotes_list:
        return 0
    
    try:
        # PostgreSQL에 일괄 저장 (UPSERT)
        stmt = insert(RealtimeQuote).values(quotes_list)
        stmt = stmt.on_conflict_do_update(
            index_elements=['asset_id'],
            set_={
                'timestamp_utc': stmt.excluded.timestamp_utc,
                'price': stmt.excluded.price,
                'volume': stmt.excluded.volume,
                'change_amount': stmt.excluded.change_amount,
                'change_percent': stmt.excluded.change_percent,
                'data_source': stmt.excluded.data_source,
                'updated_at': func.now()
            }
        )
        postgres_db.execute(stmt)
        postgres_db.commit()
        
        logger.info(f"Bulk RealtimeQuote data saved: {len(quotes_list)} records to PostgreSQL")
        return len(quotes_list)
        
    except Exception as e:
        logger.error(f"Failed to bulk save RealtimeQuote data: {e}")
        postgres_db.rollback()
        raise

def get_realtime_quote(postgres_db: Session, asset_id: int) -> Optional[RealtimeQuote]:
    """PostgreSQL에서 RealtimeQuote 조회"""
    return postgres_db.query(RealtimeQuote).filter(
        RealtimeQuote.asset_id == asset_id
    ).first()

def get_realtime_quotes(
    postgres_db: Session, 
    asset_ids: List[int] = None,
    limit: int = 100
) -> List[RealtimeQuote]:
    """PostgreSQL에서 RealtimeQuote 목록 조회"""
    query = postgres_db.query(RealtimeQuote)
    
    if asset_ids:
        query = query.filter(RealtimeQuote.asset_id.in_(asset_ids))
    
    return query.order_by(RealtimeQuote.updated_at.desc()).limit(limit).all()

def delete_realtime_quote(
    postgres_db: Session,
    asset_id: int
) -> bool:
    """RealtimeQuote 데이터를 PostgreSQL에서 삭제"""
    
    try:
        # PostgreSQL에서 삭제
        deleted_count = postgres_db.query(RealtimeQuote).filter(
            RealtimeQuote.asset_id == asset_id
        ).delete()
        postgres_db.commit()
        
        if deleted_count > 0:
            logger.info(f"RealtimeQuote deleted from PostgreSQL: asset_id={asset_id}")
            return True
        else:
            logger.warning(f"RealtimeQuote not found in PostgreSQL: asset_id={asset_id}")
            return False
        
    except Exception as e:
        logger.error(f"Failed to delete RealtimeQuote: {e}")
        postgres_db.rollback()
        raise
