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
        # 1. OHLCV (일반 = 주식 및 지수, 통화)
        self.ohlcv_clients = [
            TiingoClient(),        # 1순위
            PolygonClient(),       # 2순위
            FMPClient(),          # 3순위
            TwelveDataClient(),   # 4순위
            AlphaVantageClient()  # 5순위
        ]
        
        # 2. 커머디티용 클라이언트 (FMP 우선)
        self.commodity_clients = [
            FMPClient(),          # 1순위 (FMP 우선)
            TiingoClient(),       # 2순위
            PolygonClient(),      # 3순위
            TwelveDataClient()    # 4순위 (지원하는지 모르겠음)
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
            params = await self._get_fetch_parameters(asset_id, interval)
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
        elif asset_type and 'commodity' in asset_type.lower():
            clients_to_use = self.commodity_clients
        else:
            # 주식, ETF, 지수, 통화 등은 모두 ohlcv_clients 사용
            clients_to_use = self.ohlcv_clients
        
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
                        data = await client.get_ohlcv_data(ticker, limit=adjusted_limit)
                    else:
                        # 다른 클라이언트들은 기존 방식 유지
                        data = await client.get_ohlcv_data(ticker)
                    if data:
                        # List[Dict]를 DataFrame으로 변환
                        data = pd.DataFrame(data)
                        self.logger.info(f"{client.__class__.__name__} raw data shape: {data.shape}, columns: {list(data.columns)}")
                        
                        # timestamp 컬럼 찾기 (다양한 이름 지원)
                        timestamp_col = None
                        for col in ['timestamp_utc', 'timestamp', 'datetime', 'date', 'time']:
                            if col in data.columns:
                                timestamp_col = col
                                break
                        
                        if timestamp_col:
                            self.logger.info(f"Found timestamp column: {timestamp_col}")
                            # timestamp 컬럼을 timestamp_utc로 변환
                            if timestamp_col != 'timestamp_utc':
                                data['timestamp_utc'] = pd.to_datetime(data[timestamp_col])
                                data = data.drop(timestamp_col, axis=1)
                            
                            # 기본적인 null 체크만 수행
                            data = data[data['timestamp_utc'].notna()]
                            self.logger.info(f"After null check: {len(data)} records")
                            
                            # 숫자 값이 아닌 datetime 객체만 허용
                            data = data[data['timestamp_utc'].apply(lambda x: isinstance(x, (datetime, pd.Timestamp)))]
                            self.logger.info(f"After datetime check: {len(data)} records")
                            
                            if not data.empty:
                                # 중복 제거 (같은 timestamp가 있으면 마지막 것만 유지)
                                data = data.reset_index().drop_duplicates(subset='timestamp_utc', keep='last').set_index('timestamp_utc')
                                data.index.name = 'timestamp_utc'  # 인덱스 이름 통일
                                self.logger.info(f"Final {client.__class__.__name__} data: {len(data)} records")
                            else:
                                self.logger.warning(f"{client.__class__.__name__} data became empty after processing for {ticker}")
                                data = None
                        else:
                            self.logger.warning(f"No timestamp column found in data from {client.__class__.__name__} for {ticker}")
                            data = None
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
                        # List[Dict]를 DataFrame으로 변환
                        data = pd.DataFrame(data)
                        self.logger.info(f"Tiingo raw data shape: {data.shape}, columns: {list(data.columns)}")
                        
                        # timestamp 컬럼 찾기 (다양한 이름 지원)
                        timestamp_col = None
                        for col in ['timestamp_utc', 'timestamp', 'datetime', 'date', 'time']:
                            if col in data.columns:
                                timestamp_col = col
                                break
                        
                        if timestamp_col:
                            self.logger.info(f"Found timestamp column: {timestamp_col}")
                            # timestamp 컬럼을 timestamp_utc로 변환
                            if timestamp_col != 'timestamp_utc':
                                data['timestamp_utc'] = pd.to_datetime(data[timestamp_col])
                                data = data.drop(timestamp_col, axis=1)
                            
                            # 기본적인 null 체크만 수행
                            data = data[data['timestamp_utc'].notna()]
                            self.logger.info(f"After null check: {len(data)} records")
                            
                            # 숫자 값이 아닌 datetime 객체만 허용 (더 관대하게)
                            data = data[data['timestamp_utc'].apply(lambda x: isinstance(x, (datetime, pd.Timestamp)) or pd.notna(x))]
                            self.logger.info(f"After datetime check: {len(data)} records")
                            
                            if not data.empty:
                                # 중복 제거 (같은 timestamp가 있으면 마지막 것만 유지)
                                data = data.reset_index().drop_duplicates(subset='timestamp_utc', keep='last').set_index('timestamp_utc')
                                data.index.name = 'timestamp_utc'  # 인덱스 이름 통일
                                self.logger.info(f"Final Tiingo data: {len(data)} records")
                            else:
                                self.logger.warning(f"Tiingo data became empty after processing for {ticker}")
                                data = None
                        else:
                            self.logger.warning(f"No timestamp column found in data from {client.__class__.__name__} for {ticker}")
                            data = None
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
                            self.logger.warning(f"{client.__class__.__name__} returned data with {zero_ratio:.1%} zero/null prices for {ticker}. Skipping this data.")
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
                            self.logger.warning(f"{client.__class__.__name__} returned data with no valid prices for {ticker}. Skipping this data.")
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
        # asset_id가 있으면 DB 상태를 확인하여 최적 파라미터 결정
        if asset_id:
            params = await self._get_fetch_parameters(asset_id, interval)
            start_date = params["start_date"]
            end_date = params["end_date"]
            adjusted_limit = params["limit"]
            self.logger.info(f"Using optimized parameters for commodity asset {asset_id}: {start_date} to {end_date}, limit={adjusted_limit}")
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
        
        yahoo_period = self._calculate_yahoo_period(adjusted_limit)
        last_exception = None
        
        for i, client in enumerate(self.commodity_clients):
            try:
                self.logger.info(f"Attempting to fetch commodity OHLCV for {ticker} using {client.__class__.__name__} (attempt {i+1}/{len(self.commodity_clients)})")
                
                # 각 클라이언트의 메서드명이 다를 수 있으므로 적응적으로 호출
                if hasattr(client, 'get_ohlcv_data'):
                    # FMP, Alpha Vantage 클라이언트
                    if hasattr(client, '__class__') and 'FMPClient' in str(client.__class__):
                        # FMP 클라이언트의 경우 limit 파라미터 전달
                        data = await client.get_ohlcv_data(ticker, limit=limit)
                    else:
                        # 다른 클라이언트들은 기존 방식 유지
                        data = await client.get_ohlcv_data(ticker)
                    if data:
                        # List[Dict]를 DataFrame으로 변환
                        data = pd.DataFrame(data)
                        # timestamp_utc를 index로 설정하고 유효하지 않은 timestamp 제거
                        if 'timestamp_utc' in data.columns:
                            # 기본적인 null 체크만 수행
                            data = data[data['timestamp_utc'].notna()]
                            
                            # 숫자 값이 아닌 datetime 객체만 허용
                            data = data[data['timestamp_utc'].apply(lambda x: isinstance(x, (datetime, pd.Timestamp)))]
                            
                            if not data.empty:
                                # 중복 제거 (같은 timestamp가 있으면 마지막 것만 유지)
                                data = data.reset_index().drop_duplicates(subset='timestamp_utc', keep='last').set_index('timestamp_utc')
                                data.set_index('timestamp_utc', inplace=True)
                            else:
                                data = None
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
                        # List[Dict]를 DataFrame으로 변환
                        data = pd.DataFrame(data)
                        # Tiingo 데이터의 경우 date 컬럼을 timestamp_utc로 변환
                        if 'date' in data.columns:
                            data['timestamp_utc'] = pd.to_datetime(data['date'])
                            data = data.drop('date', axis=1)
                        # timestamp_utc를 index로 설정
                        if 'timestamp_utc' in data.columns:
                            # 기본적인 null 체크만 수행
                            data = data[data['timestamp_utc'].notna()]
                            
                            # 숫자 값이 아닌 datetime 객체만 허용
                            data = data[data['timestamp_utc'].apply(lambda x: isinstance(x, (datetime, pd.Timestamp)))]
                            
                            if not data.empty:
                                # 중복 제거 (같은 timestamp가 있으면 마지막 것만 유지)
                                data = data.reset_index().drop_duplicates(subset='timestamp_utc', keep='last').set_index('timestamp_utc')
                                data.set_index('timestamp_utc', inplace=True)
                            else:
                                data = None
                elif hasattr(client, 'get_historical_data'):
                    # Yahoo Finance 클라이언트 - period 사용
                    data = await client.get_historical_data(ticker, period=yahoo_period, interval=interval)
                    if data:
                        # List[Dict]를 DataFrame으로 변환
                        data = pd.DataFrame(data)
                else:
                    self.logger.warning(f"{client.__class__.__name__} has no known commodity OHLCV data fetching method")
                    continue
                
                if data is not None and not data.empty:
                    # 데이터 검증: 0 가격이 너무 많은지 확인
                    if 'open_price' in data.columns or 'open' in data.columns:
                        price_col = 'open_price' if 'open_price' in data.columns else 'open'
                        zero_count = (data[price_col] == 0).sum()
                        total_count = len(data)
                        zero_ratio = zero_count / total_count if total_count > 0 else 0
                        
                        if zero_ratio > 0.1:  # 10% 이상이 0이면 문제로 간주 (더 엄격하게)
                            self.logger.warning(f"{client.__class__.__name__} returned commodity data with {zero_ratio:.1%} zero prices for {ticker}. Skipping this data.")
                            continue
                    
                    self.logger.info(f"Successfully fetched commodity OHLCV for {ticker} from {client.__class__.__name__} ({len(data)} records)")
                    return data
                else:
                    self.logger.warning(f"{client.__class__.__name__} returned empty commodity data for {ticker}")
                    
            except Exception as e:
                # 404 에러는 정상적인 실패로 간주하고 다음 API로 넘어감
                if "404" in str(e) or "Not Found" in str(e):
                    self.logger.warning(f"{client.__class__.__name__} returned 404 for {ticker}. Trying next client.")
                    continue
                # 컬럼 관련 오류는 다음 클라이언트로 시도
                elif "timestamp" in str(e).lower() or "datetime" in str(e).lower() or "columns" in str(e).lower():
                    self.logger.warning(f"{client.__class__.__name__} has column/timestamp issue for commodity {ticker}: {e}. Trying next client.")
                    last_exception = e
                else:
                    self.logger.warning(f"{client.__class__.__name__} failed for commodity {ticker}. Reason: {e}. Trying next client.")
                    last_exception = e
        
        self.logger.error(f"All API clients failed to fetch commodity OHLCV for {ticker}. Last error: {last_exception}")
        return None
    
    async def get_crypto_data(self, symbol: str, interval: str = "1d", limit: int = 100) -> Optional[pd.DataFrame]:
        """
        암호화폐 데이터를 여러 API에서 순서대로 시도하여 가져옵니다.
        """
        last_exception = None
        
        for i, client in enumerate(self.crypto_clients):
            try:
                self.logger.info(f"Attempting to fetch crypto data for {symbol} using {client.__class__.__name__} (attempt {i+1}/{len(self.crypto_clients)})")
                
                if hasattr(client, 'get_ohlcv_data'):
                    # Binance, Coinbase 클라이언트
                    data = await client.get_ohlcv_data(symbol, interval, limit)
                    if data:
                        # List[Dict]를 DataFrame으로 변환
                        import pandas as pd
                        data = pd.DataFrame(data)
                elif hasattr(client, 'get_coin_market_data'):
                    # CoinGecko 클라이언트
                    data = await client.get_coin_market_data(symbol)
                    if data:
                        # Dict를 DataFrame으로 변환
                        import pandas as pd
                        data = pd.DataFrame([data])
                elif hasattr(client, 'get_cryptocurrency_quotes'):
                    # CoinMarketCap 클라이언트
                    data = await client.get_cryptocurrency_quotes(symbol)
                    if data:
                        # Dict를 DataFrame으로 변환
                        import pandas as pd
                        data = pd.DataFrame([data])
                elif hasattr(client, 'get_crypto_data'):
                    # Bitcoin Data 클라이언트
                    data = await client.get_crypto_data(symbol, interval, limit)
                else:
                    self.logger.warning(f"{client.__class__.__name__} has no known crypto data fetching method")
                    continue
                
                if data is not None and not data.empty:
                    self.logger.info(f"Successfully fetched crypto data for {symbol} from {client.__class__.__name__} ({len(data)} records)")
                    return data
                else:
                    self.logger.warning(f"{client.__class__.__name__} returned empty crypto data for {symbol}")
                    
            except Exception as e:
                self.logger.warning(f"{client.__class__.__name__} failed for crypto {symbol}. Reason: {e}. Trying next client.")
                last_exception = e
        
        self.logger.error(f"All API clients failed to fetch crypto data for {symbol}. Last error: {last_exception}")
        return None
    
    async def get_stock_data(self, ticker: str, interval: str = "1d", limit: int = 100) -> Optional[pd.DataFrame]:
        """
        주식 데이터를 여러 API에서 순서대로 시도하여 가져옵니다.
        """
        # HISTORICAL_DATA_DAYS_PER_RUN 설정값 동적으로 조회
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
        
        last_exception = None
        
        # 날짜 범위 계산 (지원하는 API용)
        start_date, end_date = self._calculate_date_range(adjusted_limit)
        yahoo_period = self._calculate_yahoo_period(adjusted_limit)
        
        for i, client in enumerate(self.stock_clients):
            try:
                self.logger.info(f"Attempting to fetch stock data for {ticker} using {client.__class__.__name__} (attempt {i+1}/{len(self.stock_clients)})")
                
                if hasattr(client, 'get_ohlcv_data'):
                    # FMP, Alpha Vantage 클라이언트
                    if hasattr(client, '__class__') and 'FMPClient' in str(client.__class__):
                        # FMP 클라이언트의 경우 limit 파라미터 전달
                        data = await client.get_ohlcv_data(ticker, limit=limit)
                    else:
                        # 다른 클라이언트들은 기존 방식 유지
                        data = await client.get_ohlcv_data(ticker)
                    if data:
                        # List[Dict]를 DataFrame으로 변환
                        data = pd.DataFrame(data)
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
                        # List[Dict]를 DataFrame으로 변환
                        data = pd.DataFrame(data)
                elif hasattr(client, 'get_quote'):
                    # Tiingo 클라이언트의 경우 (실시간 데이터)
                    data = await client.get_quote(ticker)
                    if data:
                        # Dict를 DataFrame으로 변환
                        import pandas as pd
                        data = pd.DataFrame([data])
                else:
                    self.logger.warning(f"{client.__class__.__name__} has no known stock data fetching method")
                    continue
                
                if data is not None and not data.empty:
                    # 데이터 검증: 0 가격이 너무 많은지 확인
                    if 'open_price' in data.columns or 'open' in data.columns:
                        price_col = 'open_price' if 'open_price' in data.columns else 'open'
                        zero_count = (data[price_col] == 0).sum()
                        total_count = len(data)
                        zero_ratio = zero_count / total_count if total_count > 0 else 0
                        
                        if zero_ratio > 0.1:  # 10% 이상이 0이면 문제로 간주 (더 엄격하게)
                            self.logger.warning(f"{client.__class__.__name__} returned stock data with {zero_ratio:.1%} zero prices for {ticker}. Skipping this data.")
                            continue
                    
                    self.logger.info(f"Successfully fetched stock data for {ticker} from {client.__class__.__name__} ({len(data)} records)")
                    return data
                else:
                    self.logger.warning(f"{client.__class__.__name__} returned empty stock data for {ticker}")
                    
            except Exception as e:
                self.logger.warning(f"{client.__class__.__name__} failed for stock {ticker}. Reason: {e}. Trying next client.")
                last_exception = e
        
        self.logger.error(f"All API clients failed to fetch stock data for {ticker}. Last error: {last_exception}")
        return None
    
    async def get_company_info(self, ticker: str) -> Optional[Dict[str, Any]]:
        """
        회사 정보를 여러 API에서 순서대로 시도하여 가져옵니다.
        """
        last_exception = None
        
        for i, client in enumerate(self.stock_clients):
            try:
                self.logger.info(f"Attempting to fetch company info for {ticker} using {client.__class__.__name__} (attempt {i+1}/{len(self.stock_clients)})")
                
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
    
    async def _get_fetch_parameters(self, asset_id: int, interval: str) -> Dict[str, Any]:
        """
        [NEW] Checks the DB and system settings to determine optimal fetch parameters.
        This centralizes the logic that was previously scattered across collectors.
        """
        from app.models import AppConfiguration
        from app.core.database import get_db
        from app.crud.asset import crud_ohlcv
        
        db = next(get_db())
        try:
            # Load settings from DB
            enable_backfill_conf = db.query(AppConfiguration).filter(
                AppConfiguration.config_key == "ENABLE_HISTORICAL_BACKFILL"
            ).first()
            historical_days_conf = db.query(AppConfiguration).filter(
                AppConfiguration.config_key == "HISTORICAL_DATA_DAYS_PER_RUN"
            ).first()
            
            enable_backfill = enable_backfill_conf.config_value.lower() == 'true' if enable_backfill_conf else True
            historical_days = int(historical_days_conf.config_value) if historical_days_conf else 165

            # Get latest data timestamp for this asset and interval
            latest_date_obj = crud_ohlcv.get_latest_timestamp(db, asset_id, interval)
            
            if latest_date_obj:
                latest_date = latest_date_obj.date()
                today = datetime.now().date()
                days_diff = (today - latest_date).days

                if days_diff > 1:
                    # If there's a gap, fetch the missing data
                    start_date = (latest_date + timedelta(days=1)).strftime('%Y-%m-%d')
                    end_date = today.strftime('%Y-%m-%d')
                    limit = days_diff + 1  # Add a buffer
                else:
                    # If up-to-date, just fetch the last few days to be safe
                    start_date = (today - timedelta(days=5)).strftime('%Y-%m-%d')
                    end_date = today.strftime('%Y-%m-%d')
                    limit = 7
            elif enable_backfill:
                # If no data exists at all, do a historical backfill
                end_date = datetime.now().strftime('%Y-%m-%d')
                start_date = (datetime.now() - timedelta(days=historical_days)).strftime('%Y-%m-%d')
                limit = historical_days + 1
            else:
                # No backfill enabled, just fetch recent data
                end_date = datetime.now().strftime('%Y-%m-%d')
                start_date = (datetime.now() - timedelta(days=5)).strftime('%Y-%m-%d')
                limit = 7
                
            return {
                "start_date": start_date,
                "end_date": end_date, 
                "limit": limit,
                "enable_backfill": enable_backfill,
                "historical_days": historical_days
            }
            
        except Exception as e:
            self.logger.error(f"Error getting fetch parameters for asset {asset_id}: {e}")
            # Fallback to default values
            return {
                "start_date": (datetime.now() - timedelta(days=5)).strftime('%Y-%m-%d'),
                "end_date": datetime.now().strftime('%Y-%m-%d'),
                "limit": 7,
                "enable_backfill": True,
                "historical_days": 165
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
            "stock_clients": [client.__class__.__name__ for client in self.stock_clients]
        }
        return status

# 전역 인스턴스
api_manager = ApiStrategyManager()
