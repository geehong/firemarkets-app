#!/usr/bin/env python3
"""
OHLCV 데이터 수집 스크립트
- 기본적으로 OHLCV 데이터가 없는 자산만 수집 (--all-assets 옵션으로 모든 자산 수집 가능)
- 미국 주식/ETF/펀드: TwelveDataClient (limit 5000) → PolygonClient (fallback)
- 암호화폐: BinanceClient (limit 3000) → CoinbaseClient (fallback)
- 커머디티/외국주식: FMPClient (limit 1000-3000)

사용법:
  python collect_ohlcv_data.py                    # OHLCV 데이터가 없는 자산만 수집
  python collect_ohlcv_data.py --all-assets       # 모든 자산 수집
  python collect_ohlcv_data.py --data-sources twelvedata --days 7  # 특정 데이터 소스, 7일간
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import argparse
from sqlalchemy import or_
import httpx

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.api_strategy_manager import ApiStrategyManager
from app.external_apis.implementations import (
    TwelveDataClient, PolygonClient, BinanceClient, CoinbaseClient, FMPClient
)
from app.services.data_processor import DataProcessor
from app.utils.redis_queue_manager import RedisQueueManager
from app.core.config_manager import ConfigManager
from app.utils.logging_helper import ApiLoggingHelper as LoggingHelper
from app.models.asset import Asset
from app.core.database import SessionLocal as MySQLSessionLocal, PostgreSQLSessionLocal

class OHLCVDataCollector:
    """OHLCV 데이터 수집기"""
    
    def __init__(self, db_backend: str = "postgres", direct_save: bool = False):
        self.config_manager = ConfigManager()
        self.logging_helper = LoggingHelper()
        self.redis_queue_manager = RedisQueueManager(self.config_manager)
        self.data_processor = DataProcessor()
        self.direct_save = direct_save
        # API rate limits (per provider policy)
        # TwelveData: avg 8 req/min recommended, burst up to ~20/min -> enforce ~8s interval
        self._rate_limits = {
            'TwelveDataClient': {'min_interval': 8.0},
            'PolygonClient': {'min_interval': 2.0},
            'BinanceClient': {'min_interval': 0.2},
            'CoinbaseClient': {'min_interval': 0.2},
            'FMPClient': {'min_interval': 1.0},
        }
        self._last_call_at = {}

        # DB 백엔드 선택 (postgres | mysql)
        db_backend = (db_backend or "postgres").lower()
        if db_backend in ("postgres", "postgresql", "pg"):
            self.session_factory = PostgreSQLSessionLocal
            self.logging_helper.logger.info("DB backend: PostgreSQL")
        else:
            self.session_factory = MySQLSessionLocal
            self.logging_helper.logger.info("DB backend: MySQL")
        
        # 클라이언트 초기화
        self.ohlcv_day_clients = [
            TwelveDataClient(),  # limit 5000
            PolygonClient(),     # fallback
        ]
        
        self.crypto_ohlcv_clients = [
            BinanceClient(),     # limit 3000
            CoinbaseClient(),    # fallback
        ]
        
        self.commodity_ohlcv_clients = [
            FMPClient(),         # limit 1000-3000
        ]
        
        # 심볼 캐시
        self._binance_valid_symbols: Optional[set] = None
        self._coinbase_valid_products: Optional[set] = None

    def _map_crypto_symbol_for_client(self, ticker: str, client_name: str) -> str:
        s = (ticker or "").upper().replace("-", "").replace("/", "")
        if client_name == 'BinanceClient':
            # Binance spot uses BASEQUOTE without separator. Default to USDT if no quote.
            if s.endswith(('USDT','BUSD','BTC','ETH','FDUSD','TUSD','USDC')):
                return s
            return f"{s}USDT"
        if client_name == 'CoinbaseClient':
            # Coinbase uses BASE-QUOTE
            if '-' in ticker:
                return ticker.upper()
            # prefer USD; fallback to -USDT for stable pairs that require it
            return f"{s}-USD"
        return ticker
    
    async def get_assets_by_data_source(self, data_source: str, only_missing_ohlcv: bool = True) -> List[Dict[str, Any]]:
        """데이터 소스별 자산 목록 조회"""
        try:
            db = self.session_factory()
            try:
                from app.models.asset import OHLCVData
                
                if only_missing_ohlcv:
                    # OHLCV 데이터가 없는 자산만 조회 (data_source 컬럼만 기준)
                    assets_query = db.query(Asset).outerjoin(
                        OHLCVData, Asset.asset_id == OHLCVData.asset_id
                    ).filter(
                        Asset.data_source == data_source,
                        OHLCVData.asset_id.is_(None)
                    )
                else:
                    # 모든 자산 조회 (data_source 컬럼만 기준)
                    assets_query = db.query(Asset).filter(
                        Asset.data_source == data_source
                    )
                
                assets = assets_query.all()
                
                return [
                    {
                        'asset_id': asset.asset_id,
                        'ticker': asset.ticker,
                        'name': asset.name,
                        'asset_type_id': asset.asset_type_id,
                        'data_source': data_source
                    }
                    for asset in assets
                ]
            finally:
                db.close()
        except Exception as e:
            self.logging_helper.logger.error(f"자산 조회 중 오류: {e}")
            return []
    
    async def check_ticker_exists(self, client, ticker: str) -> bool:
        """티커가 클라이언트에서 지원되는지 확인"""
        try:
            # 간단한 API 호출로 티커 존재 여부 확인
            if hasattr(client, 'get_asset_info'):
                info = await client.get_asset_info(ticker)
                return info is not None
            elif hasattr(client, 'get_quote'):
                quote = await client.get_quote(ticker)
                return quote is not None
            else:
                # 기본적으로 True 반환 (실제 수집에서 오류 처리)
                return True
        except Exception as e:
            self.logging_helper.log_warning(f"티커 {ticker} 확인 중 오류: {e}")
            return False
    
    async def collect_us_stock_etf_data(self, assets: List[Dict[str, Any]], days: Optional[int] = None) -> int:
        """미국 주식/ETF/펀드 데이터 수집"""
        self.logging_helper.logger.info(f"미국 주식/ETF/펀드 데이터 수집 시작: {len(assets)}개 자산")
        
        collected_count = 0
        limit_per_request = days if days is not None else 5000
        
        for asset in assets:
            ticker = asset['ticker']
            asset_id = asset['asset_id']
            
            print(f"🔄 {ticker} 수집 시작...")
            
            # TwelveDataClient부터 시도
            for client in self.ohlcv_day_clients:
                try:
                    # 티커 존재 여부 확인
                    if not await self.check_ticker_exists(client, ticker):
                        print(f"⚠️ {ticker} - {client.__class__.__name__}에서 지원되지 않음")
                        continue
                    
                    # OHLCV 데이터 수집
                    await self._throttle(client.__class__.__name__)
                    ohlcv_data = await self._call_with_retry(client.get_ohlcv_data, ticker, limit_per_request)
                    
                    if ohlcv_data and len(ohlcv_data) > 0:
                        print(f"📊 {ticker} - {len(ohlcv_data)}개 데이터 수집 완료")
                        # 큐에 전송하고 DB 저장 완료까지 대기
                        db_save_success = await self._send_to_queue_and_wait(ohlcv_data, asset, client.__class__.__name__)
                        if db_save_success:
                            collected_count += 1
                            print(f"✅ {ticker} - 큐에 {len(ohlcv_data)}개 저장, DB {len(ohlcv_data)}개 저장완료 => 계속")
                            break
                        else:
                            print(f"❌ {ticker} - DB 저장 실패 ({client.__class__.__name__})")
                            continue
                    else:
                        print(f"⚠️ {ticker} - 데이터 없음 ({client.__class__.__name__})")
                        
                except Exception as e:
                    print(f"❌ {ticker} - 수집 실패 ({client.__class__.__name__}): {e}")
                    continue
            
            # API 제한을 위한 대기(전역 완충)
            await asyncio.sleep(0.05)
        
        self.logging_helper.logger.info(f"미국 주식/ETF/펀드 수집 완료: {collected_count}/{len(assets)}개")
        return collected_count
    
    async def collect_crypto_data(self, assets: List[Dict[str, Any]], days: Optional[int] = None) -> int:
        """암호화폐 데이터 수집"""
        self.logging_helper.logger.info(f"암호화폐 데이터 수집 시작: {len(assets)}개 자산")
        
        collected_count = 0
        limit_per_request = days if days is not None else 3000
        
        for asset in assets:
            ticker = asset['ticker']
            asset_id = asset['asset_id']
            
            print(f"🔄 {ticker} 수집 시작...")
            
            # BinanceClient부터 시도
            for client in self.crypto_ohlcv_clients:
                try:
                    symbol = self._map_crypto_symbol_for_client(ticker, client.__class__.__name__)
                    # 유효 심볼 선검증
                    if client.__class__.__name__ == 'BinanceClient':
                        if not await self._is_valid_binance_symbol(symbol):
                            print(f"⏭️ {ticker} ({symbol}) - Binance에서 지원되지 않아 스킵")
                            continue
                    if client.__class__.__name__ == 'CoinbaseClient':
                        if not await self._is_valid_coinbase_product(symbol):
                            print(f"⏭️ {ticker} ({symbol}) - Coinbase에서 지원되지 않아 스킵")
                            continue
                    # 티커 존재 여부 확인
                    if not await self.check_ticker_exists(client, symbol):
                        print(f"⚠️ {ticker} ({symbol}) - {client.__class__.__name__}에서 지원되지 않음")
                        continue
                    
                    # OHLCV 데이터 수집
                    await self._throttle(client.__class__.__name__)
                    ohlcv_data = await self._call_with_retry(client.get_ohlcv_data, symbol, limit_per_request)
                    
                    if ohlcv_data and len(ohlcv_data) > 0:
                        print(f"📊 {ticker} ({symbol}) - {len(ohlcv_data)}개 데이터 수집 완료")
                        # 큐에 전송하고 DB 저장 완료까지 대기
                        db_save_success = await self._send_to_queue_and_wait(ohlcv_data, asset, client.__class__.__name__)
                        if db_save_success:
                            collected_count += 1
                            print(f"✅ {ticker} - 큐에 {len(ohlcv_data)}개 저장, DB {len(ohlcv_data)}개 저장완료 => 계속")
                            break
                        else:
                            print(f"❌ {ticker} - DB 저장 실패 ({client.__class__.__name__})")
                            continue
                    else:
                        print(f"⚠️ {ticker} - 데이터 없음 ({client.__class__.__name__})")
                        
                except Exception as e:
                    print(f"❌ {ticker} - 수집 실패 ({client.__class__.__name__}): {e}")
                    continue
            
            await asyncio.sleep(0.05)
        
        self.logging_helper.logger.info(f"암호화폐 수집 완료: {collected_count}/{len(assets)}개")
        return collected_count

    async def _is_valid_binance_symbol(self, symbol: str) -> bool:
        try:
            if self._binance_valid_symbols is None:
                url = "https://api.binance.com/api/v3/exchangeInfo?permissions=SPOT"
                async with httpx.AsyncClient(timeout=10) as client:
                    r = await client.get(url)
                    r.raise_for_status()
                    data = r.json()
                    valid = set()
                    for s in data.get('symbols', []):
                        if s.get('status') == 'TRADING':
                            valid.add(s.get('symbol'))
                    self._binance_valid_symbols = valid
            return symbol in self._binance_valid_symbols
        except Exception:
            # 실패 시 검증 건너뛰고 시도
            return True

    async def _is_valid_coinbase_product(self, product: str) -> bool:
        try:
            # product 형식 예: BTC-USD
            if self._coinbase_valid_products is None:
                url = "https://api.exchange.coinbase.com/products"
                async with httpx.AsyncClient(timeout=10) as client:
                    r = await client.get(url)
                    r.raise_for_status()
                    data = r.json()
                    self._coinbase_valid_products = set(item.get('id') for item in data if item.get('id'))
            return product in self._coinbase_valid_products
        except Exception:
            return True
    
    async def collect_commodity_foreign_data(self, assets: List[Dict[str, Any]], days: Optional[int] = None) -> int:
        """커머디티/외국주식 데이터 수집"""
        self.logging_helper.logger.info(f"커머디티/외국주식 데이터 수집 시작: {len(assets)}개 자산")
        
        collected_count = 0
        limit_per_request = days if days is not None else 3000
        
        for asset in assets:
            ticker = asset['ticker']
            asset_id = asset['asset_id']
            
            print(f"🔄 {ticker} 수집 시작...")
            
            # FMPClient 사용
            for client in self.commodity_ohlcv_clients:
                try:
                    # 티커 존재 여부 확인
                    if not await self.check_ticker_exists(client, ticker):
                        print(f"⚠️ {ticker} - {client.__class__.__name__}에서 지원되지 않음")
                        continue
                    
                    # OHLCV 데이터 수집
                    await self._throttle(client.__class__.__name__)
                    ohlcv_data = await self._call_with_retry(client.get_ohlcv_data, ticker, limit_per_request)
                    
                    if ohlcv_data and len(ohlcv_data) > 0:
                        print(f"📊 {ticker} - {len(ohlcv_data)}개 데이터 수집 완료")
                        # 큐에 전송하고 DB 저장 완료까지 대기
                        db_save_success = await self._send_to_queue_and_wait(ohlcv_data, asset, client.__class__.__name__)
                        if db_save_success:
                            collected_count += 1
                            print(f"✅ {ticker} - 큐에 {len(ohlcv_data)}개 저장, DB {len(ohlcv_data)}개 저장완료 => 계속")
                            break
                        else:
                            print(f"❌ {ticker} - DB 저장 실패 ({client.__class__.__name__})")
                            continue
                    else:
                        print(f"⚠️ {ticker} - 데이터 없음 ({client.__class__.__name__})")
                        
                except Exception as e:
                    print(f"❌ {ticker} - 수집 실패 ({client.__class__.__name__}): {e}")
                    continue
            
            await asyncio.sleep(0.05)

    async def _throttle(self, client_name: str):
        """Respect provider rate limits by enforcing minimal interval between calls per client."""
        cfg = self._rate_limits.get(client_name)
        if not cfg:
            return
        min_interval = cfg.get('min_interval', 0)
        last = self._last_call_at.get(client_name)
        if last is not None:
            elapsed = (datetime.now() - last).total_seconds()
            wait = max(0.0, min_interval - elapsed)
            if wait > 0:
                await asyncio.sleep(wait)
        self._last_call_at[client_name] = datetime.now()

    async def _call_with_retry(self, func, ticker: str, limit: int, max_retries: int = 2):
        """Call API with timeout, retries and backoff."""
        backoff = 2.0
        for attempt in range(max_retries + 1):
            try:
                return await asyncio.wait_for(func(ticker, limit=limit), timeout=20)
            except Exception as e:
                if attempt >= max_retries:
                    raise
                await asyncio.sleep(backoff)
                backoff *= 2
        
        self.logging_helper.logger.info(f"커머디티/외국주식 수집 완료: {collected_count}/{len(assets)}개")
        return collected_count
    
    async def _send_to_queue_and_wait(self, ohlcv_data: List[Dict[str, Any]], asset: Dict[str, Any], client_name: str) -> bool:
        """OHLCV 데이터를 큐에 전송하고 DB 저장 완료까지 대기"""
        try:
            def _get_value(obj: Any, candidates: List[str]):
                for name in candidates:
                    if isinstance(obj, dict) and name in obj:
                        return obj[name]
                    if hasattr(obj, name):
                        return getattr(obj, name)
                return None

            def _normalize_datetime(value: Any) -> str:
                if value is None:
                    return None
                if isinstance(value, (int, float)):
                    # assume epoch seconds
                    return datetime.utcfromtimestamp(value).isoformat()
                if isinstance(value, datetime):
                    return value.isoformat()
                # assume string already
                return str(value)

            # OhlcvDataPoint 객체를 딕셔너리로 변환하고 asset_id 추가
            converted_data = []
            for data_point in ohlcv_data:
                dt = _get_value(data_point, ['date', 'datetime', 'timestamp', 'timestamp_utc', 'time'])
                open_v = _get_value(data_point, ['open', 'open_price', 'o'])
                high_v = _get_value(data_point, ['high', 'high_price', 'h'])
                low_v = _get_value(data_point, ['low', 'low_price', 'l'])
                close_v = _get_value(data_point, ['close', 'close_price', 'c'])
                vol_v = _get_value(data_point, ['volume', 'v'])

                data_dict = {
                    'date': _normalize_datetime(dt),
                    'open': open_v,
                    'high': high_v,
                    'low': low_v,
                    'close': close_v,
                    'volume': vol_v,
                    'asset_id': asset['asset_id'],
                    'data_source': client_name
                }
                converted_data.append(data_dict)
            
                if self.direct_save:
                    # 큐 우회하여 직접 저장 (PostgreSQL UPSERT)
                    from app.models.asset import OHLCVData
                    from sqlalchemy.dialects.postgresql import insert as pg_insert
                    db = self.session_factory()
                    try:
                        rows = []
                        for d in converted_data:
                            rows.append({
                                'asset_id': d['asset_id'],
                                'timestamp_utc': datetime.fromisoformat(d['date']) if d['date'] else datetime.utcnow(),
                                'data_interval': '1day',
                                'open_price': d['open'],
                                'high_price': d['high'],
                                'low_price': d['low'],
                                'close_price': d['close'],
                                'volume': d['volume'],
                            })

                        # 청크 단위 UPSERT
                        chunk = 1000
                        total_saved = 0
                        for i in range(0, len(rows), chunk):
                            chunk_rows = rows[i:i+chunk]
                            stmt = pg_insert(OHLCVData.__table__).values(chunk_rows)
                            stmt = stmt.on_conflict_do_nothing(index_elements=['asset_id', 'timestamp_utc', 'data_interval'])
                            db.execute(stmt)
                            db.commit()
                            total_saved += len(chunk_rows)
                        print(f"💾 {asset['ticker']} - DB에 {total_saved}개 직접 저장 완료(UPSERT)")
                        return True
                    except Exception as e:
                        db.rollback()
                        self.logging_helper.logger.error(f"직접 저장 중 오류: {e}")
                        return False
                    finally:
                        db.close()
            else:
                # 큐에 전송
                payload = {
                    "items": converted_data,
                    "metadata": {
                        "asset_ticker": asset['ticker'],
                        "asset_id": asset['asset_id'],
                        "client_name": client_name,
                        "collection_date": datetime.now().isoformat()
                    }
                }
                await self.redis_queue_manager.push_batch_task("ohlcv_day_data", payload)
                print(f"📤 {asset['ticker']} - 큐에 {len(converted_data)}개 전송 완료")
                # DB 저장 완료까지 대기
                return await self._wait_for_db_save(asset['ticker'], asset['asset_id'], len(converted_data))
            
        except Exception as e:
            self.logging_helper.logger.error(f"큐 전송 중 오류: {e}")
            return False
    
    async def _wait_for_db_save(self, ticker: str, asset_id: int, expected_count: int, max_wait_time: int = 60) -> bool:
        """DB 저장 완료까지 대기"""
        start_time = datetime.now()
        print(f"⏳ {ticker} - DB 저장 대기 중... (예상 {expected_count}개)")
        
        while (datetime.now() - start_time).seconds < max_wait_time:
            try:
                # 현재 DB에 저장된 데이터 개수 확인
                db = self.session_factory()
                try:
                    from app.models.asset import OHLCVData
                    current_count = db.query(OHLCVData).filter(
                        OHLCVData.asset_id == asset_id
                    ).count()
                finally:
                    db.close()
                
                if current_count >= expected_count:
                    print(f"💾 {ticker} - DB에 {current_count}개 저장 완료")
                    return True
                
                # 2초 대기 후 다시 확인
                await asyncio.sleep(2)
                
            except Exception as e:
                print(f"❌ {ticker} - DB 저장 확인 중 오류: {e}")
                await asyncio.sleep(2)
        
        print(f"⏰ {ticker} - DB 저장 대기 시간 초과 (최대 {max_wait_time}초)")
        return False
    
    async def run_collection(self, data_sources: List[str] = None, days: int = 30, only_missing_ohlcv: bool = True, tickers: Optional[List[str]] = None):
        """전체 수집 프로세스 실행"""
        if data_sources is None:
            data_sources = ['tiingo', 'binance', 'fmp']
        
        mode_text = "OHLCV 데이터가 없는 자산만" if only_missing_ohlcv else "모든 자산"
        print(f"🚀 OHLCV 데이터 수집 시작 ({mode_text}) - 데이터 소스: {data_sources}, limit: {days or 'auto'}")
        
        total_collected = 0
        
        for data_source in data_sources:
            print(f"\n=== {data_source.upper()} 데이터 소스 수집 시작 ===")
            
            # 자산 목록 조회
            assets = await self.get_assets_by_data_source(data_source, only_missing_ohlcv)
            # 특정 티커만 필터링
            if tickers:
                ticker_set = set(tickers)
                assets = [a for a in assets if a['ticker'] in ticker_set]
            
            if not assets:
                print(f"⚠️ {data_source} 데이터 소스에 해당하는 자산이 없습니다.")
                continue
            
            if only_missing_ohlcv:
                print(f"📋 {data_source} 자산 중 OHLCV 데이터가 없는 자산 {len(assets)}개 발견")
            else:
                print(f"📋 {data_source} 자산 {len(assets)}개 발견")
            
            # 데이터 소스별 수집
            if data_source in ('twelvedata', 'tiingo'):
                collected = await self.collect_us_stock_etf_data(assets, days)
            elif data_source == 'binance':
                collected = await self.collect_crypto_data(assets, days)
            elif data_source == 'fmp':
                collected = await self.collect_commodity_foreign_data(assets, days)
            else:
                self.logging_helper.logger.warning(f"지원하지 않는 데이터 소스: {data_source}")
                continue
            
            total_collected += collected
            print(f"=== {data_source.upper()} 수집 완료: {collected}개 ===")
        
        print(f"\n🎉 전체 OHLCV 데이터 수집 완료: {total_collected}개 자산")
        return total_collected

async def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(description="OHLCV 데이터 수집 스크립트")
    parser.add_argument("--data-sources", nargs="+", default=["twelvedata", "binance", "fmp"],
                       help="수집할 데이터 소스 (twelvedata, binance, fmp)")
    parser.add_argument("--days", type=int, default=None,
                       help="수집할 개수 제한. 미설정 시 소스별 최대치(TD 5000/Binance 3000/FMP 3000)")
    parser.add_argument("--all-assets", action="store_true",
                       help="모든 자산 수집 (기본값: OHLCV 데이터가 없는 자산만)")
    parser.add_argument("--direct-save", action="store_true",
                       help="큐를 우회하여 바로 DB에 저장")
    parser.add_argument("--tickers", nargs="+", default=None,
                       help="특정 티커만 수집 (공백으로 구분)")
    parser.add_argument("--dry-run", action="store_true",
                       help="실제 수집 없이 테스트만 실행")
    parser.add_argument("--db", choices=["postgres", "mysql"], default="postgres",
                       help="연결할 DB 백엔드 선택 (기본값: postgres)")
    
    args = parser.parse_args()
    
    if args.dry_run:
        print("🔍 DRY-RUN 모드: 실제 수집 없이 테스트만 실행합니다.")
        return
    
    collector = OHLCVDataCollector(db_backend=args.db, direct_save=getattr(args, 'direct_save', False))
    
    try:
        total_collected = await collector.run_collection(
            data_sources=args.data_sources,
            days=args.days,
            only_missing_ohlcv=not args.all_assets,
            tickers=args.tickers
        )
        print(f"✅ 수집 완료: {total_collected}개 자산")
        
    except Exception as e:
        print(f"❌ 수집 중 오류 발생: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
