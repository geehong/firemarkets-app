"""
API 전략 관리자: 여러 외부 API를 순서대로 호출하고 실패 시 자동 전환하는 Failover 메커니즘
"""

import asyncio
import pandas as pd
import time
from typing import Optional, List, Dict, Any, Tuple
import os
import httpx
from datetime import datetime, timedelta
from collections import defaultdict
from app.utils.logger import logger
from app.core.config_manager import ConfigManager
from app.external_apis.implementations import (
    FMPClient, TiingoClient,
    AlphaVantageClient, PolygonClient, TwelveDataClient,
    BinanceClient, CoinbaseClient, CoinGeckoClient, CoinMarketCapClient,
    BitcoinDataClient, FinnhubClient
)
from app.external_apis.implementations.macrotrends_client import MacrotrendsClient
from app.crud.asset import crud_ohlcv
from app.utils.logging_helper import ApiLoggingHelper as LoggingHelper
from app.external_apis.base.schemas import EtfInfoData

class ApiStrategyManager:
    """API 전략 관리자: 여러 API를 순서대로 시도하고 실패 시 자동 전환"""
    
    def __init__(self, config_manager=None):
        """API 클라이언트들을 우선순위 순서로 초기화"""
        # ConfigManager 주입 없으면 기본 인스턴스 사용
        self.config_manager = config_manager or ConfigManager()
        # 1. 일봉 OHLCV 클라이언트 (주식, ETF, 지수, 커머디티, 통화)
        self.ohlcv_day_clients = [
            TiingoClient(),       # 1순위 복구
            #FMPClient(),          # 2순위 (WebSocket 백업용)
            #FinnhubClient(),
            PolygonClient(),      # 3순위
            TwelveDataClient(),   # 4순위
        ]
        
        # 2. 인트라데이 OHLCV 클라이언트 (4h, 1h 등)
        # FMP는 실질적으로 일봉 위주이므로 인트라데이에서는 비활성화
        self.ohlcv_intraday_clients = [
            TwelveDataClient(),  
            #AlphaVantageClient(), # (4h, 1h 데이터 지원) - 주석처리
            PolygonClient(),
            TiingoClient(),
            #FMPClient(),          # 재활성화
        ]
        
        # 3. 암호화폐 OHLCV 클라이언트 (1d, 4h, 1h 등)
        self.crypto_ohlcv_clients = [
            BinanceClient(),       # 1순위
            CoinbaseClient(),      # 2순위
        ]
        
        # 4. 주식 프로필용 클라이언트 (기업 프로필 데이터)
        # FMP는 API 제한이 심하므로 백업용으로만 사용
        self.stock_profiles_clients = [
            FinnhubClient(),
            PolygonClient(),      # 1순위 (5 calls/min, 상세한 데이터)
            TwelveDataClient(),   # 2순위 (백업용)
           #FMPClient(),          # 3순위 (제한적, 백업용)
        ]
        
        # 4-1. FMP 전용 주식 프로필 클라이언트 (주말 수집용)
        # 주말에만 실행하여 API 제한을 우회
        self.stock_profiles_fmp_clients = [
           FMPClient(),          # FMP만 사용 (상세한 데이터)
        ]
        
        # 5. 주식 재무용 클라이언트 (재무 데이터) - 원상복구 (FMP 단독)
        self.stock_financials_clients = [
            #AlphaVantageClient(), # 주석처리
            FMPClient(),
            TiingoClient(),      
            PolygonClient(),
            TwelveDataClient(),
        ]

        # 5-1. 주식 재무용 클라이언트 (Macrotrends 전용 그룹) - 명시적 분리
        self.stock_financials_macrotrends_clients = [
            MacrotrendsClient(),
        ]
        
        # 6. 주식 추정치용 클라이언트 (애널리스트 추정치)
        self.stock_analyst_estimates_clients = [
            FMPClient(),
            #AlphaVantageClient(),
            #TiingoClient(),
           # PolygonClient(),
            #TwelveDataClient(),
        ]
        
        # 7. 커머디티용 클라이언트 (커머디티 지원 확인된 API만)
        self.commodity_ohlcv_clients = [
            FMPClient(),
            #PolygonClient(),
            #TiingoClient(),
           # TwelveDataClient()
        ]
        
        # 8. ETF용 클라이언트 (ETF 정보 수집)
        self.etf_clients = [
            #AlphaVantageClient(), # 주석처리
            FMPClient(),
            #TiingoClient(),     # 대역폭 보호를 위해 비활성화
            PolygonClient(),
            TwelveDataClient(),
        ]
        
        # 9. 암호화폐 정보용 클라이언트 (일반 정보 데이터)
        self.crypto_clients = [
            CoinMarketCapClient(), # 1순위
            CoinGeckoClient(),     # 2순위
            BinanceClient(),       # 3순위
            CoinbaseClient(),      # 4순위
            #FMPClient(),           # 5순위
            TwelveDataClient()     # 6순위
        ]
        
        # 10. 온체인 메트릭용 클라이언트
        self.onchain_clients = [
            BitcoinDataClient(),   # 1순위 (MVRV-Z-Score, NUPL 등)
            # GlassnodeClient(),   # 2순위 (향후 추가 예정)
        ]
        
        # 하위 호환성을 위한 레거시 클라이언트 (기존 코드 호환성)
        self.ohlcv_clients = self.ohlcv_day_clients  # 기본값으로 일봉 클라이언트 사용
        self.stock_clients = self.stock_profiles_clients  # 기본값으로 프로필 클라이언트 사용
        
        self.logger = logger
        self.logging_helper = LoggingHelper()
        
        # API 실패 카운터 (자동 비활성화용)
        self.api_failure_counts = {}
        self.max_failures_before_disable = 5  # 5회 연속 실패 시 비활성화
        
        # API별 Rate Limiting (동적으로 클라이언트에서 가져옴)
        self.api_rate_limits = {}  # 클라이언트별로 동적 생성
        
        # 자산 타입 캐시 (성능 최적화)
        self._asset_type_cache = {}
        self._cache_ttl = self._get_config_value("ASSET_TYPE_CACHE_TTL_SECONDS", 3600, int)  # 1시간 캐시

        # 클라이언트별 심볼 제외 목록(실패 빈번/미지원 심볼)
        self._twelvedata_symbol_denylist = set([
            "2222.SR",  # Saudi Aramco - TwelveData 심볼 미지원 케이스
            "SIUSD",    # Silver USD: TwelveData 심볼 체계 불일치
            "GCUSD",    # Gold USD: TwelveData 심볼 체계 불일치
            "FFEU",     # 비표준/미확인 심볼
        ])

        # Apply optional scheduler-based client filter
        try:
            self._apply_scheduler_client_filter(
                collector_key="stock_profiles_clients",
                clients_attr_name="stock_profiles_clients",
            )
            # Also apply for financials and analyst estimates so they can be disabled during profile runs
            self._apply_scheduler_client_filter(
                collector_key="stock_financials_clients",
                clients_attr_name="stock_financials_clients",
            )
            self._apply_scheduler_client_filter(
                collector_key="stock_analyst_estimates_clients",
                clients_attr_name="stock_analyst_estimates_clients",
            )
            # Apply for commodity OHLCV clients
            self._apply_scheduler_client_filter(
                collector_key="commodity_ohlcv_clients",
                clients_attr_name="commodity_ohlcv_clients",
            )
        except Exception as e:
            logger.warning(f"[SchedulerFilter] skip: {e}")

    def _get_config_value(self, key: str, default: Any, cast: Any = str) -> Any:
        """단일 헬퍼: DB(ConfigManager) → 환경변수 → 기본값 순으로 설정 로드.

        Args:
            key: 설정 키 (예: "ASSET_TYPE_CACHE_TTL_SECONDS")
            default: 기본값
            cast: 변환 함수 또는 타입 (int, float, bool 등)
        """
        # 1) ConfigManager 우선
        try:
            if self.config_manager and hasattr(self.config_manager, "_get_config"):
                # ConfigManager의 캐시/타입캐스팅 활용
                return self.config_manager._get_config(key, default, cast)
        except Exception:
            pass

        # 2) 환경변수
        try:
            raw = os.getenv(key)
            if raw is not None:
                if cast is bool:
                    return str(raw).lower() in ("true", "1", "t", "y", "yes")
                return cast(raw)
        except Exception:
            pass

        # 3) 기본값
        return default
    
    def _validate_ohlcv_dataframe(self, data: pd.DataFrame, api_name: str, ticker: str) -> Optional[pd.DataFrame]:
        """
        단일 진입점 데이터프레임 검증 및 정규화.
        - timestamp 컬럼 식별 및 변환
        - 중복/결측 제거, 시간 정렬·단조성 확인
        - 가격 컬럼별 0/NULL 비율 산출
        - OHLC 논리 검사 (high>=open/close/low, low<=open/close/high)
        - volume 음수/NULL→0 정리
        """
        try:
            if data is None or data.empty:
                self.logger.warning(f"{api_name} returned empty dataframe for {ticker}")
                return None

            # volume 정리
            if 'volume' in data.columns:
                before_nan = data['volume'].isna().sum()
                data['volume'] = pd.to_numeric(data['volume'], errors='coerce').fillna(0)
                after_nan = data['volume'].isna().sum()
                neg_count = (data['volume'] < 0).sum()
                data.loc[data['volume'] < 0, 'volume'] = 0
                self.logger.info(f"[{api_name} {ticker}] volume cleanse: nan {before_nan}->{after_nan}, negatives fixed {neg_count}")

            # 타임스탬프 식별
            ts_col = None
            for col in ['timestamp_utc', 'timestamp', 'datetime', 'date', 'time']:
                if col in data.columns:
                    ts_col = col
                    break
            if ts_col is None:
                self.logger.warning(f"[{api_name} {ticker}] no timestamp-like column found in columns={list(data.columns)}")
                return None

            # 표준 컬럼으로 변환
            if ts_col != 'timestamp_utc':
                data['timestamp_utc'] = pd.to_datetime(data[ts_col], errors='coerce', utc=True)
                data = data.drop(ts_col, axis=1)

            # 결측 timestamp 제거 및 중복 제거
            total_before = len(data)
            data = data[data['timestamp_utc'].notna()]
            after_notna = len(data)
            data = data.reset_index(drop=True)
            dup_before = len(data)
            data = data.drop_duplicates(subset='timestamp_utc', keep='last')
            dup_removed = dup_before - len(data)
            # 정렬
            data = data.sort_values('timestamp_utc')
            self.logger.info(f"[{api_name} {ticker}] timestamp cleanse: total {total_before} -> notna {after_notna}, dups removed {dup_removed}")

            if data.empty:
                self.logger.warning(f"[{api_name} {ticker}] dataframe empty after timestamp cleaning")
                return None

            # 단조 증가 검증
            is_monotonic = data['timestamp_utc'].is_monotonic_increasing
            if not is_monotonic:
                out_of_order = (~data['timestamp_utc'].is_monotonic_increasing).sum()
                self.logger.warning(f"[{api_name} {ticker}] timestamps not monotonic increasing (out_of_order approx)={out_of_order}")

            # 가격 컬럼 수집
            price_candidates = ['open_price','open','Open','high_price','high','High','low_price','low','Low','close_price','close','Close']
            price_cols = [c for c in price_candidates if c in data.columns]

            # 가격 0/NULL 비율
            if price_cols:
                col_stats = []
                total_rows = len(data)
                total_zero_or_null = 0
                for c in price_cols:
                    series = pd.to_numeric(data[c], errors='coerce')
                    null_cnt = series.isna().sum()
                    zero_cnt = (series == 0).sum()
                    total_zero_or_null += (null_cnt + zero_cnt)
                    col_stats.append((c, int(null_cnt), int(zero_cnt)))
                ratio = total_zero_or_null / (total_rows * len(price_cols)) if total_rows > 0 else 1.0
                self.logger.info(f"[{api_name} {ticker}] price null/zero ratio={ratio:.3%} per col stats={col_stats}")
                if ratio > 0.05:
                    self.logger.warning(f"[{api_name} {ticker}] reject: too many zero/null prices ratio={ratio:.3%} > 5%")
                    return None

                # OHLC 논리 검사 (가능한 컬럼 맵핑)
                def pick(*names):
                    for n in names:
                        if n in data.columns:
                            return pd.to_numeric(data[n], errors='coerce')
                    return None
                s_open = pick('open_price','open','Open')
                s_high = pick('high_price','high','High')
                s_low  = pick('low_price','low','Low')
                s_close= pick('close_price','close','Close')
                if s_high is not None and s_low is not None:
                    max_ocl = pd.concat([s_open, s_close, s_low], axis=1).max(axis=1, skipna=True)
                    min_ocl = pd.concat([s_open, s_close, s_high], axis=1).min(axis=1, skipna=True)
                    high_viol = (s_high < max_ocl).sum(skipna=True)
                    low_viol  = (s_low  > min_ocl).sum(skipna=True)
                    if high_viol or low_viol:
                        self.logger.warning(f"[{api_name} {ticker}] OHLC logical anomalies: high<max(open,close,low)={int(high_viol)}, low>min(open,close,high)={int(low_viol)}")

            # 인덱스 설정하지 않고 컬럼으로 유지 (DataProcessor에서 처리)
            self.logger.info(f"[{api_name} {ticker}] final frame shape={data.shape}")
            return data
        except Exception as e:
            self.logger.error(f"[{api_name} {ticker}] validation error: {e}")
            return None

    def _calculate_date_range(self, limit: int) -> Tuple[str, str]:
        """
        날짜 범위를 계산합니다.
        
        Args:
            limit: 가져올 일수
            
        Returns:
            (start_date, end_date) 튜플 (YYYY-MM-DD 형식)
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=limit)
        return start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')
    
    def _calculate_yahoo_period(self, limit: int) -> str:
        """
        Yahoo Finance API용 period를 계산합니다.
        
        Args:
            limit: 가져올 일수
            
        Returns:
            Yahoo Finance period 문자열
        """
        if limit <= 5:
            return "5d"
        elif limit <= 30:
            return "1mo"
        elif limit <= 90:
            return "3mo"
        elif limit <= 180:
            return "6mo"
        elif limit <= 365:
            return "1y"
        elif limit <= 730:
            return "2y"
        elif limit <= 1825:
            return "5y"
        else:
            return "max"
    
    def _get_api_name(self, client) -> str:
        """
        클라이언트 객체에서 API 이름을 추출합니다.
        
        Args:
            client: API 클라이언트 객체
            
        Returns:
            API 이름 문자열
        """
        class_name = client.__class__.__name__
        # if 'Tiingo' in class_name:
        #     return 'tiingo'
        if 'Polygon' in class_name:
            return 'polygon'
        elif 'FMP' in class_name:
            return 'fmp'
        elif 'TwelveData' in class_name:
            return 'twelvedata'
        elif 'AlphaVantage' in class_name:
            return 'alpha_vantage'
        elif 'Binance' in class_name:
            return 'binance'
        elif 'Coinbase' in class_name:
            return 'coinbase'
        elif 'CoinMarketCap' in class_name:
            return 'coinmarketcap'
        elif 'CoinGecko' in class_name:
            return 'coingecko'
        elif 'Yahoo' in class_name:
            return 'yahoo'
        else:
            return class_name.lower()
    
    async def _check_rate_limit(self, api_name: str, client=None) -> bool:
        """
        API별 rate limit을 확인하고 필요시 대기합니다.
        클라이언트의 get_rate_limit_info()를 동적으로 사용합니다.
        
        Args:
            api_name: API 이름
            client: API 클라이언트 객체 (rate limit 정보 가져오기용)
            
        Returns:
            True if rate limit allows, False if exceeded
        """
        # 클라이언트가 제공되지 않으면 rate limit 체크 건너뛰기
        if not client or not hasattr(client, 'get_rate_limit_info'):
            return True
        
        # 클라이언트에서 rate limit 정보 가져오기
        try:
            rate_limit_info = client.get_rate_limit_info()
            calls_per_minute = rate_limit_info.get('free_tier', {}).get('calls_per_minute', 1000)
        except Exception as e:
            self.logger.warning(f"Failed to get rate limit info for {api_name}: {e}")
            return True  # 실패 시 rate limit 체크 건너뛰기
        
        # API별 호출 기록 초기화 (필요시)
        if api_name not in self.api_rate_limits:
            self.api_rate_limits[api_name] = {'last_calls': []}
        
        rate_limit = self.api_rate_limits[api_name]
        current_time = time.time()
        
        # 1분 이전의 호출 기록 제거
        rate_limit['last_calls'] = [
            call_time for call_time in rate_limit['last_calls'] 
            if current_time - call_time < 60
        ]
        
        # Rate limit 확인
        if len(rate_limit['last_calls']) >= calls_per_minute:
            self.logger.warning(f"Rate limit exceeded for {api_name} ({calls_per_minute}/min). Waiting...")
            return False
        
        # 호출 기록 추가
        rate_limit['last_calls'].append(current_time)
        return True
    
    async def _wait_for_rate_limit(self, api_name: str):
        """
        Rate limit이 초과된 경우 대기합니다.
        """
        if api_name not in self.api_rate_limits:
            return
        
        rate_limit = self.api_rate_limits[api_name]
        current_time = time.time()
        
        # 가장 오래된 호출이 1분이 지날 때까지 대기
        if rate_limit['last_calls']:
            oldest_call = min(rate_limit['last_calls'])
            wait_time = 60 - (current_time - oldest_call)
            if wait_time > 0:
                self.logger.info(f"Waiting {wait_time:.1f}s for {api_name} rate limit reset")
                await asyncio.sleep(wait_time)
    
    async def get_ohlcv_data(self, asset_id: int, interval: str = "1d") -> Optional[List]:
        """
        OHLCV 데이터를 가져오는 메서드 (수집기용)
        """
        # asset_id로 ticker 조회
        from app.models.asset import Asset
        from app.core.database import SessionLocal
        
        db = SessionLocal()
        try:
            asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
            if not asset:
                return None
            ticker = asset.ticker
            asset_type = asset.asset_type.type_name if asset.asset_type else None
            # data_source 확인 (우선순위: asset.data_source > collection_settings.data_source)
            # asset.data_source는 자산의 기본 데이터 소스 (DB 컬럼, 영구 설정)
            # collection_settings.data_source는 수집 설정에서 오버라이드 (임시 설정)
            preferred_data_source = None
            if asset.data_source:
                preferred_data_source = asset.data_source
            elif asset.collection_settings and isinstance(asset.collection_settings, dict):
                preferred_data_source = asset.collection_settings.get('data_source')
        finally:
            db.close()
        
        # 기존 get_ohlcv 메서드 호출
        df = await self.get_ohlcv(ticker, interval, 100, asset_type, asset_id, preferred_data_source=preferred_data_source)
        if df is None or df.empty:
            return None
        
        # DataFrame을 Pydantic 모델 리스트로 변환
        from app.external_apis.base.schemas import OhlcvDataPoint
        
        result = []
        # Reset index to make 'timestamp_utc' a column
        df_reset = df.reset_index()
        
        for _, row in df_reset.iterrows():
            try:
                # 컬럼명을 안전하게 확인하고 변환
                def get_val(r, keys):
                    for k in keys:
                        if k in r and pd.notna(r[k]):
                            return r[k]
                    return None
                
                data_point = OhlcvDataPoint(
                    timestamp_utc=get_val(row, ['timestamp_utc', 'timestamp']),
                    open_price=float(get_val(row, ['open_price', 'open'])),
                    high_price=float(get_val(row, ['high_price', 'high'])),
                    low_price=float(get_val(row, ['low_price', 'low'])),
                    close_price=float(get_val(row, ['close_price', 'close'])),
                    volume=float(get_val(row, ['volume'])),
                    change_percent=float(get_val(row, ['change_percent', 'change'])) if get_val(row, ['change_percent', 'change']) is not None else None
                )
                result.append(data_point)
            except Exception as e:
                self.logger.warning(f"Failed to convert row to OhlcvDataPoint: {e}")
                continue
        
        return result

    async def get_ohlcv(self, ticker: str, interval: str = "1d", limit: int = 100, asset_type: Optional[str] = None, asset_id: Optional[int] = None, preferred_data_source: Optional[str] = None) -> Optional[pd.DataFrame]:
        """
        [IMPROVED] OHLCV 데이터를 여러 API에서 순서대로 시도하여 가져옵니다.
        이제 DB 상태를 확인하여 최적의 파라미터를 자동으로 결정합니다.
        
        Args:
            ticker: 주식/암호화폐 티커
            interval: 시간 간격 (1d, 4h, 1h 등)
            limit: 가져올 데이터 개수 (기본값, asset_id가 있으면 무시됨)
            asset_type: 자산 타입 (crypto, stock, commodity 등)
            asset_id: 자산 ID (DB 상태 확인용, 있으면 최적 파라미터 자동 계산)
            
        Returns:
            DataFrame 또는 None (모든 API 실패 시)
        """
        # historical_days를 먼저 가져오기
        from app.models import AppConfiguration
        from app.core.database import get_postgres_db
        
        db = next(get_postgres_db())
        try:
            historical_days_config = db.query(AppConfiguration).filter(
                AppConfiguration.config_key == "HISTORICAL_DATA_DAYS_PER_RUN"
            ).first()
            historical_days = int(historical_days_config.config_value) if historical_days_config else 165
        finally:
            db.close()
        
        # asset_id가 있으면 DB 상태를 확인하여 최적 파라미터 결정
        is_backfill = False
        if asset_id:
            params = self._get_fetch_parameters(asset_id, interval)
            # If no action is needed, params will be None
            if not params:
                self.logger.info(f"No data fetching needed for asset {asset_id} ({ticker}) at this time.")
                return None
                
            start_date = params["start_date"]
            end_date = params["end_date"]
            adjusted_limit = params["limit"]
            is_backfill = params.get("is_backfill", False)
            # 백필 플래그를 인스턴스 변수에 저장 (수집기에서 참조용)
            self._last_fetch_was_backfill = is_backfill
            self.logger.info(f"Using optimized parameters for asset {asset_id}: {start_date} to {end_date}, limit={adjusted_limit}, backfill={is_backfill}")
        else:
            # 기존 로직 유지 (하위 호환성)
            # 간격별 limit 조정 (TwelveData 5000개 제한 고려)
            if interval == '1h':
                # 1h: 24배 (24시간 * historical_days)
                adjusted_limit = historical_days * 24
            elif interval == '4h':
                # 4h: 6배 (6개 * historical_days)
                adjusted_limit = historical_days * 6
            else:
                adjusted_limit = limit
            
            # 날짜 범위 계산 (지원하는 API용)
            start_date, end_date = self._calculate_date_range(adjusted_limit)
        
        # 인트라데이 인터벌의 경우 특별 처리
        if interval in ["4h", "1h"]:
            self.logger.info(f"{interval} interval requested for {ticker}. Using adjusted limit: {adjusted_limit} (base: {historical_days})")
        
        yahoo_period = self._calculate_yahoo_period(adjusted_limit)
        last_exception = None
        
        # preferred_data_source 초기화
        preferred_data_source_lower = preferred_data_source.lower() if preferred_data_source else None
        
        # preferred_data_source가 있으면 해당 클라이언트를 우선 사용
        if preferred_data_source:
            # data_source에 따라 클라이언트 매핑
            data_source_to_client = {
                'fmp': 'fmp',
                'tiingo': 'tiingo',
                'twelvedata': 'twelvedata',
                'polygon': 'polygon',
                'finnhub': 'finnhub',
                'binance': 'binance',
                'coinbase': 'coinbase'
            }
            
            preferred_api_name = data_source_to_client.get(preferred_data_source_lower)
            if preferred_api_name:
                # 모든 클라이언트 리스트에서 preferred 클라이언트 찾기
                all_clients = []
                if asset_type and 'crypto' in asset_type.lower():
                    all_clients = self.crypto_ohlcv_clients
                elif asset_type and 'commodit' in asset_type.lower():
                    all_clients = self.commodity_ohlcv_clients
                elif interval in ["4h", "1h", "30m", "15m", "5m", "1m"]:
                    all_clients = self.ohlcv_intraday_clients
                else:
                    all_clients = self.ohlcv_day_clients
                
                # preferred 클라이언트 찾기
                preferred_client = None
                for client in all_clients:
                    if client and self._get_api_name(client) == preferred_api_name:
                        preferred_client = client
                        break
                
                # preferred 클라이언트를 찾지 못한 경우, FMPClient는 별도로 생성 가능
                if not preferred_client and preferred_api_name == 'fmp':
                    from app.external_apis.implementations.fmp_client import FMPClient
                    preferred_client = FMPClient()
                    self.logger.info(f"Created FMPClient for preferred data source '{preferred_data_source}' for {ticker}")
                
                if preferred_client:
                    # preferred 클라이언트를 첫 번째로, 나머지는 fallback으로
                    clients_to_use = [preferred_client] + [c for c in all_clients if c != preferred_client and c is not None]
                    self.logger.info(f"Using preferred data source '{preferred_data_source}' for {ticker}: {preferred_api_name} (first priority)")
                else:
                    self.logger.warning(f"Preferred data source '{preferred_data_source}' not available for {ticker}, using default clients")
                    preferred_data_source = None  # Fallback to default logic
        
        # preferred_data_source가 없거나 클라이언트를 찾지 못한 경우 기본 로직 사용
        if not preferred_data_source or 'clients_to_use' not in locals():
            # 자산 타입과 인터벌에 따라 적절한 클라이언트 선택
            if asset_type and 'crypto' in asset_type.lower():
                # 코인 일봉은 Binance, Coinbase만 사용 (요청사항 반영)
                clients_to_use = [c for c in self.crypto_ohlcv_clients if self._get_api_name(c) in ('binance','coinbase')]
                self.logger.info(f"Using crypto OHLCV clients for {ticker} (asset_type: {asset_type}) -> {len(clients_to_use)} providers (binance/coinbase only)")
            elif asset_type and 'commodit' in asset_type.lower():
                # 커머디티는 전용 클라이언트 사용 (FMPClient 포함)
                # 'commodit'로 체크하여 'Commodities'와 'Commodity' 모두 매칭
                clients_to_use = self.commodity_ohlcv_clients
                self.logger.info(f"Using commodity OHLCV clients for {ticker} (asset_type: {asset_type})")
            else:
                # 주식, ETF, 지수, 통화 등 - 인터벌에 따라 클라이언트 선택
                # ⚠️ 일반 주식은 절대 FMP를 사용하지 않음 (commodity_ohlcv_clients는 commodity 전용)
                if interval in ["4h", "1h", "30m", "15m", "5m", "1m"]:
                    # 인트라데이 데이터 (4h, 1h 등)
                    clients_to_use = self.ohlcv_intraday_clients
                    self.logger.info(f"Using intraday OHLCV clients for {ticker} (asset_type: {asset_type}, interval: {interval})")
                else:
                    # 일봉 데이터 (1d, 1w, 1m 등)
                    clients_to_use = self.ohlcv_day_clients
                    self.logger.info(f"Using daily OHLCV clients for {ticker} (asset_type: {asset_type}, interval: {interval})")
                
                # 보안 체크: 일반 주식이 FMP로 수집되는 것을 방지 (preferred_data_source가 fmp인 경우 제외)
                if asset_type and 'stock' in asset_type.lower() and (not preferred_data_source_lower or preferred_data_source_lower != 'fmp'):
                    clients_to_use = [c for c in clients_to_use if self._get_api_name(c) != 'fmp']
                    if any(self._get_api_name(c) == 'fmp' for c in self.commodity_ohlcv_clients):
                        self.logger.warning(f"⚠️ Prevented FMP usage for stock {ticker} (asset_type: {asset_type}). FMP is only for commodities.")
        
        # 활성화된 클라이언트만 필터링
        active_clients = [client for client in clients_to_use if client is not None]
        if len(active_clients) != len(clients_to_use):
            self.logger.info(f"Filtered {len(clients_to_use) - len(active_clients)} inactive clients for {ticker}")
        
        clients_to_use = active_clients
        
        for i, client in enumerate(clients_to_use):
            try:
                # API 호출 시작 로깅
                api_name = self._get_api_name(client)

                # 클라이언트별 심볼 제외 가드
                if api_name == 'twelvedata' and ticker in self._twelvedata_symbol_denylist:
                    self.logger.info(f"Skip {api_name} for unsupported symbol {ticker}")
                    continue
                
                # Rate limit 확인 및 대기
                if not await self._check_rate_limit(api_name, client):
                    await self._wait_for_rate_limit(api_name)
                    await self._check_rate_limit(api_name, client)  # 다시 확인
                
                self.logging_helper.log_api_call_start(api_name, ticker)
                
                self.logger.info(f"Attempting to fetch OHLCV for {ticker} using {client.__class__.__name__} (attempt {i+1}/{len(clients_to_use)})")
                
                # 각 클라이언트의 메서드명이 다를 수 있으므로 적응적으로 호출
                if hasattr(client, 'get_ohlcv_data'):
                    # FMP, Alpha Vantage, Binance, Coinbase 클라이언트 (Tiingo 제외)
                    if hasattr(client, '__class__') and 'FMPClient' in str(client.__class__):
                        # FMP 클라이언트의 경우 limit 파라미터 전달
                        # 날짜 범위가 있으면 전달 (from/to)
                        if start_date and end_date:
                            data = await client.get_ohlcv_data(ticker, start_date=start_date, end_date=end_date, limit=adjusted_limit)
                        else:
                            data = await client.get_ohlcv_data(ticker, limit=adjusted_limit)
                    elif hasattr(client, '__class__') and 'BinanceClient' in str(client.__class__):
                        # Binance는 start_date, end_date 파라미터 지원
                        data = await client.get_ohlcv_data(ticker, interval=interval, start_date=start_date, end_date=end_date, limit=adjusted_limit)
                    elif hasattr(client, '__class__') and 'CoinbaseClient' in str(client.__class__):
                        # Coinbase는 start_date, end_date 파라미터 지원
                        data = await client.get_ohlcv_data(ticker, interval=interval, start_date=start_date, end_date=end_date, limit=adjusted_limit)
                    elif hasattr(client, '__class__') and 'AlphaVantageClient' in str(client.__class__):
                        # Alpha Vantage는 interval 파라미터 지원
                        data = await client.get_ohlcv_data(ticker, interval=interval, limit=adjusted_limit)
                    else:
                        # 다른 클라이언트들은 기존 방식 유지
                        data = await client.get_ohlcv_data(ticker)
                    
                    # List[OhlcvDataPoint]를 DataFrame으로 변환
                    # List[OhlcvDataPoint] 또는 None을 DataFrame으로 변환
                    if data is None:
                        self.logger.warning(f"{client.__class__.__name__} returned None for {ticker}")
                        continue
                    elif isinstance(data, list):
                        if not data:  # 빈 리스트
                            self.logger.warning(f"{client.__class__.__name__} returned empty list for {ticker}")
                            continue
                        # Pydantic 모델 리스트를 DataFrame으로 변환
                        df_data = []
                        for item in data:
                            if hasattr(item, 'model_dump'):
                                item_dict = item.model_dump()
                            elif hasattr(item, 'dict'):
                                item_dict = item.dict()
                            else:
                                item_dict = item.__dict__
                            
                            # 디버깅: 첫 번째 아이템의 구조 확인
                            if len(df_data) == 0:
                                self.logger.debug(f"First item structure: {item_dict}")
                            
                            df_data.append(item_dict)
                        
                        data = pd.DataFrame(df_data)
                        self.logger.info(f"{client.__class__.__name__} raw frame shape={data.shape}, columns={list(data.columns)}")
                        
                        # 디버깅: DataFrame의 첫 번째 행 확인
                        if not data.empty:
                            self.logger.debug(f"First row data: {data.iloc[0].to_dict()}")
                        
                        data = self._validate_ohlcv_dataframe(data, api_name, ticker)
                elif hasattr(client, 'get_historical_prices'):
                    # TwelveData, Polygon 클라이언트
                    if hasattr(client, '__class__') and 'PolygonClient' in str(client.__class__):
                        # Polygon - start_date, end_date, interval 순서
                        data = await client.get_historical_prices(ticker, start_date, end_date, interval)
                    else:
                        # TwelveData - 날짜 범위 사용
                        data = await client.get_historical_prices(ticker, interval, start_date=start_date, end_date=end_date)
                    if data is not None and not data.empty:
                        data = pd.DataFrame(data)
                        self.logger.info(f"{client.__class__.__name__} raw frame shape={data.shape}, columns={list(data.columns)}")
                        data = self._validate_ohlcv_dataframe(data, api_name, ticker)
                elif hasattr(client, 'get_historical_data'):
                    # Yahoo Finance 클라이언트 - period 사용
                    data = await client.get_historical_data(ticker, period=yahoo_period, interval=interval)
                    if data is not None and not data.empty:
                        # List[Dict]를 DataFrame으로 변환
                        data = pd.DataFrame(data)
                else:
                    self.logger.warning(f"{client.__class__.__name__} has no known OHLCV data fetching method")
                    continue
                
                if data is not None and not data.empty:
                    # 데이터 검증: 모든 가격 컬럼의 0값 확인
                    price_columns = []
                    for col_name in ['open_price', 'open', 'Open', 'high_price', 'high', 'High', 'low_price', 'low', 'Low', 'close_price', 'close', 'Close']:
                        if col_name in data.columns:
                            price_columns.append(col_name)
                    
                    if price_columns:
                        # 모든 가격 컬럼에서 0값 확인
                        total_zero_count = 0
                        total_valid_count = 0
                        
                        for col in price_columns:
                            zero_count = (data[col] == 0).sum()
                            null_count = data[col].isna().sum()
                            total_zero_count += zero_count + null_count
                            total_valid_count += len(data)
                        
                        zero_ratio = total_zero_count / total_valid_count if total_valid_count > 0 else 0
                        
                        if zero_ratio > 0.05:  # 5% 이상이 0이면 문제로 간주 (더 엄격하게)
                            msg = f"{client.__class__.__name__} returned data with {zero_ratio:.1%} zero/null prices for {ticker}"
                            self.logging_helper.log_api_call_failure(api_name, ticker, Exception(msg))
                            self.logger.warning(f"{msg}. Skipping this data.")
                            continue
                        
                        # 개별 행에서 모든 가격이 0인 경우 제거
                        valid_rows = 0
                        for _, row in data.iterrows():
                            has_valid_price = False
                            for col in price_columns:
                                if pd.notna(row[col]) and row[col] > 0:
                                    has_valid_price = True
                                    break
                            if has_valid_price:
                                valid_rows += 1
                        
                        if valid_rows == 0:
                            msg = f"{client.__class__.__name__} returned data with no valid prices for {ticker}"
                            self.logging_helper.log_api_call_failure(api_name, ticker, Exception(msg))
                            self.logger.warning(f"{msg}. Skipping this data.")
                            continue
                        
                        self.logger.info(f"{client.__class__.__name__} data validation passed for {ticker}: {valid_rows}/{len(data)} valid rows")
                    
                    # API 호출 성공 로깅
                    self.logging_helper.log_api_call_success(api_name, ticker, len(data))
                    
                    self.logger.info(f"Successfully fetched OHLCV for {ticker} from {client.__class__.__name__} ({len(data)} records)")
                    return data
                else:
                    # API 호출은 성공했지만 데이터가 없는 경우 로깅
                    self.logging_helper.log_api_call_failure(api_name, ticker, Exception("No data returned"))
                    self.logger.warning(f"{client.__class__.__name__} returned empty data for {ticker}")
                    
            except Exception as e:
                # API 호출 실패 로깅
                self.logging_helper.log_api_call_failure(api_name, ticker, e)
                
                # 404 에러는 정상적인 실패로 간주하고 다음 API로 넘어감
                if "404" in str(e) or "Not Found" in str(e):
                    self.logger.warning(f"{client.__class__.__name__} returned 404 for {ticker}. Trying next client.")
                    continue
                # 컬럼 관련 오류는 다음 클라이언트로 시도
                elif "timestamp" in str(e).lower() or "datetime" in str(e).lower() or "columns" in str(e).lower():
                    self.logger.warning(f"{client.__class__.__name__} has column/timestamp issue for {ticker}: {e}. Trying next client.")
                    last_exception = e
                else:
                    self.logger.warning(f"{client.__class__.__name__} failed for {ticker}. Reason: {e}. Trying next client.")
                    last_exception = e
        
        self.logger.error(f"All API clients failed to fetch OHLCV for {ticker}. Last error: {last_exception}")
        return None
    
    async def get_commodity_ohlcv(self, ticker: str, interval: str = "1d", limit: int = 100, asset_id: int = None) -> Optional[pd.DataFrame]:
        """
        [IMPROVED] 커머디티 OHLCV 데이터를 FMP 우선순위로 가져옵니다.
        이제 DB 상태를 확인하여 최적의 파라미터를 자동으로 결정합니다.
        """
        return await self.get_ohlcv(ticker, interval, limit, asset_type='commodity', asset_id=asset_id)
    
    async def get_crypto_data(self, symbol: str, interval: str = "1d", limit: int = 100) -> Optional[pd.DataFrame]:
        """
        암호화폐 데이터를 여러 API에서 순서대로 시도하여 가져옵니다.
        """
        return await self.get_ohlcv(symbol, interval, limit, asset_type='crypto')
    
    async def get_stock_data(self, ticker: str, interval: str = "1d", limit: int = 100) -> Optional[pd.DataFrame]:
        """
        주식 데이터를 여러 API에서 순서대로 시도하여 가져옵니다.
        """
        return await self.get_ohlcv(ticker, interval, limit, asset_type='stock')
    
    async def get_company_profile(self, asset_id: int, use_fmp_clients: bool = False) -> Optional[Dict[str, Any]]:
        """
        기업 프로필 데이터를 여러 API에서 우선순위대로 시도하여 가져옵니다.
        
        Args:
            asset_id: 자산 ID
            use_fmp_clients: True이면 stock_profiles_fmp_clients를 사용 (일요일 전용)
        """
        # asset_id로 ticker 조회
        from app.models.asset import Asset
        from app.core.database import SessionLocal
        
        db = SessionLocal()
        try:
            asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
            if not asset:
                return None
            ticker = asset.ticker
        finally:
            db.close()
        
        # 사용할 클라이언트 그룹 선택
        clients_to_use = self.stock_profiles_fmp_clients if use_fmp_clients else self.stock_profiles_clients
        self.logger.info(f"Using {'FMP clients' if use_fmp_clients else 'standard clients'} for company profile: {ticker}")
        
        # stock_profiles_clients 사용 (병렬 실행)
        import asyncio
        
        async def fetch_from_client(client):
            try:
                self.logger.info(f"Attempting to fetch company profile for {ticker} using {client.__class__.__name__}")
                
                # Enforce per-client rate limit (Polygon: 4/min, etc.)
                try:
                    client_name = client.__class__.__name__.lower()
                except Exception:
                    client_name = "unknown"
                # Only gate Polygon explicitly; others proceed as-is
                if "polygon" in client_name:
                    while not await self._check_rate_limit('polygon', client):
                        await asyncio.sleep(1)

                if hasattr(client, 'get_company_profile'):
                    data = await client.get_company_profile(ticker)
                elif hasattr(client, 'get_profile'):
                    data = await client.get_profile(ticker)
                else:
                    self.logger.warning(f"{client.__class__.__name__} has no company profile method")
                    return None
                
                if data is not None:
                    self.logger.info(f"Successfully fetched company profile for {ticker} from {client.__class__.__name__}")
                    return data
                else:
                    self.logger.warning(f"{client.__class__.__name__} returned empty company profile for {ticker}")
                    return None
                    
            except Exception as e:
                self.logger.warning(f"{client.__class__.__name__} failed for company profile {ticker}. Reason: {e}")
                return None
        
        # 모든 클라이언트를 병렬로 실행
        results = await asyncio.gather(*[fetch_from_client(client) for client in clients_to_use], return_exceptions=True)
        
        # 모든 성공한 결과를 수집 (우선순위: FMP 클라이언트 사용 시 FMP 우선, 아니면 Polygon > Finnhub > TwelveData)
        successful_results = []
        for i, result in enumerate(results):
            if result is not None and not isinstance(result, Exception):
                client_name = clients_to_use[i].__class__.__name__
                successful_results.append((client_name, result))
        
        if not successful_results:
            self.logger.error(f"All API clients failed to fetch company profile for {ticker}")
            return None
        
        # 우선순위에 따라 병합 (FMP 클라이언트 사용 시 FMP 우선, 아니면 Polygon > Finnhub > TwelveData)
        merged_data = {}
        if use_fmp_clients:
            priority_order = ['FMPClient']
        else:
            priority_order = ['PolygonClient', 'FinnhubClient', 'TwelveDataClient']
        
        for priority_client in priority_order:
            for client_name, result in successful_results:
                if client_name == priority_client:
                    # null이 아닌 값만 덮어쓰기
                    if isinstance(result, dict):
                        for key, value in result.items():
                            if value is not None:
                                merged_data[key] = value
                    else:
                        # CompanyProfileData 객체인 경우
                        for field_name, field_value in result.__dict__.items():
                            if field_value is not None:
                                merged_data[field_name] = field_value
                    break
        
        self.logger.info(f"Merged company profile data for {ticker} from {len(successful_results)} sources")
        return merged_data

    async def get_stock_financials(self, asset_id: int) -> Optional[Dict[str, Any]]:
        """
        주식 재무 데이터를 가져오는 메서드 (수집기용)
        """
        from app.models.asset import Asset
        from app.core.database import SessionLocal
        
        db = SessionLocal()
        try:
            asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
            if not asset:
                return None
            ticker = asset.ticker
        finally:
            db.close()
        
        for i, client in enumerate(self.stock_financials_clients):
            try:
                self.logger.info(f"Attempting to fetch stock financials for {ticker} using {client.__class__.__name__} (attempt {i+1}/{len(self.stock_financials_clients)})")
                # 우선 순위: get_stock_financials → get_financials → get_financial_statements
                if hasattr(client, 'get_stock_financials'):
                    data = await client.get_stock_financials(ticker)
                elif hasattr(client, 'get_financials'):
                    data = await client.get_financials(ticker)
                elif hasattr(client, 'get_financial_statements'):
                    data = await client.get_financial_statements(ticker)
                else:
                    self.logger.warning(f"{client.__class__.__name__} has no financials method")
                    continue
                if data is not None:
                    self.logger.info(f"Successfully fetched stock financials for {ticker} from {client.__class__.__name__}")
                    return data
                else:
                    self.logger.warning(f"{client.__class__.__name__} returned empty stock financials for {ticker}")
            except Exception as e:
                self.logger.warning(f"{client.__class__.__name__} failed for stock financials {ticker}. Reason: {e}. Trying next client.")
        self.logger.error(f"All API clients failed to fetch stock financials for {ticker}")
        return None

    async def get_analyst_estimates(self, asset_id: int) -> Optional[Dict[str, Any]]:
        """
        애널리스트 추정치 데이터를 가져오는 메서드 (수집기용)
        """
        from app.models.asset import Asset
        from app.core.database import SessionLocal
        
        db = SessionLocal()
        try:
            asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
            if not asset:
                return None
            ticker = asset.ticker
        finally:
            db.close()
        
        for i, client in enumerate(self.stock_analyst_estimates_clients):
            try:
                self.logger.info(f"Attempting to fetch analyst estimates for {ticker} using {client.__class__.__name__} (attempt {i+1}/{len(self.stock_analyst_estimates_clients)})")
                if hasattr(client, 'get_analyst_estimates'):
                    data = await client.get_analyst_estimates(ticker)
                elif hasattr(client, 'get_estimates'):
                    data = await client.get_estimates(ticker)
                else:
                    self.logger.warning(f"{client.__class__.__name__} has no analyst estimates method")
                    continue
                if data is not None:
                    self.logger.info(f"Successfully fetched analyst estimates for {ticker} from {client.__class__.__name__}")
                    return data
                else:
                    self.logger.warning(f"{client.__class__.__name__} returned empty analyst estimates for {ticker}")
            except Exception as e:
                self.logger.warning(f"{client.__class__.__name__} failed for analyst estimates {ticker}. Reason: {e}. Trying next client.")
        self.logger.error(f"All API clients failed to fetch analyst estimates for {ticker}")
        return None

    async def get_etf_info(self, asset_id: int) -> Optional[Dict[str, Any]]:
        """
        ETF 정보를 가져오는 메서드 (수집기용)
        """
        from app.models.asset import Asset
        from app.core.database import SessionLocal
        
        db = SessionLocal()
        try:
            asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
            if not asset:
                return None
            ticker = asset.ticker
        finally:
            db.close()
        
        for i, client in enumerate(self.etf_clients):
            try:
                self.logger.info(f"Attempting to fetch ETF info for {ticker} using {client.__class__.__name__} (attempt {i+1}/{len(self.etf_clients)})")
                if hasattr(client, 'get_etf_info'):
                    data = await client.get_etf_info(ticker)
                elif hasattr(client, 'get_etf_profile'):
                    data = await client.get_etf_profile(ticker)
                elif hasattr(client, 'get_overview'):
                    data = await client.get_overview(ticker)
                elif hasattr(client, 'get_profile'):
                    data = await client.get_profile(ticker)
                elif 'AlphaVantage' in client.__class__.__name__:
                    data = await self._fetch_alpha_vantage_etf_profile(ticker)
                else:
                    self.logger.warning(f"{client.__class__.__name__} has no ETF info method")
                    continue
                if data is not None:
                    self.logger.info(f"Successfully fetched ETF info for {ticker} from {client.__class__.__name__}")
                    return data
                else:
                    self.logger.warning(f"{client.__class__.__name__} returned empty ETF info for {ticker}")
            except Exception as e:
                self.logger.warning(f"{client.__class__.__name__} failed for ETF info {ticker}. Reason: {e}. Trying next client.")
        self.logger.error(f"All API clients failed to fetch ETF info for {ticker}")
        return None

    async def _fetch_alpha_vantage_etf_profile(self, ticker: str) -> Optional[EtfInfoData]:
        """AlphaVantage ETF_PROFILE 직접 호출 후 EtfInfoData로 매핑"""
        try:
            api_key = None
            if self.config_manager and hasattr(self.config_manager, 'get_config'):
                api_key = self.config_manager.get_config('ALPHA_VANTAGE_API_KEY_1') or self.config_manager.get_config('ALPHA_VANTAGE_API_KEY')
            if not api_key:
                api_key = os.getenv('ALPHA_VANTAGE_API_KEY_1') or os.getenv('ALPHA_VANTAGE_API_KEY')
            if not api_key:
                self.logger.warning("AlphaVantage API key not configured for ETF_PROFILE")
                return None

            url = "https://www.alphavantage.co/query"
            params = {"function": "ETF_PROFILE", "symbol": ticker, "apikey": api_key}
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                payload = resp.json() or {}

            def to_float(x):
                try:
                    return float(x) if x not in (None, "", "n/a") else None
                except Exception:
                    return None

            leveraged_str = str(payload.get("leveraged") or "").strip().upper()
            leveraged = True if leveraged_str in ("YES", "Y", "TRUE", "1") else False if leveraged_str in ("NO", "N", "FALSE", "0") else None

            etf_data = EtfInfoData(
                symbol=ticker,
                net_assets=to_float(payload.get("net_assets")),
                net_expense_ratio=to_float(payload.get("net_expense_ratio")),
                portfolio_turnover=to_float(payload.get("portfolio_turnover")),
                dividend_yield=to_float(payload.get("dividend_yield")),
                inception_date=payload.get("inception_date") or None,
                leveraged=leveraged,
                sectors=payload.get("sectors"),
                holdings=payload.get("holdings"),
                timestamp_utc=datetime.now()
            )
            return etf_data
        except Exception as e:
            self.logger.warning(f"AlphaVantage ETF_PROFILE fetch failed for {ticker}: {e}")
            return None

    async def get_crypto_info(self, asset_id: int) -> Optional[Dict[str, Any]]:
        """
        암호화폐 정보를 가져오는 메서드 (수집기용)
        가격 데이터와 메타데이터를 모두 수집하여 반환합니다.
        """
        from app.models.asset import Asset
        from app.core.database import SessionLocal
        from app.external_apis.base.schemas import CryptoData
        
        db = SessionLocal()
        try:
            asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
            if not asset:
                return None
            ticker = asset.ticker
        finally:
            db.close()
        
        for i, client in enumerate(self.crypto_clients):
            try:
                self.logger.info(f"Attempting to fetch crypto info for {ticker} using {client.__class__.__name__} (attempt {i+1}/{len(self.crypto_clients)})")
                
                # 1. 기본 가격 데이터 가져오기
                crypto_data = None
                if hasattr(client, 'get_crypto_data'):
                    crypto_data = await client.get_crypto_data(ticker)
                elif hasattr(client, 'get_crypto_info'):
                    crypto_data = await client.get_crypto_info(ticker)
                elif hasattr(client, 'get_profile'):
                    crypto_data = await client.get_profile(ticker)
                else:
                    self.logger.warning(f"{client.__class__.__name__} has no crypto info method")
                    continue
                
                if crypto_data is None:
                    self.logger.warning(f"{client.__class__.__name__} returned empty crypto info for {ticker}")
                    continue
                
                # 2. 상세 정보 가져오기 (CoinMarketCap의 경우 name, percent_change 필드 포함)
                quote_details = None
                if hasattr(client, 'get_quote_details'):
                    try:
                        quote_details = await client.get_quote_details(ticker)
                        if quote_details:
                            self.logger.info(f"Successfully fetched quote details for {ticker} from {client.__class__.__name__}")
                    except Exception as e:
                        self.logger.warning(f"Failed to fetch quote details for {ticker} from {client.__class__.__name__}: {e}")
                
                # 3. 메타데이터 가져오기 (CoinMarketCap의 경우)
                metadata = None
                if hasattr(client, 'get_metadata'):
                    try:
                        metadata = await client.get_metadata(ticker)
                        if metadata:
                            self.logger.info(f"Successfully fetched metadata for {ticker} from {client.__class__.__name__}")
                    except Exception as e:
                        self.logger.warning(f"Failed to fetch metadata for {ticker} from {client.__class__.__name__}: {e}")
                
                # 4. 데이터 병합
                # 타입 안전하게 변환: dict를 우선 체크 (dict-like 객체도 처리)
                if isinstance(crypto_data, dict):
                    result = crypto_data.copy()
                elif isinstance(crypto_data, CryptoData):
                    # Pydantic 모델을 dict로 변환
                    try:
                        result = crypto_data.model_dump(mode='json')
                    except Exception as e:
                        self.logger.warning(f"Failed to call model_dump on CryptoData for {ticker}: {e}, using dict conversion")
                        result = dict(crypto_data) if hasattr(crypto_data, '__dict__') else {}
                elif hasattr(crypto_data, 'model_dump') and callable(getattr(crypto_data, 'model_dump', None)):
                    # 다른 Pydantic 모델인 경우
                    try:
                        result = crypto_data.model_dump(mode='json')
                    except Exception as e:
                        self.logger.warning(f"Failed to call model_dump on crypto_data for {ticker}: {e}, using dict conversion")
                        result = dict(crypto_data) if hasattr(crypto_data, '__dict__') else {}
                else:
                    # 기타 경우: dict로 변환 시도
                    try:
                        result = dict(crypto_data) if hasattr(crypto_data, '__dict__') else {}
                    except Exception as e:
                        self.logger.warning(f"Failed to convert crypto_data to dict for {ticker}: {e}")
                        result = {}
                
                # result가 dict인지 최종 확인
                if not isinstance(result, dict):
                    self.logger.error(f"result is not a dict for {ticker}: {type(result)}")
                    result = {}
                
                # quote_details 병합 (name, percent_change 필드)
                if quote_details:
                    result.update({
                        'name': quote_details.get('name'),
                        'percent_change_1h': quote_details.get('percent_change_1h'),
                        'percent_change_24h': quote_details.get('percent_change_24h') or result.get('change_24h') or result.get('percent_change_24h'),
                        'percent_change_7d': quote_details.get('percent_change_7d'),
                        'percent_change_30d': quote_details.get('percent_change_30d'),
                    })
                
                # 메타데이터 병합
                if metadata:
                    # explorer, source_code, tags는 리스트일 수 있으므로 그대로 저장 (PostgreSQL JSON 타입)
                    result.update({
                        'category': metadata.get('category'),
                        'description': metadata.get('description'),
                        'logo_url': metadata.get('logo_url'),
                        'website_url': metadata.get('website_url'),
                        'slug': metadata.get('slug'),
                        'date_added': metadata.get('date_added'),
                        'platform': metadata.get('platform'),
                        'explorer': metadata.get('explorer'),  # 리스트 그대로 저장
                        'source_code': metadata.get('source_code'),  # 리스트 그대로 저장
                        'tags': metadata.get('tags'),  # 리스트 그대로 저장
                    })
                
                # percent_change 필드 처리 (호환성)
                if 'change_24h' in result and 'percent_change_24h' not in result:
                    result['percent_change_24h'] = result.get('change_24h')
                
                self.logger.info(f"Successfully fetched crypto info for {ticker} from {client.__class__.__name__}")
                return result
                
            except Exception as e:
                self.logger.warning(f"{client.__class__.__name__} failed for crypto info {ticker}. Reason: {e}. Trying next client.")
        
        self.logger.error(f"All API clients failed to fetch crypto info for {ticker}")
        return None

    async def get_onchain_metric(self, metric_name: str, asset_id: int = None, days: int = None) -> Optional[Dict[str, Any]]:
        """
        온체인 메트릭 데이터를 가져오는 메서드 (수집기용)
        동적 Limit 시스템 사용 (다른 클라이언트들과 동일)
        """
        # days가 None이면 동적으로 계산
        if days is None:
            # DB 설정에서 historical_days 가져오기
            from app.models import AppConfiguration
            from app.core.database import get_postgres_db
            
            db = next(get_postgres_db())
            try:
                historical_days_config = db.query(AppConfiguration).filter(
                    AppConfiguration.config_key == "HISTORICAL_DATA_DAYS_PER_RUN"
                ).first()
                days = int(historical_days_config.config_value) if historical_days_config else 165
                self.logger.info(f"Using dynamic limit for onchain metric {metric_name}: {days} days")
            finally:
                db.close()
        
        for i, client in enumerate(self.onchain_clients):
            try:
                self.logger.info(f"Attempting to fetch onchain metric {metric_name} using {client.__class__.__name__} (attempt {i+1}/{len(self.onchain_clients)}) with {days} days")
                if hasattr(client, 'get_metric'):
                    data = await client.get_metric(metric_name, days=days)
                elif hasattr(client, 'get_onchain_metric'):
                    data = await client.get_onchain_metric(metric_name, days=days)
                else:
                    self.logger.warning(f"{client.__class__.__name__} has no onchain metric method")
                    continue
                if data is not None:
                    self.logger.info(f"Successfully fetched onchain metric {metric_name} from {client.__class__.__name__}")
                    return data
                else:
                    self.logger.warning(f"{client.__class__.__name__} returned empty onchain metric for {metric_name}")
            except Exception as e:
                self.logger.warning(f"{client.__class__.__name__} failed for onchain metric {metric_name}. Reason: {e}. Trying next client.")
        self.logger.error(f"All API clients failed to fetch onchain metric {metric_name}")
        return None

    async def get_company_info(self, ticker: str) -> Optional[Dict[str, Any]]:
        """
        회사 정보를 여러 API에서 순서대로 시도하여 가져옵니다.
        """
        last_exception = None
        for i, client in enumerate(self.ohlcv_clients):
            try:
                self.logger.info(f"Attempting to fetch company info for {ticker} using {client.__class__.__name__} (attempt {i+1}/{len(self.ohlcv_clients)})")
                if hasattr(client, 'get_company_info'):
                    data = await client.get_company_info(ticker)
                elif hasattr(client, 'get_profile'):
                    data = await client.get_profile(ticker)
                elif hasattr(client, 'get_metadata'):
                    data = await client.get_metadata(ticker)
                else:
                    self.logger.warning(f"{client.__class__.__name__} has no known company info fetching method")
                    continue
                if data is not None:
                    self.logger.info(f"Successfully fetched company info for {ticker} from {client.__class__.__name__}")
                    return data
                else:
                    self.logger.warning(f"{client.__class__.__name__} returned empty company info for {ticker}")
            except Exception as e:
                self.logger.warning(f"{client.__class__.__name__} failed for company info {ticker}. Reason: {e}. Trying next client.")
                last_exception = e
        self.logger.error(f"All API clients failed to fetch company info for {ticker}. Last error: {last_exception}")
        return None

    
    def _get_fetch_parameters(self, asset_id: int, interval: str) -> Optional[Dict[str, Any]]:
        """
        [ADVANCED LOGIC] Determines optimal fetch parameters based on DB state and settings.
        Prioritizes recency, then progressively deepens historical data.
        """
        from app.models import AppConfiguration, Asset, AssetType
        from app.core.database import get_postgres_db
        
        db = next(get_postgres_db())
        try:
            # 자산 타입 확인 (캐시 사용)
            asset_type, is_crypto = self._get_asset_type_cached(db, asset_id)
            
            # Load settings from DB
            backfill_conf = db.query(AppConfiguration).filter_by(config_key="ENABLE_HISTORICAL_BACKFILL").first()
            historical_days_conf = db.query(AppConfiguration).filter_by(config_key="HISTORICAL_DATA_DAYS_PER_RUN").first()
            max_days_conf = db.query(AppConfiguration).filter_by(config_key="MAX_HISTORICAL_DAYS").first()

            enable_backfill = backfill_conf.config_value.lower() == 'true' if backfill_conf else True
            historical_days = int(historical_days_conf.config_value) if historical_days_conf else 165
            max_historical_days = int(max_days_conf.config_value) if max_days_conf else 10950 # Default to ~30 years

            # Get both the newest and oldest timestamps
            # interval에 따라 올바른 테이블에서 데이터 조회
            is_daily_interval = interval in ["1d", "daily", "1w", "1m"] or interval is None
            
            # 휴일 감지 및 날짜 범위 최적화
            from ..utils.trading_calendar import is_trading_day, get_last_trading_day, format_trading_status_message
            if is_daily_interval:
                oldest_ts, newest_ts = crud_ohlcv.get_date_range(db, asset_id, interval)
            else:
                # 인트라데이 데이터의 경우 OHLCVIntradayData 모델 사용
                from app.models.asset import OHLCVIntradayData
                from sqlalchemy import and_, desc
                
                # 가장 오래된 데이터 조회
                oldest_record = (
                    db.query(OHLCVIntradayData.timestamp_utc)
                    .filter(
                        and_(
                            OHLCVIntradayData.asset_id == asset_id,
                            OHLCVIntradayData.data_interval == interval
                        )
                    )
                    .order_by(OHLCVIntradayData.timestamp_utc)
                    .first()
                )
                
                # 가장 최신 데이터 조회
                newest_record = (
                    db.query(OHLCVIntradayData.timestamp_utc)
                    .filter(
                        and_(
                            OHLCVIntradayData.asset_id == asset_id,
                            OHLCVIntradayData.data_interval == interval
                        )
                    )
                    .order_by(desc(OHLCVIntradayData.timestamp_utc))
                    .first()
                )
                
                oldest_ts = oldest_record[0] if oldest_record else None
                newest_ts = newest_record[0] if newest_record else None
            
            today = datetime.now().date()
            
            # Case 1: No data at all. Perform initial backfill.
            if not newest_ts:
                if enable_backfill:
                    self.logger.info(f"Asset {asset_id}: No data found. Performing initial backfill for {historical_days} days.")
                    end_date = today
                    start_date = today - timedelta(days=historical_days)
                    return {"start_date": start_date.strftime('%Y-%m-%d'), "end_date": end_date.strftime('%Y-%m-%d'), "limit": historical_days + 5, "is_backfill": True}
                else:
                    self.logger.info(f"Asset {asset_id}: No data and backfill is disabled. Fetching recent data only.")
                    end_date = today
                    start_date = today - timedelta(days=5)
                    return {"start_date": start_date.strftime('%Y-%m-%d'), "end_date": end_date.strftime('%Y-%m-%d'), "limit": 10, "is_backfill": False}

            # Case 2: Data exists. Check for gaps and historical depth.
            # newest_ts가 datetime 또는 date일 수 있음
            if hasattr(newest_ts, 'date'):
                latest_date = newest_ts.date()
            else:
                latest_date = newest_ts
            days_diff = (today - latest_date).days

            # Subcase 2.1: Prioritize filling recent gaps.
            if days_diff > 1:
                self.logger.info(f"Asset {asset_id}: Gap of {days_diff} days detected. Filling recent data.")
                start_date = latest_date + timedelta(days=1)
                return {"start_date": start_date.strftime('%Y-%m-%d'), "end_date": today.strftime('%Y-%m-%d'), "limit": days_diff + 5, "is_backfill": True}

            # Subcase 2.2: Data is up-to-date. Check if historical deepening is needed.
            if enable_backfill:
                oldest_date = oldest_ts.date() if hasattr(oldest_ts, 'date') else oldest_ts
                current_depth = (today - oldest_date).days
                
                # 암호화폐가 아닌 경우 (주식, ETF, 지수) 특별한 백필 조건 적용
                if not is_crypto:
                    # 설정에서 최소 히스토리 날짜 가져오기 (기본값: 1999.11.01)
                    min_history_date_conf = db.query(AppConfiguration).filter_by(config_key="MIN_HISTORICAL_DATE").first()
                    min_required_date_str = min_history_date_conf.config_value if min_history_date_conf else "1999-11-01"
                    try:
                        min_required_date = datetime.strptime(min_required_date_str, "%Y-%m-%d").date()
                    except ValueError:
                        min_required_date = datetime(1999, 11, 1).date()
                        self.logger.warning(f"Invalid MIN_HISTORICAL_DATE format: {min_required_date_str}. Using default: 1999-11-01")
                    
                    max_required_date = today - timedelta(days=historical_days)
                    
                    # 최신 데이터가 충분히 있는지 확인 (현재날짜 - historical_days 이후)
                    if newest_ts.date() < max_required_date:
                        # 최신 데이터 백필 필요
                        self.logger.info(f"Asset {asset_id} ({asset_type}): Backfilling recent data from {newest_ts.date() + timedelta(days=1)} to {max_required_date}")
                        return {
                            "start_date": (newest_ts.date() + timedelta(days=1)).strftime('%Y-%m-%d'),
                            "end_date": max_required_date.strftime('%Y-%m-%d'),
                            "limit": max(1, (max_required_date - newest_ts.date()).days + 5),
                            "is_backfill": True
                        }
                    
                    # 과거 데이터가 충분히 있는지 확인 (MIN_HISTORICAL_DATE부터)
                    if oldest_date > min_required_date:
                        # 과거 데이터 백필 필요
                        self.logger.info(f"Asset {asset_id} ({asset_type}): Backfilling historical data from {min_required_date} to {oldest_date - timedelta(days=1)}")
                        return {
                            "start_date": min_required_date.strftime('%Y-%m-%d'),
                            "end_date": (oldest_date - timedelta(days=1)).strftime('%Y-%m-%d'),
                            "limit": max(1, (oldest_date - min_required_date).days + 5),
                            "is_backfill": True
                        }
                    
                    # 중간 갭 확인 및 처리
                    gap_info = self._check_data_gaps(db, asset_id, interval, min_required_date, max_required_date)
                    if gap_info:
                        self.logger.info(f"Asset {asset_id} ({asset_type}): Found data gap from {gap_info['start_date']} to {gap_info['end_date']}")
                        return {
                            "start_date": gap_info['start_date'],
                            "end_date": gap_info['end_date'],
                            "limit": max(1, gap_info['days'] + 5),
                            "is_backfill": True
                        }
                    
                    # 모든 조건 만족 - 백필 불필요
                    self.logger.info(f"Asset {asset_id} ({asset_type}): Data fully populated from {min_required_date} to {max_required_date}. No backfill needed.")
                    return None
                else:
                    # 암호화폐의 경우 주식과 동일한 체계적인 백필 로직 적용
                    # 암호화폐는 2010년부터 데이터가 있으므로 2010-01-01을 최소 히스토리 날짜로 설정
                    min_required_date = datetime(2010, 1, 1).date()
                    max_required_date = today - timedelta(days=historical_days)
                    
                    # 최신 데이터가 충분히 있는지 확인 (현재날짜 - historical_days 이후)
                    if newest_ts.date() < max_required_date:
                        # 최신 데이터 백필 필요
                        self.logger.info(f"Asset {asset_id} (crypto): Backfilling recent data from {newest_ts.date() + timedelta(days=1)} to {max_required_date}")
                        return {
                            "start_date": (newest_ts.date() + timedelta(days=1)).strftime('%Y-%m-%d'),
                            "end_date": max_required_date.strftime('%Y-%m-%d'),
                            "limit": max(1, (max_required_date - newest_ts.date()).days + 5),
                            "is_backfill": True
                        }
                    
                    # 과거 데이터가 충분히 있는지 확인 (2010-01-01부터)
                    if oldest_date > min_required_date:
                        # 과거 데이터 백필 필요
                        self.logger.info(f"Asset {asset_id} (crypto): Backfilling historical data from {min_required_date} to {oldest_date - timedelta(days=1)}")
                        return {
                            "start_date": min_required_date.strftime('%Y-%m-%d'),
                            "end_date": (oldest_date - timedelta(days=1)).strftime('%Y-%m-%d'),
                            "limit": max(1, (oldest_date - min_required_date).days + 5),
                            "is_backfill": True
                        }
                    
                    # 중간 갭 확인 및 처리
                    gap_info = self._check_data_gaps(db, asset_id, interval, min_required_date, max_required_date)
                    if gap_info:
                        self.logger.info(f"Asset {asset_id} (crypto): Found data gap from {gap_info['start_date']} to {gap_info['end_date']}")
                        return {
                            "start_date": gap_info['start_date'],
                            "end_date": gap_info['end_date'],
                            "limit": max(1, gap_info['days'] + 5),
                            "is_backfill": True
                        }
                    
                    # 모든 조건 만족 - 백필 불필요
                    self.logger.info(f"Asset {asset_id} (crypto): Data fully populated from {min_required_date} to {max_required_date}. No backfill needed.")
                    return None

            # Subcase 2.3: Data is up-to-date and backfill is disabled.
            self.logger.info(f"Asset {asset_id}: Data is up-to-date and backfill is disabled.")
            return None # No action needed

        except Exception as e:
            self.logger.error(f"Error getting fetch parameters for asset {asset_id}: {e}")
            # Fallback to a safe default (fetch last 7 days) in case of any error
            return {
                "start_date": (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d'),
                "end_date": datetime.now().strftime('%Y-%m-%d'),
                "limit": 10,
                "is_backfill": False
            }
        finally:
            db.close()
    
    def _check_data_gaps(self, db, asset_id: int, interval: str, min_date: datetime.date, max_date: datetime.date) -> Optional[Dict[str, Any]]:
        """
        지정된 날짜 범위 내에서 데이터 갭을 확인합니다.
        간단한 방식으로 변경하여 MySQL 재귀 쿼리 제한을 회피합니다.
        """
        try:
            from sqlalchemy import text
            
            # interval에 따라 올바른 테이블 사용
            is_daily_interval = interval in ["1d", "daily", "1w", "1m"] or interval is None
            table_name = "ohlcv_day_data" if is_daily_interval else "ohlcv_intraday_data"
            
            # 간단한 방식: 최근 데이터와 최초 데이터만 확인
            query = text(f"""
                SELECT 
                    MIN(timestamp_utc) as earliest_date,
                    MAX(timestamp_utc) as latest_date,
                    COUNT(*) as total_records
                FROM {table_name}
                WHERE asset_id = :asset_id 
                AND data_interval = :interval
                AND timestamp_utc >= CAST(:min_date AS DATE)
                AND timestamp_utc <= CAST(:max_date AS DATE)
            """)
            
            result = db.execute(query, {
                'asset_id': asset_id,
                'interval': interval,
                'min_date': min_date.strftime('%Y-%m-%d'),
                'max_date': max_date.strftime('%Y-%m-%d')
            }).fetchone()
            
            if not result or result[2] == 0:
                return {
                    'has_gaps': True,
                    'gap_start': min_date,
                    'gap_end': max_date,
                    'gap_days': (max_date - min_date).days
                }
            
            earliest_date = result[0].date() if result[0] else None
            latest_date = result[1].date() if result[1] else None
            total_records = result[2]
            
            # 간단한 갭 체크: 최초/최근 날짜와 요청 범위 비교
            gaps = []
            
            if earliest_date and earliest_date > min_date:
                gaps.append({
                    'start': min_date,
                    'end': earliest_date,
                    'days': (earliest_date - min_date).days
                })
            
            if latest_date and latest_date < max_date:
                gaps.append({
                    'start': latest_date,
                    'end': max_date,
                    'days': (max_date - latest_date).days
                })
            
            if gaps:
                # 가장 큰 갭 반환
                largest_gap = max(gaps, key=lambda x: x['days'])
                return {
                    'has_gaps': True,
                    'gap_start': largest_gap['start'],
                    'gap_end': largest_gap['end'],
                    'gap_days': largest_gap['days']
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error checking data gaps for asset {asset_id}: {e}")
            return None
    
    def _get_asset_type_cached(self, db, asset_id: int) -> Tuple[str, bool]:
        """
        자산 타입을 캐시에서 가져오거나 DB에서 조회하여 캐시에 저장합니다.
        """
        import time
        
        # 캐시에서 확인
        cache_key = f"asset_type_{asset_id}"
        if cache_key in self._asset_type_cache:
            cached_data = self._asset_type_cache[cache_key]
            if time.time() - cached_data['timestamp'] < self._cache_ttl:
                return cached_data['asset_type'], cached_data['is_crypto']
        
        # DB에서 조회
        from app.models import Asset, AssetType
        asset = db.query(Asset).join(AssetType).filter(Asset.asset_id == asset_id).first()
        asset_type = asset.asset_type.type_name.lower() if asset and asset.asset_type else None
        is_crypto = asset_type and 'crypto' in asset_type
        
        # 캐시에 저장
        self._asset_type_cache[cache_key] = {
            'asset_type': asset_type,
            'is_crypto': is_crypto,
            'timestamp': time.time()
        }
        
        return asset_type, is_crypto
    
    def get_market_data(self, ticker: str, data_type: str = "ohlcv", **kwargs) -> Optional[pd.DataFrame]:
        """
        범용 데이터 가져오기 메서드
        
        Args:
            ticker: 티커 심볼
            data_type: 데이터 타입 ("ohlcv", "crypto", "stock")
            **kwargs: 추가 파라미터
        """
        if data_type == "ohlcv":
            return self.get_ohlcv(ticker, **kwargs)
        elif data_type == "crypto":
            return self.get_crypto_data(ticker, **kwargs)
        elif data_type == "stock":
            return self.get_stock_data(ticker, **kwargs)
        else:
            self.logger.error(f"Unknown data type: {data_type}")
            return None
    
    def get_stock_profiles_clients(self, priority_override: List[str] = None):
        """주식 프로필 클라이언트를 우선순위에 따라 반환"""
        if priority_override:
            return self._filter_clients_by_priority(self.stock_profiles_clients, priority_override)
        return self.stock_profiles_clients
    
    def get_stock_financials_clients(self, priority_override: List[str] = None):
        """주식 재무 클라이언트를 우선순위에 따라 반환"""
        if priority_override:
            return self._filter_clients_by_priority(self.stock_financials_clients, priority_override)
        return self.stock_financials_clients

    def get_stock_financials_macrotrends_clients(self) -> List:
        """Macrotrends 단독 재무 클라이언트 그룹 반환"""
        return self.stock_financials_macrotrends_clients
    
    def get_stock_analyst_estimates_clients(self, priority_override: List[str] = None):
        """주식 추정치 클라이언트를 우선순위에 따라 반환"""
        if priority_override:
            return self._filter_clients_by_priority(self.stock_analyst_estimates_clients, priority_override)
        return self.stock_analyst_estimates_clients
    
    def _filter_clients_by_priority(self, clients: List, priority_override: List[str]):
        """클라이언트 우선순위에 따라 필터링"""
        if not priority_override:
            return clients
        
        filtered_clients = []
        for client_name in priority_override:
            for client in clients:
                if client.__class__.__name__ == client_name:
                    filtered_clients.append(client)
                    break
        
        # 우선순위에 지정된 클라이언트가 없으면 기본 클라이언트 반환
        return filtered_clients if filtered_clients else clients

    def get_api_status(self) -> Dict[str, List[str]]:
        """
        각 API 클라이언트의 상태를 반환합니다.
        """
        status = {
            "ohlcv_day_clients": [client.__class__.__name__ for client in self.ohlcv_day_clients],
            "ohlcv_intraday_clients": [client.__class__.__name__ for client in self.ohlcv_intraday_clients],
            "crypto_ohlcv_clients": [client.__class__.__name__ for client in self.crypto_ohlcv_clients],
            "stock_profiles_clients": [client.__class__.__name__ for client in self.stock_profiles_clients],
            "stock_financials_clients": [client.__class__.__name__ for client in self.stock_financials_clients],
            "stock_analyst_estimates_clients": [client.__class__.__name__ for client in self.stock_analyst_estimates_clients],
            "crypto_clients": [client.__class__.__name__ for client in self.crypto_clients],
            "commodity_ohlcv_clients": [client.__class__.__name__ for client in self.commodity_ohlcv_clients],
            "etf_clients": [client.__class__.__name__ for client in self.etf_clients],
            "onchain_clients": [client.__class__.__name__ for client in self.onchain_clients]
        }
        return status

    def _apply_scheduler_client_filter(self, collector_key: str, clients_attr_name: str) -> None:
        """
        Applies optional client overrides from SCHEDULER_CONFIG.
        Expected JSON (optional): { "client_overrides": { "stock_profiles_clients": ["PolygonClient","TwelveDataClient"] } }
        """
        from app.core.config_manager import ConfigManager
        import json
        cfg = ConfigManager()
        raw = cfg.get_scheduler_config()
        if not raw:
            return
        data = json.loads(raw)
        overrides = (data or {}).get("client_overrides")
        if not overrides or not isinstance(overrides, dict):
            return
        names = overrides.get(collector_key)
        if not names or not isinstance(names, list):
            return
        current_list = getattr(self, clients_attr_name, [])
        name_to_instance = {c.__class__.__name__: c for c in current_list}
        enabled = [name_to_instance[n] for n in names if n in name_to_instance]
        disabled = [n for n in name_to_instance.keys() if n not in names]
        if enabled:
            setattr(self, clients_attr_name, enabled)
            logger.info(f"[SchedulerFilter] {collector_key} enabled: {names}; disabled: {disabled}")
        else:
            logger.warning(f"[SchedulerFilter] No matching clients for {collector_key}: {names}")

# 전역 인스턴스
api_manager = ApiStrategyManager()
