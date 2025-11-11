#!/usr/bin/env python3
"""
OHLCV 파이프라인 테스트 스크립트
- 실제 데이터 수집 → 큐 저장 → 데이터 프로세서 처리 → DB 저장 확인
"""
import asyncio
import sys
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any
import json

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.api_strategy_manager import ApiStrategyManager
from app.utils.redis_queue_manager import RedisQueueManager
from app.core.config_manager import ConfigManager
from app.models.asset import Asset, OHLCVData
from app.core.database import PostgreSQLSessionLocal
from sqlalchemy import text

class OHLCVPipelineTester:
    """OHLCV 파이프라인 테스트"""
    
    def __init__(self):
        self.config_manager = ConfigManager()
        self.api_manager = ApiStrategyManager(config_manager=self.config_manager)
        self.redis_queue_manager = RedisQueueManager(config_manager=self.config_manager)
        self.db = PostgreSQLSessionLocal()
    
    def get_test_asset(self, ticker: str = "AAPL") -> Dict[str, Any]:
        """테스트용 자산 조회"""
        asset = self.db.query(Asset).filter(Asset.ticker == ticker).first()
        if not asset:
            raise ValueError(f"자산 {ticker}을 찾을 수 없습니다.")
        return {
            'asset_id': asset.asset_id,
            'ticker': asset.ticker,
            'name': asset.name,
            'asset_type_id': asset.asset_type_id
        }
    
    async def test_collect_and_queue(self, ticker: str = "AAPL", interval: str = "1d") -> Dict[str, Any]:
        """1단계: 데이터 수집 및 큐 저장"""
        print("=" * 60)
        print(f"1단계: 데이터 수집 및 큐 저장 테스트")
        print(f"티커: {ticker}, Interval: {interval}")
        print("=" * 60)
        
        asset = self.get_test_asset(ticker)
        asset_id = asset['asset_id']
        
        print(f"\n📊 {ticker} (asset_id: {asset_id}) 데이터 수집 시작...")
        
        # API에서 데이터 수집
        ohlcv_data = await self.api_manager.get_ohlcv_data(
            asset_id=asset_id,
            interval=interval
        )
        
        if not ohlcv_data:
            print(f"❌ {ticker} - 데이터 수집 실패 (데이터 없음)")
            return {"success": False, "reason": "데이터 없음"}
        
        print(f"✅ {ticker} - {len(ohlcv_data)}개 데이터 수집 완료")
        
        # 큐에 저장할 데이터 변환
        items = [
            json.loads(item.model_dump_json()) for item in ohlcv_data
        ]
        
        # interval에 따라 적절한 태스크 타입 선택
        task_type = "ohlcv_day_data" if interval in ["1d", "daily", "1w", "1mo", "1month"] else "ohlcv_intraday_data"
        
        # 큐에 저장
        payload = {
            "items": items,
            "metadata": {
                "asset_id": asset_id,
                "interval": interval,
                "data_type": "ohlcv",
                "is_backfill": False
            }
        }
        
        await self.redis_queue_manager.push_batch_task(task_type, payload)
        print(f"✅ {ticker} - 큐에 {len(items)}개 데이터 저장 완료 (task_type: {task_type})")
        
        return {
            "success": True,
            "asset_id": asset_id,
            "ticker": ticker,
            "task_type": task_type,
            "items_count": len(items),
            "interval": interval
        }
    
    async def check_queue_status(self, task_type: str) -> Dict[str, Any]:
        """2단계: 큐 상태 확인"""
        print("\n" + "=" * 60)
        print(f"2단계: 큐 상태 확인 (task_type: {task_type})")
        print("=" * 60)
        
        try:
            import redis.asyncio as redis
            redis_client = redis.Redis(
                host=os.getenv("REDIS_HOST", "redis"),
                port=int(os.getenv("REDIS_PORT", 6379)),
                db=int(os.getenv("REDIS_DB", 0)),
                password=os.getenv("REDIS_PASSWORD") or None,
                decode_responses=True
            )
            
            queue_key = f"batch_data_queue:{task_type}"
            length = await redis_client.llen(queue_key)
            
            print(f"📦 큐 키: {queue_key}")
            print(f"📦 큐 길이: {length}개")
            
            if length > 0:
                # 첫 번째 항목 확인
                first_item = await redis_client.lindex(queue_key, 0)
                if first_item:
                    try:
                        task = json.loads(first_item)
                        payload = task.get("payload", {})
                        metadata = payload.get("metadata", {}) if isinstance(payload, dict) else {}
                        items_count = len(payload.get("items", [])) if isinstance(payload, dict) else 0
                        
                        print(f"  - asset_id: {metadata.get('asset_id')}")
                        print(f"  - interval: {metadata.get('interval')}")
                        print(f"  - items 수: {items_count}")
                    except Exception as e:
                        print(f"  - 파싱 오류: {e}")
            
            await redis_client.close()
            
            return {"queue_length": length, "queue_key": queue_key}
            
        except Exception as e:
            print(f"❌ 큐 확인 오류: {e}")
            return {"error": str(e)}
    
    async def wait_for_processing(self, asset_id: int, expected_count: int, interval: str = "1d", max_wait: int = 60) -> Dict[str, Any]:
        """3단계: 데이터 프로세서 처리 대기"""
        print("\n" + "=" * 60)
        print(f"3단계: 데이터 프로세서 처리 대기")
        print(f"asset_id: {asset_id}, 예상 개수: {expected_count}, interval: {interval}")
        print("=" * 60)
        
        start_time = datetime.now()
        check_interval = 2  # 2초마다 확인
        
        # interval에 따라 테이블 선택
        table_name = "ohlcv_day_data" if interval in ["1d", "daily", "1w", "1mo", "1month"] else "ohlcv_intraday_data"
        
        # 시작 시점의 총 개수 확인
        initial_query = text(f"""
            SELECT COUNT(*) as count
            FROM {table_name}
            WHERE asset_id = :asset_id
            AND data_interval = :interval
        """)
        initial_result = self.db.execute(initial_query, {"asset_id": asset_id, "interval": interval}).fetchone()
        initial_count = initial_result[0] if initial_result else 0
        print(f"📊 시작 시점 총 레코드: {initial_count}개")
        
        while (datetime.now() - start_time).total_seconds() < max_wait:
            # DB에 저장된 데이터 개수 확인 (최근 10분 내 업데이트된 데이터)
            try:
                query = text(f"""
                    SELECT COUNT(*) as count
                    FROM {table_name}
                    WHERE asset_id = :asset_id
                    AND data_interval = :interval
                    AND updated_at > NOW() - INTERVAL '10 minutes'
                """)
                
                result = self.db.execute(query, {"asset_id": asset_id, "interval": interval}).fetchone()
                current_count = result[0] if result else 0
                
                # 전체 개수도 확인
                total_query = text(f"""
                    SELECT COUNT(*) as count
                    FROM {table_name}
                    WHERE asset_id = :asset_id
                    AND data_interval = :interval
                """)
                total_result = self.db.execute(total_query, {"asset_id": asset_id, "interval": interval}).fetchone()
                total_count = total_result[0] if total_result else 0
                
                print(f"⏳ [{int((datetime.now() - start_time).total_seconds())}초] 최근 10분 내: {current_count}개, 전체: {total_count}개 (시작: {initial_count}개)")
                
                # 최근 업데이트된 데이터가 예상 개수 이상이거나, 전체 개수가 증가했으면 성공
                if current_count >= expected_count or total_count > initial_count:
                    print(f"✅ DB 저장 완료: 최근 업데이트 {current_count}개, 전체 {total_count}개 (증가: {total_count - initial_count}개)")
                    return {
                        "success": True,
                        "saved_count": current_count,
                        "total_count": total_count,
                        "increased_count": total_count - initial_count,
                        "wait_time": (datetime.now() - start_time).total_seconds()
                    }
                
            except Exception as e:
                print(f"⚠️ DB 확인 오류: {e}")
            
            await asyncio.sleep(check_interval)
        
        print(f"⏰ 대기 시간 초과 ({max_wait}초)")
        return {
            "success": False,
            "reason": "대기 시간 초과"
        }
    
    def check_db_status(self, asset_id: int, interval: str = "1d") -> Dict[str, Any]:
        """4단계: DB 저장 상태 최종 확인"""
        print("\n" + "=" * 60)
        print(f"4단계: DB 저장 상태 최종 확인")
        print(f"asset_id: {asset_id}, interval: {interval}")
        print("=" * 60)
        
        try:
            # interval에 따라 테이블 선택
            table_name = "ohlcv_day_data" if interval in ["1d", "daily", "1w", "1mo", "1month"] else "ohlcv_intraday_data"
            
            query = text(f"""
                SELECT 
                    COUNT(*) as total,
                    MIN(timestamp_utc) as oldest,
                    MAX(timestamp_utc) as newest,
                    MAX(updated_at) as latest_update
                FROM {table_name}
                WHERE asset_id = :asset_id
                AND data_interval = :interval
            """)
            
            result = self.db.execute(query, {"asset_id": asset_id, "interval": interval}).fetchone()
            
            if result:
                total, oldest, newest, latest_update = result
                print(f"📊 테이블: {table_name}")
                print(f"  - 총 레코드: {total}개")
                print(f"  - 가장 오래된 데이터: {oldest}")
                print(f"  - 가장 최신 데이터: {newest}")
                print(f"  - 최신 업데이트: {latest_update}")
                
                return {
                    "success": True,
                    "table": table_name,
                    "total": total,
                    "oldest": oldest,
                    "newest": newest,
                    "latest_update": latest_update
                }
            else:
                print(f"❌ 데이터 없음")
                return {"success": False, "reason": "데이터 없음"}
                
        except Exception as e:
            print(f"❌ DB 확인 오류: {e}")
            return {"error": str(e)}
    
    async def run_full_test(self, ticker: str = "AAPL", interval: str = "1d"):
        """전체 파이프라인 테스트 실행"""
        print(f"\n{'='*60}")
        print(f"OHLCV 파이프라인 전체 테스트")
        print(f"실행 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}\n")
        
        try:
            # 1단계: 데이터 수집 및 큐 저장
            collect_result = await self.test_collect_and_queue(ticker, interval)
            if not collect_result.get("success"):
                print(f"\n❌ 테스트 실패: {collect_result.get('reason')}")
                return
            
            asset_id = collect_result["asset_id"]
            task_type = collect_result["task_type"]
            items_count = collect_result["items_count"]
            
            # 2단계: 큐 상태 확인
            queue_result = await self.check_queue_status(task_type)
            
            # 3단계: 데이터 프로세서 처리 대기
            process_result = await self.wait_for_processing(asset_id, items_count, interval=interval, max_wait=60)
            
            # 4단계: DB 저장 상태 최종 확인
            db_result = self.check_db_status(asset_id, interval)
            
            # 결과 요약
            print("\n" + "=" * 60)
            print("테스트 결과 요약")
            print("=" * 60)
            print(f"✅ 1단계 (수집 및 큐 저장): {'성공' if collect_result.get('success') else '실패'}")
            print(f"✅ 2단계 (큐 상태): 큐 길이 {queue_result.get('queue_length', 0)}개")
            print(f"✅ 3단계 (데이터 프로세서 처리): {'성공' if process_result.get('success') else '실패'}")
            print(f"✅ 4단계 (DB 저장 확인): {'성공' if db_result.get('success') else '실패'}")
            
            if all([
                collect_result.get("success"),
                process_result.get("success"),
                db_result.get("success")
            ]):
                print(f"\n🎉 전체 파이프라인 테스트 성공!")
            else:
                print(f"\n⚠️ 일부 단계에서 문제가 발생했습니다.")
                
        except Exception as e:
            print(f"\n❌ 테스트 중 오류 발생: {e}")
            import traceback
            traceback.print_exc()
        finally:
            self.db.close()

async def main():
    """메인 함수"""
    import argparse
    
    parser = argparse.ArgumentParser(description="OHLCV 파이프라인 테스트 스크립트")
    parser.add_argument("--ticker", type=str, default="AAPL", help="테스트할 티커 (기본값: AAPL)")
    parser.add_argument("--interval", type=str, default="1d", help="테스트할 interval (기본값: 1d)")
    
    args = parser.parse_args()
    
    tester = OHLCVPipelineTester()
    await tester.run_full_test(ticker=args.ticker, interval=args.interval)

if __name__ == "__main__":
    asyncio.run(main())

