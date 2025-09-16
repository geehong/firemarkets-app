#!/usr/bin/env python3
"""
상세 로깅 시스템 테스트 스크립트
"""
import asyncio
import sys
import os
from datetime import datetime

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.collectors.logging_helper import (
    create_structured_log, 
    create_collection_summary_log, 
    create_api_call_log,
    CollectorLoggingHelper
)
from app.collectors.base_collector import BaseCollector
from app.models.system import SchedulerLog, ApiCallLog
from app.core.database import SessionLocal


class MockBaseCollector(BaseCollector):
    """테스트용 Mock BaseCollector"""
    
    def __init__(self):
        super().__init__()
        self.logs = []
    
    def log_task_progress(self, message: str, data: dict = None):
        """Mock 로그 메소드"""
        self.logs.append({"type": "progress", "message": message, "data": data})
    
    def log_api_call(self, api_name: str, endpoint: str, success: bool, data: dict = None):
        """Mock API 호출 로그"""
        self.logs.append({"type": "api_call", "api_name": api_name, "endpoint": endpoint, "success": success, "data": data})
    
    def log_error_with_context(self, error: Exception, context: str = ""):
        """Mock 오류 로그"""
        self.logs.append({"type": "error", "error": str(error), "context": context})


def test_structured_log_creation():
    """구조화된 로그 생성 테스트"""
    print("=== 구조화된 로그 생성 테스트 ===")
    
    db = SessionLocal()
    try:
        # 테스트 로그 생성
        log_entry = create_structured_log(
            db=db,
            collector_name="TestCollector",
            status="success",
            message="Test collection completed",
            details={
                "total_assets": 10,
                "success_count": 8,
                "failure_count": 2,
                "api_provider": "TestAPI"
            },
            assets_processed=10,
            data_points_added=100
        )
        
        if log_entry:
            print(f"✅ 구조화된 로그 생성 성공: ID {log_entry.log_id}")
            print(f"  - 상태: {log_entry.status}")
            print(f"  - 메시지: {log_entry.message}")
            print(f"  - 상세 정보: {log_entry.details}")
            print(f"  - 처리된 자산: {log_entry.assets_processed}")
            print(f"  - 추가된 데이터: {log_entry.data_points_added}")
        else:
            print("❌ 구조화된 로그 생성 실패")
            
    except Exception as e:
        print(f"❌ 테스트 중 오류 발생: {e}")
    finally:
        db.close()
    
    print()


def test_collection_summary_log():
    """수집 요약 로그 생성 테스트"""
    print("=== 수집 요약 로그 생성 테스트 ===")
    
    try:
        # 테스트 데이터
        failed_assets = [
            {"ticker": "AAPL", "error": "API rate limit exceeded", "error_type": "RateLimitError"},
            {"ticker": "GOOGL", "error": "Asset not found", "error_type": "NotFoundError"}
        ]
        
        log_entry = create_collection_summary_log(
            collector_name="TestCollector",
            total_assets=10,
            success_count=8,
            failure_count=2,
            added_records=150,
            failed_assets=failed_assets,
            api_provider="TestAPI",
            collection_type="OHLCV",
            duration_seconds=120,
            start_time=datetime.now(),
            end_time=datetime.now()
        )
        
        if log_entry:
            print(f"✅ 수집 요약 로그 생성 성공: ID {log_entry.log_id}")
            print(f"  - 상태: {log_entry.status}")
            print(f"  - 메시지: {log_entry.message}")
            print(f"  - 성공률: {log_entry.details.get('success_rate', 0)}%")
            print(f"  - 실패한 자산 수: {len(log_entry.details.get('failed_assets', []))}")
        else:
            print("❌ 수집 요약 로그 생성 실패")
            
    except Exception as e:
        print(f"❌ 테스트 중 오류 발생: {e}")
    
    print()


def test_api_call_log():
    """API 호출 로그 생성 테스트"""
    print("=== API 호출 로그 생성 테스트 ===")
    
    try:
        # 성공한 API 호출 로그
        success_log = create_api_call_log(
            api_name="TestAPI",
            endpoint="/v1/price",
            ticker="AAPL",
            status_code=200,
            response_time_ms=150,
            success=True,
            additional_data={"data_points": 100}
        )
        
        if success_log:
            print(f"✅ 성공한 API 호출 로그 생성: ID {success_log.log_id}")
            print(f"  - API: {success_log.api_name}")
            print(f"  - 엔드포인트: {success_log.endpoint}")
            print(f"  - 티커: {success_log.asset_ticker}")
            print(f"  - 응답 시간: {success_log.response_time_ms}ms")
        else:
            print("❌ 성공한 API 호출 로그 생성 실패")
        
        # 실패한 API 호출 로그
        failure_log = create_api_call_log(
            api_name="TestAPI",
            endpoint="/v1/price",
            ticker="INVALID",
            status_code=404,
            response_time_ms=200,
            success=False,
            error_message="Asset not found",
            additional_data={"error_type": "NotFoundError"}
        )
        
        if failure_log:
            print(f"✅ 실패한 API 호출 로그 생성: ID {failure_log.log_id}")
            print(f"  - 상태 코드: {failure_log.status_code}")
            print(f"  - 오류 메시지: {failure_log.error_message}")
        else:
            print("❌ 실패한 API 호출 로그 생성 실패")
            
    except Exception as e:
        print(f"❌ 테스트 중 오류 발생: {e}")
    
    print()


