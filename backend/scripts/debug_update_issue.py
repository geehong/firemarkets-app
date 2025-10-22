#!/usr/bin/env python3
"""
overview_dict.update() 문제 디버깅 스크립트
None 값이 유효한 값을 덮어쓰는 문제 확인
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

def debug_update_issue(asset_identifier: str = "NMRX"):
    """overview_dict.update() 문제 디버깅"""
    print(f"🔍 overview_dict.update() 문제 디버깅: {asset_identifier}")
    print("=" * 60)
    
    try:
        db = next(get_postgres_db())
        asset_id = resolve_asset_identifier(db, asset_identifier)
        print(f"✅ Asset ID: {asset_id}")
        
        # 1. treemap_live_view에서 기본 데이터 가져오기
        print(f"\n1️⃣ treemap_live_view에서 기본 데이터 가져오기")
        result = db.execute(text("""
            SELECT * FROM treemap_live_view
            WHERE asset_id = :asset_id
        """), {"asset_id": asset_id}).fetchone()
        
        overview_dict = dict(result._mapping)
        print(f"✅ 기본 데이터 로드 완료")
        print(f"📊 기본 데이터 키 수: {len(overview_dict)}")
        
        # 2. 핵심 필드 확인 (update 전)
        print(f"\n2️⃣ 핵심 필드 확인 (update 전)")
        critical_fields = ['asset_id', 'ticker', 'name', 'updated_at', 'created_at']
        for field in critical_fields:
            value = overview_dict.get(field)
            print(f"  {field}: {value} (타입: {type(value)})")
        
        # 3. type_name 매핑
        if 'type_name' not in overview_dict and 'asset_type' in overview_dict:
            overview_dict['type_name'] = overview_dict.get('asset_type')
            print(f"✅ type_name 매핑: {overview_dict.get('type_name')}")
        
        # 4. 주식 추가 데이터 가져오기
        print(f"\n3️⃣ 주식 추가 데이터 가져오기")
        stock_data = get_stock_additional_data(db, asset_id)
        if stock_data:
            print(f"✅ 주식 추가 데이터 로드 완료")
            print(f"📊 주식 데이터 키 수: {len(stock_data)}")
            
            # None이 아닌 값들만 확인
            non_null_values = {k: v for k, v in stock_data.items() if v is not None}
            print(f"📊 None이 아닌 값 수: {len(non_null_values)}")
            print(f"📋 None이 아닌 키: {list(non_null_values.keys())}")
            
            # None 값들 확인
            null_values = {k: v for k, v in stock_data.items() if v is None}
            print(f"📊 None 값 수: {len(null_values)}")
            print(f"📋 None 키 (처음 10개): {list(null_values.keys())[:10]}")
        else:
            print("❌ 주식 추가 데이터 없음")
            return
        
        # 5. update 전후 비교
        print(f"\n4️⃣ update 전후 비교")
        
        # update 전 핵심 필드 저장
        before_asset_id = overview_dict.get('asset_id')
        before_updated_at = overview_dict.get('updated_at')
        before_ticker = overview_dict.get('ticker')
        before_name = overview_dict.get('name')
        
        print(f"  update 전 asset_id: {before_asset_id} (타입: {type(before_asset_id)})")
        print(f"  update 전 updated_at: {before_updated_at} (타입: {type(before_updated_at)})")
        print(f"  update 전 ticker: {before_ticker} (타입: {type(before_ticker)})")
        print(f"  update 전 name: {before_name} (타입: {type(before_name)})")
        
        # 6. update 실행
        print(f"\n5️⃣ update 실행")
        print("  overview_dict.update(stock_data) 실행 중...")
        overview_dict.update(stock_data)
        print("  ✅ update 완료")
        
        # 7. update 후 핵심 필드 확인
        print(f"\n6️⃣ update 후 핵심 필드 확인")
        after_asset_id = overview_dict.get('asset_id')
        after_updated_at = overview_dict.get('updated_at')
        after_ticker = overview_dict.get('ticker')
        after_name = overview_dict.get('name')
        
        print(f"  update 후 asset_id: {after_asset_id} (타입: {type(after_asset_id)})")
        print(f"  update 후 updated_at: {after_updated_at} (타입: {type(after_updated_at)})")
        print(f"  update 후 ticker: {after_ticker} (타입: {type(after_ticker)})")
        print(f"  update 후 name: {after_name} (타입: {type(after_name)})")
        
        # 8. 변경된 필드 확인
        print(f"\n7️⃣ 변경된 필드 확인")
        if before_asset_id != after_asset_id:
            print(f"  ⚠️ asset_id 변경: {before_asset_id} → {after_asset_id}")
        if before_updated_at != after_updated_at:
            print(f"  ⚠️ updated_at 변경: {before_updated_at} → {after_updated_at}")
        if before_ticker != after_ticker:
            print(f"  ⚠️ ticker 변경: {before_ticker} → {after_ticker}")
        if before_name != after_name:
            print(f"  ⚠️ name 변경: {before_name} → {after_name}")
        
        # 9. None 값으로 덮어쓰인 필드들 확인
        print(f"\n8️⃣ None 값으로 덮어쓰인 필드들 확인")
        none_overwritten = []
        for key, value in stock_data.items():
            if value is None and key in overview_dict:
                original_value = overview_dict.get(key)
                if original_value is not None:
                    none_overwritten.append((key, original_value, value))
        
        if none_overwritten:
            print(f"  ❌ {len(none_overwritten)}개 필드가 None으로 덮어쓰임:")
            for key, original, new in none_overwritten[:10]:  # 처음 10개만 출력
                print(f"    {key}: {original} → {new}")
        else:
            print("  ✅ None으로 덮어쓰인 필드 없음")
        
    except Exception as e:
        print(f"❌ 전체 프로세스 오류: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    print("🚀 overview_dict.update() 문제 디버깅 스크립트 시작")
    print("=" * 60)
    
    # NMRX로 테스트
    debug_update_issue("NMRX")
    
    print("\n" + "=" * 60)
    print("🏁 디버깅 완료")
