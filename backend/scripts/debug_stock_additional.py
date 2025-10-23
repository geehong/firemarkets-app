#!/usr/bin/env python3
"""
get_stock_additional_data 함수 디버깅 스크립트
NMRX에 대한 주식 추가 데이터 조회 테스트
"""

import sys
import os
sys.path.append('/app')

from app.core.database import get_postgres_db
from app.api.v1.endpoints.assets import resolve_asset_identifier, get_stock_additional_data
from sqlalchemy.orm import Session
from sqlalchemy import text
import json
import traceback

def debug_stock_additional_data(asset_identifier: str = "NMRX"):
    """get_stock_additional_data 함수 디버깅"""
    print(f"🔍 get_stock_additional_data 디버깅: {asset_identifier}")
    print("=" * 60)
    
    try:
        db = next(get_postgres_db())
        asset_id = resolve_asset_identifier(db, asset_identifier)
        print(f"✅ Asset ID: {asset_id}")
        
        # 1. stock_profiles 테이블 확인
        print(f"\n1️⃣ stock_profiles 테이블 확인")
        result = db.execute(text("""
            SELECT * FROM stock_profiles
            WHERE asset_id = :asset_id
        """), {"asset_id": asset_id}).fetchone()
        
        if result:
            print("✅ stock_profiles에 데이터 존재")
            print(f"📊 컬럼 수: {len(result._mapping)}")
            print(f"📋 컬럼 목록: {list(result._mapping.keys())}")
        else:
            print("❌ stock_profiles에 데이터 없음")
        
        # 2. stock_financials 테이블 확인
        print(f"\n2️⃣ stock_financials 테이블 확인")
        result = db.execute(text("""
            SELECT * FROM stock_financials
            WHERE asset_id = :asset_id
        """), {"asset_id": asset_id}).fetchone()
        
        if result:
            print("✅ stock_financials에 데이터 존재")
            print(f"📊 컬럼 수: {len(result._mapping)}")
            print(f"📋 컬럼 목록: {list(result._mapping.keys())}")
        else:
            print("❌ stock_financials에 데이터 없음")
        
        # 3. JOIN 쿼리 실행
        print(f"\n3️⃣ JOIN 쿼리 실행")
        result = db.execute(text("""
            SELECT sp.*, sf.* FROM stock_profiles sp
            LEFT JOIN stock_financials sf ON sp.asset_id = sf.asset_id
            WHERE sp.asset_id = :asset_id
        """), {"asset_id": asset_id}).fetchone()
        
        if result:
            print("✅ JOIN 쿼리 성공")
            print(f"📊 결과 컬럼 수: {len(result._mapping)}")
            print(f"📋 결과 컬럼 목록: {list(result._mapping.keys())}")
            
            # 결과를 딕셔너리로 변환
            stock_data = dict(result._mapping)
            print(f"📊 딕셔너리 키 수: {len(stock_data)}")
            
            # None이 아닌 값들만 출력
            non_null_values = {k: v for k, v in stock_data.items() if v is not None}
            print(f"📊 None이 아닌 값 수: {len(non_null_values)}")
            print(f"📋 None이 아닌 키: {list(non_null_values.keys())}")
            
        else:
            print("❌ JOIN 쿼리 결과 없음")
        
        # 4. get_stock_additional_data 함수 직접 호출
        print(f"\n4️⃣ get_stock_additional_data 함수 직접 호출")
        try:
            stock_data = get_stock_additional_data(db, asset_id)
            if stock_data:
                print("✅ get_stock_additional_data 성공")
                print(f"📊 반환된 데이터 키 수: {len(stock_data)}")
                print(f"📋 반환된 데이터 키: {list(stock_data.keys())}")
                
                # None이 아닌 값들만 출력
                non_null_values = {k: v for k, v in stock_data.items() if v is not None}
                print(f"📊 None이 아닌 값 수: {len(non_null_values)}")
                print(f"📋 None이 아닌 키: {list(non_null_values.keys())}")
            else:
                print("❌ get_stock_additional_data 반환값 없음")
        except Exception as e:
            print(f"❌ get_stock_additional_data 오류: {e}")
            traceback.print_exc()
        
    except Exception as e:
        print(f"❌ 전체 프로세스 오류: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    print("🚀 get_stock_additional_data 디버깅 스크립트 시작")
    print("=" * 60)
    
    # NMRX로 테스트
    debug_stock_additional_data("NMRX")
    
    print("\n" + "=" * 60)
    print("🏁 디버깅 완료")

