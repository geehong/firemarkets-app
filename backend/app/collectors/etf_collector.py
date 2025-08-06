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
from ..core.config import GLOBAL_APP_CONFIGS
from ..models.asset import Asset
from ..models.etf import EtfInfo

logger = logging.getLogger(__name__)


class ETFCollector(BaseCollector):
    """Collects ETF information from various APIs"""
    
    def __init__(self, db: Session = None):
        super().__init__(db)
        self.api_timeout = GLOBAL_APP_CONFIGS.get("API_REQUEST_TIMEOUT_SECONDS", 30)
        self.max_retries = GLOBAL_APP_CONFIGS.get("MAX_API_RETRY_ATTEMPTS", 3)
    
    async def collect_with_settings(self) -> Dict[str, Any]:
        """Collect ETF data with individual asset settings"""
        try:
            # Get assets that have ETF collection enabled in their settings
            # 하이브리드 방식: True/False와 true/false 모두 지원
            from sqlalchemy import or_, text
            
            db = self.get_db_session()
            condition1 = Asset.collection_settings.contains({"collect_etf_info": True})
            condition2 = text("JSON_EXTRACT(collection_settings, '$.collect_etf_info') = true")
            
            assets = db.query(Asset).filter(
                Asset.is_active == True,
                or_(condition1, condition2)
            ).all()
            
            if not assets:
                await self.safe_emit('scheduler_log', {
                    'message': "ETF 데이터 수집이 활성화된 자산이 없습니다.", 
                    'type': 'warning'
                })
                return {"message": "No assets with ETF collection enabled", "processed": 0}
            
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
            # Get all ETF assets
            from ..models import AssetType
            etf_assets = db.query(Asset).join(AssetType).filter(
                Asset.is_active == True,
                AssetType.type_name.in_(['ETF', 'etf'])
            ).all()
            
            if not etf_assets:
                return {"message": "No active ETF assets found", "processed": 0}
            
            self.log_progress(f"Starting ETF info collection for {len(etf_assets)} ETFs")
            
            # Process ETFs in batches
            batch_size = 3
            total_processed = 0
            total_updated = 0
            
            for i in range(0, len(etf_assets), batch_size):
                batch = etf_assets[i:i + batch_size]
                
                # Process batch concurrently
                tasks = [self._fetch_and_store_etf_info_for_asset(asset) for asset in batch]
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                for result in results:
                    if isinstance(result, Exception):
                        self.log_progress(f"ETF processing error: {result}", "error")
                    else:
                        total_processed += 1
                        if result.get("success", False):
                            total_updated += 1
                
                # Rate limiting between batches
                if i + batch_size < len(etf_assets):
                    await asyncio.sleep(2)
            
            return {
                "processed_etfs": total_processed,
                "updated_etfs": total_updated,
                "message": f"Successfully processed {total_processed} ETFs, updated {total_updated}"
            }
            
        except Exception as e:
            self.log_progress(f"ETF collection failed: {e}", "error")
            raise
    
    @backoff.on_exception(
        backoff.expo,
        (httpx.RequestError, httpx.HTTPStatusError),
        max_tries=3,
        max_time=60
    )
    async def _fetch_async(self, client: httpx.AsyncClient, url: str, api_name: str, ticker: str):
        """Fetch data from API with retry logic"""
        await self.safe_emit('scheduler_log', {
            'message': f"[{ticker}] {api_name} API 호출 시도: {url}", 
            'type': 'info'
        })
        
        response = await client.get(url, timeout=self.api_timeout)
        
        if response.status_code == 429:  # Too Many Requests
            await self.safe_emit('scheduler_log', {
                'message': f"[{ticker}] {api_name} API 호출 제한 도달. 재시도합니다.", 
                'type': 'warning'
            })
            response.raise_for_status()
        
        response.raise_for_status()
        return response.json()
    
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



