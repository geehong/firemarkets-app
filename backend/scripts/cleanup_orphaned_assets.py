#!/usr/bin/env python3
"""
Orphaned Assets Cleanup Script

이 스크립트는 다음 작업을 수행합니다:
1. assets 테이블에 있지만 world_assets_ranking에 없는 자산들을 찾습니다
2. 해당 자산들의 ohlcv_day_data, ohlcv_intraday_data를 삭제합니다
3. 마지막으로 해당 자산들을 assets 테이블에서 삭제합니다

사용법:
    python cleanup_orphaned_assets.py [--dry-run] [--confirm]
    
옵션:
    --dry-run: 실제 삭제하지 않고 삭제될 항목들만 보여줍니다
    --confirm: 실제 삭제를 수행합니다 (기본값은 dry-run)
"""

import sys
import os
import argparse
from datetime import datetime
from typing import List, Tuple

# 프로젝트 루트를 Python path에 추가
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

import mysql.connector
import psycopg2
from mysql.connector import Error as MySQLError
from psycopg2 import Error as PostgreSQLError


class DatabaseCleaner:
    def __init__(self):
        # MySQL 설정
        self.mysql_config = {
            'host': 'db',
            'database': 'markets',
            'user': 'geehong',
            'password': 'Power6100',
            'port': 3306
        }
        
        # PostgreSQL 설정
        self.postgres_config = {
            'host': 'db_postgres',
            'database': 'markets',
            'user': 'geehong',
            'password': 'Power6100',
            'port': 5432
        }
        
        self.mysql_conn = None
        self.postgres_conn = None
    
    def connect_databases(self):
        """데이터베이스 연결"""
        try:
            # MySQL 연결
            self.mysql_conn = mysql.connector.connect(**self.mysql_config)
            print("✅ MySQL 연결 성공")
            
            # PostgreSQL 연결
            self.postgres_conn = psycopg2.connect(**self.postgres_config)
            print("✅ PostgreSQL 연결 성공")
            
        except MySQLError as e:
            print(f"❌ MySQL 연결 실패: {e}")
            sys.exit(1)
        except PostgreSQLError as e:
            print(f"❌ PostgreSQL 연결 실패: {e}")
            sys.exit(1)
    
    def close_connections(self):
        """데이터베이스 연결 종료"""
        if self.mysql_conn and self.mysql_conn.is_connected():
            self.mysql_conn.close()
        if self.postgres_conn:
            self.postgres_conn.close()
        print("🔌 데이터베이스 연결 종료")
    
    def get_orphaned_assets(self) -> List[Tuple[int, str, str]]:
        """world_assets_ranking에 없는 자산들을 찾습니다"""
        cursor = self.mysql_conn.cursor()
        
        query = """
        SELECT a.asset_id, a.ticker, a.name
        FROM assets a
        LEFT JOIN world_assets_ranking war ON a.asset_id = war.asset_id
        WHERE war.asset_id IS NULL
        ORDER BY a.asset_id;
        """
        
        cursor.execute(query)
        orphaned_assets = cursor.fetchall()
        cursor.close()
        
        return orphaned_assets
    
    def get_ohlcv_counts(self, asset_id: int) -> Tuple[int, int]:
        """특정 자산의 OHLCV 데이터 개수를 반환합니다"""
        cursor = self.mysql_conn.cursor()
        
        # ohlcv_day_data 개수
        day_query = "SELECT COUNT(*) FROM ohlcv_day_data WHERE asset_id = %s"
        cursor.execute(day_query, (asset_id,))
        day_count = cursor.fetchone()[0]
        
        # ohlcv_intraday_data 개수
        intraday_query = "SELECT COUNT(*) FROM ohlcv_intraday_data WHERE asset_id = %s"
        cursor.execute(intraday_query, (asset_id,))
        intraday_count = cursor.fetchone()[0]
        
        cursor.close()
        return day_count, intraday_count
    
    def delete_ohlcv_data(self, asset_id: int, dry_run: bool = True) -> Tuple[int, int]:
        """특정 자산의 OHLCV 데이터를 삭제합니다"""
        cursor = self.mysql_conn.cursor()
        deleted_day = 0
        deleted_intraday = 0
        
        try:
            if not dry_run:
                # ohlcv_day_data 삭제
                day_query = "DELETE FROM ohlcv_day_data WHERE asset_id = %s"
                cursor.execute(day_query, (asset_id,))
                deleted_day = cursor.rowcount
                
                # ohlcv_intraday_data 삭제
                intraday_query = "DELETE FROM ohlcv_intraday_data WHERE asset_id = %s"
                cursor.execute(intraday_query, (asset_id,))
                deleted_intraday = cursor.rowcount
                
                self.mysql_conn.commit()
            else:
                # dry-run: 삭제될 개수만 확인
                day_query = "SELECT COUNT(*) FROM ohlcv_day_data WHERE asset_id = %s"
                cursor.execute(day_query, (asset_id,))
                deleted_day = cursor.fetchone()[0]
                
                intraday_query = "SELECT COUNT(*) FROM ohlcv_intraday_data WHERE asset_id = %s"
                cursor.execute(intraday_query, (asset_id,))
                deleted_intraday = cursor.fetchone()[0]
                
        except MySQLError as e:
            print(f"❌ OHLCV 데이터 삭제 중 오류: {e}")
            self.mysql_conn.rollback()
        finally:
            cursor.close()
        
        return deleted_day, deleted_intraday
    
    def delete_asset(self, asset_id: int, dry_run: bool = True) -> bool:
        """특정 자산을 assets 테이블에서 삭제합니다"""
        cursor = self.mysql_conn.cursor()
        
        try:
            if not dry_run:
                query = "DELETE FROM assets WHERE asset_id = %s"
                cursor.execute(query, (asset_id,))
                deleted = cursor.rowcount > 0
                self.mysql_conn.commit()
            else:
                # dry-run: 삭제될지 확인
                query = "SELECT COUNT(*) FROM assets WHERE asset_id = %s"
                cursor.execute(query, (asset_id,))
                deleted = cursor.fetchone()[0] > 0
                
        except MySQLError as e:
            print(f"❌ 자산 삭제 중 오류: {e}")
            self.mysql_conn.rollback()
            deleted = False
        finally:
            cursor.close()
        
        return deleted
    
    def cleanup_orphaned_assets(self, dry_run: bool = True):
        """고아 자산들을 정리합니다"""
        print(f"\n🔍 {'DRY-RUN 모드' if dry_run else '실제 삭제 모드'}로 고아 자산 정리 시작...")
        print("=" * 60)
        
        # 고아 자산들 찾기
        orphaned_assets = self.get_orphaned_assets()
        
        if not orphaned_assets:
            print("✅ 고아 자산이 없습니다. 모든 자산이 world_assets_ranking에 존재합니다.")
            return
        
        print(f"📊 발견된 고아 자산: {len(orphaned_assets)}개")
        print("-" * 60)
        
        total_deleted_assets = 0
        total_deleted_day_data = 0
        total_deleted_intraday_data = 0
        
        for asset_id, ticker, name in orphaned_assets:
            print(f"\n🔍 자산 ID: {asset_id}, Ticker: {ticker}, Name: {name}")
            
            # OHLCV 데이터 개수 확인
            day_count, intraday_count = self.get_ohlcv_counts(asset_id)
            print(f"   📈 OHLCV Day Data: {day_count}개")
            print(f"   📊 OHLCV Intraday Data: {intraday_count}개")
            
            if day_count > 0 or intraday_count > 0:
                # OHLCV 데이터 삭제
                deleted_day, deleted_intraday = self.delete_ohlcv_data(asset_id, dry_run)
                print(f"   {'🗑️  삭제 예정' if dry_run else '🗑️  삭제 완료'}: Day {deleted_day}개, Intraday {deleted_intraday}개")
                total_deleted_day_data += deleted_day
                total_deleted_intraday_data += deleted_intraday
            
            # 자산 삭제
            deleted = self.delete_asset(asset_id, dry_run)
            if deleted:
                print(f"   {'🗑️  삭제 예정' if dry_run else '🗑️  삭제 완료'}: 자산 {ticker}")
                total_deleted_assets += 1
            else:
                print(f"   ❌ 삭제 실패: 자산 {ticker}")
        
        print("\n" + "=" * 60)
        print("📊 정리 결과 요약:")
        print(f"   🗑️  삭제된 자산: {total_deleted_assets}개")
        print(f"   📈 삭제된 OHLCV Day Data: {total_deleted_day_data}개")
        print(f"   📊 삭제된 OHLCV Intraday Data: {total_deleted_intraday_data}개")
        
        if dry_run:
            print("\n⚠️  이는 DRY-RUN 결과입니다. 실제 삭제를 원하면 --confirm 옵션을 사용하세요.")
        else:
            print("\n✅ 실제 삭제가 완료되었습니다.")


def main():
    parser = argparse.ArgumentParser(description='고아 자산 정리 스크립트')
    parser.add_argument('--dry-run', action='store_true', default=True,
                       help='실제 삭제하지 않고 삭제될 항목들만 보여줍니다 (기본값)')
    parser.add_argument('--confirm', action='store_true',
                       help='실제 삭제를 수행합니다')
    
    args = parser.parse_args()
    
    # --confirm이 지정되면 dry_run을 False로 설정
    dry_run = not args.confirm
    
    print("🧹 Orphaned Assets Cleanup Script")
    print(f"⏰ 실행 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    cleaner = DatabaseCleaner()
    
    try:
        cleaner.connect_databases()
        cleaner.cleanup_orphaned_assets(dry_run=dry_run)
        
    except KeyboardInterrupt:
        print("\n⚠️  사용자에 의해 중단되었습니다.")
    except Exception as e:
        print(f"\n❌ 예상치 못한 오류 발생: {e}")
    finally:
        cleaner.close_connections()


if __name__ == "__main__":
    main()
