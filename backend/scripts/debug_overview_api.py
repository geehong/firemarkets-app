#!/usr/bin/env python3
"""
Asset Overview API 디버깅 스크립트
{"detail":"Overview data not found"} (200 OK) 발생 원인 정밀 분석
"""

import sys
import os
sys.path.append('/app')

from app.core.database import get_postgres_db
from app.api.v1.endpoints.assets import get_unified_overview_data, resolve_asset_identifier
from app.schemas.asset import AssetOverviewResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
import json
import traceback

def debug_overview_api(asset_identifier: str = "NMRX"):
    """Asset Overview API 디버깅"""
    print(f"🔍 Asset Overview API 디버깅 시작: {asset_identifier}")
    print("=" * 60)
    
    try:
        # 1. 데이터베이스 연결 테스트
        print("1️⃣ 데이터베이스 연결 테스트...")
        db = next(get_postgres_db())
        print("✅ 데이터베이스 연결 성공")
        
        # 2. Asset Identifier 해석 테스트
        print(f"\n2️⃣ Asset Identifier 해석 테스트: {asset_identifier}")
        try:
            asset_id = resolve_asset_identifier(db, asset_identifier)
            print(f"✅ Asset ID 해석 성공: {asset_id}")
        except Exception as e:
            print(f"❌ Asset ID 해석 실패: {e}")
            return
        
        # 3. treemap_live_view 데이터 확인
        print(f"\n3️⃣ treemap_live_view 데이터 확인 (asset_id: {asset_id})")
        result = db.execute(text("""
            SELECT * FROM treemap_live_view
            WHERE asset_id = :asset_id
        """), {"asset_id": asset_id}).fetchone()
        
        if not result:
            print("❌ treemap_live_view에 데이터 없음")
            return
        
        print("✅ treemap_live_view에 데이터 존재")
        print(f"📊 데이터 컬럼 수: {len(result._mapping)}")
        print(f"📋 컬럼 목록: {list(result._mapping.keys())}")
        
        # 4. 핵심 필드 확인
        print(f"\n4️⃣ 핵심 필드 확인")
        overview_dict = dict(result._mapping)
        
        critical_fields = ['asset_id', 'ticker', 'name', 'asset_type', 'updated_at', 'created_at']
        for field in critical_fields:
            value = overview_dict.get(field)
            print(f"  {field}: {value} (타입: {type(value)})")
        
        # 5. type_name 매핑 확인
        print(f"\n5️⃣ type_name 매핑 확인")
        if 'type_name' not in overview_dict and 'asset_type' in overview_dict:
            overview_dict['type_name'] = overview_dict.get('asset_type')
            print(f"✅ type_name 매핑 완료: {overview_dict.get('type_name')}")
        else:
            print(f"ℹ️ type_name 이미 존재: {overview_dict.get('type_name')}")
        
        # 6. 데이터 타입 변환 테스트
        print(f"\n6️⃣ 데이터 타입 변환 테스트")
        
        # 날짜/시간 타입 변환
        date_fields = ['created_at', 'updated_at', 'realtime_updated_at', 'daily_data_updated_at']
        for field in date_fields:
            value = overview_dict.get(field)
            if value:
                print(f"  {field}: {value} (타입: {type(value)})")
        
        # 정수 타입 변환
        int_fields = ['asset_id', 'employees_count', 'cmc_rank']
        for field in int_fields:
            value = overview_dict.get(field)
            if value is not None:
                try:
                    converted = int(value)
                    overview_dict[field] = converted
                    print(f"  {field}: {converted} (변환 성공)")
                except (ValueError, TypeError) as e:
                    print(f"  {field}: {value} (변환 실패: {e})")
                    overview_dict[field] = None
        
        # 불린 타입 변환
        bool_fields = ['is_active', 'leveraged', 'crypto_is_active']
        for field in bool_fields:
            value = overview_dict.get(field)
            if value is not None:
                try:
                    converted = bool(value)
                    overview_dict[field] = converted
                    print(f"  {field}: {converted} (변환 성공)")
                except (ValueError, TypeError) as e:
                    print(f"  {field}: {value} (변환 실패: {e})")
                    overview_dict[field] = None
        
        # 숫자 타입 변환
        float_fields = ['current_price', 'price_change_percentage_24h', 'market_cap', 'pe_ratio', 'eps', 'beta']
        for field in float_fields:
            value = overview_dict.get(field)
            if value is not None:
                try:
                    converted = float(value)
                    overview_dict[field] = converted
                    print(f"  {field}: {converted} (변환 성공)")
                except (ValueError, TypeError) as e:
                    print(f"  {field}: {value} (변환 실패: {e})")
                    overview_dict[field] = None
        
        # 7. AssetOverviewResponse 스키마 검증
        print(f"\n7️⃣ AssetOverviewResponse 스키마 검증")
        try:
            response = AssetOverviewResponse(**overview_dict)
            print("✅ AssetOverviewResponse 스키마 검증 성공")
            print(f"📊 응답 객체 생성 성공: {type(response)}")
            return response
        except Exception as e:
            print(f"❌ AssetOverviewResponse 스키마 검증 실패: {e}")
            
            # 상세 오류 정보 출력
            if hasattr(e, 'errors'):
                print("🔍 상세 검증 오류:")
                for error in e.errors():
                    field = error.get('loc', ['unknown'])[0]
                    input_value = error.get('input')
                    error_type = error.get('type')
                    error_msg = error.get('msg')
                    print(f"  - {field}: {input_value} (타입: {type(input_value)}) - {error_type}: {error_msg}")
            
            return None
        
    except Exception as e:
        print(f"❌ 전체 프로세스 오류: {e}")
        traceback.print_exc()
        return None

def test_get_unified_overview_data(asset_identifier: str = "NMRX"):
    """get_unified_overview_data 함수 직접 테스트"""
    print(f"\n8️⃣ get_unified_overview_data 함수 직접 테스트")
    try:
        db = next(get_postgres_db())
        asset_id = resolve_asset_identifier(db, asset_identifier)
        result = get_unified_overview_data(db, asset_id)
        
        if result:
            print("✅ get_unified_overview_data 성공")
            print(f"📊 결과 타입: {type(result)}")
            if hasattr(result, '__dict__'):
                print(f"📋 결과 키: {list(result.__dict__.keys())}")
        else:
            print("❌ get_unified_overview_data 실패 - None 반환")
            
    except Exception as e:
        print(f"❌ get_unified_overview_data 오류: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    print("🚀 Asset Overview API 디버깅 스크립트 시작")
    print("=" * 60)
    
    # NMRX로 테스트
    debug_overview_api("NMRX")
    
    # get_unified_overview_data 직접 테스트
    test_get_unified_overview_data("NMRX")
    
    print("\n" + "=" * 60)
    print("🏁 디버깅 완료")
