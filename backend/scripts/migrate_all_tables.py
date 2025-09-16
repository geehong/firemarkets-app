#!/usr/bin/env python3
"""
MySQL에서 PostgreSQL로 모든 테이블 데이터 일괄 마이그레이션
"""

import os
import mysql.connector
import psycopg2
from psycopg2.extras import execute_values
import logging
from datetime import datetime

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 데이터베이스 연결 설정
mysql_cfg = {
    'host': os.getenv('DB_HOSTNAME', 'db'),
    'port': 3306,
    'user': os.getenv('DB_USERNAME', 'geehong'),
    'password': os.getenv('DB_PASSWORD', 'Power6100'),
    'database': os.getenv('DB_DATABASE', 'markets')
}

pg_cfg = {
    'host': os.getenv('DB_HOSTNAME_PG', 'db_postgres'),
    'port': 5432,
    'user': os.getenv('DB_USERNAME_PG', 'geehong'),
    'password': os.getenv('DB_PASSWORD_PG', 'Power6100'),
    'dbname': os.getenv('DB_DATABASE_PG', 'markets')
}

def get_table_columns(cursor, table_name, db_type='mysql'):
    """테이블의 컬럼 정보를 가져옵니다"""
    if db_type == 'mysql':
        cursor.execute(f"DESCRIBE {table_name}")
        columns = [row[0] for row in cursor.fetchall()]
    else:  # postgresql
        cursor.execute(f"""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = '{table_name}' 
            ORDER BY ordinal_position
        """)
        columns = [row[0] for row in cursor.fetchall()]
    return columns

def migrate_table(mysql_cursor, pg_cursor, table_name, batch_size=10000):
    """단일 테이블 마이그레이션"""
    try:
        logger.info(f"Starting migration for table: {table_name}")
        
        # MySQL에서 총 레코드 수 확인
        mysql_cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        total_rows = mysql_cursor.fetchone()[0]
        logger.info(f"Total rows to migrate in {table_name}: {total_rows}")
        
        if total_rows == 0:
            logger.info(f"No data to migrate in {table_name}")
            return True
        
        # 컬럼 정보 가져오기
        mysql_columns = get_table_columns(mysql_cursor, table_name, 'mysql')
        pg_columns = get_table_columns(pg_cursor, table_name, 'postgresql')
        
        # 공통 컬럼 찾기
        common_columns = [col for col in mysql_columns if col in pg_columns]
        logger.info(f"Common columns: {common_columns}")
        
        # 배치 단위로 데이터 이전
        for offset in range(0, total_rows, batch_size):
            # MySQL에서 데이터 조회
            columns_str = ', '.join(common_columns)
            mysql_cursor.execute(f"""
                SELECT {columns_str}
                FROM {table_name}
                ORDER BY {common_columns[0] if common_columns else '1'}
                LIMIT {batch_size} OFFSET {offset}
            """)
            
            rows = mysql_cursor.fetchall()
            if not rows:
                break
            
            # PostgreSQL에 데이터 삽입 (ON CONFLICT DO NOTHING 사용)
            columns_str_pg = ', '.join([f'"{col}"' for col in common_columns])
            placeholders = ', '.join(['%s'] * len(common_columns))
            
            # UPSERT 구문 생성
            conflict_columns = common_columns[:3] if len(common_columns) >= 3 else common_columns
            conflict_str = ', '.join([f'"{col}"' for col in conflict_columns])
            
            upsert_sql = f"""
                INSERT INTO "{table_name}" ({columns_str_pg})
                VALUES %s
                ON CONFLICT ({conflict_str}) DO NOTHING
            """
            
            try:
                execute_values(pg_cursor, upsert_sql, rows, page_size=1000)
                logger.info(f"Migrated {min(offset + len(rows), total_rows)}/{total_rows} rows from {table_name}")
            except Exception as e:
                # UPSERT가 실패하면 일반 INSERT 시도
                logger.warning(f"UPSERT failed for {table_name}, trying simple INSERT: {e}")
                simple_sql = f"""
                    INSERT INTO "{table_name}" ({columns_str_pg})
                    VALUES %s
                """
                execute_values(pg_cursor, simple_sql, rows, page_size=1000)
                logger.info(f"Migrated {min(offset + len(rows), total_rows)}/{total_rows} rows from {table_name}")
        
        logger.info(f"Successfully migrated table: {table_name}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to migrate table {table_name}: {e}")
        return False

def main():
    """메인 함수"""
    try:
        logger.info("Starting full table migration from MySQL to PostgreSQL")
        
        # 데이터베이스 연결
        logger.info("Connecting to MySQL...")
        mysql_conn = mysql.connector.connect(**mysql_cfg)
        mysql_cursor = mysql_conn.cursor()
        
        logger.info("Connecting to PostgreSQL...")
        pg_conn = psycopg2.connect(**pg_cfg)
        pg_cursor = pg_conn.cursor()
        
        # 마이그레이션할 테이블 목록 (이미 마이그레이션된 테이블 제외)
        exclude_tables = {
            'asset_types', 'assets', 'ohlcv_day_data', 'ohlcv_intraday_data'
        }
        
        # MySQL에서 모든 테이블 목록 가져오기
        mysql_cursor.execute("SHOW TABLES")
        all_tables = [row[0] for row in mysql_cursor.fetchall()]
        
        # 마이그레이션할 테이블 필터링
        tables_to_migrate = [table for table in all_tables if table not in exclude_tables]
        
        logger.info(f"Tables to migrate: {tables_to_migrate}")
        
        # 각 테이블 마이그레이션
        success_count = 0
        failed_tables = []
        
        for table_name in tables_to_migrate:
            try:
                if migrate_table(mysql_cursor, pg_cursor, table_name):
                    success_count += 1
                    pg_conn.commit()  # 각 테이블마다 커밋
                else:
                    failed_tables.append(table_name)
                    pg_conn.rollback()
            except Exception as e:
                logger.error(f"Error migrating {table_name}: {e}")
                failed_tables.append(table_name)
                pg_conn.rollback()
        
        # 연결 종료
        mysql_cursor.close()
        mysql_conn.close()
        pg_cursor.close()
        pg_conn.close()
        
        # 결과 요약
        logger.info("=" * 50)
        logger.info("MIGRATION SUMMARY")
        logger.info("=" * 50)
        logger.info(f"Total tables processed: {len(tables_to_migrate)}")
        logger.info(f"Successfully migrated: {success_count}")
        logger.info(f"Failed tables: {len(failed_tables)}")
        
        if failed_tables:
            logger.error(f"Failed tables: {failed_tables}")
        else:
            logger.info("All tables migrated successfully!")
        
        logger.info("Full table migration completed!")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise

if __name__ == "__main__":
    main()
