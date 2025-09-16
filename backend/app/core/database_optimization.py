"""
Database optimization utilities
"""
import logging
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class DatabaseOptimizer:
    """데이터베이스 최적화 클래스"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_indexes(self):
        """필요한 인덱스 생성"""
        try:
            # asset_types 테이블 인덱스
            self.db.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_asset_types_name 
                ON asset_types(type_name)
            """))
            
            # assets 테이블 인덱스
            self.db.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_assets_type_ticker 
                ON assets(asset_type_id, ticker)
            """))
            
            # OHLCV 데이터 인덱스
            self.db.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_ohlcv_asset_date 
                ON ohlcv_data(asset_id, timestamp_utc)
            """))
            
            self.db.commit()
            logger.info("Database indexes created successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to create indexes: {e}")
            self.db.rollback()
            return False
    
    def create_views(self):
        """최적화된 뷰 생성"""
        try:
            # 자산 타입별 통계 뷰
            self.db.execute(text("""
                CREATE OR REPLACE VIEW asset_type_stats AS
                SELECT 
                    at.asset_type_id,
                    at.type_name,
                    at.description,
                    COUNT(a.asset_id) as total_assets,
                    COUNT(CASE WHEN a.is_active = true THEN 1 END) as active_assets,
                    COUNT(CASE WHEN o.asset_id IS NOT NULL THEN 1 END) as assets_with_data
                FROM asset_types at
                LEFT JOIN assets a ON at.asset_type_id = a.asset_type_id
                LEFT JOIN (
                    SELECT DISTINCT asset_id
                    FROM ohlcv_day_data 
                    WHERE timestamp_utc > DATE_SUB(NOW(), INTERVAL 30 DAY)
                ) o ON a.asset_id = o.asset_id
                GROUP BY at.asset_type_id, at.type_name, at.description
            """))
            
            # 활성 자산 뷰
            self.db.execute(text("""
                CREATE OR REPLACE VIEW active_assets AS
                SELECT 
                    a.asset_id,
                    a.ticker,
                    a.name,
                    a.asset_type_id,
                    at.type_name,
                    a.exchange,
                    a.currency,
                    a.is_active,
                    a.description,
                    a.data_source,
                    a.created_at,
                    a.updated_at
                FROM assets a
                JOIN asset_types at ON a.asset_type_id = at.asset_type_id
                WHERE a.is_active = true
            """))
            
            self.db.commit()
            logger.info("Database views created successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to create views: {e}")
            self.db.rollback()
            return False
    
    def analyze_tables(self):
        """테이블 통계 업데이트"""
        try:
            tables = ['asset_types', 'assets', 'ohlcv_data', 'stock_financials', 'crypto_data', 'etf_info']
            for table in tables:
                self.db.execute(text(f"ANALYZE TABLE {table}"))
            
            self.db.commit()
            logger.info("Table analysis completed")
            return True
        except Exception as e:
            logger.error(f"Failed to analyze tables: {e}")
            self.db.rollback()
            return False

def optimize_database(db: Session):
    """데이터베이스 최적화 실행"""
    optimizer = DatabaseOptimizer(db)
    
    logger.info("Starting database optimization...")
    
    # 1. 인덱스 생성
    if optimizer.create_indexes():
        logger.info("✓ Indexes created")
    else:
        logger.error("✗ Failed to create indexes")
    
    # 2. 뷰 생성
    if optimizer.create_views():
        logger.info("✓ Views created")
    else:
        logger.error("✗ Failed to create views")
    
    # 3. 테이블 분석
    if optimizer.analyze_tables():
        logger.info("✓ Table analysis completed")
    else:
        logger.error("✗ Failed to analyze tables")
    
    logger.info("Database optimization completed")

# 최적화된 쿼리 함수들
def get_asset_types_optimized(db: Session, has_data: bool = False, include_description: bool = True):
    """최적화된 자산 타입 조회"""
    if has_data:
        # 뷰를 사용한 최적화된 쿼리
        query = text("""
            SELECT 
                at.asset_type_id,
                at.type_name,
                at.created_at,
                at.updated_at
        """)
        
        if include_description:
            query = text("""
                SELECT 
                    at.asset_type_id,
                    at.type_name,
                    at.description,
                    at.created_at,
                    at.updated_at
            """)
        
        query = text(str(query) + """
            FROM asset_type_stats at
            WHERE at.assets_with_data > 0
            ORDER BY at.type_name
        """)
    else:
        # 기본 쿼리 (이미 최적화됨)
        query = text("""
            SELECT 
                asset_type_id,
                type_name,
                created_at,
                updated_at
        """)
        
        if include_description:
            query = text("""
                SELECT 
                    asset_type_id,
                    type_name,
                    description,
                    created_at,
                    updated_at
            """)
        
        query = text(str(query) + """
            FROM asset_types
            ORDER BY type_name
        """)
    
    result = db.execute(query)
    return [dict(row) for row in result]

def get_assets_optimized(db: Session, type_name: Optional[str] = None, has_ohlcv_data: bool = True, limit: int = 1000, offset: int = 0):
    """최적화된 자산 목록 조회"""
    if type_name:
        # 특정 타입의 자산만 조회
        query = text("""
            SELECT 
                a.asset_id,
                a.ticker,
                a.name,
                a.asset_type_id,
                at.type_name,
                a.exchange,
                a.currency,
                a.is_active,
                a.description,
                a.data_source,
                a.created_at,
                a.updated_at
            FROM assets a
            JOIN asset_types at ON a.asset_type_id = at.asset_type_id
            WHERE at.type_name = :type_name
            AND a.is_active = true
        """)
        
        if has_ohlcv_data:
            query = text(str(query) + """
                AND EXISTS (
                    SELECT 1 FROM ohlcv_day_data o 
                    WHERE o.asset_id = a.asset_id
                )
            """)
        
        query = text(str(query) + """
            ORDER BY a.ticker
            LIMIT :limit OFFSET :offset
        """)
        
        result = db.execute(query, {
            'type_name': type_name,
            'limit': limit,
            'offset': offset
        })
    else:
        # 활성 자산 뷰 사용
        query = text("""
            SELECT * FROM active_assets
            LIMIT :limit OFFSET :offset
        """)
        
        result = db.execute(query, {
            'limit': limit,
            'offset': offset
        })
    
    return [dict(row) for row in result]

def get_ohlcv_data_optimized(db: Session, asset_id: int, data_interval: str = '1d', start_date: Optional[str] = None, end_date: Optional[str] = None, limit: int = 50000):
    """최적화된 OHLCV 데이터 조회"""
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"get_ohlcv_data_optimized called with asset_id={asset_id}, data_interval={data_interval}")
    query = text("""
        SELECT 
            ohlcv_id,
            asset_id,
            timestamp_utc,
            open_price,
            high_price,
            low_price,
            close_price,
            volume,
            data_interval,
            change_percent
        FROM ohlcv_day_data
        WHERE asset_id = :asset_id
        AND data_interval = :data_interval
    """)
    
    params = {
        'asset_id': asset_id,
        'data_interval': data_interval,
        'limit': limit
    }
    
    if start_date:
        query = text(str(query) + " AND timestamp_utc >= :start_date")
        params['start_date'] = start_date
    
    if end_date:
        query = text(str(query) + " AND timestamp_utc <= :end_date")
        params['end_date'] = end_date
    
    query = text(str(query) + """
        ORDER BY timestamp_utc DESC
        LIMIT :limit
    """)
    
    result = db.execute(query, params)
    data = [dict(row) for row in result]
    logger.info(f"get_ohlcv_data_optimized returned {len(data)} records with data_interval={data_interval}")
    return data 