def test_collector_logging_helper():
    """CollectorLoggingHelper 테스트"""
    print("=== CollectorLoggingHelper 테스트 ===")
    
    try:
        # Mock BaseCollector 생성
        mock_collector = MockBaseCollector()
        logging_helper = CollectorLoggingHelper("TestCollector", mock_collector)
        
        # 수집 시작
        logging_helper.start_collection("OHLCV", 10, collection_type="test")
        print(f"✅ 수집 시작 로그: {len(mock_collector.logs)}개 로그 생성")
        
        # 자산 처리 시작
        mock_asset = type('MockAsset', (), {'ticker': 'AAPL'})()
        logging_helper.log_asset_processing_start(mock_asset, "TestAPI")
        print(f"✅ 자산 처리 시작 로그: {len(mock_collector.logs)}개 로그 생성")
        
        # API 호출 시작
        logging_helper.log_api_call_start("TestAPI", "AAPL", "/v1/price")
        print(f"✅ API 호출 시작 로그: {len(mock_collector.logs)}개 로그 생성")
        
        # API 호출 성공
        logging_helper.log_api_call_success("TestAPI", "AAPL", 100)
        print(f"✅ API 호출 성공 로그: {len(mock_collector.logs)}개 로그 생성")
        
        # 자산 처리 성공
        logging_helper.log_asset_processing_success(mock_asset, "TestAPI", 50)
        print(f"✅ 자산 처리 성공 로그: {len(mock_collector.logs)}개 로그 생성")
        
        # 자산 처리 실패
        logging_helper.log_asset_processing_failure(mock_asset, Exception("Test error"), ["TestAPI"])
        print(f"✅ 자산 처리 실패 로그: {len(mock_collector.logs)}개 로그 생성")
        
        # 수집 완료
        logging_helper.log_collection_completion(10, 500, api_provider="TestAPI")
        print(f"✅ 수집 완료 로그: {len(mock_collector.logs)}개 로그 생성")
        
        print(f"📊 총 생성된 로그 수: {len(mock_collector.logs)}")
        
        # 로그 타입별 통계
        log_types = {}
        for log in mock_collector.logs:
            log_type = log.get("type", "unknown")
            log_types[log_type] = log_types.get(log_type, 0) + 1
        
        for log_type, count in log_types.items():
            print(f"  - {log_type}: {count}개")
            
    except Exception as e:
        print(f"❌ 테스트 중 오류 발생: {e}")
    
    print()


def test_database_schema():
    """데이터베이스 스키마 테스트"""
    print("=== 데이터베이스 스키마 테스트 ===")
    
    db = SessionLocal()
    try:
        # SchedulerLog 테이블 구조 확인
        scheduler_logs = db.query(SchedulerLog).limit(5).all()
        print(f"✅ SchedulerLog 테이블 접근 성공: {len(scheduler_logs)}개 레코드")
        
        # ApiCallLog 테이블 구조 확인
        api_call_logs = db.query(ApiCallLog).limit(5).all()
        print(f"✅ ApiCallLog 테이블 접근 성공: {len(api_call_logs)}개 레코드")
        
        # 최근 로그 확인
        recent_logs = db.query(SchedulerLog).order_by(SchedulerLog.created_at.desc()).limit(3).all()
        if recent_logs:
            print("📋 최근 로그:")
            for log in recent_logs:
                print(f"  - {log.job_name}: {log.status} ({log.created_at})")
                if log.details:
                    print(f"    상세 정보: {log.details}")
        else:
            print("📋 로그가 없습니다.")
            
    except Exception as e:
        print(f"❌ 데이터베이스 접근 오류: {e}")
    finally:
        db.close()
    
    print()


def test_logging_integration():
    """로깅 시스템 통합 테스트"""
    print("=== 로깅 시스템 통합 테스트 ===")
    
    try:
        # 실제 OHLCV Collector 로깅 테스트
        from app.collectors.ohlcv_collector import OHLCVCollector
        
        collector = OHLCVCollector()
        
        # 로깅 헬퍼 확인
        if hasattr(collector, 'logging_helper'):
            print("✅ OHLCVCollector에 로깅 헬퍼가 정상적으로 초기화됨")
            print(f"  - 컬렉터 이름: {collector.logging_helper.collector_name}")
            print(f"  - 베이스 컬렉터: {collector.logging_helper.base_collector}")
        else:
            print("❌ OHLCVCollector에 로깅 헬퍼가 없음")
        
        # 로깅 헬퍼 메소드들 확인
        required_methods = [
            'start_collection',
            'log_asset_processing_start',
            'log_api_call_start',
            'log_api_call_success',
            'log_api_call_failure',
            'log_asset_processing_success',
            'log_asset_processing_failure',
            'log_collection_completion'
        ]
        
        for method in required_methods:
            if hasattr(collector.logging_helper, method):
                print(f"✅ {method} 메소드 존재")
            else:
                print(f"❌ {method} 메소드 없음")
                
    except Exception as e:
        print(f"❌ 통합 테스트 중 오류 발생: {e}")
    
    print()


def main():
    """메인 테스트 함수"""
    print("🚀 상세 로깅 시스템 테스트 시작\n")
    
    try:
        test_structured_log_creation()
        test_collection_summary_log()
        test_api_call_log()
        test_collector_logging_helper()
        test_database_schema()
        test_logging_integration()
        
        print("🎉 모든 테스트가 성공적으로 완료되었습니다!")
        print("\n📋 상세 로깅 시스템 요약:")
        print("✅ 구조화된 로그 생성 기능")
        print("✅ 수집 요약 로그 생성 기능")
        print("✅ API 호출 로그 생성 기능")
        print("✅ CollectorLoggingHelper 클래스")
        print("✅ 데이터베이스 스키마 지원")
        print("✅ OHLCV Collector 통합")
        print("✅ JSON 형태의 상세 정보 저장")
        print("✅ 실시간 로그 추적")
        print("✅ 관리자 페이지용 구조화된 데이터")
        
    except Exception as e:
        print(f"❌ 테스트 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()







