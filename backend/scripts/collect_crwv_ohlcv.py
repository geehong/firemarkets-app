#!/usr/bin/env python3
"""
CRWV (CoreWeave) OHLCV 데이터 수동 수집 스크립트 (최대 포인트)
OHLCVCollector를 사용하여 CRWV의 가격 데이터를 최대한 많이 수집하고 저장합니다.
API 무료 플랜 제한 내에서 최대 기간 데이터를 수집합니다.
"""
import asyncio
import sys
import os
from datetime import datetime, timedelta, timezone
import json

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy.orm import Session
from app.core.database import PostgreSQLSessionLocal
from app.core.config_manager import ConfigManager
from app.services.api_strategy_manager import ApiStrategyManager
from app.utils.redis_queue_manager import RedisQueueManager
from app.collectors.ohlcv_collector import OHLCVCollector
from app.models.asset import Asset
from app.external_apis.implementations.tiingo_client import TiingoClient
from app.external_apis.implementations.twelvedata_client import TwelveDataClient
from app.external_apis.implementations.fmp_client import FMPClient
from app.external_apis.base.schemas import OhlcvDataPoint


async def collect_crwv_ohlcv_max():
    """CRWV의 OHLCV 데이터를 최대한 많이 수집하고 저장합니다."""
    db: Session = PostgreSQLSessionLocal()
    
    try:
        # CRWV 자산 조회
        crwv_asset = db.query(Asset).filter(Asset.ticker == 'CRWV').first()
        
        if not crwv_asset:
            print("❌ CRWV 자산을 찾을 수 없습니다.")
            return
        
        print(f"✅ CRWV 자산 발견: asset_id={crwv_asset.asset_id}, name={crwv_asset.name}, exchange={crwv_asset.exchange}")
        
        # collection_settings에 collect_price가 true인지 확인
        if not crwv_asset.collection_settings or crwv_asset.collection_settings.get('collect_price') != 'true':
            print("⚠️ CRWV의 collect_price 설정이 활성화되지 않았습니다. 활성화합니다...")
            if not crwv_asset.collection_settings:
                crwv_asset.collection_settings = {}
            crwv_asset.collection_settings['collect_price'] = 'true'
            db.commit()
            print("✅ collect_price 설정을 활성화했습니다.")
        
        # 의존성 초기화
        print("\n📦 의존성 초기화 중...")
        config_manager = ConfigManager()
        redis_queue_manager = RedisQueueManager(config_manager)
        
        # API 클라이언트 초기화 (최대 포인트 수집용)
        print("\n🔧 API 클라이언트 초기화 중...")
        tiingo_client = TiingoClient()
        twelvedata_client = TwelveDataClient()
        fmp_client = FMPClient()
        
        # 최대 기간 설정 (API 무료 플랜 제한 내)
        # Tiingo: 5년, TwelveData: 2020-02-10부터, FMP: 5년
        end_date = datetime.now().strftime('%Y-%m-%d')
        
        # TwelveData는 2020-02-10부터 시작
        twelvedata_start = '2020-02-10'
        # Tiingo와 FMP는 5년 전부터
        five_years_ago = (datetime.now() - timedelta(days=5*365)).strftime('%Y-%m-%d')
        
        print(f"\n📅 데이터 수집 기간 설정:")
        print(f"   Tiingo/FMP: {five_years_ago} ~ {end_date} (최대 5년)")
        print(f"   TwelveData: {twelvedata_start} ~ {end_date} (2020-02-10부터)")
        
        all_data = []
        successful_sources = []
        
        # 1. Tiingo 시도 (5년치)
        print(f"\n🔍 Tiingo API로 데이터 수집 시도...")
        try:
            tiingo_data = await tiingo_client.get_ohlcv_data(
                symbol='CRWV',
                interval='1d',
                start_date=five_years_ago,
                end_date=end_date,
                limit=None  # 제한 없음
            )
            if tiingo_data:
                print(f"   ✅ Tiingo: {len(tiingo_data)}개 레코드 수집 성공")
                all_data.extend(tiingo_data)
                successful_sources.append('Tiingo')
            else:
                print(f"   ⚠️ Tiingo: 데이터 없음")
        except Exception as e:
            print(f"   ❌ Tiingo 오류: {e}")
        
        # 2. TwelveData 시도 (2020-02-10부터)
        print(f"\n🔍 TwelveData API로 데이터 수집 시도...")
        try:
            twelvedata_data = await twelvedata_client.get_ohlcv_data(
                symbol='CRWV',
                interval='1d',
                start_date=twelvedata_start,
                end_date=end_date,
                limit=None
            )
            if twelvedata_data:
                print(f"   ✅ TwelveData: {len(twelvedata_data)}개 레코드 수집 성공")
                # 중복 제거를 위해 기존 데이터와 비교
                existing_timestamps = {d.timestamp_utc for d in all_data}
                new_data = [d for d in twelvedata_data if d.timestamp_utc not in existing_timestamps]
                if new_data:
                    all_data.extend(new_data)
                    print(f"   📊 TwelveData: {len(new_data)}개 새로운 레코드 추가 (중복 제외)")
                else:
                    print(f"   ℹ️ TwelveData: 모든 데이터가 이미 수집됨")
                successful_sources.append('TwelveData')
            else:
                print(f"   ⚠️ TwelveData: 데이터 없음")
        except Exception as e:
            print(f"   ❌ TwelveData 오류: {e}")
        
        # 3. FMP 시도 (5년치, 하지만 402 에러 가능성 높음)
        print(f"\n🔍 FMP API로 데이터 수집 시도...")
        try:
            fmp_data = await fmp_client.get_ohlcv_data(
                symbol='CRWV',
                interval='1d',
                start_date=five_years_ago,
                end_date=end_date,
                limit=None
            )
            if fmp_data:
                print(f"   ✅ FMP: {len(fmp_data)}개 레코드 수집 성공")
                # 중복 제거
                existing_timestamps = {d.timestamp_utc for d in all_data}
                new_data = [d for d in fmp_data if d.timestamp_utc not in existing_timestamps]
                if new_data:
                    all_data.extend(new_data)
                    print(f"   📊 FMP: {len(new_data)}개 새로운 레코드 추가 (중복 제외)")
                else:
                    print(f"   ℹ️ FMP: 모든 데이터가 이미 수집됨")
                successful_sources.append('FMP')
            else:
                print(f"   ⚠️ FMP: 데이터 없음 (402 Payment Required 가능)")
        except Exception as e:
            print(f"   ❌ FMP 오류: {e}")
        
        if not all_data:
            print("\n❌ 모든 API에서 데이터를 가져오지 못했습니다.")
            return
        
        # 중복 제거 (timestamp_utc 기준)
        print(f"\n🔄 데이터 정리 중...")
        unique_data = {}
        for item in all_data:
            timestamp = item.timestamp_utc
            # 타임존 통일 (UTC로 변환)
            if timestamp.tzinfo is None:
                timestamp = timestamp.replace(tzinfo=timezone.utc)
            else:
                timestamp = timestamp.astimezone(timezone.utc)
            
            # 날짜만 비교 (시간 제외)
            date_key = timestamp.date()
            if date_key not in unique_data:
                unique_data[date_key] = item
        
        final_data = list(unique_data.values())
        # 날짜순 정렬 (타임존 통일 후)
        def get_sort_key(x):
            ts = x.timestamp_utc
            if ts.tzinfo is None:
                return ts.replace(tzinfo=timezone.utc)
            return ts.astimezone(timezone.utc)
        final_data.sort(key=get_sort_key)
        
        print(f"   📊 총 수집된 레코드: {len(all_data)}개")
        print(f"   📊 중복 제거 후: {len(final_data)}개")
        print(f"   📅 기간: {final_data[0].timestamp_utc.strftime('%Y-%m-%d')} ~ {final_data[-1].timestamp_utc.strftime('%Y-%m-%d')}")
        print(f"   ✅ 성공한 API: {', '.join(successful_sources)}")
        
        # Redis 큐에 추가
        print(f"\n📤 Redis 큐에 데이터 추가 중...")
        items = [json.loads(item.model_dump_json()) for item in final_data]
        
        await redis_queue_manager.push_batch_task(
            "ohlcv_day_data",
            {
                "items": items,
                "metadata": {
                    "asset_id": crwv_asset.asset_id,
                    "interval": "1d",
                    "data_type": "ohlcv",
                    "is_backfill": True,
                    "sources": successful_sources
                }
            }
        )
        
        print(f"\n✅ 데이터 수집 완료!")
        print(f"   큐에 추가된 레코드 수: {len(final_data)}개")
        print(f"   사용된 API: {', '.join(successful_sources)}")
        print(f"\n💡 참고: 데이터는 Redis 큐에 추가되었으며, data_processor가 이를 처리하여 DB에 저장합니다.")
        print(f"   data_processor 로그를 확인하세요: docker-compose logs data_processor --tail 50 -f")
            
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("CRWV (CoreWeave) OHLCV 데이터 수동 수집 스크립트 (최대 포인트)")
    print("=" * 60)
    asyncio.run(collect_crwv_ohlcv_max())
