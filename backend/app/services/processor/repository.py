import logging
import os
import time
from typing import List, Dict, Any, Optional
from datetime import datetime, date, timedelta, timezone
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert as pg_insert

from ...core.database import get_postgres_db
from ...models.asset import (
    RealtimeQuote, RealtimeQuoteTimeDelay, StockProfile, ETFInfo, 
    CryptoData, StockFinancial, StockAnalystEstimate, WorldAssetsRanking,
    CryptoMetric, RealtimeQuotesTimeBar
)

logger = logging.getLogger(__name__)

class DataRepository:
    """데이터베이스 저장 작업을 전담하는 클래스"""

    def __init__(self, validator):
        self.validator = validator
        self.bulk_upsert_enabled = os.getenv("BULK_UPSERT_ENABLED", "true").lower() == "true"
        self.batch_size = int(os.getenv("BULK_BATCH_SIZE", "1000"))

    def _sanitize_number(self, val, min_abs=0.0, max_abs=1e9, digits=8):
        try:
            if val is None:
                return None
            f = float(val)
            if not (f == f) or f == float('inf') or f == float('-inf'):
                return None
            if abs(f) < min_abs:
                f = 0.0
            if abs(f) > max_abs:
                return None
            return round(f, digits)
        except Exception:
            return None

    def _get_time_window(self, timestamp: datetime, interval_minutes: int = 15) -> datetime:
        """지정된 분 단위로 시간 윈도우 계산"""
        try:
            minute = (timestamp.minute // interval_minutes) * interval_minutes
            return timestamp.replace(minute=minute, second=0, microsecond=0)
        except Exception:
            return timestamp

    async def bulk_save_realtime_quotes(self, records: List[Dict[str, Any]]) -> bool:
        """실시간 인용 데이터 일괄 저장"""
        if not records:
            logger.warning("⚠️ 저장할 레코드가 없습니다.")
            return False

        logger.debug(f"🔍 검증 시작: {len(records)}개 레코드")
        # 데이터 검증
        validated_records = []
        for record in records:
            if self.validator.validate_realtime_quote(record):
                validated_records.append(record)

        if not validated_records:
            logger.warning(f"🚨 검증을 통과한 레코드가 없습니다. (입력: {len(records)}개)")
            return False
        
        logger.debug(f"✅ 검증 통과: {len(validated_records)}/{len(records)}개")

        pg_db = next(get_postgres_db())
        try:
            batch_size = self.batch_size if self.bulk_upsert_enabled else 1
            success_count = 0

            for start_idx in range(0, len(validated_records), batch_size):
                batch = validated_records[start_idx:start_idx + batch_size]
                if not batch:
                    continue

                # 실시간 테이블용 데이터
                dedup_rt = {}
                rt_allowed_keys = {'asset_id', 'timestamp_utc', 'price', 'volume', 'change_amount', 'change_percent', 'data_source'}
                for rec in batch:
                    r = {k: v for k, v in rec.items() if k in rt_allowed_keys}
                    r['price'] = self._sanitize_number(rec.get('price'))
                    r['volume'] = self._sanitize_number(rec.get('volume'))
                    r['change_amount'] = self._sanitize_number(rec.get('change_amount'))
                    r['change_percent'] = self._sanitize_number(rec.get('change_percent'))
                    if r['price'] is None:
                        continue
                    # Ensure required fields
                    if 'asset_id' not in r or 'timestamp_utc' not in r or 'data_source' not in r:
                        continue
                    dedup_rt[r['asset_id']] = r
                realtime_rows = list(dedup_rt.values())

                # 지연 테이블용 데이터 (1m 단위로 집계) - 영구 저장용
                delay_dedup = {}
                delay_allowed_keys = {'asset_id', 'timestamp_utc', 'price', 'volume', 'change_amount', 'change_percent', 'data_source', 'data_interval'}
                for rec in batch:
                    d = {k: v for k, v in rec.items() if k in delay_allowed_keys}
                    tw = self._get_time_window(rec['timestamp_utc'], 1) # 1m window
                    d['timestamp_utc'] = tw
                    d['data_interval'] = "1m"
                    d['price'] = self._sanitize_number(rec.get('price'))
                    d['volume'] = self._sanitize_number(rec.get('volume'))
                    d['change_amount'] = self._sanitize_number(rec.get('change_amount'))
                    d['change_percent'] = self._sanitize_number(rec.get('change_percent'))
                    
                    if 'asset_id' not in d: d['asset_id'] = rec.get('asset_id')
                    if 'data_source' not in d: d['data_source'] = rec.get('data_source')
                    
                    if d['price'] is None:
                        continue
                        
                    key = (d['asset_id'], d['timestamp_utc'], d['data_source'], d['data_interval'])
                    if key not in delay_dedup:
                        delay_dedup[key] = d
                    else:
                        delay_dedup[key].update(d)
                delay_rows = list(delay_dedup.values())

                realtime_rows = list(dedup_rt.values())

                # 실시간 봉 테이블 집계 - REDIS로 대체됨 (중복 계산 방지를 위해 주석 처리)
                rt_bar_rows = []
                # for interval in ["1m", "5m"]:
                #     ...

                try:
                    # 1. 실시간 테이블 UPSERT
                    if realtime_rows:
                        stmt = pg_insert(RealtimeQuote).values(realtime_rows)
                        stmt = stmt.on_conflict_do_update(
                            index_elements=['asset_id'],
                            set_={
                                'timestamp_utc': stmt.excluded.timestamp_utc,
                                'price': stmt.excluded.price,
                                'volume': stmt.excluded.volume,
                                'change_amount': stmt.excluded.change_amount,
                                'change_percent': stmt.excluded.change_percent,
                                'data_source': stmt.excluded.data_source,
                                'updated_at': func.now()
                            }
                        )
                        pg_db.execute(stmt)

                    # 2. 지연 테이블 (1m) UPSERT - 영구 저장
                    if delay_rows:
                        stmt = pg_insert(RealtimeQuoteTimeDelay).values(delay_rows)
                        stmt = stmt.on_conflict_do_update(
                            index_elements=['asset_id', 'timestamp_utc', 'data_source', 'data_interval'],
                            set_={
                                'price': stmt.excluded.price,
                                'volume': stmt.excluded.volume,
                                'change_amount': stmt.excluded.change_amount,
                                'change_percent': stmt.excluded.change_percent,
                                'updated_at': func.now()
                            }
                        )
                        pg_db.execute(stmt)

                    # 3. 실시간 봉 테이블 (1m, 5m) UPSERT - REDIS로 대체됨
                    # if rt_bar_rows:
                    #     stmt = pg_insert(RealtimeQuotesTimeBar).values(rt_bar_rows)
                    #     stmt = stmt.on_conflict_do_update(
                    #         index_elements=['asset_id', 'timestamp_utc', 'data_interval'],
                    #         set_={
                    #             'high_price': func.greatest(RealtimeQuotesTimeBar.high_price, stmt.excluded.high_price),
                    #             'low_price': func.least(RealtimeQuotesTimeBar.low_price, stmt.excluded.low_price),
                    #             'close_price': stmt.excluded.close_price,
                    #             'volume': RealtimeQuotesTimeBar.volume + stmt.excluded.volume,
                    #             'change_amount': stmt.excluded.close_price - RealtimeQuotesTimeBar.open_price,
                    #             'change_percent': ((stmt.excluded.close_price - RealtimeQuotesTimeBar.open_price) / RealtimeQuotesTimeBar.open_price) * 100,
                    #             'updated_at': func.now()
                    #         }
                    #     )
                    #     pg_db.execute(stmt)

                    pg_db.commit()
                    success_count += len(batch)
                    logger.debug(f"💾 배치 저장 성공: {len(batch)}개 (RT: {len(realtime_rows)}, Delay: {len(delay_rows)}, Bars: {len(rt_bar_rows)})")
                except Exception as e:
                    pg_db.rollback()
                    logger.error(f"❌ Bulk upsert 실패: {e}", exc_info=True)

            logger.info(f"💾 총 저장 완료: {success_count}/{len(validated_records)}개")
            return success_count > 0
        finally:
            pg_db.close()

    async def save_realtime_bars_batch(self, bars: List[Dict[str, Any]]) -> bool:
        """Redis 바구니에서 넘어온 집계된 봉 데이터를 DB에 일괄 저장"""
        if not bars:
            return True
            
        pg_db = next(get_postgres_db())
        try:
            # SQLAlchemy 모델에 맞게 변환
            rows = []
            for b in bars:
                try:
                    open_p = float(b.get('open'))
                    close_p = float(b.get('close'))
                    source = b.get('data_source') or 'binance'
                    interval = b.get('interval') or '1m'
                    row = {
                        'asset_id': int(b.get('asset_id')),
                        'timestamp_utc': b.get('timestamp_utc'),
                        'data_interval': interval,
                        'open_price': open_p,
                        'high_price': float(b.get('high')),
                        'low_price': float(b.get('low')),
                        'close_price': close_p,
                        'volume': float(b.get('volume')),
                        'change_amount': close_p - open_p,
                        'data_source': source,
                        'updated_at': func.now()
                    }
                    if row['open_price'] and row['open_price'] != 0:
                        row['change_percent'] = (row['change_amount'] / row['open_price']) * 100
                    else:
                        row['change_percent'] = 0
                    rows.append(row)
                except (ValueError, TypeError) as e:
                    logger.warning(f"⚠️ 바구니 데이터 데이터 변환 실패: {e} | bar: {b}")
                    continue

            if not rows:
                return True

            # 1. RealtimeQuotesTimeBar UPSERT
            stmt = pg_insert(RealtimeQuotesTimeBar).values(rows)
            stmt = stmt.on_conflict_do_update(
                index_elements=['asset_id', 'timestamp_utc', 'data_interval'],
                set_={
                    'high_price': func.greatest(RealtimeQuotesTimeBar.high_price, stmt.excluded.high_price),
                    'low_price': func.least(RealtimeQuotesTimeBar.low_price, stmt.excluded.low_price),
                    'close_price': stmt.excluded.close_price,
                    'volume': RealtimeQuotesTimeBar.volume + stmt.excluded.volume,
                    'change_amount': stmt.excluded.change_amount,
                    'change_percent': stmt.excluded.change_percent,
                    'updated_at': func.now()
                }
            )
            pg_db.execute(stmt)

            # 2. 1분봉인 경우 RealtimeQuoteTimeDelay에도 저장 (영구 백업용)
            delay_rows = []
            for r in rows:
                if r['data_interval'] == '1m':
                    delay_rows.append({
                        'asset_id': r['asset_id'],
                        'timestamp_utc': r['timestamp_utc'],
                        'price': r['close_price'],
                        'volume': r['volume'],
                        'change_amount': r['change_amount'],
                        'change_percent': r['change_percent'],
                        'data_source': r['data_source'],
                        'data_interval': '1m',
                        'updated_at': func.now()
                    })
            
            if delay_rows:
                stmt_delay = pg_insert(RealtimeQuoteTimeDelay).values(delay_rows)
                stmt_delay = stmt_delay.on_conflict_do_update(
                    index_elements=['asset_id', 'timestamp_utc'],
                    set_={
                        'price': stmt_delay.excluded.price,
                        'volume': stmt_delay.excluded.volume,
                        'change_amount': stmt_delay.excluded.change_amount,
                        'change_percent': stmt_delay.excluded.change_percent,
                        'updated_at': func.now()
                    }
                )
                pg_db.execute(stmt_delay)

            pg_db.commit()
            logger.info(f"💾 Redis 바구니 데이터 DB 저장 완료: {len(rows)}건 ({rows[0]['data_interval']})")
            return True
        except Exception as e:
            pg_db.rollback()
            logger.error(f"❌ Redis 바구니 데이터 DB 저장 실패: {e}", exc_info=True)
            return False
        finally:
            pg_db.close()

    async def cleanup_old_realtime_bars(self, days: int = 7) -> int:
        """7일 이상 된 실시간 봉 데이터 삭제 및 비정상 데이터(꼬리) 보정"""
        try:
            db = next(get_postgres_db())
            try:
                # 1. 오래된 데이터 삭제
                cutoff = datetime.now(timezone.utc) - timedelta(days=days)
                deleted = db.query(RealtimeQuotesTimeBar).filter(RealtimeQuotesTimeBar.timestamp_utc < cutoff).delete()
                
                # 2. 비정상 데이터(꼬리/니들) 보정
                # 시가/종가 범위 대비 고가/저가가 1% 이상 차이나는 경우 보정
                fix_query = """
                UPDATE realtime_quotes_time_bar 
                SET 
                  high_price = CASE 
                    WHEN (high_price - GREATEST(open_price, close_price)) / NULLIF(close_price, 0) > 0.01 
                    THEN GREATEST(open_price, close_price) * 1.001 
                    ELSE high_price 
                  END,
                  low_price = CASE 
                    WHEN (LEAST(open_price, close_price) - low_price) / NULLIF(close_price, 0) > 0.01 
                    THEN LEAST(open_price, close_price) * 0.999 
                    ELSE low_price 
                  END
                WHERE 
                  timestamp_utc > NOW() - INTERVAL '2 days'
                  AND (
                    (high_price - GREATEST(open_price, close_price)) / NULLIF(close_price, 0) > 0.01 
                    OR (LEAST(open_price, close_price) - low_price) / NULLIF(close_price, 0) > 0.01
                  );
                """
                db.execute(fix_query)
                db.commit()
                
                if deleted > 0:
                    logger.info(f"🧹 오래된 실시간 봉 데이터 삭제 완료: {deleted}개")
                logger.info(f"🛡️ 실시간 봉 데이터 이상치 보정 완료 (최근 2일)")
                return deleted
            finally:
                db.close()
        except Exception as e:
            logger.error(f"실시간 봉 데이터 정리 실패: {e}")
            return 0

    async def save_stock_profile(self, items: List[Dict[str, Any]]) -> bool:
        if not items:
            return True

        pg_db = next(get_postgres_db())
        try:
            for item in items:
                try:
                    asset_id = item.get("asset_id") or item.get("assetId")
                    data = item.get("data") if "data" in item else item
                    if not asset_id or not isinstance(data, dict):
                        continue

                    # 데이터 매핑 (간소화됨, 필요시 필드 추가)
                    pg_data = {
                        'asset_id': asset_id,
                        'company_name': data.get("name") or data.get("company_name"),
                        'description_en': data.get("description_en") or data.get("description"),
                        'sector': data.get("sector"),
                        'industry': data.get("industry"),
                        'market_cap': data.get("market_cap"),
                        # ... 기타 필드들 ...
                    }
                    # None 제거
                    pg_data = {k: v for k, v in pg_data.items() if v is not None}

                    stmt = pg_insert(StockProfile).values(**pg_data)
                    stmt = stmt.on_conflict_do_update(
                        index_elements=['asset_id'],
                        set_={k: getattr(stmt.excluded, k) for k in pg_data.keys() if k != 'asset_id'}
                    )
                    # updated_at 추가
                    if 'updated_at' in StockProfile.__table__.columns:
                         stmt = stmt.on_conflict_do_update(
                            index_elements=['asset_id'],
                            set_={**{k: getattr(stmt.excluded, k) for k in pg_data.keys() if k != 'asset_id'}, 'updated_at': func.now()}
                        )

                    pg_db.execute(stmt)
                except Exception as e:
                    logger.warning(f"개별 주식 프로필 저장 실패: {e}")
                    continue
            
            pg_db.commit()
            return True
        except Exception as e:
            pg_db.rollback()
            logger.error(f"주식 프로필 저장 실패: {e}")
            return False
        finally:
            pg_db.close()

    async def save_crypto_data(self, items: List[Dict[str, Any]]) -> bool:
        if not items:
            return True
            
        pg_db = next(get_postgres_db())
        try:
            saved_count = 0
            for item in items:
                try:
                    asset_id = item.get('asset_id')
                    if not asset_id:
                        continue
                    
                    crypto_data_dict = {
                        'asset_id': asset_id,
                        'symbol': item.get('symbol', ''),
                        'name': item.get('name', ''),
                        'price': item.get('price'),
                        'current_price': item.get('price'),  # price와 current_price 동기화
                        'market_cap': item.get('market_cap'),
                        'circulating_supply': item.get('circulating_supply'),
                        'total_supply': item.get('total_supply'),
                        'max_supply': item.get('max_supply'),
                        'volume_24h': item.get('volume_24h'),
                        'percent_change_1h': item.get('percent_change_1h'),
                        'percent_change_24h': item.get('percent_change_24h'),
                        'percent_change_7d': item.get('percent_change_7d'),
                        'percent_change_30d': item.get('percent_change_30d'),
                        'cmc_rank': item.get('rank'),
                        'category': item.get('category'),
                        'description': item.get('description'),
                        'logo_url': item.get('logo_url'),
                        'website_url': item.get('website_url'),
                        'slug': item.get('slug'),
                        'date_added': item.get('date_added'),
                        'platform': item.get('platform'),
                        'explorer': item.get('explorer'),
                        'source_code': item.get('source_code'),
                        'tags': item.get('tags'),
                        'is_active': True
                    }
                    crypto_data_dict = {k: v for k, v in crypto_data_dict.items() if v is not None}
                    

                    # logo_url: 이미 로컬 경로('/images/')로 설정된 경우 덮어쓰지 않음
                    stmt = pg_insert(CryptoData).values(**crypto_data_dict)
                    set_dict = {k: getattr(stmt.excluded, k) for k in crypto_data_dict.keys() if k != 'asset_id'}
                    
                    # logo_url에 대한 조건부 업데이트 로직 적용
                    if 'logo_url' in set_dict:
                        from sqlalchemy import case, literal
                        # 기존 값이 '/images/%'로 시작하면(로컬 아이콘), 기존 값 유지. 아니면 새로운 값으로 업데이트
                        set_dict['logo_url'] = case(
                            (CryptoData.logo_url.like('/images/%'), CryptoData.logo_url),
                            else_=stmt.excluded.logo_url
                        )

                    stmt = stmt.on_conflict_do_update(
                        index_elements=['asset_id'],
                        set_={
                            **set_dict,
                            'last_updated': func.now()
                        }
                    )
                    pg_db.execute(stmt)
                    saved_count += 1
                except Exception as e:
                    logger.error(f"crypto_data 저장 중 오류: {e}")
                    continue
            
            pg_db.commit()
            return saved_count > 0
        except Exception as e:
            pg_db.rollback()
            logger.error(f"crypto_data 저장 실패: {e}")
            return False
        finally:
            pg_db.close()

    async def save_stock_financials(self, items: List[Dict[str, Any]]) -> bool:
        """주식 재무 데이터 저장"""
        if not items:
            return True

        pg_db = next(get_postgres_db())
        try:
            from ...models.asset import StockFinancial
            
            for item in items:
                try:
                    asset_id = item.get("asset_id") or item.get("assetId")
                    data = item.get("data") if isinstance(item, dict) and "data" in item else item
                    if not asset_id or not isinstance(data, dict):
                        continue

                    # 필드 매핑 (간소화)
                    pg_data = {
                        'asset_id': asset_id,
                        'snapshot_date': data.get('snapshot_date') or data.get('date'),
                        'currency': data.get('currency'),
                        'market_cap': data.get('market_cap'),
                        'ebitda': data.get('ebitda'),
                        'pe_ratio': data.get('pe_ratio'),
                        # ... 필요한 필드 추가 ...
                    }
                    pg_data = {k: v for k, v in pg_data.items() if v is not None}

                    stmt = pg_insert(StockFinancial).values(**pg_data)
                    stmt = stmt.on_conflict_do_update(
                        index_elements=['asset_id'],
                        set_={k: getattr(stmt.excluded, k) for k in pg_data.keys() if k != 'asset_id'}
                    )
                    pg_db.execute(stmt)
                except Exception as e:
                    logger.warning(f"개별 주식 재무 저장 실패: {e}")
                    continue

            pg_db.commit()
            return True
        except Exception as e:
            pg_db.rollback()
            logger.error(f"주식 재무 데이터 저장 실패: {e}")
            return False
        finally:
            pg_db.close()

    async def save_stock_estimate(self, items: List[Dict[str, Any]]) -> bool:
        """주식 추정치 데이터 저장"""
        if not items:
            return True

        pg_db = next(get_postgres_db())
        try:
            from ...models.asset import StockAnalystEstimate
            
            for item in items:
                try:
                    asset_id = item.get("asset_id")
                    data = item.get("data") if "data" in item else item
                    if not asset_id:
                        continue
                    
                    # fiscal_date 파싱 등 로직 필요
                    fiscal_date = data.get("fiscal_date")
                    if not fiscal_date:
                        continue

                    pg_data = {
                        'asset_id': asset_id,
                        'fiscal_date': fiscal_date,
                        'revenue_avg': data.get('revenue_avg'),
                        # ...
                    }
                    pg_data = {k: v for k, v in pg_data.items() if v is not None}

                    stmt = pg_insert(StockAnalystEstimate).values(**pg_data)
                    stmt = stmt.on_conflict_do_update(
                        index_elements=['asset_id', 'fiscal_date'],
                        set_={k: getattr(stmt.excluded, k) for k in pg_data.keys() if k not in ['asset_id', 'fiscal_date']}
                    )
                    pg_db.execute(stmt)
                except Exception as e:
                    continue
            
            pg_db.commit()
            return True
        except Exception as e:
            pg_db.rollback()
            return False
        finally:
            pg_db.close()

    async def save_ohlcv_data(self, items: List[Dict[str, Any]], metadata: Dict[str, Any] = None) -> bool:
        """OHLCV 데이터 저장 - 일봉과 인트라데이 데이터를 적절한 테이블에 분리 저장"""
        if not items:
            return True
        
        if metadata is None:
            metadata = {}
            
        pg_db = next(get_postgres_db())
        try:
            from ...models.asset import OHLCVData, OHLCVIntradayData
            
            daily_items = []
            intraday_items = []
            
            # metadata에서 asset_id 가져오기 (Collector가 여기에 넣음)
            meta_asset_id = metadata.get('asset_id')
            meta_interval = metadata.get('interval')
            
            for item in items:
                # 데이터 간격 결정 로직
                interval = item.get('interval') or item.get('data_interval') or meta_interval
                if not interval:
                    # 메타데이터나 빈도 정보로 추론
                    freq = metadata.get('frequency')
                    if freq:
                        if freq.lower() in ['daily', 'd', '1d']:
                            interval = '1d'
                        elif freq.lower() in ['weekly', 'w', '1w']:
                            interval = '1w'
                        elif freq.lower() in ['monthly', 'm', '1m']:
                            interval = '1M'
                        else:
                            interval = '1d' # Default to daily
                    else:
                         interval = '1d'

                # asset_id: item에 있으면 사용, 없으면 metadata에서 가져옴
                asset_id = item.get('asset_id') or meta_asset_id

                # 데이터 정제
                pg_data = {
                    'asset_id': asset_id,
                    'timestamp_utc': item.get('timestamp_utc') or item.get('date'),
                    'open_price': self._sanitize_number(item.get('open_price') or item.get('open')),
                    'high_price': self._sanitize_number(item.get('high_price') or item.get('high')),
                    'low_price': self._sanitize_number(item.get('low_price') or item.get('low')),
                    'close_price': self._sanitize_number(item.get('close_price') or item.get('close')),
                    'volume': self._sanitize_number(item.get('volume')),
                    'data_interval': interval
                }
                
                if not pg_data['asset_id'] or not pg_data['timestamp_utc']:
                    continue
                    
                if interval in ['1d', '1w', '1M']:
                    daily_items.append(pg_data)
                else:
                    intraday_items.append(pg_data)

            # 일봉 데이터 저장
            if daily_items:
                try:
                    logger.debug(f"💾 일봉 데이터 저장 시도: {len(daily_items)}건")
                    stmt = pg_insert(OHLCVData).values(daily_items)
                    # asset_id, timestamp_utc, data_interval 조합이 unique constraint일 가능성 고려
                    # unique constraint가 없으면 에러가 발생하지만, 그 경우에도 처리
                    try:
                        stmt = stmt.on_conflict_do_update(
                            index_elements=['asset_id', 'timestamp_utc', 'data_interval'],
                            set_={
                                'open_price': stmt.excluded.open_price,
                                'high_price': stmt.excluded.high_price,
                                'low_price': stmt.excluded.low_price,
                                'close_price': stmt.excluded.close_price,
                                'volume': stmt.excluded.volume,
                                'change_percent': stmt.excluded.change_percent,
                            }
                        )
                    except Exception:
                        # unique constraint가 다른 조합이거나 없는 경우, 일반 insert 시도
                        pass
                    pg_db.execute(stmt)
                    logger.debug(f"✅ 일봉 데이터 저장 성공: {len(daily_items)}건")
                except Exception as e:
                    # 중복 에러인 경우 무시하고 계속 진행
                    if 'duplicate key' in str(e).lower() or 'unique constraint' in str(e).lower():
                        logger.warning(f"⚠️ 일봉 데이터 중복 무시: {len(daily_items)}건")
                    else:
                        logger.error(f"❌ 일봉 데이터 저장 실패: {e}", exc_info=True)
                        raise

            # 인트라데이 데이터 저장
            if intraday_items:
                try:
                    logger.debug(f"💾 인트라데이 데이터 저장 시도: {len(intraday_items)}건")
                    stmt = pg_insert(OHLCVIntradayData).values(intraday_items)
                    # asset_id, timestamp_utc, data_interval 조합이 unique constraint일 가능성 고려
                    try:
                        stmt = stmt.on_conflict_do_update(
                            index_elements=['asset_id', 'timestamp_utc', 'data_interval'],
                            set_={
                                'open_price': stmt.excluded.open_price,
                                'high_price': stmt.excluded.high_price,
                                'low_price': stmt.excluded.low_price,
                                'close_price': stmt.excluded.close_price,
                                'volume': stmt.excluded.volume,
                                'change_percent': stmt.excluded.change_percent,
                            }
                        )
                    except Exception:
                        # unique constraint가 다른 조합이거나 없는 경우, 일반 insert 시도
                        pass
                    pg_db.execute(stmt)
                    logger.debug(f"✅ 인트라데이 데이터 저장 성공: {len(intraday_items)}건")
                except Exception as e:
                    # 중복 에러인 경우 무시하고 계속 진행
                    if 'duplicate key' in str(e).lower() or 'unique constraint' in str(e).lower():
                        logger.warning(f"⚠️ 인트라데이 데이터 중복 무시: {len(intraday_items)}건")
                    else:
                        logger.error(f"❌ 인트라데이 데이터 저장 실패: {e}", exc_info=True)
                        raise

            pg_db.commit()
            total_saved = len(daily_items) + len(intraday_items)
            if total_saved > 0:
                logger.info(f"✅ OHLCV 저장 완료: daily={len(daily_items)}, intraday={len(intraday_items)}")
            return True
            
        except Exception as e:
            pg_db.rollback()
            logger.error(f"OHLCV 데이터 저장 실패: {e}")
            return False
        finally:
            pg_db.close()

    async def save_world_assets_ranking(self, items: List[Dict[str, Any]], metadata: Dict[str, Any]) -> bool:
        """세계 자산 랭킹 데이터 저장"""
        if not items:
            return True
        pg_db = next(get_postgres_db())
        try:
            from ...models.asset import WorldAssetsRanking
            
            saved_count = 0
            for item in items:
                try:
                    ticker = item.get('ticker')
                    if not ticker:
                        continue
                        
                    ranking_date = metadata.get('collection_date', datetime.now().date())
                    data_source = metadata.get('data_source', 'unknown')
                    
                    pg_data = {
                        'rank': item.get('rank'),
                        'name': item.get('name'),
                        'ticker': ticker,
                        'market_cap_usd': item.get('market_cap_usd'),
                        'price_usd': item.get('price_usd'),
                        'daily_change_percent': item.get('daily_change_percent'),
                        'ranking_date': ranking_date,
                        'data_source': data_source,
                    }
                    
                    stmt = pg_insert(WorldAssetsRanking).values(**pg_data)
                    stmt = stmt.on_conflict_do_update(
                        index_elements=['ranking_date', 'ticker', 'data_source'],
                        set_={
                            'rank': stmt.excluded.rank,
                            'name': stmt.excluded.name,
                            'market_cap_usd': stmt.excluded.market_cap_usd,
                            'price_usd': stmt.excluded.price_usd,
                            'daily_change_percent': stmt.excluded.daily_change_percent,
                            'last_updated': func.now()
                        }
                    )
                    pg_db.execute(stmt)
                    saved_count += 1
                except Exception as e:
                    logger.warning(f"WorldAssetsRanking 저장 실패: {e}")
                    continue
            
            pg_db.commit()
            return saved_count > 0
        except Exception as e:
            pg_db.rollback()
            logger.error(f"WorldAssetsRanking 저장 실패: {e}")
            return False
        finally:
            pg_db.close()

    async def save_etf_info(self, items: List[Dict[str, Any]]) -> bool:
        """ETF 정보 저장"""
        if not items:
            return True
            
        pg_db = next(get_postgres_db())
        try:
            from ...models.asset import ETFInfo
            
            saved_count = 0
            for item in items:
                try:
                    asset_id = item.get('asset_id')
                    if not asset_id:
                        continue
                    
                    data = item.get('data') if 'data' in item else item
                    
                    pg_data = {
                        'asset_id': asset_id,
                        'snapshot_date': data.get('snapshot_date') or date.today(),
                        'net_assets': self._sanitize_number(data.get('net_assets'), max_abs=1e18),
                        'net_expense_ratio': self._sanitize_number(data.get('net_expense_ratio')),
                        'portfolio_turnover': self._sanitize_number(data.get('portfolio_turnover')),
                        'dividend_yield': self._sanitize_number(data.get('dividend_yield')),
                        'inception_date': data.get('inception_date'),
                        'leveraged': data.get('leveraged'),
                        'sectors': data.get('sectors'),
                        'holdings': data.get('holdings'),
                    }
                    pg_data = {k: v for k, v in pg_data.items() if v is not None}
                    
                    stmt = pg_insert(ETFInfo).values(**pg_data)
                    stmt = stmt.on_conflict_do_update(
                        index_elements=['asset_id'],
                        set_={k: getattr(stmt.excluded, k) for k in pg_data.keys() if k != 'asset_id'}
                    )
                    pg_db.execute(stmt)
                    saved_count += 1
                except Exception as e:
                    logger.warning(f"ETF 정보 저장 실패: {e}")
                    continue
            
            pg_db.commit()
            return saved_count > 0
        except Exception as e:
            pg_db.rollback()
            logger.error(f"ETF 정보 저장 실패: {e}")
            return False
        finally:
            pg_db.close()

    async def save_macrotrends_financials(self, items: List[Dict[str, Any]]) -> bool:
        """Macrotrends 재무 데이터 저장"""
        if not items:
            return True
            
        pg_db = next(get_postgres_db())
        try:
            from ...models.asset import MacrotrendsFinancial
            
            saved_count = 0
            for item in items:
                try:
                    # camelCase와 snake_case 모두 지원
                    asset_id = item.get('asset_id') or item.get('assetId')
                    section = item.get('section')
                    field_name = item.get('field_name') or item.get('fieldName')
                    snapshot_date = item.get('snapshot_date') or item.get('snapshotDate')
                    
                    if not all([asset_id, section, field_name, snapshot_date]):
                        continue
                    
                    pg_data = {
                        'asset_id': asset_id,
                        'section': section,
                        'field_name': field_name,
                        'snapshot_date': snapshot_date,
                        'value_numeric': self._sanitize_number(
                            item.get('value_numeric') or item.get('valueNumeric'), 
                            max_abs=1e18
                        ),
                        'value_text': item.get('value_text') or item.get('valueText'),
                        'unit': item.get('unit'),
                        'currency': item.get('currency'),
                        'source_url': item.get('source_url') or item.get('sourceUrl'),
                    }
                    pg_data = {k: v for k, v in pg_data.items() if v is not None}
                    
                    stmt = pg_insert(MacrotrendsFinancial).values(**pg_data)
                    stmt = stmt.on_conflict_do_update(
                        index_elements=['asset_id', 'section', 'field_name', 'snapshot_date'],
                        set_={k: getattr(stmt.excluded, k) for k in pg_data.keys() 
                              if k not in ['asset_id', 'section', 'field_name', 'snapshot_date']}
                    )
                    pg_db.execute(stmt)
                    saved_count += 1
                except Exception as e:
                    logger.warning(f"Macrotrends 재무 데이터 저장 실패: {e}")
                    continue
            
            pg_db.commit()
            logger.info(f"✅ macrotrends_financials 저장 완료: {saved_count}건")
            return saved_count > 0
        except Exception as e:
            pg_db.rollback()
            logger.error(f"Macrotrends 재무 데이터 저장 실패: {e}")
            return False
        finally:
            pg_db.close()

    async def save_onchain_metrics(self, items: List[Dict[str, Any]]) -> bool:
        """온체인 메트릭 데이터 저장 (Bulk UPSERT 최적화 버전)"""
        if not items:
            return True
        
        pg_db = next(get_postgres_db())
        try:
            # Debug: Check known columns
            # logger.info(f"DEBUG: CryptoMetric columns: {CryptoMetric.__table__.columns.keys()}")

            # 1. 수집 가능한 모든 필드 정의 (Group A + Group B 전체)
            all_metric_fields = [
                # Group A (홀수일)
                'mvrv_z_score', 'mvrv', 'nupl', 'sopr', 'realized_price',
                'sth_realized_price', 'lth_mvrv', 'sth_mvrv', 'lth_nupl',
                'sth_nupl', 'aviv', 'true_market_mean', 'terminal_price',
                'delta_price_usd', 'market_cap',
                # Group B (짝수일)
                'hashrate', 'difficulty', 'thermo_cap', 'puell_multiple',
                'reserve_risk', 'rhodl_ratio', 'nvts', 'nrpl_usd',
                'utxos_in_profit_pct', 'utxos_in_loss_pct', 'realized_cap',
                'etf_btc_flow', 'etf_btc_total', 'hodl_waves_supply', 'cdd_90dma',
                'hodl_age_distribution',
            ]
            
            # 2. 데이터 유효성 검사 및 정제
            valid_pg_data_list = []
            for item in items:
                asset_id = item.get('asset_id')
                ts = item.get('timestamp_utc')
                if not asset_id or not ts: continue
                
                pg_data = {'asset_id': asset_id, 'timestamp_utc': ts}
                has_metric = False
                for field in all_metric_fields:
                    val = item.get(field)
                    if val is not None:
                        # Onchain data varies widely (e.g. hashrate, market_cap are huge). 
                        # Relax max_abs to 1e30 and increase digits.
                        pg_data[field] = val if field in ('hodl_age_distribution', 'open_interest_futures') else self._sanitize_number(val, max_abs=1e30, digits=10)
                        has_metric = True
                if has_metric:
                    valid_pg_data_list.append(pg_data)

            if not valid_pg_data_list:
                return True

            # 3. 배치 처리 (대량 데이터인 경우 1000개씩 끊어서 처리)
            batch_size = 1000
            for i in range(0, len(valid_pg_data_list), batch_size):
                batch = valid_pg_data_list[i : i + batch_size]
                
                stmt = pg_insert(CryptoMetric).values(batch)
                
                # 업데이트할 필드 결정 (배치 내에 존재하는 모든 메트릭 필드)
                update_fields = set()
                for d in batch:
                    for k in d.keys():
                        if k not in ('asset_id', 'timestamp_utc'):
                            update_fields.add(k)
                
                update_dict = {k: getattr(stmt.excluded, k) for k in update_fields}
                update_dict['updated_at'] = func.now()
                
                stmt = stmt.on_conflict_do_update(
                    index_elements=['asset_id', 'timestamp_utc'],
                    set_=update_dict
                )
                
                pg_db.execute(stmt)
            
            pg_db.commit()
            logger.info(f"✅ 온체인 메트릭 저장 완료: {len(valid_pg_data_list)}건 (Bulk UPSERT)")
            return True
            
        except Exception as e:
            pg_db.rollback()
            logger.error(f"온체인 메트릭 배치 저장 실패: {e}", exc_info=True)
            return False
        finally:
            pg_db.close()
