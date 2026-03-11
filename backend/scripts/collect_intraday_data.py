#!/usr/bin/env python3
"""
특정 자산의 인트라데이 데이터(1m, 5m) 수집 스크립트
"""
import asyncio
import sys
import os
import json
from datetime import datetime

# 프로젝트 루트를 경로에 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.api_strategy_manager import ApiStrategyManager
from app.core.config_manager import ConfigManager
from app.core.database import PostgreSQLSessionLocal
from app.models.asset import Asset
from app.utils.redis_queue_manager import RedisQueueManager

async def collect_intraday_data(asset_id: int, intervals: list = ["1m", "5m"]):
    """특정 자산의 인트라데이 데이터 수집"""
    db = PostgreSQLSessionLocal()
    try:
        # 자산 정보 조회
        asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
        if not asset:
            print(f"❌ asset_id {asset_id}를 찾을 수 없습니다.")
            return False
        
        ticker = asset.ticker
        asset_type = asset.asset_type.type_name if asset.asset_type else None
        print(f"\n{'='*60}")
        print(f"자산 정보: {ticker} (asset_id: {asset_id}, type: {asset_type})")
        print(f"{'='*60}")
        
        # API Manager 초기화
        config_manager = ConfigManager()
        api_manager = ApiStrategyManager(config_manager)
        redis_queue_manager = RedisQueueManager(config_manager)
        
        results = {}
        
        for interval in intervals:
            print(f"\n📡 {ticker} ({interval}) 데이터 수집 시작...")
            
            try:
                # 데이터 수집
                ohlcv_data = await api_manager.get_ohlcv_data(
                    asset_id=asset_id,
                    interval=interval
                )
                
                if ohlcv_data and len(ohlcv_data) > 0:
                    print(f"✅ {ticker} ({interval}) - {len(ohlcv_data)}개 데이터 수집 완료")
                    
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
                    
                    await redis_queue_manager.push_batch_task(task_type, payload)
                    print(f"✅ {ticker} ({interval}) - 큐에 {len(items)}개 데이터 저장 완료 (task_type: {task_type})")
                    
                    # 최신 데이터 정보
                    if items:
                        latest = items[0] if items else None
                        oldest = items[-1] if items else None
                        if latest and 'timestamp_utc' in latest:
                            print(f"   최신: {latest['timestamp_utc']}")
                        if oldest and 'timestamp_utc' in oldest:
                            print(f"   최초: {oldest['timestamp_utc']}")
                    
                    results[interval] = {"success": True, "count": len(items)}
                else:
                    print(f"❌ {ticker} ({interval}) - 데이터 없음")
                    results[interval] = {"success": False, "reason": "데이터 없음"}
                    
            except Exception as e:
                print(f"❌ {ticker} ({interval}) - 에러 발생: {type(e).__name__}: {e}")
                import traceback
                traceback.print_exc()
                results[interval] = {"success": False, "error": str(e)}
            
            # API rate limit을 피하기 위해 잠시 대기
            await asyncio.sleep(2)
        
        return results
        
    finally:
        db.close()

async def main():
    """메인 함수"""
    # 수집할 자산 목록 (ticker 또는 asset_id)
    assets_to_collect = [
        {"identifier": "MSFT"},
    ]
    
    intervals = ["1m", "5m"]
    
    print("="*60)
    print("인트라데이 데이터 수집 (1m, 5m)")
    print("="*60)
    
    db = PostgreSQLSessionLocal()
    try:
        # ticker로 asset_id 조회
        for asset_info in assets_to_collect:
            if "asset_id" in asset_info:
                asset_id = asset_info["asset_id"]
            else:
                ticker = asset_info["identifier"]
                asset = db.query(Asset).filter(Asset.ticker == ticker).first()
                if not asset:
                    print(f"❌ {ticker} 자산을 찾을 수 없습니다.")
                    continue
                asset_id = asset.asset_id
                asset_info["asset_id"] = asset_id
            
            await collect_intraday_data(asset_id, intervals)
            print()  # 빈 줄 추가
        
    finally:
        db.close()
    
    print("="*60)
    print("수집 완료")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(main())



