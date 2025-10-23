#!/usr/bin/env python3
"""
메뉴 metadata에 영어 이름 추가 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
import json

# 데이터베이스 URL 설정
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://geehong:Power6100@db_postgres:5432/markets')

def update_menu_metadata():
    """메뉴 metadata에 영어 이름 추가"""
    
    # 데이터베이스 연결
    engine = create_engine(DATABASE_URL)
    
    # 메뉴 번역 매핑 (영어 → 한국어)
    menu_translations = {
        'Dashboard': '대시보드',
        'Assets': '자산',
        'OnChain': '온체인',
        'Map': '지도',
        'Stocks': '주식',
        'Commodities': '상품',
        'ETFs': 'ETF',
        'Funds': '펀드',
        'Crypto': '암호화폐',
        'All Assets': '전체 자산',
        'Admin': '관리자',
        'Components': '컴포넌트',
        'Charts': '차트',
        'Forms': '폼',
        'Inputs': '입력',
        'Tables': '테이블',
        'E-commerce': '전자상거래',
        'Examples': '예제',
        'Headers': '헤더',
        'Debug': '디버그',
        'Calendar': '캘린더',
        'Profile': '프로필',
        'Blank Page': '빈 페이지',
        'Avatars': '아바타',
        'Badge': '배지',
        'Buttons': '버튼',
        'Images': '이미지',
        'Modals': '모달',
        'Videos': '비디오',
        'App Config': '앱 설정',
        'Sign In': '로그인'
    }
    
    try:
        with engine.connect() as conn:
            # 1. 기존 메뉴 조회
            print("1. 기존 메뉴 조회 중...")
            result = conn.execute(text("""
                SELECT id, name, menu_metadata 
                FROM menus 
                WHERE is_active = true
                ORDER BY id;
            """))
            
            menus = result.fetchall()
            print(f"📊 총 {len(menus)}개 메뉴 발견")
            
            # 2. 각 메뉴의 metadata 업데이트
            updated_count = 0
            for menu in menus:
                menu_id, name, metadata = menu
                
                # 기존 metadata 파싱
                if metadata:
                    try:
                        if isinstance(metadata, str):
                            metadata_dict = json.loads(metadata)
                        else:
                            metadata_dict = metadata
                    except:
                        metadata_dict = {}
                else:
                    metadata_dict = {}
                
                # 한국어 이름 추가
                if name in menu_translations:
                    metadata_dict['ko_menu_name'] = menu_translations[name]
                    
                    # metadata 업데이트
                    conn.execute(text("""
                        UPDATE menus 
                        SET menu_metadata = :metadata
                        WHERE id = :menu_id
                    """), {
                        'metadata': json.dumps(metadata_dict, ensure_ascii=False),
                        'menu_id': menu_id
                    })
                    
                    updated_count += 1
                    print(f"✅ {name} → {menu_translations[name]}")
                else:
                    print(f"⚠️  번역 없음: {name}")
            
            conn.commit()
            
            # 3. 업데이트 결과 확인
            print(f"\n📊 업데이트 완료:")
            print(f"   - 총 메뉴 수: {len(menus)}")
            print(f"   - 업데이트된 메뉴: {updated_count}")
            
            # 4. 샘플 데이터 확인
            print("\n4. 샘플 데이터 확인:")
            result = conn.execute(text("""
                SELECT name, menu_metadata 
                FROM menus 
                WHERE is_active = true 
                AND menu_metadata IS NOT NULL
                LIMIT 5;
            """))
            
            samples = result.fetchall()
            for sample in samples:
                print(f"   - {sample[0]}: {sample[1]}")
            
            print("\n🎉 메뉴 metadata 업데이트 완료!")
            
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        raise

if __name__ == "__main__":
    update_menu_metadata()
