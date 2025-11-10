#!/usr/bin/env python3
"""
GOOGL (asset_id=27) 관련 데이터를 모든 테이블에서 삭제하는 스크립트
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from sqlalchemy import text
from app.models.asset import Asset

def delete_googl_data():
    """GOOGL (asset_id=27) 관련 데이터를 모든 테이블에서 삭제"""
    db = SessionLocal()
    
    try:
        # 먼저 GOOGL 자산 확인
        googl = db.query(Asset).filter(Asset.asset_id == 27).first()
        if not googl:
            print("GOOGL (asset_id=27)을 찾을 수 없습니다.")
            return
        
        print(f"=== GOOGL (asset_id=27, ticker={googl.ticker}) 삭제 시작 ===")
        
        # asset_id를 참조하는 모든 테이블에서 삭제
        tables_to_delete = [
            'ohlcv_data',
            'ohlcv_intraday_data',
            'stock_financials',
            'stock_analyst_estimates',
            'etf_info',
            'crypto_data',
            'world_assets_ranking',
            'realtime_quotes',
            'realtime_quotes_time_delay',
            'posts',
            'financial_statements',
            'financial_metrics',
            'company_financials',
            'macrotrends_financials',
            'stock_profiles',
            'technical_indicators',
            'api_call_logs'
        ]
        
        deleted_counts = {}
        
        for table in tables_to_delete:
            try:
                # 먼저 개수 확인
                count_result = db.execute(text(f'SELECT COUNT(*) FROM {table} WHERE asset_id = 27'))
                count = count_result.scalar()
                
                if count > 0:
                    # 삭제 실행
                    delete_result = db.execute(text(f'DELETE FROM {table} WHERE asset_id = 27'))
                    deleted_counts[table] = delete_result.rowcount
                    print(f"✅ {table}: {delete_result.rowcount} records deleted")
                else:
                    print(f"⏭️  {table}: 0 records (skipped)")
            except Exception as e:
                # 테이블이 없거나 컬럼이 없을 수 있음
                print(f"⚠️  {table}: {str(e)}")
        
        # 마지막으로 assets 테이블에서 삭제
        print(f"\n=== assets 테이블에서 GOOGL 삭제 ===")
        db.delete(googl)
        db.commit()
        print(f"✅ assets: GOOGL (asset_id=27) deleted")
        
        print(f"\n=== 삭제 완료 ===")
        print(f"총 {len([k for k, v in deleted_counts.items() if v > 0])}개 테이블에서 데이터 삭제됨")
        
    except Exception as e:
        db.rollback()
        print(f"❌ 오류 발생: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    delete_googl_data()


