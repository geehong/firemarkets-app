#!/usr/bin/env python3
"""
Crypto Data Collection Script using CoinMarketCap API
- Collects detailed cryptocurrency information and populates crypto_data table
- Uses CoinMarketCap client for comprehensive crypto data
- Supports both direct database save and queue-based processing

Usage:
  python collect_crypto_data.py                    # Collect crypto data for all crypto assets
  python collect_crypto_data.py --direct-save      # Save directly to database (bypass queue)
  python collect_crypto_data.py --tickers BTC ETH  # Collect for specific tickers only
  python collect_crypto_data.py --limit 10         # Limit number of assets to process
  python collect_crypto_data.py --dry-run          # Test mode without actual collection
"""

import asyncio
import sys
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
import argparse
from sqlalchemy import and_

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.external_apis.implementations.coinmarketcap_client import CoinMarketCapClient
from app.models.asset import Asset, AssetType, CryptoData
from app.core.database import PostgreSQLSessionLocal
from app.core.config_manager import ConfigManager
from app.utils.logging_helper import ApiLoggingHelper as LoggingHelper
from app.utils.redis_queue_manager import RedisQueueManager

class CryptoDataCollector:
    """Crypto Data Collector using CoinMarketCap API"""
    
    def __init__(self, direct_save: bool = False):
        self.config_manager = ConfigManager()
        self.logging_helper = LoggingHelper()
        self.redis_queue_manager = RedisQueueManager(self.config_manager)
        self.direct_save = direct_save
        self.session_factory = PostgreSQLSessionLocal
        
        # CoinMarketCap client 초기화
        self.cmc_client = CoinMarketCapClient()
        
        # Rate limiting을 위한 설정 (보수적 접근)
        # Free tier: 30 req/min, 10,000 req/day
        # 안전을 위해 20 req/min으로 제한 (3초 간격)
        self.min_delay_between_requests = 3.0  # 3초 간격으로 제한
        self.max_requests_per_hour = 1000  # 시간당 최대 1000개 요청 (일일 제한 고려)
        self.request_count = 0
        self.hour_start_time = datetime.now()
        self.last_request_time = None
    
    async def _enforce_rate_limit(self):
        """CoinMarketCap API rate limiting 적용 (보수적 접근)"""
        current_time = datetime.now()
        
        # 시간당 요청 수 제한 확인
        if (current_time - self.hour_start_time).total_seconds() >= 3600:  # 1시간 경과
            self.request_count = 0
            self.hour_start_time = current_time
        
        # 시간당 제한 확인
        if self.request_count >= self.max_requests_per_hour:
            wait_time = 3600 - (current_time - self.hour_start_time).total_seconds()
            if wait_time > 0:
                self.logging_helper.logger.warning(f"시간당 요청 제한 도달. {wait_time:.0f}초 대기...")
                await asyncio.sleep(wait_time)
                self.request_count = 0
                self.hour_start_time = datetime.now()
        
        # 요청 간 최소 간격 확인
        if self.last_request_time:
            elapsed = (current_time - self.last_request_time).total_seconds()
            if elapsed < self.min_delay_between_requests:
                wait_time = self.min_delay_between_requests - elapsed
                self.logging_helper.logger.info(f"Rate limiting: {wait_time:.1f}초 대기 중...")
                await asyncio.sleep(wait_time)
        
        self.last_request_time = datetime.now()
        self.request_count += 1
    
    async def get_crypto_assets(self, limit: Optional[int] = None, tickers: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """crypto_data 테이블에 있는 크립토 자산 목록 조회"""
        try:
            db = self.session_factory()
            try:
                # crypto_data 테이블에 있는 크립토 자산만 조회
                query = db.query(Asset).join(AssetType).join(CryptoData, Asset.asset_id == CryptoData.asset_id).filter(
                    Asset.is_active == True,
                    AssetType.type_name == 'Crypto'
                )
                
                if tickers:
                    ticker_set = set(tickers)
                    query = query.filter(Asset.ticker.in_(ticker_set))
                
                if limit:
                    query = query.limit(limit)
                
                assets = query.all()
                
                return [
                    {
                        'asset_id': asset.asset_id,
                        'ticker': asset.ticker,
                        'name': asset.name,
                        'asset_type_id': asset.asset_type_id
                    }
                    for asset in assets
                ]
            finally:
                db.close()
        except Exception as e:
            self.logging_helper.logger.error(f"크립토 자산 조회 중 오류: {e}")
            return []
    
    async def collect_crypto_data_for_asset(self, asset: Dict[str, Any]) -> bool:
        """단일 크립토 자산에 대한 데이터 수집"""
        ticker = asset['ticker']
        asset_id = asset['asset_id']
        
        try:
            print(f"🔄 {ticker} ({asset['name']}) 데이터 수집 시작...")
            
            # Rate limiting 적용
            await self._enforce_rate_limit()
            
            # CoinMarketCap에서 데이터 수집(기본 + 상세 + 메타)
            crypto_data = await self.cmc_client.get_crypto_data(ticker)
            quote_details = await self.cmc_client.get_quote_details(ticker)
            metadata = await self.cmc_client.get_metadata(ticker)

            if not crypto_data and not quote_details and not metadata:
                print(f"⚠️ {ticker} - CoinMarketCap에서 데이터를 가져올 수 없음")
                return False

            try:
                price_for_log = getattr(crypto_data, 'price', None) if crypto_data else (quote_details or {}).get('price')
                mcap_for_log = getattr(crypto_data, 'market_cap', None) if crypto_data else (quote_details or {}).get('market_cap')
                if price_for_log is not None and mcap_for_log is not None:
                    print(f"📊 {ticker} - 데이터 수집 완료: 가격 ${float(price_for_log):.2f}, 시가총액 ${float(mcap_for_log):,.0f}")
                else:
                    print(f"📊 {ticker} - 데이터 수집 완료")
            except Exception:
                print(f"📊 {ticker} - 데이터 수집 완료")
            
            # 데이터 저장
            if self.direct_save:
                success = await self._save_to_database_direct(asset_id, crypto_data, quote_details, metadata)
            else:
                success = await self._save_to_queue(asset_id, crypto_data, quote_details, metadata)
            
            if success:
                print(f"✅ {ticker} - 데이터 저장 완료")
                return True
            else:
                print(f"❌ {ticker} - 데이터 저장 실패")
                return False
                
        except Exception as e:
            print(f"❌ {ticker} - 수집 실패: {e}")
            self.logging_helper.logger.error(f"Crypto data collection failed for {ticker}: {e}")
            return False
    
    async def _save_to_database_direct(self, asset_id: int, crypto_data, quote_details: Optional[Dict[str, Any]], metadata: Optional[Dict[str, Any]]) -> bool:
        """데이터베이스에 직접 저장"""
        try:
            db = self.session_factory()
            try:
                # 기존 데이터 업데이트 또는 새로 삽입
                existing_crypto = db.query(CryptoData).filter(CryptoData.asset_id == asset_id).first()
                
                if existing_crypto:
                    # 기존 데이터 업데이트 - crypto_data, quote_details, metadata를 모두 병합
                    # 우선순위: quote_details > crypto_data > 기존값
                    
                    # Helper function to get value with priority: quote_details > crypto_data > existing
                    def get_value(quote_key=None, crypto_attr=None, default=None):
                        """Get value with priority: quote_details > crypto_data > default"""
                        if quote_details and quote_key:
                            val = quote_details.get(quote_key)
                            if val is not None:
                                return val
                        if crypto_data and crypto_attr:
                            val = getattr(crypto_data, crypto_attr, None)
                            if val is not None:
                                return val
                        return default
                    
                    # Symbol 및 Name 처리
                    new_symbol = get_value('symbol', 'symbol', existing_crypto.symbol)
                    if new_symbol != existing_crypto.symbol:
                        existing_crypto.symbol = new_symbol
                    
                    new_name = getattr(crypto_data, 'name', None) if crypto_data else None
                    if not new_name and quote_details:
                        new_name = quote_details.get('name')
                    if new_name:
                        existing_crypto.name = new_name
                    
                    # 가격 및 시장 데이터 처리 (quote_details 우선)
                    existing_crypto.current_price = get_value('price', 'price', existing_crypto.current_price)
                    existing_crypto.market_cap = get_value('market_cap', 'market_cap', existing_crypto.market_cap)
                    existing_crypto.volume_24h = get_value('volume_24h', 'volume_24h', existing_crypto.volume_24h)
                    existing_crypto.circulating_supply = get_value('circulating_supply', 'circulating_supply', existing_crypto.circulating_supply)
                    existing_crypto.total_supply = get_value('total_supply', 'total_supply', existing_crypto.total_supply)
                    existing_crypto.max_supply = get_value('max_supply', 'max_supply', existing_crypto.max_supply)
                    existing_crypto.cmc_rank = get_value('rank', 'rank', existing_crypto.cmc_rank)
                    
                    # percent_change 필드들 (quote_details에만 있음, crypto_data는 change_24h만)
                    if quote_details:
                        existing_crypto.percent_change_1h = quote_details.get('percent_change_1h', existing_crypto.percent_change_1h)
                        existing_crypto.percent_change_24h = quote_details.get('percent_change_24h') or (getattr(crypto_data, 'change_24h', None) if crypto_data else None) or existing_crypto.percent_change_24h
                        existing_crypto.percent_change_7d = quote_details.get('percent_change_7d', existing_crypto.percent_change_7d)
                        existing_crypto.percent_change_30d = quote_details.get('percent_change_30d', existing_crypto.percent_change_30d)
                    elif crypto_data:
                        change_24h = getattr(crypto_data, 'change_24h', None)
                        if change_24h is not None:
                            existing_crypto.percent_change_24h = change_24h

                    # Metadata 처리 (metadata에만 있음)
                    if metadata:
                        existing_crypto.category = metadata.get('category', existing_crypto.category)
                        existing_crypto.description = metadata.get('description', existing_crypto.description)
                        existing_crypto.logo_url = metadata.get('logo_url', existing_crypto.logo_url)
                        existing_crypto.website_url = metadata.get('website_url', existing_crypto.website_url)
                        existing_crypto.slug = metadata.get('slug', existing_crypto.slug)
                        existing_crypto.date_added = metadata.get('date_added', existing_crypto.date_added)
                        existing_crypto.tags = metadata.get('tags', existing_crypto.tags)
                        existing_crypto.explorer = metadata.get('explorer', existing_crypto.explorer)
                        existing_crypto.source_code = metadata.get('source_code', existing_crypto.source_code)

                    existing_crypto.last_updated = datetime.now()
                    
                    print(f"💾 {(getattr(crypto_data, 'symbol', None) or (quote_details or {}).get('symbol') or 'UNKNOWN')} - 기존 데이터 업데이트")
                else:
                    # 새 데이터 삽입
                    base = {
                        'asset_id': asset_id,
                        'symbol': getattr(crypto_data, 'symbol', (quote_details or {}).get('symbol') if quote_details else None) or 'UNKNOWN',
                        'name': getattr(crypto_data, 'symbol', (quote_details or {}).get('symbol') if quote_details else None) or 'UNKNOWN',
                        'market_cap': getattr(crypto_data, 'market_cap', None),
                        'circulating_supply': getattr(crypto_data, 'circulating_supply', None),
                        'total_supply': getattr(crypto_data, 'total_supply', None),
                        'max_supply': getattr(crypto_data, 'max_supply', None),
                        'current_price': getattr(crypto_data, 'price', None),
                        'volume_24h': getattr(crypto_data, 'volume_24h', None),
                        'percent_change_24h': getattr(crypto_data, 'change_24h', None),
                        'cmc_rank': getattr(crypto_data, 'rank', None),
                        'is_active': True,
                        'created_at': datetime.now(),
                        'last_updated': datetime.now(),
                    }
                    if quote_details:
                        base.update({
                            'percent_change_1h': quote_details.get('percent_change_1h'),
                            'percent_change_24h': quote_details.get('percent_change_24h', base.get('percent_change_24h')),
                            'percent_change_7d': quote_details.get('percent_change_7d'),
                            'percent_change_30d': quote_details.get('percent_change_30d'),
                            'current_price': quote_details.get('price', base.get('current_price')),
                            'market_cap': quote_details.get('market_cap', base.get('market_cap')),
                            'volume_24h': quote_details.get('volume_24h', base.get('volume_24h')),
                            'circulating_supply': quote_details.get('circulating_supply', base.get('circulating_supply')),
                            'total_supply': quote_details.get('total_supply', base.get('total_supply')),
                            'max_supply': quote_details.get('max_supply', base.get('max_supply')),
                            'cmc_rank': quote_details.get('rank', base.get('cmc_rank')),
                        })
                    if metadata:
                        base.update({
                            'category': metadata.get('category'),
                            'description': metadata.get('description'),
                            'logo_url': metadata.get('logo_url'),
                            'website_url': metadata.get('website_url'),
                            'slug': metadata.get('slug'),
                            'date_added': metadata.get('date_added'),
                            'tags': metadata.get('tags'),
                            'explorer': metadata.get('explorer'),
                            'source_code': metadata.get('source_code'),
                        })

                    new_crypto = CryptoData(**base)
                    db.add(new_crypto)
                    print(f"💾 {base['symbol']} - 새 데이터 삽입")
                
                db.commit()
                return True
                
            except Exception as e:
                db.rollback()
                self.logging_helper.logger.error(f"Database save failed: {e}")
                return False
            finally:
                db.close()
                
        except Exception as e:
            self.logging_helper.logger.error(f"Database connection failed: {e}")
            return False
    
    async def _save_to_queue(self, asset_id: int, crypto_data, quote_details: Optional[Dict[str, Any]], metadata: Optional[Dict[str, Any]]) -> bool:
        """큐를 통해 데이터 저장 - crypto_data, quote_details, metadata 모두 병합"""
        try:
            # Helper function to get value with priority: quote_details > crypto_data
            def get_value(quote_key=None, crypto_attr=None):
                """Get value with priority: quote_details > crypto_data"""
                if quote_details and quote_key:
                    val = quote_details.get(quote_key)
                    if val is not None:
                        return val
                if crypto_data and crypto_attr:
                    val = getattr(crypto_data, crypto_attr, None)
                    if val is not None:
                        return val
                return None
            
            # 큐에 전송할 데이터 준비 - 모든 소스 병합
            price_value = get_value('price', 'price')  # quote_details 또는 crypto_data에서 가져온 가격
            
            crypto_data_dict = {
                'asset_id': asset_id,
                'symbol': get_value('symbol', 'symbol') or (crypto_data.symbol if crypto_data else None),
                'name': getattr(crypto_data, 'name', None) if crypto_data else (quote_details.get('name') if quote_details else None),
                'market_cap': get_value('market_cap', 'market_cap'),
                'circulating_supply': get_value('circulating_supply', 'circulating_supply'),
                'total_supply': get_value('total_supply', 'total_supply'),
                'max_supply': get_value('max_supply', 'max_supply'),
                'current_price': price_value,  # current_price 필드
                'price': price_value,  # price 필드도 동일 값으로 설정 (데이터 프로세서에서 사용)
                'volume_24h': get_value('volume_24h', 'volume_24h'),
                'percent_change_24h': get_value('percent_change_24h', 'change_24h'),
                'cmc_rank': get_value('rank', 'rank'),
                'is_active': True,
                'last_updated': datetime.now().isoformat(),
                'created_at': datetime.now().isoformat()
            }
            
            # quote_details에서 추가 필드들 (percent_change_1h, 7d, 30d는 quote_details에만 있음)
            if quote_details:
                crypto_data_dict.update({
                    'percent_change_1h': quote_details.get('percent_change_1h'),
                    'percent_change_7d': quote_details.get('percent_change_7d'),
                    'percent_change_30d': quote_details.get('percent_change_30d'),
                })
            
            # metadata 필드들 (metadata에만 있음)
            if metadata:
                crypto_data_dict.update({
                    'category': metadata.get('category'),
                    'description': metadata.get('description'),
                    'logo_url': metadata.get('logo_url'),
                    'website_url': metadata.get('website_url'),
                    'slug': metadata.get('slug'),
                    'date_added': metadata.get('date_added'),
                    'platform': metadata.get('platform'),  # platform 필드 추가
                    'tags': metadata.get('tags'),
                    'explorer': metadata.get('explorer'),
                    'source_code': metadata.get('source_code'),
                })
            
            # 큐에 전송
            payload = {
                "items": [crypto_data_dict],
                "metadata": {
                    "asset_id": asset_id,
                    "symbol": getattr(crypto_data, 'symbol', None) or (quote_details or {}).get('symbol') or 'UNKNOWN',
                    "client_name": "CoinMarketCapClient",
                    "collection_date": datetime.now().isoformat()
                }
            }
            
            await self.redis_queue_manager.push_batch_task("crypto_data", payload)
            print(f"📤 {crypto_data.symbol} - 큐에 전송 완료")
            return True
            
        except Exception as e:
            self.logging_helper.logger.error(f"Queue save failed: {e}")
            return False
    
    async def run_collection(self, limit: Optional[int] = None, tickers: Optional[List[str]] = None) -> int:
        """전체 수집 프로세스 실행"""
        print(f"🚀 크립토 데이터 수집 시작 (CoinMarketCap API)")
        
        # 수집 대상 자산 조회
        assets = await self.get_crypto_assets(limit=limit, tickers=tickers)
        
        if not assets:
            print("⚠️ 수집할 크립토 자산이 없습니다.")
            return 0
        
        print(f"📋 수집 대상: {len(assets)}개 크립토 자산")
        
        # 예상 소요 시간 계산 (자산당 약 5초)
        estimated_time = len(assets) * 5
        print(f"⏱️ 예상 소요 시간: 약 {estimated_time//60}분 {estimated_time%60}초")
        
        # 각 자산에 대해 데이터 수집
        collected_count = 0
        start_time = datetime.now()
        
        for i, asset in enumerate(assets, 1):
            print(f"\n[{i}/{len(assets)}] 처리 중... ({collected_count}개 성공)")
            
            success = await self.collect_crypto_data_for_asset(asset)
            if success:
                collected_count += 1
            
            # 진행률 표시
            progress = (i / len(assets)) * 100
            elapsed = (datetime.now() - start_time).total_seconds()
            if i > 0:
                remaining_time = (elapsed / i) * (len(assets) - i)
                print(f"📊 진행률: {progress:.1f}% | 남은 시간: 약 {remaining_time//60:.0f}분 {remaining_time%60:.0f}초")
            
            # API 제한을 위한 추가 대기 (보수적 접근)
            await asyncio.sleep(2.0)  # 2초 추가 대기
        
        print(f"\n🎉 크립토 데이터 수집 완료: {collected_count}/{len(assets)}개 자산")
        return collected_count

async def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(description="크립토 데이터 수집 스크립트 (CoinMarketCap API)")
    parser.add_argument("--direct-save", action="store_true",
                       help="큐를 우회하여 바로 DB에 저장")
    parser.add_argument("--tickers", nargs="+", default=None,
                       help="특정 티커만 수집 (공백으로 구분)")
    parser.add_argument("--limit", type=int, default=None,
                       help="처리할 자산 수 제한")
    parser.add_argument("--dry-run", action="store_true",
                       help="실제 수집 없이 테스트만 실행")
    
    args = parser.parse_args()
    
    if args.dry_run:
        print("🔍 DRY-RUN 모드: 실제 수집 없이 테스트만 실행합니다.")
        return
    
    # CoinMarketCap API 연결 테스트
    collector = CryptoDataCollector(direct_save=args.direct_save)
    
    print("🔗 CoinMarketCap API 연결 테스트 중...")
    connection_ok = await collector.cmc_client.test_connection()
    if not connection_ok:
        print("❌ CoinMarketCap API 연결 실패. API 키를 확인해주세요.")
        sys.exit(1)
    print("✅ CoinMarketCap API 연결 성공")
    
    try:
        total_collected = await collector.run_collection(
            limit=args.limit,
            tickers=args.tickers
        )
        print(f"✅ 수집 완료: {total_collected}개 자산")
        
    except Exception as e:
        print(f"❌ 수집 중 오류 발생: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
