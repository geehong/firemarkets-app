"""
ETF data collector for fetching and storing ETF information from various APIs.
"""
import logging
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any

import httpx
import backoff
from sqlalchemy.orm import Session

from .base_collector import BaseCollector
from .logging_helper import CollectorLoggingHelper, BatchProcessor
from ..core.config import GLOBAL_APP_CONFIGS
from ..models.asset import Asset
from ..models.etf import EtfInfo
from ..utils.retry import retry_with_backoff, classify_api_error, TransientAPIError, PermanentAPIError

logger = logging.getLogger(__name__)


class ETFCollector(BaseCollector):
    """Collects ETF information from various APIs"""
    
    def __init__(self, db: Session = None):
        super().__init__(db)
        self.api_timeout = GLOBAL_APP_CONFIGS.get("API_REQUEST_TIMEOUT_SECONDS", 30)
        self.max_retries = GLOBAL_APP_CONFIGS.get("MAX_API_RETRY_ATTEMPTS", 3)
        
        # 로깅 헬퍼 초기화
        self.logging_helper = CollectorLoggingHelper("ETFCollector", self)
    
    async def collect_with_settings(self) -> Dict[str, Any]:
        """Collect ETF data with individual asset settings"""
        try:
            # Get assets that have ETF collection enabled in their settings
            # 하이브리드 방식: True/False와 true/false 모두 지원
            from sqlalchemy import or_, text
            
            db = self.get_db_session()
            condition1 = Asset.collection_settings.contains({"collect_assets_info": True})
            condition2 = text("JSON_EXTRACT(collection_settings, '$.collect_assets_info') = true")
            
            assets = db.query(Asset).filter(
                Asset.is_active == True,
                or_(condition1, condition2)
            ).all()
            
            if not assets:
                self.logging_helper.log_assets_filtered(0, {"collect_assets_info": True})
                await self.safe_emit('scheduler_log', {
                    'message': "ETF 데이터 수집이 활성화된 자산이 없습니다.", 
                    'type': 'warning'
                })
                return {"message": "No assets with ETF collection enabled", "processed": 0}
            
            # 수집 시작 로그
            self.logging_helper.start_collection("ETF data", len(assets), {
                "collection_type": "settings_based",
                "filter_criteria": {"collect_assets_info": True}
            })
            
            # 자산 필터링 결과 로그
            self.logging_helper.log_assets_filtered(len(assets), {"collect_assets_info": True})
            
            await self.safe_emit('scheduler_log', {
                'message': f"ETF 데이터 수집 시작: {len(assets)}개 자산 (설정 기반)", 
                'type': 'info'
            })
            
            return await self._collect_data()
            
        except Exception as e:
            self.log_progress(f"ETF collection with settings failed: {e}", "error")
            raise
        finally:
            db.close()
    
    async def _collect_data(self) -> Dict[str, Any]:
        """Collect ETF information for all ETF assets"""
        db = self.get_db_session()
        
        try:
            # Get ETF assets that have collection enabled in their settings
            from ..models import AssetType
            from sqlalchemy import or_, text
            
            condition1 = Asset.collection_settings.contains({"collect_assets_info": True})
            condition2 = text("JSON_EXTRACT(collection_settings, '$.collect_assets_info') = true")
            
            etf_assets = db.query(Asset).join(AssetType).filter(
                Asset.is_active == True,
                AssetType.type_name.in_(['ETF', 'etf']),
                or_(condition1, condition2)
            ).all()
            
            if not etf_assets:
                self.logging_helper.log_assets_filtered(0, {"asset_type": "ETF"})
                return {"message": "No active ETF assets found", "processed": 0}
            
            # 자산 필터링 결과 로그
            self.logging_helper.log_assets_filtered(len(etf_assets), {
                "asset_type": "ETF",
                "collection_types": ["assets_info"]
            })
            
            self.log_progress(f"Starting ETF info collection for {len(etf_assets)} ETFs")
            
            # 배치 프로세서를 사용한 처리
            batch_processor = BatchProcessor(self.logging_helper, batch_size=3)
            
            async def process_etf_asset(asset):
                return await self.process_with_semaphore(
                    self._fetch_and_store_etf_info_for_asset(asset)
                )
            
            result = await batch_processor.process_assets(etf_assets, process_etf_asset)
            
            # 수집 완료 로그
            self.logging_helper.log_collection_completion(
                result["processed_assets"], 
                result["total_added_records"],
                {"collection_type": "ETF_data"}
            )
            
            return {
                "processed_etfs": result["processed_assets"],
                "updated_etfs": result["total_added_records"],
                "message": f"Successfully processed {result['processed_assets']} ETFs, updated {result['total_added_records']}"
            }
            
        except Exception as e:
            self.log_progress(f"ETF collection failed: {e}", "error")
            raise
    
    async def _fetch_async(self, client: httpx.AsyncClient, url: str, api_name: str, ticker: str):
        """Fetch data from API with advanced retry logic"""
        async def api_call():
            await self.safe_emit('scheduler_log', {
                'message': f"[{ticker}] {api_name} API 호출 시도: {url}", 
                'type': 'info'
            })
            
            response = await client.get(url, timeout=self.api_timeout)
            
            # API 응답 상태 코드에 따른 오류 분류
            if response.status_code == 429:
                raise TransientAPIError(f"Rate limit exceeded for {api_name}")
            elif response.status_code >= 500:
                raise TransientAPIError(f"Server error {response.status_code} for {api_name}")
            elif response.status_code == 404:
                raise PermanentAPIError(f"Resource not found for {ticker} in {api_name}")
            elif response.status_code in [401, 403]:
                raise PermanentAPIError(f"Authentication failed for {api_name}")
            
            response.raise_for_status()
            return response.json()
        
        # 고도화된 재시도 로직 적용
        max_retries = GLOBAL_APP_CONFIGS.get("MAX_API_RETRY_ATTEMPTS", 3)
        return await retry_with_backoff(
            api_call,
            max_retries=max_retries,
            base_delay=1.0,
            max_delay=30.0,
            jitter=True
        )
    
    async def _fetch_etf_info_from_fmp(self, client: httpx.AsyncClient, ticker: str, api_key: str) -> Dict:
        """Fetch ETF information from FMP"""
        url = f"https://financialmodelingprep.com/api/v3/etf/profile/{ticker}?apikey={api_key}"
        
        try:
            data = await self._fetch_async(client, url, "FMP", ticker)
            
            if isinstance(data, list) and len(data) > 0:
                return data[0]
            elif isinstance(data, dict):
                return data
            else:
                return {}
                
        except Exception as e:
            self.log_progress(f"FMP ETF data parsing error ({ticker}): {e}", "error")
            return {}
    
    async def _fetch_etf_info_from_alpha_vantage(self, client: httpx.AsyncClient, ticker: str, api_key: str) -> Dict:
        """Fetch ETF information from Alpha Vantage"""
        url = f"https://www.alphavantage.co/query?function=OVERVIEW&symbol={ticker}&apikey={api_key}"
        
        try:
            data = await self._fetch_async(client, url, "Alpha Vantage", ticker)
            
            if data and not data.get("Error Message"):
                return data
            else:
                return {}
                
        except Exception as e:
            self.log_progress(f"Alpha Vantage ETF data parsing error ({ticker}): {e}", "error")
            return {}
    
    def _store_etf_info(self, asset_id: int, etf_data: Dict) -> bool:
        """Store ETF information in database"""
        if not etf_data:
            return False
        
        db = self.get_db_session()
        
        try:
            # Check if ETF info already exists
            existing_info = db.query(EtfInfo).filter(EtfInfo.asset_id == asset_id).first()
            
            # Extract ETF information
            etf_info = {
                'asset_id': asset_id,
                'fund_name': etf_data.get('fundName') or etf_data.get('Name', ''),
                'issuer': etf_data.get('issuer') or etf_data.get('Issuer', ''),
                'expense_ratio': self._safe_float(etf_data.get('expenseRatio') or etf_data.get('ExpenseRatio')),
                'aum': self._safe_float(etf_data.get('aum') or etf_data.get('AUM')),
                'inception_date': self._safe_date_parse(etf_data.get('inceptionDate') or etf_data.get('InceptionDate')),
                'category': etf_data.get('category') or etf_data.get('Category', ''),
                'asset_class': etf_data.get('assetClass') or etf_data.get('AssetClass', ''),
                'index_tracked': etf_data.get('indexTracked') or etf_data.get('IndexTracked', ''),
                'domicile': etf_data.get('domicile') or etf_data.get('Domicile', ''),
                'currency': etf_data.get('currency') or etf_data.get('Currency', ''),
                'exchange': etf_data.get('exchange') or etf_data.get('Exchange', ''),
                'last_updated': datetime.now()
            }
            
            if existing_info:
                # Update existing record
                for key, value in etf_info.items():
                    if key != 'asset_id':
                        setattr(existing_info, key, value)
            else:
                # Create new record
                new_info = EtfInfo(**etf_info)
                db.add(new_info)
            
            db.commit()
            return True
            
        except Exception as e:
            db.rollback()
            self.log_progress(f"Error storing ETF info: {e}", "error")
            return False
    
    async def _fetch_and_store_etf_info_for_asset(self, asset: Asset) -> Dict[str, Any]:
        """Fetch and store ETF information for a single asset"""
        primary_source = asset.data_source
        fallback_sources = []
        
        # Define fallback strategy for ETFs
        if primary_source == 'alpha_vantage':
            fallback_sources = ['fmp']
        elif primary_source == 'fmp':
            fallback_sources = ['alpha_vantage']
        
        sources_to_try = [primary_source] + [s for s in fallback_sources if s != primary_source]
        
        async with httpx.AsyncClient() as client:
            for source in sources_to_try:
                try:
                    etf_data = {}
                    
                    if source == 'alpha_vantage':
                        api_keys = GLOBAL_APP_CONFIGS.get("ALPHA_VANTAGE_API_KEYS", [])
                        etf_data = await self._fetch_etf_info_from_alpha_vantage(client, asset.ticker, api_keys[0] if api_keys else "")
                    elif source == 'fmp':
                        api_key = GLOBAL_APP_CONFIGS.get("FMP_API_KEY", "")
                        if api_key:
                            etf_data = await self._fetch_etf_info_from_fmp(client, asset.ticker, api_key)
                    
                    if etf_data:
                        success = self._store_etf_info(asset.id, etf_data)
                        return {
                            "asset_id": asset.id,
                            "ticker": asset.ticker,
                            "source": source,
                            "success": success,
                            "message": f"ETF info {'updated' if success else 'failed to update'}"
                        }
                        
                except Exception as e:
                    self.log_progress(f"Failed to fetch from {source} for {asset.ticker}: {e}", "warning")
                    continue
        
        return {
            "asset_id": asset.id,
            "ticker": asset.ticker,
            "success": False,
            "error": "All data sources failed"
        }
    
    def _safe_float(self, value: Any) -> Optional[float]:
        """Safely convert value to float"""
        if value is None:
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None
    
    def _safe_date_parse(self, date_str: str) -> Optional[datetime]:
        """Safely parse date string"""
        if not date_str:
            return None
        try:
            return datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            return None



