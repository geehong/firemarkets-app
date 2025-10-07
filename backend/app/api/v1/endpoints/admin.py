"""
Admin endpoints for database optimization
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging

from ....core.database import get_postgres_db
from ....core.database_optimization import optimize_database

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/optimize-database")
def run_database_optimization(db: Session = Depends(get_postgres_db)):
    """데이터베이스 최적화 실행 (관리자 전용)"""
    try:
        logger.info("Database optimization requested by admin")
        optimize_database(db)
        return {"message": "Database optimization completed successfully"}
    except Exception as e:
        logger.error(f"Database optimization failed: {e}")
        raise HTTPException(status_code=500, detail=f"Database optimization failed: {str(e)}")

@router.get("/database-stats")
def get_database_stats(db: Session = Depends(get_postgres_db)):
    """데이터베이스 통계 조회 (관리자 전용)"""
    try:
        from sqlalchemy import text
        
        # 테이블 크기 및 행 수 조회
        result = db.execute(text("""
            SELECT 
                table_name,
                ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb,
                table_rows
            FROM information_schema.tables
            WHERE table_schema = 'firemarkets'
            ORDER BY (data_length + index_length) DESC
        """))
        
        tables = [dict(row) for row in result]
        
        # 인덱스 정보 조회
        result = db.execute(text("""
            SELECT 
                table_name,
                index_name,
                cardinality
            FROM information_schema.statistics
            WHERE table_schema = 'firemarkets'
            ORDER BY table_name, index_name
        """))
        
        indexes = [dict(row) for row in result]
        
        return {
            "tables": tables,
            "indexes": indexes
        }
    except Exception as e:
        logger.error(f"Failed to get database stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get database stats: {str(e)}") 