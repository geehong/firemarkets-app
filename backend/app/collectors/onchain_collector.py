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
                for metric_name in metrics:
                    try:
                        # Check if metric collection is enabled
                        config_key = f"ONCHAIN_COLLECT_{metric_name.replace('-', '_').upper()}"
                        if not GLOBAL_APP_CONFIGS.get(config_key, True):
                            self.log_progress(f"Skipping {metric_name} (disabled)")
                            continue
                        
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
                        
                        if added_count > 0:
                            total_fetched += added_count
                            successful_metrics.append(metric_name)
                            self.log_progress(f"{metric_name}: Added {added_count} records")
                        else:
                            self.log_progress(f"No new {metric_name} data was fetched", "warning")
                            
                    except Exception as e:
                        self.log_progress(f"Error collecting {metric_name}: {e}", "error")
                        continue
                
                # Update asset's last collection time
                await self._update_asset_collection_time()
            
            if total_fetched > 0:
                self.log_progress(f"Onchain data collection completed: {total_fetched} records from {len(successful_metrics)} metrics")
                return {
                    "total_records": total_fetched,
                    "successful_metrics": successful_metrics,
                    "message": f"Successfully collected {total_fetched} records from {len(successful_metrics)} metrics"
                }
            else:
                self.log_progress("No onchain data was collected", "warning")
                return {
                    "total_records": 0,
                    "successful_metrics": [],
                    "message": "No onchain data was collected"
                }
                
        except Exception as e:
            self.log_progress(f"Onchain data collection failed: {e}", "error")
            raise
    
    @backoff.on_exception(
        backoff.expo,
        (httpx.RequestError, httpx.HTTPStatusError),
        max_tries=3,
        max_time=60
    )
    async def _fetch_and_store_onchain_metric(self, client: httpx.AsyncClient, metric_name: str, endpoint: str, field_map: dict, collection_type: str = "recent", force_update: bool = False) -> int:
        """Fetch and store onchain metric data"""
        url = f"{self.base_url}{endpoint}"
        
        # collection_type에 따라 날짜 범위 설정
        if collection_type == "all":
            # 전체 데이터 수집을 위해 더 넓은 범위 사용
            params = {
                'startday': (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d'),  # 1년
                'endday': datetime.now().strftime('%Y-%m-%d'),
                'page': 0,
                'size': 1000  # 더 많은 데이터 요청
            }
        else:
            # 최근 데이터만 수집
            params = {
                'startday': (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d'),
                'endday': datetime.now().strftime('%Y-%m-%d'),
                'page': 0,
                'size': 100
            }
        
        try:
            await self.safe_emit('scheduler_log', {
                'message': f"Onchain API 호출 시도: {url} with params: {params}", 
                'type': 'info'
            })
            
            response = await client.get(url, params=params, timeout=self.api_timeout)
            response.raise_for_status()
            data = response.json()
            
            if not data or not isinstance(data, list):
                self.log_progress(f"Invalid response format from {metric_name} API", "warning")
                return 0
            
            # 필드명 매핑 정의
            field_mapping = {
                'mvrv-zscore': 'mvrvZscore',
                'sopr': 'sopr',
                'nupl': 'nupl',
                'realized-price': 'realizedPrice',
                'hashrate': 'hashrate',
                'difficulty-BTC': 'difficultyBtc',
                'miner-reserves': 'reserves',
                'etf-btc-total': 'etfBtcTotal',
                'open-interest-futures': 'openInterestFutures',
                'cap-real-usd': 'capRealUSD',
                'cdd-90dma': 'cdd90dma',
                'true-market-mean': 'trueMarketMean',
                'nrpl-btc': 'nrplBtc',
                'aviv': 'aviv',
                'thermo-cap': 'thermoCap',
                'hodl-waves-supply': 'hodlWavesSupply',
                'etf-btc-flow': 'etfFlow'
            }
            
            # 실제 필드명 가져오기
            actual_field_name = field_mapping.get(metric_name, metric_name.replace('-', ''))
            
            total_fetched = 0
            db = self.get_db_session()
            
            for item in data:
                date_str = item.get('d')
                
                # HODL Waves Supply 특별 처리
                if metric_name == 'hodl-waves-supply':
                    hodl_fields = [
                        'age_0d_1d', 'age_1d_1w', 'age_1w_1m', 'age_1m_3m',
                        'age_3m_6m', 'age_6m_1y', 'age_1y_2y', 'age_2y_3y',
                        'age_3y_4y', 'age_4y_5y', 'age_5y_7y', 'age_7y_10y', 'age_10y'
                    ]
                    
                    # 모든 HODL 필드가 None인지 확인
                    all_none = all(item.get(field) is None for field in hodl_fields)
                    if all_none:
                        continue
                        
                    metric_value = None  # HODL Waves는 개별 필드로 저장
                else:
                    metric_value = self._safe_float(item.get(actual_field_name))
                
                if not date_str or (metric_value is None and metric_name != 'hodl-waves-supply'):
                    continue
                
                try:
                    record_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                except ValueError:
                    continue
                
                # Check if record already exists
                existing_record = db.query(CryptoMetric).filter(
                    CryptoMetric.asset_id == self.bitcoin_asset_id,
                    CryptoMetric.timestamp_utc == record_date
                ).first()
                
                if existing_record and not force_update:
                    # Skip existing record if not forcing update
                    continue
                elif existing_record and force_update:
                    # Update existing record when force_update is True
                    if metric_name == 'hodl-waves-supply':
                        # HODL Waves 필드들 업데이트
                        for field in hodl_fields:
                            db_field = f"hodl_{field}"
                            value = self._safe_float(item.get(field))
                            if value is not None:
                                setattr(existing_record, db_field, value)
                    else:
                        setattr(existing_record, metric_name.replace('-', '_'), metric_value)
                else:
                    # Create new record
                    new_record = CryptoMetric(
                        asset_id=self.bitcoin_asset_id,
                        timestamp_utc=record_date
                    )
                    if metric_name == 'hodl-waves-supply':
                        # HODL Waves 필드들 설정
                        for field in hodl_fields:
                            db_field = f"hodl_{field}"
                            value = self._safe_float(item.get(field))
                            if value is not None:
                                setattr(new_record, db_field, value)
                    else:
                        setattr(new_record, metric_name.replace('-', '_'), metric_value)
                    db.add(new_record)
                
                total_fetched += 1
            
            if total_fetched > 0:
                db.commit()
            
            return total_fetched
            
        except Exception as e:
            self.log_progress(f"Error fetching {metric_name} data: {e}", "error")
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
            metric_name = metric_id.replace('_', '-')
            
            # MVRV Z-Score 특별 처리
            if metric_id == 'mvrv_z_score':
                endpoint = "/v1/mvrv-zscore"  # 올바른 엔드포인트
            else:
                endpoint = f"/v1/{metric_name}"
            
            async with httpx.AsyncClient() as client:
                added_count = await self._fetch_and_store_onchain_metric(
                    client, metric_name, endpoint, {
                        'd': 'timestamp_utc',
                        metric_name.replace('-', '_'): metric_name.replace('-', '_')
                    }, collection_type, force_update
                )
                
                await self._update_asset_collection_time()
                
                self.log_progress(f"Successfully collected {added_count} records for {metric_id}")
                return added_count
                
        except Exception as e:
            self.log_progress(f"Error collecting {metric_id}: {e}", "error")
            return 0
