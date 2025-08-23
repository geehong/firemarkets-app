"""
Onchain data collector for Bitcoin metrics from various APIs.
"""
import logging
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any

import httpx
import backoff
from sqlalchemy.orm import Session

from .base_collector import BaseCollector
from ..core.config import GLOBAL_APP_CONFIGS
from ..models.asset import Asset
from ..models.crypto import CryptoMetric
from ..external_apis.alpha_vantage_client import AlphaVantageClient
from ..external_apis.fmp_client import FMPClient
from ..external_apis.coinmarketcap_client import CoinMarketCapClient
from ..external_apis.coingecko_client import CoinGeckoClient
from ..utils.retry import retry_with_backoff, classify_api_error, TransientAPIError, PermanentAPIError

from ..core.websocket import scheduler

logger = logging.getLogger(__name__)


class OnchainCollector(BaseCollector):
    """Collects onchain data for Bitcoin and other cryptocurrencies"""
    
    def __init__(self, db: Session = None):
        super().__init__(db)
        from ..core.config import GLOBAL_APP_CONFIGS
        self.base_url = GLOBAL_APP_CONFIGS.get("BGEO_API_BASE_URL", "https://bitcoin-data.com")
        self.bitcoin_asset_id = self._get_bitcoin_asset_id()
        self.api_timeout = GLOBAL_APP_CONFIGS.get("API_REQUEST_TIMEOUT_SECONDS", 30)
        
        # 온체인 API 제한 고려한 세마포어 설정
        semaphore_limit = GLOBAL_APP_CONFIGS.get("ONCHAIN_SEMAPHORE_LIMIT", 1)  # 기본값 1
        self.log_progress(f"OnchainCollector: Semaphore enabled with limit {semaphore_limit}", "info")
        
        # API 클라이언트 초기화 (Fallback 체인)
        self.coingecko_client = CoinGeckoClient()
        self.coinmarketcap_client = CoinMarketCapClient()
        
        # API 우선순위 설정
        self.api_priority = GLOBAL_APP_CONFIGS.get("ONCHAIN_API_PRIORITY", "coingecko,coinmarketcap,bitcoin-data")
    
    def _get_bitcoin_asset_id(self) -> int:
        """비트코인 자산 ID를 동적으로 찾습니다. BTC 또는 BTCUSDT를 지원합니다."""
        try:
            db = self.get_db_session()
            # 먼저 BTC로 시도
            bitcoin_asset = db.query(Asset).filter(Asset.ticker == "BTC").first()
            if bitcoin_asset:
                return bitcoin_asset.asset_id
            
            # BTC가 없으면 BTCUSDT로 시도
            bitcoin_asset = db.query(Asset).filter(Asset.ticker == "BTCUSDT").first()
            if bitcoin_asset:
                return bitcoin_asset.asset_id
            
            # 둘 다 없으면 기본값 반환
            logger.warning("Bitcoin asset not found (BTC or BTCUSDT), using default asset_id: 1")
            return 1
        except Exception as e:
            logger.error(f"Error getting Bitcoin asset ID: {e}")
            return 1
    
    async def collect_with_settings(self) -> Dict[str, Any]:
        """Collect onchain data with individual asset settings"""
        try:
            # Get assets that have onchain collection enabled in their settings
            # 하이브리드 방식: True/False와 true/false 모두 지원
            from sqlalchemy import or_, text
            
            db = self.get_db_session()
            condition1 = Asset.collection_settings.contains({"collect_onchain": True})
            condition2 = text("JSON_EXTRACT(collection_settings, '$.collect_onchain') = true")
            
            assets = db.query(Asset).filter(
                Asset.is_active == True,
                or_(condition1, condition2)
            ).all()
            
            if not assets:
                await self.safe_emit('scheduler_log', {
                    'message': "온체인 데이터 수집이 활성화된 자산이 없습니다.", 
                    'type': 'warning'
                })
                return {"message": "No assets with onchain collection enabled", "processed": 0}
            
            await self.safe_emit('scheduler_log', {
                'message': f"온체인 데이터 수집 시작: {len(assets)}개 자산 (설정 기반)", 
                'type': 'info'
            })
            
            return await self._collect_data()
            
        except Exception as e:
            self.log_progress(f"Onchain collection with settings failed: {e}", "error")
            raise
    
    async def _collect_data(self) -> Dict[str, Any]:
        """Collect onchain data for Bitcoin"""
        try:
            self.log_progress(f"Starting onchain data collection for Bitcoin (Asset ID: {self.bitcoin_asset_id})")
            
            # Define metrics to collect (원본과 동일하게 복원)
            metrics = [
                'mvrv-zscore',
                'sopr', 
                'nupl',
                'realized-price',
                'hashrate',
                'difficulty-BTC',
                'miner-reserves',
                'etf-btc-total',
                'open-interest-futures',
                'cap-real-usd',
                'cdd-90dma',
                'true-market-mean',
                'nrpl-btc',
                'aviv',
                'thermo-cap',
                'hodl-waves-supply',
                'etf-btc-flow'
            ]
            
            total_fetched = 0
            successful_metrics = []
            
            async with httpx.AsyncClient() as client:
                # 메트릭을 배치로 처리 (API 제한 고려)
                batch_size = 1  # 한 번에 1개씩만 처리
                for i in range(0, len(metrics), batch_size):
                    metric_batch = metrics[i:i + batch_size]
                    
                    async def process_metric_with_semaphore(metric_name):
                        return await self.process_with_semaphore(
                            self._process_single_metric(client, metric_name)
                        )
                    
                    tasks = [process_metric_with_semaphore(metric_name) for metric_name in metric_batch]
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    
                    for j, result in enumerate(results):
                        metric_name = metric_batch[j]
                        if isinstance(result, Exception):
                            self.log_progress(f"Error collecting {metric_name}: {result}", "error")
                        elif result and result > 0:
                            total_fetched += result
                            successful_metrics.append(metric_name)
                            self.log_progress(f"{metric_name}: Added {result} records")
                        else:
                            self.log_progress(f"No new {metric_name} data was fetched", "warning")
                    
                    # API 제한 고려한 긴 지연 (시간당 10회 = 6분 간격)
                    if i + batch_size < len(metrics):
                        delay_seconds = GLOBAL_APP_CONFIGS.get("ONCHAIN_API_DELAY_SECONDS", 360)  # 기본 6분
                        self.log_progress(f"Waiting {delay_seconds} seconds before next API call...", "info")
                        await asyncio.sleep(delay_seconds)
                
                # Update asset's last collection time
                await self._update_asset_collection_time()
            
            if total_fetched > 0:
                self.log_progress(f"Onchain data collection completed: {total_fetched} records from {len(successful_metrics)} metrics")
                return {
                    "total_records": total_fetched,
                    "total_added_records": total_fetched,  # 스케줄러 로그용
                    "successful_metrics": successful_metrics,
                    "message": f"Successfully collected {total_fetched} records from {len(successful_metrics)} metrics"
                }
            else:
                self.log_progress("No onchain data was collected", "warning")
                return {
                    "total_records": 0,
                    "total_added_records": 0,  # 스케줄러 로그용
                    "successful_metrics": [],
                    "message": "No onchain data was collected"
                }
                
        except Exception as e:
            self.log_progress(f"Onchain data collection failed: {e}", "error")
            raise
    
    async def _process_single_metric(self, client: httpx.AsyncClient, metric_name: str) -> int:
        """개별 메트릭 처리 (세마포어 내부에서 호출)"""
        try:
            # Check if metric collection is enabled
            config_key = f"ONCHAIN_COLLECT_{metric_name.replace('-', '_').upper()}"
            if not GLOBAL_APP_CONFIGS.get(config_key, True):
                self.log_progress(f"Skipping {metric_name} (disabled)")
                return 0
            
            self.log_progress(f"Collecting {metric_name} data")
            
            # MVRV Z-Score 특별 처리
            if metric_name == 'mvrv-zscore':
                endpoint = "/v1/mvrv-zscore"  # 올바른 엔드포인트
            else:
                endpoint = f"/v1/{metric_name}"
            
            added_count = await self._fetch_and_store_onchain_metric(
                client, metric_name, endpoint, {
                    'd': 'timestamp_utc',
                    metric_name.replace('-', '_'): metric_name.replace('-', '_')
                }
            )
            
            return added_count
            
        except Exception as e:
            self.log_progress(f"Error collecting {metric_name}: {e}", "error")
            return 0

    async def _fetch_and_store_onchain_metric(self, client: httpx.AsyncClient, metric_name: str, endpoint: str, field_map: dict, collection_type: str = "recent", force_update: bool = False) -> int:
        """Fetch and store onchain metric data with fallback chain"""
        
        # API 우선순위에 따라 순차적으로 시도
        apis = self.api_priority.split(',')
        
        for api_name in apis:
            api_name = api_name.strip()
            try:
                self.log_progress(f"Trying {api_name} API for {metric_name}", "info")
                
                if api_name == "coingecko":
                    if self._is_coingecko_supported(metric_name):
                        self.log_progress(f"CoinGecko supports {metric_name}, attempting fetch", "info")
                        result = await self._fetch_from_coingecko(metric_name, collection_type, force_update)
                        if result > 0:
                            self.log_progress(f"Successfully collected {result} records from CoinGecko for {metric_name}", "success")
                            return result
                    else:
                        self.log_progress(f"CoinGecko does not support {metric_name}, skipping", "info")
                
                elif api_name == "coinmarketcap":
                    if self._is_coinmarketcap_supported(metric_name):
                        self.log_progress(f"CoinMarketCap supports {metric_name}, attempting fetch", "info")
                        result = await self._fetch_from_coinmarketcap(metric_name, collection_type, force_update)
                        if result > 0:
                            self.log_progress(f"Successfully collected {result} records from CoinMarketCap for {metric_name}", "success")
                            return result
                    else:
                        self.log_progress(f"CoinMarketCap does not support {metric_name}, skipping", "info")
                
                elif api_name == "bitcoin-data":
                    self.log_progress(f"Bitcoin-Data supports all metrics, attempting fetch", "info")
                    # client가 None인 경우 새로운 client 생성
                    if client is None:
                        async with httpx.AsyncClient() as new_client:
                            result = await self._fetch_from_bitcoin_data(new_client, metric_name, endpoint, field_map, collection_type, force_update)
                            if result > 0:
                                self.log_progress(f"Successfully collected {result} records from Bitcoin-Data for {metric_name}", "success")
                                return result
                    else:
                        result = await self._fetch_from_bitcoin_data(client, metric_name, endpoint, field_map, collection_type, force_update)
                        if result > 0:
                            self.log_progress(f"Successfully collected {result} records from Bitcoin-Data for {metric_name}", "success")
                            return result
                
            except Exception as e:
                self.log_progress(f"Failed to fetch from {api_name} for {metric_name}: {e}", "warning")
                continue
        
        self.log_progress(f"All APIs failed for {metric_name}", "error")
        return 0
        
        pass
    
    async def _fetch_from_bitcoin_data(self, client: httpx.AsyncClient, metric_name: str, endpoint: str, field_map: dict, collection_type: str, force_update: bool) -> int:
        """Fetch data from bitcoin-data.com API"""
        url = f"{self.base_url}{endpoint}"
        
        # collection_type에 따라 날짜 범위 설정
        if collection_type == "all":
            params = {}
        else:
            params = {}
        
        async def api_call():
            await self.safe_emit('scheduler_log', {
                'message': f"Bitcoin-Data API 호출 시도: {url} with params: {params}", 
                'type': 'info'
            })
            
            response = await client.get(url, params=params, timeout=30)
            
            # API 응답 상태 코드에 따른 오류 분류
            if response.status_code == 429:
                raise TransientAPIError(f"Rate limit exceeded for Bitcoin-Data API")
            elif response.status_code >= 500:
                raise TransientAPIError(f"Server error {response.status_code} for Bitcoin-Data API")
            elif response.status_code == 404:
                raise PermanentAPIError(f"Endpoint not found: {endpoint}")
            elif response.status_code in [401, 403]:
                raise PermanentAPIError(f"Authentication failed for Bitcoin-Data API")
            
            response.raise_for_status()
            return response.json()
        
        try:
            # 고도화된 재시도 로직 적용
            max_retries = GLOBAL_APP_CONFIGS.get("MAX_API_RETRY_ATTEMPTS", 3)
            data = await retry_with_backoff(
                api_call,
                max_retries=max_retries,
                base_delay=1.0,
                max_delay=30.0,
                jitter=True
            )
            
            # 데이터 처리 및 저장
            try:
                self.log_progress(f"DEBUG: About to call _process_onchain_data for {metric_name}", "info")
                result = await self._process_onchain_data(metric_name, data, field_map)
                self.log_progress(f"DEBUG: _process_onchain_data returned {result} for {metric_name}", "info")
                return result
            except Exception as e:
                self.log_progress(f"Error in _process_onchain_data for {metric_name}: {e}", "error")
                import traceback
                self.log_progress(f"Traceback: {traceback.format_exc()}", "error")
                return 0
            
        except PermanentAPIError as e:
            self.log_progress(f"Permanent error for {metric_name}: {e}", "error")
            return 0
        except TransientAPIError as e:
            self.log_progress(f"Transient error for {metric_name}: {e}", "warning")
            return 0
        except Exception as e:
            self.log_progress(f"Unexpected error for {metric_name}: {e}", "error")
            return 0

    async def _process_onchain_data(self, metric_name: str, data: dict, field_map: dict) -> int:
        """온체인 데이터 처리 및 저장"""
        # 디버깅 로그 추가
        self.log_progress(f"DEBUG: Processing {metric_name} data, type: {type(data)}, length: {len(data) if isinstance(data, (list, dict)) else 'N/A'}", "info")
        
        if not data:
            self.log_progress(f"DEBUG: No data for {metric_name}", "warning")
            return 0
            
        if not isinstance(data, (list, dict)):
            self.log_progress(f"DEBUG: Invalid data type for {metric_name}: {type(data)}", "warning")
            return 0
        
        db = self.get_db_session()
        added_count = 0
        
        try:
            # 데이터 구조에 따라 처리
            if 'data' in data:
                records = data['data']
                self.log_progress(f"DEBUG: Using data['data'] for {metric_name}, records count: {len(records)}", "info")
            elif isinstance(data, list):
                records = data
                self.log_progress(f"DEBUG: Using data as list for {metric_name}, records count: {len(records)}", "info")
            else:
                records = [data]
                self.log_progress(f"DEBUG: Using data as single record for {metric_name}", "info")
            
            if metric_name == 'realized-cap':
                self.log_progress(f"DEBUG: About to process {len(records)} records", "info")
                self.log_progress(f"DEBUG: First record sample: {records[0] if records else 'No records'}", "info")
            
            for i, record in enumerate(records):
                if metric_name == 'realized-cap' and i < 3:  # 처음 3개만 로그
                    self.log_progress(f"DEBUG: Processing record {i}: {record}", "info")
                
                # realized-cap 메트릭을 cap-real-usd로 처리
                if metric_name == 'realized-cap':
                    metric_name = 'cap-real-usd'
                if not isinstance(record, dict):
                    if metric_name == 'realized-cap':
                        self.log_progress(f"DEBUG: Skipping non-dict record {i}: {record}", "warning")
                    continue
                
                # 필드 매핑 적용 (API별 필드명 변환 고려)
                field_key = metric_name.replace('-', '_')
                value = record.get(field_key) or record.get('value')
                
                # API별 특별한 필드명 처리
                if metric_name == 'mvrv-zscore' and value is None:
                    value = record.get('mvrvZscore')  # Bitcoin-Data API 필드명
                elif metric_name == 'difficulty-BTC' and value is None:
                    value = record.get('difficultyBtc')  # Bitcoin-Data API 필드명
                elif metric_name == 'realized-price' and value is None:
                    value = record.get('realizedPrice')  # Bitcoin-Data API 필드명
                elif metric_name == 'miner-reserves' and value is None:
                    value = record.get('reserves')  # Bitcoin-Data API 필드명
                elif metric_name == 'etf-btc-total' and value is None:
                    value = record.get('etfBtcTotal')  # Bitcoin-Data API 필드명
                elif metric_name == 'etf-btc-flow' and value is None:
                    value = record.get('etfFlow')  # Bitcoin-Data API 필드명
                elif metric_name == 'true-market-mean' and value is None:
                    value = record.get('trueMarketMean')  # Bitcoin-Data API 필드명
                elif metric_name == 'cdd-90dma' and value is None:
                    value = record.get('cdd90dma')  # Bitcoin-Data API 필드명
                elif metric_name == 'nrpl-btc' and value is None:
                    value = record.get('nrplBtc')  # Bitcoin-Data API 필드명
                elif metric_name == 'cap-real-usd' and value is None:
                    value = record.get('capRealUSD')  # Bitcoin-Data API 필드명
                    # 과학적 표기법 문자열을 일반 문자열로 변환
                    if value and isinstance(value, str) and 'E' in value:
                        try:
                            value = f"{float(value):.2f}"
                        except (ValueError, TypeError):
                            pass
                    # 디버깅 로그 추가
                    if i < 3:  # 처음 3개만 로그
                        self.log_progress(f"DEBUG: cap-real-usd record {i}: value={value}, type={type(value)}", "info")
                elif metric_name == 'open-interest-futures' and value is None:
                    # JSON 형식으로 거래소별 데이터 저장
                    exchanges = ['binance', 'bybit', 'okx', 'bitget', 'deribit', 'bitmex', 'huobi', 'bitfinex', 'gateIo', 'kucoin', 'kraken', 'cryptoCom', 'dydx', 'deltaExchange']
                    exchange_data = {}
                    total_oi = 0
                    
                    for exchange in exchanges:
                        exchange_value = record.get(exchange)
                        if exchange_value is not None and exchange_value != 'null':
                            try:
                                float_value = float(exchange_value)
                                exchange_data[exchange] = float_value
                                total_oi += float_value
                            except (ValueError, TypeError):
                                continue
                    
                    # JSON 형식으로 저장
                    value = {
                        "total": total_oi if total_oi > 0 else None,
                        "exchanges": exchange_data,
                        "timestamp": record.get('d'),
                        "unix_ts": record.get('unixTs')
                    }
                elif metric_name == 'cap-real-usd':
                    # capRealUSD 필드에서 값 추출
                    value = record.get('capRealUSD')
                    if value and isinstance(value, str) and 'E' in value:
                        try:
                            value = f"{float(value):.2f}"
                        except (ValueError, TypeError):
                            pass
                
                # 값 검증
                if value is None:
                    if metric_name in ['aviv', 'cap-real-usd']:
                        self.log_progress(f"DEBUG: Skipping record with None value: {record}", "warning")
                    continue
                
                # 중복 체크 및 저장 (날짜 필드 처리)
                timestamp_field = 'theDay' if metric_name in ['realized-price', 'cap-real-usd'] else 'd'
                timestamp_value = record.get(timestamp_field)
                
                # 디버깅 로그
                if metric_name in ['aviv', 'cap-real-usd', 'realized-cap']:
                    self.log_progress(f"DEBUG: metric_name={metric_name}, record={record}, field_key={field_key}, value={value}", "info")
                    self.log_progress(f"DEBUG: timestamp_field={timestamp_field}, timestamp_value={timestamp_value}", "info")
                
                existing = db.query(CryptoMetric).filter(
                    CryptoMetric.asset_id == self.bitcoin_asset_id,
                    CryptoMetric.timestamp_utc == timestamp_value
                ).first()
                
                # UPSERT 로직: 기존 레코드가 있으면 업데이트, 없으면 새로 생성
                try:
                    # 기존 레코드 확인
                    existing = db.query(CryptoMetric).filter(
                        CryptoMetric.asset_id == self.bitcoin_asset_id,
                        CryptoMetric.timestamp_utc == timestamp_value
                    ).first()
                    
                    if existing:
                        # 기존 레코드 업데이트
                        if metric_name == 'aviv':
                            existing.aviv = value
                        elif metric_name == 'mvrv-zscore':
                            existing.mvrv_z_score = value
                        elif metric_name == 'sopr':
                            existing.sopr = value
                        elif metric_name == 'nupl':
                            existing.nupl = value
                        elif metric_name == 'realized-price':
                            existing.realized_price = value
                        elif metric_name == 'hashrate':
                            existing.hashrate = value
                        elif metric_name == 'difficulty-BTC':
                            existing.difficulty = value
                        elif metric_name == 'miner-reserves':
                            existing.miner_reserves = value
                        elif metric_name == 'etf-btc-total':
                            existing.etf_btc_total = value
                        elif metric_name == 'open-interest-futures':
                            existing.open_interest_futures = value
                        elif metric_name == 'cap-real-usd':
                            existing.realized_cap = value
                        elif metric_name == 'cdd-90dma':
                            existing.cdd_90dma = value
                        elif metric_name == 'true-market-mean':
                            existing.true_market_mean = value
                        elif metric_name == 'nrpl-btc':
                            existing.nrpl_btc = value
                        elif metric_name == 'thermo-cap':
                            existing.thermo_cap = value
                        elif metric_name == 'hodl-waves-supply':
                            existing.hodl_waves_supply = value
                        elif metric_name == 'etf-btc-flow':
                            existing.etf_btc_flow = value
                        
                        existing.updated_at = datetime.now()
                        self.log_progress(f"Updated existing record for {metric_name} on {timestamp_value}", "info")
                    else:
                        # 새로운 레코드 생성
                        new_metric = CryptoMetric(
                            asset_id=self.bitcoin_asset_id,
                            timestamp_utc=timestamp_value,
                            created_at=datetime.now()
                        )
                        
                        # 메트릭별 필드 설정
                        if metric_name == 'aviv':
                            new_metric.aviv = value
                        elif metric_name == 'mvrv-zscore':
                            new_metric.mvrv_z_score = value
                        elif metric_name == 'sopr':
                            new_metric.sopr = value
                        elif metric_name == 'nupl':
                            new_metric.nupl = value
                        elif metric_name == 'realized-price':
                            new_metric.realized_price = value
                        elif metric_name == 'hashrate':
                            new_metric.hashrate = value
                        elif metric_name == 'difficulty-BTC':
                            new_metric.difficulty = value
                        elif metric_name == 'miner-reserves':
                            new_metric.miner_reserves = value
                        elif metric_name == 'etf-btc-total':
                            new_metric.etf_btc_total = value
                        elif metric_name == 'open-interest-futures':
                            new_metric.open_interest_futures = value
                        elif metric_name == 'cap-real-usd':
                            new_metric.realized_cap = value
                        elif metric_name == 'cdd-90dma':
                            new_metric.cdd_90dma = value
                        elif metric_name == 'true-market-mean':
                            new_metric.true_market_mean = value
                        elif metric_name == 'nrpl-btc':
                            new_metric.nrpl_btc = value
                        elif metric_name == 'thermo-cap':
                            new_metric.thermo_cap = value
                        elif metric_name == 'hodl-waves-supply':
                            new_metric.hodl_waves_supply = value
                        elif metric_name == 'etf-btc-flow':
                            new_metric.etf_btc_flow = value
                        
                        db.add(new_metric)
                        self.log_progress(f"Created new record for {metric_name} on {timestamp_value}", "info")
                    
                    # 각 레코드마다 커밋 (중복 키 오류 방지)
                    db.commit()
                    
                except Exception as e:
                    db.rollback()
                    self.log_progress(f"Error saving {metric_name} data for {timestamp_value}: {e}", "error")
                    continue
                
                added_count += 1
            
            db.commit()
            return added_count
            
        except Exception as e:
            db.rollback()
            self.log_progress(f"Error processing {metric_name} data: {e}", "error")
            import traceback
            self.log_progress(f"Traceback: {traceback.format_exc()}", "error")
            return 0
    
    async def _update_asset_collection_time(self):
        """Update asset's last onchain collection time"""
        try:
            db = self.get_db_session()
            asset = db.query(Asset).filter(Asset.asset_id == self.bitcoin_asset_id).first()
            if asset:
                asset.last_onchain_collection = datetime.now()
                db.commit()
                self.log_progress("Updated asset last onchain collection time")
        except Exception as e:
            self.log_progress(f"Error updating asset collection time: {e}", "error")
    

    
    def _is_coingecko_supported(self, metric_name: str) -> bool:
        """Check if metric is supported by CoinGecko API"""
        supported_metrics = [
            'price', 'market-cap', 'volume', 'realized-price'
        ]
        return metric_name in supported_metrics
    
    def _is_coinmarketcap_supported(self, metric_name: str) -> bool:
        """Check if metric is supported by CoinMarketCap API"""
        supported_metrics = [
            'price', 'market-cap', 'volume', 'circulating-supply'
        ]
        return metric_name in supported_metrics
    

    
    def _update_metric_field(self, metric: CryptoMetric, metric_name: str, value: float):
        """Update specific metric field on CryptoMetric object"""
        field_mapping = {
            'mvrv-zscore': 'mvrv_z_score',
            'sopr': 'sopr',
            'nupl': 'nupl',
            'realized-price': 'realized_price',
            'hashrate': 'hashrate',
            'difficulty-BTC': 'difficulty',
            'hodl-waves-supply': 'hodl_waves_supply',
            'aviv': 'aviv'
        }
        
        field_name = field_mapping.get(metric_name)
        if field_name and hasattr(metric, field_name):
            setattr(metric, field_name, value)
    
    async def _fetch_from_coingecko(self, metric_name: str, collection_type: str, force_update: bool) -> int:
        """Fetch data from CoinGecko API"""
        try:
            self.log_progress(f"Fetching {metric_name} from CoinGecko API", "info")
            
            # 메트릭별 CoinGecko 메서드 매핑
            method_mapping = {
                'price': self.coingecko_client.get_bitcoin_price_history,
                'market-cap': self.coingecko_client.get_bitcoin_market_cap_history,
                'volume': self.coingecko_client.get_bitcoin_volume_history,
                'realized-price': self.coingecko_client.get_bitcoin_price_history  # 대체로 사용
            }
            
            method = method_mapping.get(metric_name)
            if not method:
                self.log_progress(f"CoinGecko method not found for {metric_name}", "warning")
                return 0
            
            # 데이터 가져오기 (최근 30일)
            days = 30 if collection_type == "recent" else 365
            data = await method(days)
            
            if not data:
                self.log_progress(f"No data received from CoinGecko for {metric_name}", "warning")
                return 0
            
            # 데이터 처리 및 저장
            return await self._process_coingecko_data(metric_name, data)
            
        except Exception as e:
            self.log_progress(f"Error fetching from CoinGecko for {metric_name}: {e}", "error")
            return 0
    
    async def _fetch_from_coinmarketcap(self, metric_name: str, collection_type: str, force_update: bool) -> int:
        """Fetch data from CoinMarketCap API"""
        try:
            self.log_progress(f"Fetching {metric_name} from CoinMarketCap API", "info")
            
            # CoinMarketCap은 기본적인 시장 데이터만 제공
            # 여기서는 기본적인 메트릭만 처리
            if metric_name in ['price', 'market-cap', 'volume']:
                # CoinMarketCap API 호출 (구현 필요)
                self.log_progress(f"CoinMarketCap API implementation needed for {metric_name}", "warning")
                return 0
            
            return 0
            
        except Exception as e:
            self.log_progress(f"Error fetching from CoinMarketCap for {metric_name}: {e}", "error")
            return 0
    
    async def _process_coingecko_data(self, metric_name: str, data: List[Dict]) -> int:
        """Process and store CoinGecko data"""
        if not data:
            return 0
        
        db = self.get_db_session()
        added_count = 0
        
        try:
            for item in data:
                if len(item) >= 2:
                    timestamp_utc = datetime.fromtimestamp(item[0] / 1000)  # CoinGecko uses milliseconds
                    value = item[1]
                    
                    # 중복 체크
                    existing = db.query(CryptoMetric).filter(
                        CryptoMetric.asset_id == self.bitcoin_asset_id,
                        CryptoMetric.timestamp_utc == timestamp_utc.date()
                    ).first()
                    
                    if existing:
                        # 기존 레코드 업데이트 (CoinGecko 데이터는 기본 메트릭만)
                        if metric_name == 'price':
                            # 가격 데이터는 다른 필드에 저장하거나 무시
                            pass
                        existing.updated_at = datetime.now()
                    else:
                        # 새 레코드 생성 (CoinGecko 데이터는 기본 메트릭만)
                        new_metric = CryptoMetric(
                            asset_id=self.bitcoin_asset_id,
                            timestamp_utc=timestamp_utc.date(),
                            created_at=datetime.now()
                        )
                        db.add(new_metric)
                    
                    added_count += 1
            
            db.commit()
            return added_count
            
        except Exception as e:
            db.rollback()
            self.log_progress(f"Error processing CoinGecko data for {metric_name}: {e}", "error")
            return 0
    
    def _safe_float(self, value: Any) -> Optional[float]:
        """Safely convert value to float"""
        if value is None:
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None
    
    async def collect_specific_metric(self, metric_name: str) -> Dict[str, Any]:
        """Collect data for a specific metric"""
        try:
            self.log_progress(f"Starting {metric_name} data collection")
            
            async with httpx.AsyncClient() as client:
                added_count = await self._fetch_and_store_onchain_metric(
                    client, metric_name, f"/v1/{metric_name}", {
                        'd': 'timestamp_utc',
                        metric_name.replace('-', '_'): metric_name.replace('-', '_')
                    }
                )
                
                await self._update_asset_collection_time()
                
                return {
                    "metric": metric_name,
                    "records_added": added_count,
                    "success": True,
                    "message": f"Successfully collected {added_count} records for {metric_name}"
                }
                
        except Exception as e:
            self.log_progress(f"Error collecting {metric_name}: {e}", "error")
            return {
                "metric": metric_name,
                "records_added": 0,
                "success": False,
                "error": str(e)
            }

    async def collect_data(self, metric_id: str, force_update: bool = False, collection_type: str = "recent") -> int:
        """특정 메트릭의 데이터를 수집합니다."""
        try:
            self.log_progress(f"Starting {metric_id} data collection (type: {collection_type})")
            
            # metric_id를 API 형식으로 변환
            if metric_id == 'difficulty':
                metric_name = 'difficulty-BTC'  # difficulty는 difficulty-BTC로 변환
            else:
                metric_name = metric_id.replace('_', '-')
            
            # 각 메트릭별 올바른 API 응답 필드명 매핑
            if metric_id == 'mvrv_z_score':
                endpoint = "/v1/mvrv-zscore"
                field_map = {
                    'd': 'timestamp_utc',
                    'mvrv_z_score': 'mvrvZscore'
                }
            elif metric_id == 'realized_price':
                endpoint = "/v1/realized-price"
                field_map = {
                    'theDay': 'timestamp_utc',  # API 응답 필드명과 일치
                    'realizedPrice': 'realizedPrice'  # API 응답 필드명과 일치
                }
            elif metric_id == 'difficulty_btc':
                endpoint = "/v1/difficulty-BTC"
                field_map = {
                    'd': 'timestamp_utc',
                    'difficultyBtc': 'difficultyBtc'  # API 응답 필드명과 일치
                }
            elif metric_id == 'difficulty':
                endpoint = "/v1/difficulty-BTC"
                field_map = {
                    'd': 'timestamp_utc',
                    'difficultyBtc': 'difficultyBtc'  # API 응답 필드명과 일치
                }
            elif metric_id == 'miner_reserves':
                endpoint = "/v1/miner-reserves"
                field_map = {
                    'd': 'timestamp_utc',
                    'reserves': 'reserves'  # API 응답 필드명과 일치
                }
            elif metric_id == 'etf_btc_total':
                endpoint = "/v1/etf-btc-total"
                field_map = {
                    'd': 'timestamp_utc',
                    'etfBtcTotal': 'etfBtcTotal'  # API 응답 필드명과 일치
                }
            elif metric_id == 'open_interest_futures':
                endpoint = "/v1/open-interest-futures"
                field_map = {
                    'd': 'timestamp_utc'
                    # JSON 형식으로 저장하므로 field_map은 최소화
                }
            elif metric_id == 'realized_cap':
                endpoint = "/v1/cap-real-usd"
                field_map = {
                    'theDay': 'timestamp_utc',
                    'capRealUSD': 'capRealUSD'
                }
            elif metric_id == 'cdd_90dma':
                endpoint = "/v1/cdd-90dma"
                field_map = {
                    'd': 'timestamp_utc',
                    'cdd_90dma': 'cdd90dma'
                }
            elif metric_id == 'true_market_mean':
                endpoint = "/v1/true-market-mean"
                field_map = {
                    'd': 'timestamp_utc',
                    'true_market_mean': 'trueMarketMean'
                }
            elif metric_id == 'nrpl_btc':
                endpoint = "/v1/nrpl-btc"
                field_map = {
                    'd': 'timestamp_utc',
                    'nrpl_btc': 'nrplBtc'
                }
            elif metric_id == 'thermo_cap':
                endpoint = "/v1/thermo-cap"
                field_map = {
                    'd': 'timestamp_utc',
                    'thermo_cap': 'thermoCap'
                }
            elif metric_id == 'etf_btc_flow':
                endpoint = "/v1/etf-flow-btc"  # 올바른 엔드포인트
                field_map = {
                    'd': 'timestamp_utc',
                    'etfFlow': 'etfFlow'  # API 응답 필드명과 일치
                }
            elif metric_id == 'hodl_waves_supply':
                endpoint = "/v1/hodl-waves-supply"
                field_map = {
                    'd': 'timestamp_utc',
                    'hodl_waves_supply': 'hodlWavesSupply'
                }
            else:
                # 나머지 메트릭들은 API 응답 필드명이 동일함
                endpoint = f"/v1/{metric_name}"
                field_map = {
                    'd': 'timestamp_utc',
                    metric_name.replace('-', '_'): metric_name.replace('-', '_')
                }
            
            async with httpx.AsyncClient() as client:
                added_count = await self._fetch_and_store_onchain_metric(
                    client, metric_name, endpoint, field_map, collection_type, force_update
                )
                
                await self._update_asset_collection_time()
                
                self.log_progress(f"Successfully collected {added_count} records for {metric_id}")
                return added_count
                
        except Exception as e:
            self.log_progress(f"Error collecting {metric_id}: {e}", "error")
            return 0
