#!/usr/bin/env python3
"""
테스트 자산들의 365일치 OHLCV 데이터를 삭제하는 스크립트
"""

import sys
import os
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.asset import Asset, OHLCVData

def delete_test_assets_ohlcv_data():
    """테스트 자산들의 365일치 OHLCV 데이터를 삭제합니다."""
    
    # 테스트 자산 티커들
    test_tickers = ['AAPL', 'SPY', 'BTCUSDT']
    
    # 365일 전 날짜 계산
    cutoff_date = datetime.now() - timedelta(days=365)
    
    db = SessionLocal()
    try:
        print(f"테스트 자산들의 {cutoff_date.strftime('%Y-%m-%d')} 이후 데이터를 삭제합니다...")
        
        # 테스트 자산들의 asset_id 조회
        assets = db.query(Asset).filter(Asset.ticker.in_(test_tickers)).all()
        
        if not assets:
            print("테스트 자산을 찾을 수 없습니다.")
            return
        
        total_deleted = 0
        
        for asset in assets:
            print(f"\n처리 중: {asset.ticker} (ID: {asset.asset_id})")
            
            # 365일 이후의 OHLCV 데이터 삭제
            deleted_count = db.query(OHLCVData).filter(
                OHLCVData.asset_id == asset.asset_id,
                OHLCVData.timestamp_utc >= cutoff_date
            ).delete()
            
            print(f"  - 삭제된 레코드: {deleted_count}개")
            total_deleted += deleted_count
        
        # 변경사항 커밋
        db.commit()
        
        print(f"\n총 삭제된 레코드: {total_deleted}개")
        
        # 삭제 후 각 자산의 남은 데이터 확인
        print("\n삭제 후 남은 데이터 확인:")
        for asset in assets:
            remaining_count = db.query(OHLCVData).filter(
                OHLCVData.asset_id == asset.asset_id
            ).count()
            
            oldest_data = db.query(OHLCVData).filter(
                OHLCVData.asset_id == asset.asset_id
            ).order_by(OHLCVData.timestamp_utc.asc()).first()
            
            newest_data = db.query(OHLCVData).filter(
                OHLCVData.asset_id == asset.asset_id
            ).order_by(OHLCVData.timestamp_utc.desc()).first()
            
            print(f"  {asset.ticker}: {remaining_count}개 레코드")
            if oldest_data and newest_data:
                print(f"    - 기간: {oldest_data.timestamp_utc.strftime('%Y-%m-%d')} ~ {newest_data.timestamp_utc.strftime('%Y-%m-%d')}")
        
    except Exception as e:
        print(f"오류 발생: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    delete_test_assets_ohlcv_data()
    print("삭제 완료!")
