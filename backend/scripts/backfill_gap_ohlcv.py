#!/usr/bin/env python3
"""
OHLCV 갭 구간 백필 스크립트
- DB에서 최신 데이터 날짜를 조회하고, 그 이후 오늘까지의 누락된 데이터를 수집
- 데이터 소스별로 적절한 API 클라이언트 사용
- PostgreSQL에 직접 UPSERT 저장

사용법:
  python backfill_gap_ohlcv.py                          # 모든 자산 갭 백필
  python backfill_gap_ohlcv.py --data-sources binance   # 특정 데이터소스만
  python backfill_gap_ohlcv.py --tickers BTCUSDT ETHUSDT  # 특정 티커만
  python backfill_gap_ohlcv.py --since 2026-04-01       # 특정 날짜 이후 갭만
  python backfill_gap_ohlcv.py --dry-run                # 갭 현황만 출력
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional
import argparse

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert
import httpx

from app.external_apis.implementations import (
    TwelveDataClient, PolygonClient, BinanceClient, FMPClient
)
from app.models.asset import OHLCVData
from app.core.database import PostgreSQLSessionLocal
from app.utils.logging_helper import ApiLoggingHelper as LoggingHelper


# 데이터소스 → 클라이언트 우선순위 목록 (첫 번째 실패 시 다음으로 fallback)
DATA_SOURCE_CLIENTS = {
    'twelvedata': ['TwelveDataClient', 'PolygonClient'],
    'tiingo':     ['TwelveDataClient', 'PolygonClient'],
    'binance':    ['BinanceClient'],
    'fmp':        ['FMPClient'],
}

RATE_LIMITS = {
    'TwelveDataClient': 15.0,  # 15초 간격 (분당 4요청 - 다른 서비스 공유 고려)
    'PolygonClient':     2.0,
    'BinanceClient':    0.3,
    'FMPClient':        1.0,
}


class GapBackfiller:
    def __init__(self):
        self.logger = LoggingHelper().logger
        self.session_factory = PostgreSQLSessionLocal
        self._clients: Dict[str, Any] = {}
        self._last_call_at: Dict[str, datetime] = {}
        self._binance_valid_symbols: Optional[set] = None

    _CLIENT_FACTORIES = {
        'TwelveDataClient': TwelveDataClient,
        'PolygonClient':    PolygonClient,
        'BinanceClient':    BinanceClient,
        'FMPClient':        FMPClient,
    }

    def _get_client(self, client_name: str):
        if client_name not in self._clients:
            self._clients[client_name] = self._CLIENT_FACTORIES[client_name]()
        return self._clients[client_name]

    async def _throttle(self, client_name: str):
        min_interval = RATE_LIMITS.get(client_name, 1.0)
        last = self._last_call_at.get(client_name)
        if last:
            elapsed = (datetime.now() - last).total_seconds()
            wait = max(0.0, min_interval - elapsed)
            if wait > 0:
                await asyncio.sleep(wait)
        self._last_call_at[client_name] = datetime.now()

    async def _is_valid_binance_symbol(self, symbol: str) -> bool:
        try:
            if self._binance_valid_symbols is None:
                url = "https://api.binance.com/api/v3/exchangeInfo?permissions=SPOT"
                async with httpx.AsyncClient(timeout=10) as c:
                    r = await c.get(url)
                    r.raise_for_status()
                    data = r.json()
                    self._binance_valid_symbols = {
                        s['symbol'] for s in data.get('symbols', [])
                        if s.get('status') == 'TRADING'
                    }
            return symbol in self._binance_valid_symbols
        except Exception:
            return True

    def _map_binance_symbol(self, ticker: str) -> str:
        s = ticker.upper().replace('-', '').replace('/', '')
        if s.endswith(('USDT', 'BUSD', 'BTC', 'ETH', 'FDUSD', 'USDC')):
            return s
        return f"{s}USDT"

    def get_gap_assets(self, since_date: str, data_sources: Optional[List[str]] = None,
                       tickers: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """since_date 이후 데이터가 없거나 끊긴 자산 목록 반환"""
        db = self.session_factory()
        try:
            where_clauses = ["o.data_interval = '1d'", "a.is_active = true"]
            params: Dict[str, Any] = {'since_date': since_date}

            if data_sources:
                placeholders = ", ".join(f":ds_{i}" for i in range(len(data_sources)))
                where_clauses.append(f"a.data_source IN ({placeholders})")
                params.update({f"ds_{i}": v for i, v in enumerate(data_sources)})
            if tickers:
                placeholders = ", ".join(f":tk_{i}" for i in range(len(tickers)))
                where_clauses.append(f"a.ticker IN ({placeholders})")
                params.update({f"tk_{i}": v for i, v in enumerate(tickers)})

            where_sql = " AND ".join(where_clauses)

            sql = text(f"""
                SELECT
                    a.asset_id,
                    a.ticker,
                    a.name,
                    a.data_source,
                    a.asset_type_id,
                    MAX(o.timestamp_utc::date) as latest_date
                FROM assets a
                JOIN ohlcv_day_data o ON a.asset_id = o.asset_id
                WHERE {where_sql}
                GROUP BY a.asset_id, a.ticker, a.name, a.data_source, a.asset_type_id
                HAVING MAX(o.timestamp_utc::date) < :since_date
                ORDER BY a.data_source, a.ticker
            """)

            rows = db.execute(sql, params).fetchall()
            return [
                {
                    'asset_id': r.asset_id,
                    'ticker': r.ticker,
                    'name': r.name,
                    'data_source': r.data_source,
                    'asset_type_id': r.asset_type_id,
                    'latest_date': r.latest_date,
                }
                for r in rows
            ]
        finally:
            db.close()

    def upsert_ohlcv(self, rows: List[Dict]) -> int:
        """ohlcv_day_data에 UPSERT, 저장된 행 수 반환"""
        if not rows:
            return 0
        db = self.session_factory()
        try:
            chunk = 500
            for i in range(0, len(rows), chunk):
                batch = rows[i:i + chunk]
                stmt = pg_insert(OHLCVData.__table__).values(batch)
                stmt = stmt.on_conflict_do_nothing(
                    index_elements=['asset_id', 'timestamp_utc']
                )
                db.execute(stmt)
            db.commit()
            return len(rows)
        except Exception as e:
            db.rollback()
            self.logger.error(f"UPSERT 오류: {e}")
            return 0
        finally:
            db.close()

    @staticmethod
    def _get_field(obj, keys):
        for k in keys:
            v = obj.get(k) if isinstance(obj, dict) else getattr(obj, k, None)
            if v is not None:
                return v
        return None

    def _normalize_ohlcv_rows(self, ohlcv_data, asset_id: int) -> List[Dict]:
        """API 응답 → ohlcv_day_data 컬럼 형식 변환"""
        g = self._get_field
        rows = []
        for dp in ohlcv_data:
            dt_raw = g(dp, ['date', 'datetime', 'timestamp', 'timestamp_utc', 'time'])
            if dt_raw is None:
                continue
            if isinstance(dt_raw, (int, float)):
                ts = datetime.utcfromtimestamp(dt_raw)
            elif isinstance(dt_raw, datetime):
                ts = dt_raw.replace(tzinfo=None)
            else:
                try:
                    ts = datetime.fromisoformat(str(dt_raw).replace('Z', ''))
                except Exception:
                    continue

            rows.append({
                'asset_id': asset_id,
                'timestamp_utc': ts,
                'data_interval': '1d',
                'open_price':  g(dp, ['open', 'open_price', 'o']),
                'high_price':  g(dp, ['high', 'high_price', 'h']),
                'low_price':   g(dp, ['low',  'low_price',  'l']),
                'close_price': g(dp, ['close', 'close_price', 'c']),
                'volume':      g(dp, ['volume', 'v']),
            })
        return rows

    async def backfill_asset(self, asset: Dict, start_date: str, end_date: str) -> int:
        """단일 자산 백필, 저장된 행 수 반환. TwelveData 실패 시 Polygon fallback"""
        ticker = asset['ticker']
        data_source = asset['data_source']
        asset_id = asset['asset_id']
        client_names = DATA_SOURCE_CLIENTS.get(data_source)

        if not client_names:
            print(f"  ⚠️  {ticker}: 지원하지 않는 데이터소스 '{data_source}' - 스킵")
            return 0

        for idx, client_name in enumerate(client_names):
            client = self._get_client(client_name)

            # Binance: 심볼 매핑 및 유효성 확인
            fetch_ticker = ticker
            if client_name == 'BinanceClient':
                fetch_ticker = self._map_binance_symbol(ticker)
                if not await self._is_valid_binance_symbol(fetch_ticker):
                    print(f"  ⏭️  {ticker} ({fetch_ticker}): Binance에서 지원되지 않음 - 스킵")
                    continue

            try:
                await self._throttle(client_name)
                ohlcv_data = await asyncio.wait_for(
                    client.get_ohlcv_data(fetch_ticker, limit=200,
                                          start_date=start_date, end_date=end_date),
                    timeout=30
                )
            except asyncio.TimeoutError:
                print(f"  ⏰ {ticker} ({client_name}): API 타임아웃")
                continue
            except Exception as e:
                print(f"  ❌ {ticker} ({client_name}): API 오류 - {e}")
                continue

            if not ohlcv_data:
                if idx < len(client_names) - 1:
                    print(f"  🔄 {ticker}: {client_name} 데이터 없음 → {client_names[idx+1]} fallback")
                continue

            rows = self._normalize_ohlcv_rows(ohlcv_data, asset_id)
            if not rows:
                continue

            saved = self.upsert_ohlcv(rows)
            return saved

        print(f"  ⚠️  {ticker}: 모든 클라이언트에서 데이터 없음")
        return 0

    async def run(self, since_date: str, end_date: str,
                  data_sources: Optional[List[str]], tickers: Optional[List[str]],
                  dry_run: bool = False):

        print(f"\n갭 백필 시작: {since_date} ~ {end_date}")
        print("=" * 60)

        assets = self.get_gap_assets(since_date, data_sources, tickers)

        if not assets:
            print("갭이 있는 자산 없음 - 완료")
            return

        # 요약 출력
        by_source: Dict[str, List] = {}
        for a in assets:
            by_source.setdefault(a['data_source'], []).append(a)

        print(f"총 {len(assets)}개 자산에 갭 발견:")
        for src, lst in sorted(by_source.items()):
            print(f"  {src}: {len(lst)}개")

        if dry_run:
            print("\n[DRY-RUN] 실제 수집 없이 종료")
            for a in assets:
                gap_days = (date.fromisoformat(end_date) - a['latest_date']).days
                print(f"  {a['ticker']:<12} {a['data_source']:<12} "
                      f"latest={a['latest_date']}  gap={gap_days}일")
            return

        print()
        total_saved = 0
        for i, asset in enumerate(assets, 1):
            backfill_start = (asset['latest_date'] + timedelta(days=1)).isoformat()
            gap_days = (date.fromisoformat(end_date) - asset['latest_date']).days
            print(f"[{i}/{len(assets)}] {asset['ticker']:<12} "
                  f"({asset['data_source']}) "
                  f"from={backfill_start}  gap={gap_days}일")

            saved = await self.backfill_asset(asset, backfill_start, end_date)
            total_saved += saved
            if saved > 0:
                print(f"  ✅ {saved}개 저장")
            else:
                print(f"  — 저장 없음")

        print(f"\n{'='*60}")
        print(f"백필 완료: {total_saved}개 행 저장 ({len(assets)}개 자산 처리)")


async def main():
    parser = argparse.ArgumentParser(description="OHLCV 갭 백필 스크립트")
    parser.add_argument("--since", default="2026-05-20",
                        help="이 날짜 이전이 latest인 자산 대상 (기본: 2026-05-20)")
    parser.add_argument("--end", default=date.today().isoformat(),
                        help="백필 종료 날짜 (기본: 오늘)")
    parser.add_argument("--data-sources", nargs="+", default=None,
                        help="대상 데이터소스 (twelvedata binance fmp tiingo)")
    parser.add_argument("--tickers", nargs="+", default=None,
                        help="특정 티커만 (예: BTCUSDT AAPL)")
    parser.add_argument("--dry-run", action="store_true",
                        help="갭 현황만 출력, 실제 수집 없음")
    args = parser.parse_args()

    backfiller = GapBackfiller()
    await backfiller.run(
        since_date=args.since,
        end_date=args.end,
        data_sources=args.data_sources,
        tickers=args.tickers,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    asyncio.run(main())
