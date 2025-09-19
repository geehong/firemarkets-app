#!/usr/bin/env python3
"""
PostgreSQL Unnecessary Funds Cleanup Script

이 스크립트는 PostgreSQL에서 다음 작업을 수행합니다:
1. 유지해야 할 중요 펀드들을 제외하고 나머지 펀드들을 삭제합니다
2. 해당 펀드들의 OHLCV 데이터도 함께 삭제합니다
3. assets 테이블에서도 해당 펀드들을 삭제합니다

유지할 중요 펀드들:
- FXAIX: Fidelity 500 Index Fund
- PIMIX: PIMCO Income Fund Institutional Class
- PONPX: PIMCO Income Fund
- FCTDX: Strategic Advisers Fidelity US TtlStk

사용법:
    python cleanup_unnecessary_funds_pg.py [--dry-run] [--confirm]
    
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

import psycopg2
from psycopg2 import Error as PostgreSQLError


class PostgreSQLFundCleaner:
    def __init__(self):
        # PostgreSQL 설정
        self.pg_config = {
            'host': 'db_postgres',
            'database': 'markets',
            'user': 'geehong',
            'password': 'Power6100',
            'port': 5432
        }
        
        # 유지할 중요 펀드들
        self.keep_funds = {
            'FXAIX',  # Fidelity 500 Index Fund
            'PIMIX',  # PIMCO Income Fund Institutional Class
            'PONPX',  # PIMCO Income Fund
            'FCTDX'   # Strategic Advisers Fidelity US TtlStk
        }
        
        self.pg_conn = None
    
    def connect_database(self):
        """데이터베이스 연결"""
        try:
            self.pg_conn = psycopg2.connect(**self.pg_config)
            print("✅ PostgreSQL 연결 성공")
        except PostgreSQLError as e:
            print(f"❌ PostgreSQL 연결 실패: {e}")
            sys.exit(1)
    
    def close_connection(self):
        """데이터베이스 연결 종료"""
        if self.pg_conn:
            self.pg_conn.close()
        print("🔌 PostgreSQL 연결 종료")
    
    def get_funds_to_delete(self) -> List[Tuple[int, str, str]]:
        """삭제할 펀드들을 찾습니다"""
        cursor = self.pg_conn.cursor()
        
        query = """
        SELECT a.asset_id, a.ticker, a.name
        FROM assets a
        LEFT JOIN world_assets_ranking war ON a.asset_id = war.asset_id
        WHERE a.asset_type_id = 7 
        AND war.asset_id IS NULL
        AND a.ticker NOT IN ('FXAIX', 'PIMIX', 'PONPX', 'FCTDX')
        ORDER BY a.ticker;
        """
        
        cursor.execute(query)
        funds_to_delete = cursor.fetchall()
        cursor.close()
        
        return funds_to_delete
    
    def get_ohlcv_counts(self, asset_id: int) -> Tuple[int, int]:
        """특정 자산의 OHLCV 데이터 개수를 반환합니다"""
        cursor = self.pg_conn.cursor()
        
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
        cursor = self.pg_conn.cursor()
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
                
                self.pg_conn.commit()
            else:
                # dry-run: 삭제될 개수만 확인
                day_query = "SELECT COUNT(*) FROM ohlcv_day_data WHERE asset_id = %s"
                cursor.execute(day_query, (asset_id,))
                deleted_day = cursor.fetchone()[0]
                
                intraday_query = "SELECT COUNT(*) FROM ohlcv_intraday_data WHERE asset_id = %s"
                cursor.execute(intraday_query, (asset_id,))
                deleted_intraday = cursor.fetchone()[0]
                
        except PostgreSQLError as e:
            print(f"❌ OHLCV 데이터 삭제 중 오류: {e}")
            self.pg_conn.rollback()
        finally:
            cursor.close()
        
        return deleted_day, deleted_intraday
    
    def delete_fund(self, asset_id: int, ticker: str, dry_run: bool = True) -> bool:
        """특정 펀드를 assets 테이블에서 삭제합니다"""
        cursor = self.pg_conn.cursor()
        
        try:
            if not dry_run:
                query = "DELETE FROM assets WHERE asset_id = %s"
                cursor.execute(query, (asset_id,))
                deleted = cursor.rowcount > 0
                self.pg_conn.commit()
            else:
                # dry-run: 삭제될지 확인
                query = "SELECT COUNT(*) FROM assets WHERE asset_id = %s"
                cursor.execute(query, (asset_id,))
                deleted = cursor.fetchone()[0] > 0
                
        except PostgreSQLError as e:
            print(f"❌ 펀드 삭제 중 오류: {e}")
            self.pg_conn.rollback()
            deleted = False
        finally:
            cursor.close()
        
        return deleted
    
    def cleanup_unnecessary_funds(self, dry_run: bool = True):
        """불필요한 펀드들을 정리합니다"""
        print(f"\n🔍 {'DRY-RUN 모드' if dry_run else '실제 삭제 모드'}로 PostgreSQL 불필요한 펀드 정리 시작...")
        print("=" * 60)
        print("✅ 유지할 중요 펀드들:")
        for fund in self.keep_funds:
            print(f"   - {fund}")
        print("=" * 60)
        
        # 삭제할 펀드들 찾기
        funds_to_delete = self.get_funds_to_delete()
        
        if not funds_to_delete:
            print("✅ 삭제할 불필요한 펀드가 없습니다.")
            return
        
        print(f"📊 삭제 예정인 펀드: {len(funds_to_delete)}개")
        print("-" * 60)
        
        total_deleted_funds = 0
        total_deleted_day_data = 0
        total_deleted_intraday_data = 0
        
        for asset_id, ticker, name in funds_to_delete:
            print(f"\n🔍 펀드 ID: {asset_id}, Ticker: {ticker}")
            print(f"   📝 Name: {name}")
            
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
            
            # 펀드 삭제
            deleted = self.delete_fund(asset_id, ticker, dry_run)
            if deleted:
                print(f"   {'🗑️  삭제 예정' if dry_run else '🗑️  삭제 완료'}: 펀드 {ticker}")
                total_deleted_funds += 1
            else:
                print(f"   ❌ 삭제 실패: 펀드 {ticker}")
        
        print("\n" + "=" * 60)
        print("📊 PostgreSQL 정리 결과 요약:")
        print(f"   🗑️  삭제된 펀드: {total_deleted_funds}개")
        print(f"   📈 삭제된 OHLCV Day Data: {total_deleted_day_data}개")
        print(f"   📊 삭제된 OHLCV Intraday Data: {total_deleted_intraday_data}개")
        
        if dry_run:
            print("\n⚠️  이는 DRY-RUN 결과입니다. 실제 삭제를 원하면 --confirm 옵션을 사용하세요.")
        else:
            print("\n✅ PostgreSQL 실제 삭제가 완료되었습니다.")


def main():
    parser = argparse.ArgumentParser(description='PostgreSQL 불필요한 펀드 정리 스크립트')
    parser.add_argument('--dry-run', action='store_true', default=True,
                       help='실제 삭제하지 않고 삭제될 항목들만 보여줍니다 (기본값)')
    parser.add_argument('--confirm', action='store_true',
                       help='실제 삭제를 수행합니다')
    
    args = parser.parse_args()
    
    # --confirm이 지정되면 dry_run을 False로 설정
    dry_run = not args.confirm
    
    print("🧹 PostgreSQL Unnecessary Funds Cleanup Script")
    print(f"⏰ 실행 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    cleaner = PostgreSQLFundCleaner()
    
    try:
        cleaner.connect_database()
        cleaner.cleanup_unnecessary_funds(dry_run=dry_run)
        
    except KeyboardInterrupt:
        print("\n⚠️  사용자에 의해 중단되었습니다.")
    except Exception as e:
        print(f"\n❌ 예상치 못한 오류 발생: {e}")
    finally:
        cleaner.close_connection()


if __name__ == "__main__":
    main()
