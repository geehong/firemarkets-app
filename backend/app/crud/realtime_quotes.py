"""
RealtimeQuote 이중 쓰기 CRUD 함수
MySQL과 PostgreSQL에 동시에 데이터를 저장하는 함수들
"""

from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import func
from ..models.asset import RealtimeQuote
from ..schemas.realtime_quotes import RealtimeQuoteCreate, RealtimeQuoteUpdate
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

def create_realtime_quote_dual(
    mysql_db: Session, 
    postgres_db: Session, 
    quote_data: RealtimeQuoteCreate
) -> RealtimeQuote:
    """RealtimeQuote 데이터를 MySQL과 PostgreSQL에 동시 저장"""
    
    try:
        # 1. MySQL에 저장 (기존 로직)
        mysql_quote = RealtimeQuote(**quote_data.dict())
        mysql_db.add(mysql_quote)
        mysql_db.commit()
        mysql_db.refresh(mysql_quote)
        logger.info(f"RealtimeQuote saved to MySQL: asset_id={quote_data.asset_id}, price={quote_data.price}")
        
        # 2. PostgreSQL에 저장 (UPSERT)
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
        
        return mysql_quote
        
    except Exception as e:
        logger.error(f"Failed to save RealtimeQuote: {e}")
        mysql_db.rollback()
        postgres_db.rollback()
        raise

def update_realtime_quote_dual(
    mysql_db: Session,
    postgres_db: Session,
    asset_id: int,
    quote_data: RealtimeQuoteUpdate
) -> Optional[RealtimeQuote]:
    """RealtimeQuote 데이터를 MySQL과 PostgreSQL에서 동시 업데이트"""
    
    try:
        # 1. MySQL에서 업데이트
        mysql_quote = mysql_db.query(RealtimeQuote).filter(
            RealtimeQuote.asset_id == asset_id
        ).first()
        
        if not mysql_quote:
            logger.warning(f"RealtimeQuote not found in MySQL: asset_id={asset_id}")
            return None
        
        # 업데이트할 필드만 적용
        update_data = quote_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(mysql_quote, field, value)
        
        mysql_db.commit()
        mysql_db.refresh(mysql_quote)
        logger.info(f"RealtimeQuote updated in MySQL: asset_id={asset_id}")
        
        # 2. PostgreSQL에서 업데이트
        pg_update_data = quote_data.dict(exclude_unset=True)
        pg_update_data['updated_at'] = func.now()
        
        postgres_db.query(RealtimeQuote).filter(
            RealtimeQuote.asset_id == asset_id
        ).update(pg_update_data)
        postgres_db.commit()
        logger.info(f"RealtimeQuote updated in PostgreSQL: asset_id={asset_id}")
        
        return mysql_quote
        
    except Exception as e:
        logger.error(f"Failed to update RealtimeQuote: {e}")
        mysql_db.rollback()
        postgres_db.rollback()
        raise

def bulk_upsert_realtime_quotes_dual(
    mysql_db: Session,
    postgres_db: Session,
    quotes_list: List[Dict[str, Any]]
) -> int:
    """RealtimeQuote 데이터를 MySQL과 PostgreSQL에 일괄 저장"""
    
    if not quotes_list:
        return 0
    
    try:
        # 1. MySQL에 일괄 저장
        mysql_objects = []
        for quote_data in quotes_list:
            # 기존 레코드 확인
            existing_quote = mysql_db.query(RealtimeQuote).filter(
                RealtimeQuote.asset_id == quote_data['asset_id']
            ).first()
            
            if existing_quote:
                # 기존 레코드 업데이트
                for field, value in quote_data.items():
                    if field != 'id':  # ID는 업데이트하지 않음
                        setattr(existing_quote, field, value)
            else:
                # 새 레코드 생성
                mysql_objects.append(RealtimeQuote(**quote_data))
        
        if mysql_objects:
            mysql_db.add_all(mysql_objects)
        mysql_db.commit()
        
        # 2. PostgreSQL에 일괄 저장 (UPSERT)
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
        
        logger.info(f"Bulk RealtimeQuote data saved: {len(quotes_list)} records to both databases")
        return len(quotes_list)
        
    except Exception as e:
        logger.error(f"Failed to bulk save RealtimeQuote data: {e}")
        mysql_db.rollback()
        postgres_db.rollback()
        raise

def get_realtime_quote_mysql(mysql_db: Session, asset_id: int) -> Optional[RealtimeQuote]:
    """MySQL에서 RealtimeQuote 조회"""
    return mysql_db.query(RealtimeQuote).filter(
        RealtimeQuote.asset_id == asset_id
    ).first()

def get_realtime_quote_postgres(postgres_db: Session, asset_id: int) -> Optional[RealtimeQuote]:
    """PostgreSQL에서 RealtimeQuote 조회"""
    return postgres_db.query(RealtimeQuote).filter(
        RealtimeQuote.asset_id == asset_id
    ).first()

def get_realtime_quotes_postgres(
    postgres_db: Session, 
    asset_ids: List[int] = None,
    limit: int = 100
) -> List[RealtimeQuote]:
    """PostgreSQL에서 RealtimeQuote 목록 조회"""
    query = postgres_db.query(RealtimeQuote)
    
    if asset_ids:
        query = query.filter(RealtimeQuote.asset_id.in_(asset_ids))
    
    return query.order_by(RealtimeQuote.updated_at.desc()).limit(limit).all()

def delete_realtime_quote_dual(
    mysql_db: Session,
    postgres_db: Session,
    asset_id: int
) -> bool:
    """RealtimeQuote 데이터를 MySQL과 PostgreSQL에서 동시 삭제"""
    
    try:
        # 1. MySQL에서 삭제
        mysql_quote = mysql_db.query(RealtimeQuote).filter(
            RealtimeQuote.asset_id == asset_id
        ).first()
        
        if mysql_quote:
            mysql_db.delete(mysql_quote)
            mysql_db.commit()
            logger.info(f"RealtimeQuote deleted from MySQL: asset_id={asset_id}")
        
        # 2. PostgreSQL에서 삭제
        deleted_count = postgres_db.query(RealtimeQuote).filter(
            RealtimeQuote.asset_id == asset_id
        ).delete()
        postgres_db.commit()
        
        if deleted_count > 0:
            logger.info(f"RealtimeQuote deleted from PostgreSQL: asset_id={asset_id}")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to delete RealtimeQuote: {e}")
        mysql_db.rollback()
        postgres_db.rollback()
        raise
