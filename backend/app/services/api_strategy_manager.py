"""
API 전략 관리자: 여러 외부 API를 순서대로 호출하고 실패 시 자동 전환하는 Failover 메커니즘
"""

import pandas as pd
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta
from app.utils.logger import logger
from app.external_apis.fmp_client import FMPClient
from app.external_apis.twelvedata_client import TwelveDataClient
from app.external_apis.alpha_vantage_client import AlphaVantageClient
from app.external_apis.yahoo_client import YahooFinanceClient as YahooClient
from app.external_apis.binance_client import BinanceClient
from app.external_apis.coinbase_client import CoinbaseClient
from app.external_apis.coinmarketcap_client import CoinMarketCapClient
from app.external_apis.tiingo_client import TiingoClient
from app.external_apis.polygon_client import PolygonClient
from app.external_apis.coingecko_client import CoinGeckoClient
from app.external_apis.bitcoin_data_client import BitcoinDataClient
from app.crud.asset import crud_ohlcv
from app.utils.logging_helper import ApiLoggingHelper as LoggingHelper

class ApiStrategyManager:
    """API 전략 관리자: 여러 API를 순서대로 시도하고 실패 시 자동 전환"""
    
    def __init__(self):
        """API 클라이언트들을 우선순위 순서로 초기화"""
        # 1. OHLCV (일반 = 주식 및 지수, 통화) - 성공률 기반 재정렬
        self.ohlcv_clients = [
            TiingoClient(),
            PolygonClient(),
            FMPClient(),                 # 1순위 (88% 성공률)
            AlphaVantageClient(),  # 2순위 (100% 성공률)                  # 3순위 (일반 주식에서 우수)
            TwelveDataClient(),    # 4순위 (일부 심볼에서만 실패)
            # FMPClient(),         # 일시 비활성화 (429 에러 - 한계 초과)
        ]
        
        # 2. 커머디티용 클라이언트 (커머디티 지원 확인된 API만)
        self.commodity_clients = [
            FMPClient(),          # 1순위 (가장 포괄적인 커머디티 지원)
            #PolygonClient(),      # 2순위 (주요 커머디티 지원)
            # TiingoClient(),     # 커머디티 지원 불확실
            # TwelveDataClient()  # 커머디티 지원 불확실
            # AlphaVantageClient() # 선물 심볼 미지원
        ]
        
        # 3. 암호화폐용 클라이언트
        self.crypto_clients = [
            BinanceClient(),      # 1순위
            CoinbaseClient(),     # 2순위
            CoinMarketCapClient(), # 3순위
            CoinGeckoClient(),    # 4순위
            FMPClient(),          # 5순위
            TwelveDataClient()    # 6순위
        ]
        
        self.logger = logger
        self.logging_helper = LoggingHelper()
        
        # API 실패 카운터 (자동 비활성화용)
        self.api_failure_counts = {}
        self.max_failures_before_disable = 5  # 5회 연속 실패 시 비활성화
    
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

            # 인덱스 설정
            data = data.set_index('timestamp_utc')
            data.index.name = 'timestamp_utc'
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
        if 'Tiingo' in class_name:
            return 'tiingo'
        elif 'Polygon' in class_name:
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
    
    async def get_ohlcv(self, ticker: str, interval: str = "1d", limit: int = 100, asset_type: str = None, asset_id: int = None) -> Optional[pd.DataFrame]:
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
        # asset_id가 있으면 DB 상태를 확인하여 최적 파라미터 결정
        if asset_id:
            params = self._get_fetch_parameters(asset_id, interval)
            # If no action is needed, params will be None
            if not params:
                self.logger.info(f"No data fetching needed for asset {asset_id} ({ticker}) at this time.")
                return None
                
            start_date = params["start_date"]
            end_date = params["end_date"]
            adjusted_limit = params["limit"]
            self.logger.info(f"Using optimized parameters for asset {asset_id}: {start_date} to {end_date}, limit={adjusted_limit}")
        else:
            # 기존 로직 유지 (하위 호환성)
            from app.models import AppConfiguration
            from app.core.database import get_db
            
            db = next(get_db())
            try:
                historical_days_config = db.query(AppConfiguration).filter(
                    AppConfiguration.config_key == "HISTORICAL_DATA_DAYS_PER_RUN"
                ).first()
                historical_days = int(historical_days_config.config_value) if historical_days_config else 165
            finally:
                db.close()
            
            # 간격별 limit 조정
            if interval == '4h':
                adjusted_limit = historical_days
            else:
                adjusted_limit = limit
            
            # 날짜 범위 계산 (지원하는 API용)
            start_date, end_date = self._calculate_date_range(adjusted_limit)
        
        # 4h 인터벌의 경우 특별 처리
        if interval == "4h":
            self.logger.info(f"4h interval requested for {ticker}. Some APIs may not support 4h data well.")
        
        yahoo_period = self._calculate_yahoo_period(adjusted_limit)
        last_exception = None
        
        # 자산 타입에 따라 적절한 클라이언트 선택
        if asset_type and 'crypto' in asset_type.lower():
            clients_to_use = self.crypto_clients
            self.logger.info(f"Using crypto clients for {ticker} (asset_type: {asset_type})")
        elif asset_type and 'commodity' in asset_type.lower():
            clients_to_use = self.commodity_clients
            self.logger.info(f"Using commodity clients for {ticker} (asset_type: {asset_type})")
        else:
            # 주식, ETF, 지수, 통화 등은 모두 ohlcv_clients 사용
            clients_to_use = self.ohlcv_clients
            self.logger.info(f"Using ohlcv clients for {ticker} (asset_type: {asset_type})")
        
        # 활성화된 클라이언트만 필터링
        active_clients = [client for client in clients_to_use if client is not None]
        if len(active_clients) != len(clients_to_use):
            self.logger.info(f"Filtered {len(clients_to_use) - len(active_clients)} inactive clients for {ticker}")
        
        clients_to_use = active_clients
        
        for i, client in enumerate(clients_to_use):
            try:
                # API 호출 시작 로깅
                api_name = self._get_api_name(client)
                self.logging_helper.log_api_call_start(api_name, ticker)
                
                self.logger.info(f"Attempting to fetch OHLCV for {ticker} using {client.__class__.__name__} (attempt {i+1}/{len(clients_to_use)})")
                
                # 각 클라이언트의 메서드명이 다를 수 있으므로 적응적으로 호출
                if hasattr(client, 'get_ohlcv_data') and not isinstance(client, TiingoClient):
                    # FMP, Alpha Vantage, Binance, Coinbase 클라이언트 (Tiingo 제외)
                    if hasattr(client, '__class__') and 'FMPClient' in str(client.__class__):
                        # FMP 클라이언트의 경우 limit 파라미터 전달
                        # 날짜 범위가 있으면 전달 (from/to)
                        if start_date and end_date:
                            data = await client.get_ohlcv_data(ticker, start_date=start_date, end_date=end_date, limit=adjusted_limit)
                        else:
                            data = await client.get_ohlcv_data(ticker, limit=adjusted_limit)
                    elif hasattr(client, '__class__') and 'BinanceClient' in str(client.__class__):
                        # Binance는 start/end를 ms로 전달 가능
                        # params의 start_date/end_date가 YYYY-MM-DD 형식이면 자정 UTC로 변환
                        try:
                            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
                            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
                            start_ms = int(start_dt.timestamp() * 1000)
                            # Binance endTime is inclusive; set to end of day 23:59:59
                            end_ms = int((end_dt + timedelta(days=1) - timedelta(milliseconds=1)).timestamp() * 1000)
                        except Exception:
                            start_ms = None
                            end_ms = None
                        data = await client.get_ohlcv_data(ticker, interval=interval, limit=adjusted_limit, start_time_ms=start_ms, end_time_ms=end_ms)
                    elif hasattr(client, '__class__') and 'CoinbaseClient' in str(client.__class__):
                        # Coinbase는 ISO8601 start/end 지원
                        try:
                            # YYYY-MM-DD -> ISO8601 (UTC 자정/종료)
                            start_iso = f"{start_date}T00:00:00Z" if start_date else None
                            end_iso = f"{end_date}T23:59:59Z" if end_date else None
                        except Exception:
                            start_iso = None
                            end_iso = None
                        data = await client.get_ohlcv_data(ticker, granularity='86400', start_iso=start_iso, end_iso=end_iso)
                    else:
                        # 다른 클라이언트들은 기존 방식 유지
                        data = await client.get_ohlcv_data(ticker)
                    if data:
                        data = pd.DataFrame(data)
                        self.logger.info(f"{client.__class__.__name__} raw frame shape={data.shape}, columns={list(data.columns)}")
                        data = self._validate_ohlcv_dataframe(data, api_name, ticker)
                elif hasattr(client, 'get_historical_prices'):
                    # Tiingo, TwelveData, Polygon 클라이언트
                    if isinstance(client, TiingoClient):
                        # Tiingo는 start_date, end_date 사용
                        data = await client.get_historical_prices(ticker, start_date, end_date, interval)
                    elif hasattr(client, '__class__') and 'PolygonClient' in str(client.__class__):
                        # Polygon - start_date, end_date, interval 순서
                        data = await client.get_historical_prices(ticker, start_date, end_date, interval)
                    else:
                        # TwelveData - 날짜 범위 사용
                        data = await client.get_historical_prices(ticker, interval, start_date=start_date, end_date=end_date)
                    if data:
                        data = pd.DataFrame(data)
                        self.logger.info(f"{client.__class__.__name__} raw frame shape={data.shape}, columns={list(data.columns)}")
                        data = self._validate_ohlcv_dataframe(data, api_name, ticker)
                elif hasattr(client, 'get_historical_data'):
                    # Yahoo Finance 클라이언트 - period 사용
                    data = await client.get_historical_data(ticker, period=yahoo_period, interval=interval)
                    if data:
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
                    # Tiingo 클라이언트의 경우
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
        from app.models import AppConfiguration
        from app.core.database import get_db
        
        db = next(get_db())
        try:
            # Load settings from DB
            backfill_conf = db.query(AppConfiguration).filter_by(config_key="ENABLE_HISTORICAL_BACKFILL").first()
            historical_days_conf = db.query(AppConfiguration).filter_by(config_key="HISTORICAL_DATA_DAYS_PER_RUN").first()
            max_days_conf = db.query(AppConfiguration).filter_by(config_key="MAX_HISTORICAL_DAYS").first()

            enable_backfill = backfill_conf.config_value.lower() == 'true' if backfill_conf else True
            historical_days = int(historical_days_conf.config_value) if historical_days_conf else 165
            max_historical_days = int(max_days_conf.config_value) if max_days_conf else 10950 # Default to ~30 years

            # Get both the newest and oldest timestamps
            oldest_ts, newest_ts = crud_ohlcv.get_date_range(db, asset_id, interval)
            
            today = datetime.now().date()
            
            # Case 1: No data at all. Perform initial backfill.
            if not newest_ts:
                if enable_backfill:
                    self.logger.info(f"Asset {asset_id}: No data found. Performing initial backfill for {historical_days} days.")
                    end_date = today
                    start_date = today - timedelta(days=historical_days)
                    return {"start_date": start_date.strftime('%Y-%m-%d'), "end_date": end_date.strftime('%Y-%m-%d'), "limit": historical_days + 5}
                else:
                    self.logger.info(f"Asset {asset_id}: No data and backfill is disabled. Fetching recent data only.")
                    end_date = today
                    start_date = today - timedelta(days=5)
                    return {"start_date": start_date.strftime('%Y-%m-%d'), "end_date": end_date.strftime('%Y-%m-%d'), "limit": 10}

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
                return {"start_date": start_date.strftime('%Y-%m-%d'), "end_date": today.strftime('%Y-%m-%d'), "limit": days_diff + 5}

            # Subcase 2.2: Data is up-to-date. Check if historical deepening is needed.
            if enable_backfill:
                oldest_date = oldest_ts.date() if hasattr(oldest_ts, 'date') else oldest_ts
                current_depth = (today - oldest_date).days
                if current_depth < max_historical_days:
                    self.logger.info(f"Asset {asset_id}: Data is up-to-date. Deepening history from {oldest_date}.")
                    end_date = oldest_date - timedelta(days=1)
                    start_date = end_date - timedelta(days=historical_days)
                    return {"start_date": start_date.strftime('%Y-%m-%d'), "end_date": end_date.strftime('%Y-%m-%d'), "limit": historical_days + 5}
                else:
                    self.logger.info(f"Asset {asset_id}: Historical data is fully populated to {max_historical_days} days. No backfill needed.")
                    return None # No action needed

            # Subcase 2.3: Data is up-to-date and backfill is disabled.
            self.logger.info(f"Asset {asset_id}: Data is up-to-date and backfill is disabled.")
            return None # No action needed

        except Exception as e:
            self.logger.error(f"Error getting fetch parameters for asset {asset_id}: {e}")
            # Fallback to a safe default (fetch last 7 days) in case of any error
            return {
                "start_date": (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d'),
                "end_date": datetime.now().strftime('%Y-%m-%d'),
                "limit": 10
            }
        finally:
            db.close()
    
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
    
    def get_api_status(self) -> Dict[str, List[str]]:
        """
        각 API 클라이언트의 상태를 반환합니다.
        """
        status = {
            "ohlcv_clients": [client.__class__.__name__ for client in self.ohlcv_clients],
            "crypto_clients": [client.__class__.__name__ for client in self.crypto_clients],
            "commodity_clients": [client.__class__.__name__ for client in self.commodity_clients]
        }
        return status

# 전역 인스턴스
api_manager = ApiStrategyManager()
