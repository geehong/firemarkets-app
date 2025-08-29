"""
Onchain data collector for Bitcoin metrics from various APIs.
"""
import logging
import asyncio
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any

import httpx
import backoff
from sqlalchemy.orm import Session

from .base_collector import BaseCollector
from ..core.config import GLOBAL_APP_CONFIGS
from ..models.asset import Asset
from ..models.crypto import CryptoMetric
from ..models.system import SchedulerLog
from ..crud.asset import crypto_metric
from ..external_apis.alpha_vantage_client import AlphaVantageClient
from ..external_apis.fmp_client import FMPClient
from ..external_apis.coinmarketcap_client import CoinMarketCapClient
from ..external_apis.coingecko_client import CoinGeckoClient
from ..utils.retry import retry_with_backoff, classify_api_error, TransientAPIError, PermanentAPIError
from ..services.api_strategy_manager import api_manager

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
        
        # API 우선순위 설정 - Thermo Cap은 bitcoin-data에서만 제공되므로 bitcoin-data 우선
        self.api_priority = GLOBAL_APP_CONFIGS.get("ONCHAIN_API_PRIORITY", "bitcoin-data")
        
        # 견고한 로깅을 위한 변수들
        self.current_scheduler_log_id = None
        self.current_task = None
        self.strategy_used = None
        self.checkpoint_data = {}
        self.retry_count = 0
        self.assets_processed = 0
        self.data_points_added = 0
    
    def _create_scheduler_log(self, job_name: str = "onchaincollector_collection") -> int:
        """스케줄러 로그 엔트리를 생성하고 ID를 반환합니다."""
        try:
            db = self.get_db_session()
            scheduler_log = SchedulerLog(
                job_name=job_name,
                status="running",
                current_task="Initializing collection",
                strategy_used="standard",
                retry_count=self.retry_count,
                assets_processed=0,
                data_points_added=0
            )
            db.add(scheduler_log)
            db.commit()
            db.refresh(scheduler_log)
            return scheduler_log.log_id
        except Exception as e:
            logger.error(f"Error creating scheduler log: {e}")
            return None
    
    def _update_scheduler_log(self, 
                            status: str = None, 
                            current_task: str = None, 
                            strategy_used: str = None,
                            checkpoint_data: Dict = None,
                            assets_processed: int = None,
                            data_points_added: int = None,
                            error_message: str = None,
                            end_time: bool = False):
        """스케줄러 로그를 업데이트합니다."""
        if not self.current_scheduler_log_id:
            return
        
        try:
            db = self.get_db_session()
            scheduler_log = db.query(SchedulerLog).filter(
                SchedulerLog.log_id == self.current_scheduler_log_id
            ).first()
            
            if not scheduler_log:
                return
            
            if status:
                scheduler_log.status = status
            if current_task:
                scheduler_log.current_task = current_task
            if strategy_used:
                scheduler_log.strategy_used = strategy_used
            if checkpoint_data:
                scheduler_log.checkpoint_data = json.dumps(checkpoint_data)
            if assets_processed is not None:
                scheduler_log.assets_processed = assets_processed
            if data_points_added is not None:
                scheduler_log.data_points_added = data_points_added
            if error_message:
                scheduler_log.error_message = error_message
            if end_time:
                scheduler_log.end_time = datetime.now()
                if scheduler_log.start_time:
                    scheduler_log.duration_seconds = int((scheduler_log.end_time - scheduler_log.start_time).total_seconds())
            
            db.commit()
            
        except Exception as e:
            logger.error(f"Error updating scheduler log: {e}")
    
    def _update_checkpoint(self, metric_name: str, last_processed_date: str, records_processed: int):
        """체크포인트 데이터를 업데이트합니다."""
        self.checkpoint_data[metric_name] = {
            "last_processed_date": last_processed_date,
            "records_processed": records_processed,
            "timestamp": datetime.now().isoformat()
        }
        self._update_scheduler_log(checkpoint_data=self.checkpoint_data)
    
    def _log_with_scheduler_update(self, message: str, level: str = "info", 
                                 current_task: str = None, 
                                 data_points_added: int = None):
        """로깅과 스케줄러 업데이트를 동시에 수행합니다."""
        # 기존 로깅
        self.log_progress(message, level)
        
        # 스케줄러 로그 업데이트
        update_kwargs = {}
        if current_task:
            update_kwargs['current_task'] = current_task
        if data_points_added is not None:
            self.data_points_added += data_points_added
            update_kwargs['data_points_added'] = self.data_points_added
        
        if update_kwargs:
            self._update_scheduler_log(**update_kwargs)
    
    def _handle_collection_error(self, error: Exception, metric_name: str = None, context: str = ""):
        """수집 오류를 처리하고 로깅합니다."""
        error_msg = f"Collection error {context}: {str(error)}"
        if metric_name:
            error_msg = f"{metric_name} - {error_msg}"
        
        self.log_progress(error_msg, "error")
        
        # 스케줄러 로그에 오류 기록
        self._update_scheduler_log(
            status="failed",
            error_message=error_msg,
            end_time=True
        )
        
        # 재시도 로직
        if self.retry_count < 3:  # 최대 3회 재시도
            self.retry_count += 1
            self._update_scheduler_log(retry_count=self.retry_count)
            self.log_progress(f"Retrying collection (attempt {self.retry_count}/3)", "warning")
            return True  # 재시도 가능
        else:
            self.log_progress("Max retry attempts reached", "error")
            return False  # 재시도 불가
    
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
        """Collect onchain data for Bitcoin with robust logging"""
        try:
            # 스케줄러 로그 생성
            self.current_scheduler_log_id = self._create_scheduler_log()
            if not self.current_scheduler_log_id:
                self.log_progress("Failed to create scheduler log entry", "error")
                return {"error": "Failed to create scheduler log", "processed": 0}
            
            self._log_with_scheduler_update(
                f"Starting onchain data collection for Bitcoin (Asset ID: {self.bitcoin_asset_id})",
                current_task="Initializing collection"
            )
            
            # Define metrics to collect
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
                            self._handle_collection_error(result, metric_name, "in batch processing")
                        elif result and result > 0:
                            total_fetched += result
                            successful_metrics.append(metric_name)
                            self._log_with_scheduler_update(
                                f"{metric_name}: Added {result} records",
                                current_task=f"Processing {metric_name}",
                                data_points_added=result
                            )
                            # 체크포인트 업데이트
                            self._update_checkpoint(metric_name, datetime.now().strftime("%Y-%m-%d"), result)
                        else:
                            self._log_with_scheduler_update(
                                f"No new {metric_name} data was fetched",
                                "warning",
                                current_task=f"Processing {metric_name}"
                            )
                    
                    # API 제한 고려한 긴 지연
                    if i + batch_size < len(metrics):
                        delay_seconds = GLOBAL_APP_CONFIGS.get("ONCHAIN_API_DELAY_SECONDS", 480)  # 기본 8분
                        self._log_with_scheduler_update(
                            f"Waiting {delay_seconds} seconds before next API call...",
                            current_task="API rate limiting"
                        )
                        await asyncio.sleep(delay_seconds)
                
                # Update asset's last collection time
                await self._update_asset_collection_time()
            
            if total_fetched > 0:
                self._log_with_scheduler_update(
                    f"Onchain data collection completed: {total_fetched} records from {len(successful_metrics)} metrics",
                    current_task="Collection completed"
                )
                # 성공적으로 완료
                self._update_scheduler_log(
                    status="completed",
                    end_time=True
                )
                return {
                    "total_records": total_fetched,
                    "total_added_records": total_fetched,  # 스케줄러 로그용
                    "successful_metrics": successful_metrics,
                    "message": f"Successfully collected {total_fetched} records from {len(successful_metrics)} metrics"
                }
            else:
                self._log_with_scheduler_update(
                    "No onchain data was collected",
                    "warning",
                    current_task="Collection completed (no data)"
                )
                # 실패로 마킹
                self._update_scheduler_log(
                    status="completed",
                    end_time=True
                )
                return {
                    "total_records": 0,
                    "total_added_records": 0,
                    "successful_metrics": [],
                    "message": "No onchain data was collected"
                }
                
        except Exception as e:
            # 오류 처리 및 로깅
            self._handle_collection_error(e, context="in main collection")
            raise
    
    async def _process_single_metric(self, client: httpx.AsyncClient, metric_name: str) -> int:
        """개별 메트릭 처리 (세마포어 내부에서 호출)"""
        try:
            # Check if metric collection is enabled
            config_key = f"ONCHAIN_COLLECT_{metric_name.replace('-', '_').upper()}"
            if not GLOBAL_APP_CONFIGS.get(config_key, True):
                self._log_with_scheduler_update(
                    f"Skipping {metric_name} (disabled)",
                    current_task=f"Skipping {metric_name}"
                )
                return 0
            
            self._log_with_scheduler_update(
                f"Collecting {metric_name} data",
                current_task=f"Starting {metric_name} collection"
            )
            
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
            self._handle_collection_error(e, metric_name, "in single metric processing")
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
                    self.log_progress(f"Bitcoin-Data supports all metrics, attempting fetch via api_manager", "info")
                    try:
                        # api_manager를 사용하여 Bitcoin Data API 호출
                        result = await self._fetch_from_bitcoin_data_via_manager(metric_name, collection_type, force_update)
                        if result > 0:
                            self.log_progress(f"Successfully collected {result} records from Bitcoin-Data for {metric_name}", "success")
                            return result
                    except Exception as e:
                        self.log_progress(f"Failed to fetch from Bitcoin-Data via api_manager for {metric_name}: {e}", "warning")
                        continue
                
            except Exception as e:
                self.log_progress(f"Failed to fetch from {api_name} for {metric_name}: {e}", "warning")
                continue
        
        self.log_progress(f"All APIs failed for {metric_name}", "error")
        return 0
        
        pass
    
    async def _fetch_from_bitcoin_data_via_manager(self, metric_name: str, collection_type: str, force_update: bool) -> int:
        """Fetch data from Bitcoin Data API using api_manager"""
        try:
            # Bitcoin Data API 클라이언트 직접 사용
            from ..external_apis.bitcoin_data_client import BitcoinDataClient
            client = BitcoinDataClient()
            
            # 메트릭에 따라 적절한 메서드 호출
            if metric_name == "mvrv":
                data = await client.get_mvrv_ratio(30)
            elif metric_name == "difficulty":
                data = await client.get_difficulty(30)
            elif metric_name == "hashrate":
                data = await client.get_hashrate(30)
            elif metric_name == "sopr":
                data = await client.get_sopr_ratio(30)
            elif metric_name == "nupl":
                data = await client.get_nupl_ratio(30)
            else:
                # 기본적으로 가격 데이터 사용
                data = await client.get_btc_price(30)
            
            if data is not None and not data.empty:
                # 데이터를 기존 형식에 맞게 변환
                field_map = self._get_field_map_for_metric(metric_name)
                result = await self._process_onchain_data(metric_name, {"data": data.to_dict('records')}, field_map, collection_type)
                return result
            else:
                self.log_progress(f"No data returned from Bitcoin Data API for {metric_name}", "warning")
                return 0
                
        except Exception as e:
            self.log_progress(f"Error fetching from Bitcoin Data API via manager for {metric_name}: {e}", "error")
            return 0
    
    def _get_field_map_for_metric(self, metric_name: str) -> dict:
        """메트릭별 필드 매핑 반환"""
        field_maps = {
            "mvrv": {"mvrvZscore": "mvrv"},
            "difficulty": {"difficultyBtc": "difficulty"},
            "realized_price": {"realizedPrice": "realized_price"},
            "reserves": {"reserves": "reserves"},
            "etf_btc_total": {"etfBtcTotal": "etf_btc_total"},
            "etf_flow": {"etfFlow": "etf_flow"},
            "true_market_mean": {"trueMarketMean": "true_market_mean"},
            "cdd_90dma": {"cdd90dma": "cdd_90dma"},
            "nrpl_btc": {"nrplBtc": "nrpl_btc"},
            "cap_real_usd": {"capRealUSD": "cap_real_usd"},
            "thermo_cap": {"thermoCap": "thermo_cap"}
        }
        return field_maps.get(metric_name, {})
    
    async def _fetch_from_bitcoin_data(self, client: httpx.AsyncClient, metric_name: str, endpoint: str, field_map: dict, collection_type: str, force_update: bool) -> int:
        """Fetch data from bitcoin-data.com API"""
        url = f"{self.base_url}{endpoint}"
        
        # collection_type에 따라 날짜 범위 설정
        if collection_type == "all":
            params = {}
        else:
            # recent인 경우 파라미터 없이 전체 데이터를 가져온 후 필터링
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
                result = await self._process_onchain_data(metric_name, data, field_map, collection_type)
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

    async def _process_onchain_data(self, metric_name: str, data: dict, field_map: dict, collection_type: str = "all") -> int:
        """온체인 데이터 처리 및 저장 (UPSERT 로직 적용)"""
        # 디버깅 로그 추가
        self._log_with_scheduler_update(
            f"Processing {metric_name} data, type: {type(data)}, length: {len(data) if isinstance(data, (list, dict)) else 'N/A'}",
            current_task=f"Processing {metric_name} data"
        )
        
        if not data:
            self._log_with_scheduler_update(
                f"No data for {metric_name}",
                "warning",
                current_task=f"No data for {metric_name}"
            )
            return 0
            
        if not isinstance(data, (list, dict)):
            self._log_with_scheduler_update(
                f"Invalid data type for {metric_name}: {type(data)}",
                "warning",
                current_task=f"Invalid data type for {metric_name}"
            )
            return 0
        
        db = self.get_db_session()
        added_count = 0
        
        try:
            # 데이터 구조에 따라 처리
            if 'data' in data:
                records = data['data']
                self._log_with_scheduler_update(
                    f"Processing {metric_name} data, records count: {len(records)}",
                    current_task=f"Processing {metric_name} data"
                )
            elif isinstance(data, list):
                records = data
                self._log_with_scheduler_update(
                    f"Processing {metric_name} data, records count: {len(records)}",
                    current_task=f"Processing {metric_name} data"
                )
            else:
                records = [data]
                self._log_with_scheduler_update(
                    f"Processing {metric_name} data as single record",
                    current_task=f"Processing {metric_name} data"
                )
            
            # collection_type이 "recent"인 경우 최신 30일 데이터만 필터링
            if collection_type == "recent" and records:
                from datetime import datetime, timedelta
                cutoff_date = datetime.now() - timedelta(days=30)
                filtered_records = []
                
                for record in records:
                    if isinstance(record, dict) and 'd' in record:
                        try:
                            record_date = datetime.strptime(record['d'], '%Y-%m-%d')
                            if record_date >= cutoff_date:
                                filtered_records.append(record)
                        except (ValueError, TypeError):
                            continue
                
                records = filtered_records
                self._log_with_scheduler_update(
                    f"Filtered to {len(records)} recent records for {metric_name}",
                    current_task=f"Filtering {metric_name} data"
                )
            
            # 간단한 디버깅: 첫 번째 레코드 확인
            if records and len(records) > 0:
                first_record = records[0]
                self._log_with_scheduler_update(
                    f"DEBUG: First record for {metric_name}: {first_record}",
                    current_task=f"Debugging {metric_name}"
                )
            
            # 배치 처리를 위한 데이터 수집
            batch_data = []
            
            for i, record in enumerate(records):
                # realized-cap 메트릭을 cap-real-usd로 처리
                current_metric_name = metric_name
                if metric_name == 'realized-cap':
                    current_metric_name = 'cap-real-usd'
                
                if not isinstance(record, dict):
                    continue
                
                # 필드 매핑 적용 (API별 필드명 변환 고려)
                field_key = current_metric_name.replace('-', '_')
                value = record.get(field_key) or record.get('value')
                
                # API별 특별한 필드명 처리
                if current_metric_name == 'mvrv-zscore' and value is None:
                    value = record.get('mvrvZscore')  # Bitcoin-Data API 필드명
                elif current_metric_name == 'difficulty-BTC' and value is None:
                    value = record.get('difficultyBtc')  # Bitcoin-Data API 필드명
                elif current_metric_name == 'realized-price' and value is None:
                    value = record.get('realizedPrice')  # Bitcoin-Data API 필드명
                elif current_metric_name == 'miner-reserves' and value is None:
                    value = record.get('reserves')  # Bitcoin-Data API 필드명
                elif current_metric_name == 'etf-btc-total' and value is None:
                    value = record.get('etfBtcTotal')  # Bitcoin-Data API 필드명
                elif current_metric_name == 'etf-btc-flow' and value is None:
                    value = record.get('etfFlow')  # Bitcoin-Data API 필드명
                elif current_metric_name == 'true-market-mean' and value is None:
                    value = record.get('trueMarketMean')  # Bitcoin-Data API 필드명
                elif current_metric_name == 'cdd-90dma' and value is None:
                    value = record.get('cdd90dma')  # Bitcoin-Data API 필드명
                elif current_metric_name == 'nrpl-btc' and value is None:
                    value = record.get('nrplBtc')  # Bitcoin-Data API 필드명
                elif current_metric_name == 'cap-real-usd' and value is None:
                    value = record.get('capRealUSD')  # Bitcoin-Data API 필드명
                    # 과학적 표기법 문자열을 일반 문자열로 변환
                    if value and isinstance(value, str) and 'E' in value:
                        try:
                            value = f"{float(value):.2f}"
                        except (ValueError, TypeError):
                            pass
                elif current_metric_name == 'thermo-cap' and value is None:
                    value = record.get('thermoCap')  # Bitcoin-Data API 필드명
                    # 문자열을 숫자로 변환
                    if value and isinstance(value, str):
                        try:
                            value = float(value)
                        except (ValueError, TypeError):
                            value = None
                elif current_metric_name == 'open-interest-futures' and value is None:
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
                elif current_metric_name == 'cap-real-usd':
                    # capRealUSD 필드에서 값 추출
                    value = record.get('capRealUSD')
                    if value and isinstance(value, str) and 'E' in value:
                        try:
                            value = f"{float(value):.2f}"
                        except (ValueError, TypeError):
                            pass
                
                # 값 검증
                if value is None:
                    continue
                
                # 중복 체크 및 저장 (날짜 필드 처리)
                timestamp_field = 'theDay' if current_metric_name in ['realized-price', 'cap-real-usd'] else 'd'
                timestamp_value = record.get(timestamp_field)
                
                # 디버깅: thermo-cap 데이터 확인
                if current_metric_name == 'thermo-cap' and i < 3:
                    self._log_with_scheduler_update(
                        f"DEBUG: thermo-cap record {i}: value={value}, timestamp={timestamp_value}, record={record}",
                        current_task=f"Debugging {current_metric_name}"
                    )
                
                # UPSERT 로직을 위한 데이터 준비
                metric_data = {
                    'asset_id': self.bitcoin_asset_id,
                    'timestamp_utc': timestamp_value,
                    'created_at': datetime.now()
                }
                
                # 메트릭별 필드 설정
                if current_metric_name == 'aviv':
                    metric_data['aviv'] = value
                elif current_metric_name == 'mvrv-zscore':
                    metric_data['mvrv_z_score'] = value
                elif current_metric_name == 'sopr':
                    metric_data['sopr'] = value
                elif current_metric_name == 'nupl':
                    metric_data['nupl'] = value
                elif current_metric_name == 'realized-price':
                    metric_data['realized_price'] = value
                elif current_metric_name == 'hashrate':
                    metric_data['hashrate'] = value
                elif current_metric_name == 'difficulty-BTC':
                    metric_data['difficulty'] = value
                elif current_metric_name == 'miner-reserves':
                    metric_data['miner_reserves'] = value
                elif current_metric_name == 'etf-btc-total':
                    metric_data['etf_btc_total'] = value
                elif current_metric_name == 'open-interest-futures':
                    metric_data['open_interest_futures'] = value
                elif current_metric_name == 'cap-real-usd':
                    metric_data['realized_cap'] = value
                elif current_metric_name == 'cdd-90dma':
                    metric_data['cdd_90dma'] = value
                elif current_metric_name == 'true-market-mean':
                    metric_data['true_market_mean'] = value
                elif current_metric_name == 'nrpl-btc':
                    metric_data['nrpl_btc'] = value
                elif current_metric_name == 'thermo-cap':
                    metric_data['thermo_cap'] = value
                elif current_metric_name == 'hodl-waves-supply':
                    metric_data['hodl_waves_supply'] = value
                elif current_metric_name == 'etf-btc-flow':
                    metric_data['etf_btc_flow'] = value
                
                batch_data.append(metric_data)
            
            # 디버깅: 배치 데이터 상태 확인
            if current_metric_name == 'thermo-cap' and len(batch_data) % 1000 == 0:
                self._log_with_scheduler_update(
                    f"DEBUG: Collected {len(batch_data)} records for {current_metric_name}",
                    current_task=f"Collecting {current_metric_name}"
                )
            
            # 배치 UPSERT 실행
            self._log_with_scheduler_update(
                f"Final batch_data count: {len(batch_data)} for {metric_name}",
                current_task=f"Final batch count for {metric_name}"
            )
            
            # 디버깅: batch_data가 비어있는 이유 확인
            if len(batch_data) == 0:
                self._log_with_scheduler_update(
                    f"DEBUG: batch_data is empty for {metric_name}. Records processed: {len(records)}",
                    "warning",
                    current_task=f"Empty batch for {metric_name}"
                )
            
            if batch_data:
                self._log_with_scheduler_update(
                    f"Preparing to batch upsert {len(batch_data)} records for {metric_name}",
                    current_task=f"Preparing batch upsert for {metric_name}"
                )
                try:
                    # result = crypto_metric.bulk_upsert_crypto_metrics(db, batch_data)
                    # added_count = result
                    # UPSERT 로직 주석처리 - 개별 INSERT로 변경
                    for record_data in batch_data:
                        try:
                            # 중복 체크
                            existing = db.query(CryptoMetric).filter(
                                CryptoMetric.asset_id == record_data['asset_id'],
                                CryptoMetric.timestamp_utc == record_data['timestamp_utc']
                            ).first()
                            
                            if not existing:
                                new_metric = CryptoMetric(**record_data)
                                db.add(new_metric)
                                added_count += 1
                        except Exception as e:
                            self._log_with_scheduler_update(
                                f"Error inserting individual record for {metric_name}: {e}",
                                "warning",
                                current_task=f"Error inserting record for {metric_name}"
                            )
                            continue
                    
                    self._log_with_scheduler_update(
                        f"Inserted {added_count} new records for {metric_name}",
                        current_task=f"Completed {metric_name} batch processing"
                    )
                except Exception as e:
                    self._log_with_scheduler_update(
                        f"Error processing {metric_name} data: {e}",
                        "error",
                        current_task=f"Error processing {metric_name}"
                    )
                    return 0
            else:
                self._log_with_scheduler_update(
                    f"No valid data to upsert for {metric_name}",
                    "warning",
                    current_task=f"No data for {metric_name}"
                )
            
            db.commit()
            self._log_with_scheduler_update(
                f"Successfully processed {added_count} records for {metric_name}",
                current_task=f"Completed {metric_name} processing"
            )
            return added_count
            
        except Exception as e:
            db.rollback()
            self._log_with_scheduler_update(
                f"Exception in _process_onchain_data for {metric_name}: {e}",
                "error",
                current_task=f"Exception in {metric_name}"
            )
            import traceback
            self._log_with_scheduler_update(
                f"Traceback: {traceback.format_exc()}",
                "error",
                current_task=f"Traceback for {metric_name}"
            )
            return 0
    
    async def _update_asset_collection_time(self):
        """Update asset's last onchain collection time"""
        try:
            db = self.get_db_session()
            asset = db.query(Asset).filter(Asset.asset_id == self.bitcoin_asset_id).first()
            if asset:
                asset.last_onchain_collection = datetime.now()
                db.commit()
                self._log_with_scheduler_update(
                    "Updated asset last onchain collection time",
                    current_task="Updating asset collection time"
                )
        except Exception as e:
            self._log_with_scheduler_update(
                f"Error updating asset collection time: {e}",
                "error",
                current_task="Error updating asset collection time"
            )
    

    
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
    
    async def _fetch_thermo_cap_simple(self, client: httpx.AsyncClient) -> int:
        """Thermo Cap 데이터를 단순하게 수집하고 저장"""
        try:
            url = f"{self.base_url}/v1/thermo-cap"
            
            self.log_progress(f"Fetching Thermo Cap data from: {url}", "info")
            
            response = await client.get(url, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            if not data or not isinstance(data, list):
                self.log_progress("No valid Thermo Cap data received", "warning")
                return 0
            
            self.log_progress(f"Received {len(data)} Thermo Cap records", "info")
            
            # 데이터베이스에 저장
            db = self.get_db_session()
            added_count = 0
            
            for record in data:
                try:
                    # 데이터 파싱
                    date_str = record.get('d')
                    thermo_cap_str = record.get('thermoCap')
                    
                    if not date_str or not thermo_cap_str:
                        continue
                    
                    # 날짜 파싱
                    try:
                        timestamp = datetime.strptime(date_str, "%Y-%m-%d").date()
                    except ValueError:
                        continue
                    
                    # thermo_cap 값을 숫자로 변환
                    try:
                        thermo_cap = float(thermo_cap_str)
                    except (ValueError, TypeError):
                        continue
                    
                    # 간단한 UPSERT: 기존 데이터 확인 후 INSERT 또는 UPDATE
                    existing = db.query(CryptoMetric).filter(
                        CryptoMetric.asset_id == self.bitcoin_asset_id,
                        CryptoMetric.timestamp_utc == timestamp
                    ).first()
                    
                    if existing:
                        # 기존 데이터 업데이트
                        existing.thermo_cap = thermo_cap
                        existing.updated_at = datetime.now()
                        self.log_progress(f"Updated existing record for {date_str}: {thermo_cap}", "info")
                    else:
                        # 새 데이터 생성
                        new_metric = CryptoMetric(
                            asset_id=self.bitcoin_asset_id,
                            timestamp_utc=timestamp,
                            thermo_cap=thermo_cap
                        )
                        db.add(new_metric)
                        self.log_progress(f"Inserted new record for {date_str}: {thermo_cap}", "info")
                    
                    added_count += 1
                    
                    # 100개마다 커밋
                    if added_count % 100 == 0:
                        db.commit()
                        self.log_progress(f"Processed {added_count} Thermo Cap records", "info")
                
                except Exception as e:
                    self.log_progress(f"Error processing Thermo Cap record: {e}", "error")
                    continue
            
            # 최종 커밋
            db.commit()
            
            self.log_progress(f"Successfully saved {added_count} Thermo Cap records", "success")
            return added_count
            
        except Exception as e:
            self.log_progress(f"Error fetching Thermo Cap data: {e}", "error")
            return 0
    
    # BaseCollector의 공통 메소드 사용하므로 제거
    
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
