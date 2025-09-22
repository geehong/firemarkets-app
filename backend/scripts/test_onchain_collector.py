#!/usr/bin/env python3
"""
온체인 컬렉터 테스트 스크립트
수정된 OnchainCollector가 정상적으로 작동하는지 테스트합니다.
"""

import asyncio
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.append('/app')

from app.services.scheduler_service import scheduler_service
from app.core.database import SessionLocal
from app.services.api_strategy_manager import ApiStrategyManager
from app.collectors.onchain_collector import OnchainCollector

async def test_onchain_collector():
    """온체인 컬렉터 테스트 함수"""
    print("🧪 수정된 OnchainCollector 테스트 시작")
    print("=" * 50)
    
    db = SessionLocal()
    try:
        # API 매니저 생성
        print("📡 API Strategy Manager 초기화 중...")
        api_manager = ApiStrategyManager(config_manager=scheduler_service.config_manager)
        
        # 온체인 컬렉터 인스턴스 생성
        print("🔧 OnchainCollector 인스턴스 생성 중...")
        collector = OnchainCollector(
            db=db,
            config_manager=scheduler_service.config_manager,
            api_manager=api_manager,
            redis_queue_manager=scheduler_service.redis_queue_manager
        )
        
        # 데이터 수집 실행
        print("🚀 온체인 데이터 수집 시작...")
        result = await collector.collect_with_settings()
        
        print("=" * 50)
        print("✅ 테스트 완료!")
        print(f"📊 결과: {result}")
        print("=" * 50)
        
        return result
        
    except Exception as e:
        print("=" * 50)
        print(f"❌ 오류 발생: {e}")
        print("=" * 50)
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}
    finally:
        db.close()

if __name__ == "__main__":
    # 비동기 함수 실행
    result = asyncio.run(test_onchain_collector())
    
    # 결과에 따른 종료 코드 설정
    if result.get("success", False):
        print("🎉 테스트 성공!")
        sys.exit(0)
    else:
        print("💥 테스트 실패!")
        sys.exit(1)



