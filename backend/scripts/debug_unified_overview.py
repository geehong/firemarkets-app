#!/usr/bin/env python3
"""
get_unified_overview_data 함수 내부 디버깅 스크립트
왜 asset_id와 updated_at이 None으로 변환되는지 정밀 분석
"""

import sys
import os
sys.path.append('/app')

from app.core.database import get_postgres_db
from app.api.v1.endpoints.assets import resolve_asset_identifier
from app.schemas.asset import AssetOverviewResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
import json
import traceback

def debug_unified_overview_internal(asset_identifier: str = "NMRX"):
    """get_unified_overview_data 함수 내부 단계별 디버깅"""
    print(f"🔍 get_unified_overview_data 내부 디버깅: {asset_identifier}")
    print("=" * 60)
    
    try:
        db = next(get_postgres_db())
        asset_id = resolve_asset_identifier(db, asset_identifier)
        print(f"✅ Asset ID: {asset_id}")
        
        # 1. treemap_live_view 쿼리 실행
        print(f"\n1️⃣ treemap_live_view 쿼리 실행")
        result = db.execute(text("""
            SELECT * FROM treemap_live_view
            WHERE asset_id = :asset_id
        """), {"asset_id": asset_id}).fetchone()
        
        if not result:
            print("❌ treemap_live_view에 데이터 없음")
            return
        
        print("✅ treemap_live_view 쿼리 성공")
        
        # 2. SQLAlchemy Row를 딕셔너리로 변환
        print(f"\n2️⃣ SQLAlchemy Row를 딕셔너리로 변환")
        overview_dict = dict(result._mapping)
        print(f"📊 변환된 딕셔너리 키 수: {len(overview_dict)}")
        
        # 3. 핵심 필드 확인 (변환 전)
        print(f"\n3️⃣ 핵심 필드 확인 (변환 전)")
        critical_fields = ['asset_id', 'ticker', 'name', 'asset_type', 'updated_at', 'created_at']
        for field in critical_fields:
            value = overview_dict.get(field)
            print(f"  {field}: {value} (타입: {type(value)})")
        
        # 4. type_name 매핑
        print(f"\n4️⃣ type_name 매핑")
        if 'type_name' not in overview_dict and 'asset_type' in overview_dict:
            overview_dict['type_name'] = overview_dict.get('asset_type')
            print(f"✅ type_name 매핑: {overview_dict.get('type_name')}")
        
        # 5. 자산 타입별 추가 정보 조회
        print(f"\n5️⃣ 자산 타입별 추가 정보 조회")
        asset_type = overview_dict.get('asset_type')
        print(f"  자산 타입: {asset_type}")
        
        if asset_type == 'Stocks':
            print("  주식 타입 - 추가 정보 조회 시도")
            # get_stock_additional_data 함수 호출 시뮬레이션
            # 실제로는 여기서 추가 데이터를 가져옴
        elif asset_type == 'Crypto':
            print("  암호화폐 타입 - 추가 정보 조회 시도")
        elif asset_type == 'ETFs':
            print("  ETF 타입 - 추가 정보 조회 시도")
        
        # 6. 데이터 타입 변환 과정 (단계별)
        print(f"\n6️⃣ 데이터 타입 변환 과정 (단계별)")
        
        # 변환 전 핵심 필드 저장
        original_asset_id = overview_dict.get('asset_id')
        original_updated_at = overview_dict.get('updated_at')
        print(f"  변환 전 asset_id: {original_asset_id} (타입: {type(original_asset_id)})")
        print(f"  변환 전 updated_at: {original_updated_at} (타입: {type(original_updated_at)})")
        
        # None 값 처리 및 타입 변환
        print(f"\n7️⃣ None 값 처리 및 타입 변환")
        for key, value in overview_dict.items():
            if value is None:
                print(f"  {key}: None 값 발견 - 건너뛰기")
                continue
            
            # 날짜/시간 타입 변환
            if key in ['created_at', 'updated_at', 'realtime_updated_at', 'daily_data_updated_at'] and value:
                print(f"  {key}: 날짜/시간 필드 - 변환 없음")
                overview_dict[key] = value
            # 정수 타입 변환
            elif key in ['asset_id', 'employees_count', 'cmc_rank']:
                try:
                    converted = int(value) if value is not None else None
                    overview_dict[key] = converted
                    print(f"  {key}: {value} → {converted} (정수 변환 성공)")
                except (ValueError, TypeError) as e:
                    print(f"  {key}: {value} (정수 변환 실패: {e})")
                    overview_dict[key] = None
            # 불린 타입 변환
            elif key in ['is_active', 'leveraged', 'crypto_is_active']:
                try:
                    converted = bool(value) if value is not None else None
                    overview_dict[key] = converted
                    print(f"  {key}: {value} → {converted} (불린 변환 성공)")
                except (ValueError, TypeError) as e:
                    print(f"  {key}: {value} (불린 변환 실패: {e})")
                    overview_dict[key] = None
            # 숫자 타입 변환
            elif key in ['current_price', 'price_change_percentage_24h', 'market_cap', 'pe_ratio', 'eps', 'beta']:
                try:
                    converted = float(value) if value is not None else None
                    overview_dict[key] = converted
                    print(f"  {key}: {value} → {converted} (숫자 변환 성공)")
                except (ValueError, TypeError) as e:
                    print(f"  {key}: {value} (숫자 변환 실패: {e})")
                    overview_dict[key] = None
        
        # 8. 변환 후 핵심 필드 확인
        print(f"\n8️⃣ 변환 후 핵심 필드 확인")
        final_asset_id = overview_dict.get('asset_id')
        final_updated_at = overview_dict.get('updated_at')
        print(f"  변환 후 asset_id: {final_asset_id} (타입: {type(final_asset_id)})")
        print(f"  변환 후 updated_at: {final_updated_at} (타입: {type(final_updated_at)})")
        
        # 9. AssetOverviewResponse 스키마 검증
        print(f"\n9️⃣ AssetOverviewResponse 스키마 검증")
        try:
            response = AssetOverviewResponse(**overview_dict)
            print("✅ AssetOverviewResponse 스키마 검증 성공")
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

if __name__ == "__main__":
    print("🚀 get_unified_overview_data 내부 디버깅 스크립트 시작")
    print("=" * 60)
    
    # NMRX로 테스트
    debug_unified_overview_internal("NMRX")
    
    print("\n" + "=" * 60)
    print("🏁 내부 디버깅 완료")
