#!/usr/bin/env python3
"""
Posts API 테스트 스크립트
"""

import requests
import json
import sys
from datetime import datetime

# API 기본 설정
BASE_URL = "http://localhost:8001/api/v1"
HEADERS = {"Content-Type": "application/json"}

def test_api_connection():
    """API 연결 테스트"""
    print("🔍 API 연결 테스트...")
    try:
        response = requests.get(f"{BASE_URL}/posts/test", timeout=10)
        if response.status_code == 200:
            print("✅ API 연결 성공")
            return True
        else:
            print(f"❌ API 연결 실패: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API 연결 오류: {e}")
        return False

def test_get_posts():
    """포스트 목록 조회 테스트"""
    print("\n📋 포스트 목록 조회 테스트...")
    try:
        response = requests.get(f"{BASE_URL}/posts/", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 포스트 목록 조회 성공: {data.get('total', 0)}개 포스트")
            return True
        else:
            print(f"❌ 포스트 목록 조회 실패: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 포스트 목록 조회 오류: {e}")
        return False

def test_get_post_by_id():
    """포스트 ID로 조회 테스트"""
    print("\n🔍 포스트 ID 조회 테스트...")
    try:
        # 먼저 포스트 목록을 가져와서 존재하는 ID 확인
        response = requests.get(f"{BASE_URL}/posts/", timeout=10)
        if response.status_code == 200:
            data = response.json()
            posts = data.get('posts', [])
            if posts:
                post_id = posts[0]['id']
                print(f"테스트할 포스트 ID: {post_id}")
                
                # 포스트 상세 조회
                response = requests.get(f"{BASE_URL}/posts/{post_id}", timeout=10)
                print(f"Status Code: {response.status_code}")
                
                if response.status_code == 200:
                    print("✅ 포스트 ID 조회 성공")
                    return True
                else:
                    print(f"❌ 포스트 ID 조회 실패: {response.text}")
                    return False
            else:
                print("❌ 조회할 포스트가 없습니다")
                return False
        else:
            print(f"❌ 포스트 목록 조회 실패: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 포스트 ID 조회 오류: {e}")
        return False

def test_create_post_simple():
    """간단한 포스트 생성 테스트"""
    print("\n➕ 간단한 포스트 생성 테스트...")
    
    test_data = {
        "title": "API 테스트 포스트",
        "slug": f"api-test-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "description": "API 테스트용 포스트입니다",
        "content": "이것은 API 테스트용 포스트입니다."
    }
    
    try:
        response = requests.post(f"{BASE_URL}/posts/", 
                               headers=HEADERS, 
                               data=json.dumps(test_data), 
                               timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ 간단한 포스트 생성 성공")
            return True
        else:
            print(f"❌ 간단한 포스트 생성 실패: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 간단한 포스트 생성 오류: {e}")
        return False

def test_create_post_full():
    """전체 필드를 포함한 포스트 생성 테스트"""
    print("\n➕ 전체 필드 포스트 생성 테스트...")
    
    test_data = {
        "title": "전체 필드 API 테스트 포스트",
        "slug": f"full-test-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "description": "전체 필드를 포함한 API 테스트용 포스트입니다",
        "content": "이것은 전체 필드를 포함한 API 테스트용 포스트입니다.",
        "excerpt": "전체 필드 API 테스트",
        "status": "draft",
        "featured": False,
        "author_id": 13,
        "category_id": 4,
        "meta_title": "전체 필드 API 테스트 포스트",
        "meta_description": "전체 필드를 포함한 API 테스트용 포스트입니다",
        "keywords": ["test", "api", "post", "full"],
        "canonical_url": f"/full-test-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "post_type": "post",
        "post_parent": None,
        "menu_order": 0,
        "comment_count": 0,
        "post_password": None,
        "ping_status": "open",
        "sync_with_asset": False,
        "auto_sync_content": False
    }
    
    try:
        response = requests.post(f"{BASE_URL}/posts/", 
                               headers=HEADERS, 
                               data=json.dumps(test_data), 
                               timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ 전체 필드 포스트 생성 성공")
            return True
        else:
            print(f"❌ 전체 필드 포스트 생성 실패: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 전체 필드 포스트 생성 오류: {e}")
        return False

def test_create_asset_post():
    """Asset 타입 포스트 생성 테스트"""
    print("\n➕ Asset 타입 포스트 생성 테스트...")
    
    test_data = {
        "title": "테스트 자산",
        "slug": f"test-asset-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "description": "테스트용 자산 포스트입니다",
        "content": "This page is currently under construction.",
        "excerpt": "테스트용 자산",
        "status": "published",
        "featured": False,
        "author_id": 13,
        "category_id": 4,
        "meta_title": "테스트 자산",
        "meta_description": "테스트용 자산 포스트입니다",
        "keywords": ["test", "asset", "stock"],
        "canonical_url": f"/assets/test-asset-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "post_type": "assets",
        "post_parent": 12,  # Assets 페이지 ID
        "menu_order": 0,
        "comment_count": 0,
        "post_password": None,
        "ping_status": "open",
        "sync_with_asset": True,
        "auto_sync_content": True,
        "asset_id": 127,  # 실제 존재하는 Asset ID (Numerex Corp)
        "asset_type_id": 1,
        "post_info": {
            "exchange": "NASDAQ",
            "currency": "USD",
            "data_source": "test",
            "is_active": True
        }
    }
    
    try:
        response = requests.post(f"{BASE_URL}/posts/", 
                               headers=HEADERS, 
                               data=json.dumps(test_data), 
                               timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Asset 타입 포스트 생성 성공")
            return True
        else:
            print(f"❌ Asset 타입 포스트 생성 실패: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Asset 타입 포스트 생성 오류: {e}")
        return False

def test_create_onchain_post():
    """Onchain 타입 포스트 생성 테스트"""
    print("\n➕ Onchain 타입 포스트 생성 테스트...")
    
    test_data = {
        "title": "테스트 온체인 메트릭",
        "slug": f"test-onchain-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "description": "테스트용 온체인 메트릭 포스트입니다",
        "content": "This onchain metric is currently under construction.",
        "excerpt": "테스트용 온체인 메트릭",
        "status": "published",
        "featured": False,
        "author_id": 13,
        "category_id": 13,  # Market Cycle Indicators
        "meta_title": "Bitcoin Price vs. Test Metric",
        "meta_description": "테스트용 온체인 메트릭 포스트입니다",
        "keywords": ["test", "onchain", "bitcoin"],
        "canonical_url": f"/onchain/test-onchain-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "post_type": "onchain",
        "post_parent": 12,  # OnChain 페이지 ID (Assets와 동일하게 설정)
        "menu_order": 0,
        "comment_count": 0,
        "post_password": None,
        "ping_status": "open",
        "sync_with_asset": False,
        "auto_sync_content": False,
        "post_info": {
            "interpretations": {"test": "This is a test metric"},
            "chart_title": "Bitcoin Price vs. Test Metric",
            "loading_text": "Loading test data...",
            "data_count": 100,
            "current_range": "1D",
            "is_enabled": True,
            "metric_category": "Market",
            "original_metric_id": f"test_onchain_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        }
    }
    
    try:
        response = requests.post(f"{BASE_URL}/posts/", 
                               headers=HEADERS, 
                               data=json.dumps(test_data), 
                               timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Onchain 타입 포스트 생성 성공")
            return True
        else:
            print(f"❌ Onchain 타입 포스트 생성 실패: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Onchain 타입 포스트 생성 오류: {e}")
        return False

def test_update_post():
    """포스트 수정 테스트"""
    print("\n✏️ 포스트 수정 테스트...")
    
    # 먼저 포스트 목록을 가져와서 존재하는 ID 확인
    try:
        response = requests.get(f"{BASE_URL}/posts/", timeout=10)
        if response.status_code == 200:
            data = response.json()
            posts = data.get('posts', [])
            if posts:
                post_id = posts[0]['id']
                print(f"수정할 포스트 ID: {post_id}")
                
                # 포스트 수정
                update_data = {
                    "title": "수정된 포스트 제목",
                    "description": "수정된 포스트 설명"
                }
                
                response = requests.put(f"{BASE_URL}/posts/{post_id}", 
                                      headers=HEADERS, 
                                      data=json.dumps(update_data), 
                                      timeout=10)
                
                print(f"Status Code: {response.status_code}")
                print(f"Response: {response.text}")
                
                if response.status_code == 200:
                    print("✅ 포스트 수정 성공")
                    return True
                else:
                    print(f"❌ 포스트 수정 실패: {response.text}")
                    return False
            else:
                print("❌ 수정할 포스트가 없습니다")
                return False
        else:
            print(f"❌ 포스트 목록 조회 실패: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 포스트 수정 오류: {e}")
        return False

def test_categories():
    """카테고리 API 테스트"""
    print("\n📂 카테고리 API 테스트...")
    try:
        response = requests.get(f"{BASE_URL}/posts/categories/", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 카테고리 목록 조회 성공: {len(data)}개 카테고리")
            return True
        else:
            print(f"❌ 카테고리 목록 조회 실패: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 카테고리 API 오류: {e}")
        return False

def main():
    """메인 함수"""
    print("🚀 Posts API 테스트 스크립트 시작")
    print("=" * 60)
    
    tests = [
        ("API 연결", test_api_connection),
        ("포스트 목록 조회", test_get_posts),
        ("포스트 ID 조회", test_get_post_by_id),
        ("간단한 포스트 생성", test_create_post_simple),
        ("전체 필드 포스트 생성", test_create_post_full),
        ("Asset 타입 포스트 생성", test_create_asset_post),
        ("Onchain 타입 포스트 생성", test_create_onchain_post),
        ("포스트 수정", test_update_post),
        ("카테고리 API", test_categories)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} 테스트 중 예외 발생: {e}")
            results.append((test_name, False))
    
    # 결과 요약
    print("\n" + "=" * 60)
    print("📊 테스트 결과 요약")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ 통과" if result else "❌ 실패"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\n총 {total}개 테스트 중 {passed}개 통과 ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("🎉 모든 테스트가 성공했습니다!")
    else:
        print("⚠️ 일부 테스트가 실패했습니다. 로그를 확인해주세요.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
