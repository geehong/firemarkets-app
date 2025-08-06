"""
Index data collector for fetching and storing index information.
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

from ..crud.asset import crud_index_info

logger = logging.getLogger(__name__)


class IndexCollector(BaseCollector):
    """Collects index data from various APIs"""
    
    def __init__(self, db: Session = None):
        super().__init__(db)
        from ..core.config import GLOBAL_APP_CONFIGS
        self.api_timeout = GLOBAL_APP_CONFIGS.get("API_REQUEST_TIMEOUT_SECONDS", 30)
        self.max_retries = GLOBAL_APP_CONFIGS.get("MAX_API_RETRY_ATTEMPTS", 3)
    
    async def _collect_data(self) -> Dict[str, Any]:
        """Collect index data for all index assets"""
        db = self.get_db_session()
        
        try:
            # Get all index assets
            from ..models import AssetType
            index_assets = db.query(Asset).join(AssetType).filter(
                Asset.is_active == True,
                AssetType.type_name.in_(['Index', 'index', 'indices'])
            ).all()
            
            if not index_assets:
                return {"message": "No active index assets found", "processed": 0}
            
            self.log_progress(f"Starting index data collection for {len(index_assets)} indices")
            
            # Process indices in batches
            batch_size = 3
            total_processed = 0
            total_updated = 0
            
            for i in range(0, len(index_assets), batch_size):
                batch = index_assets[i:i + batch_size]
                
                # Process batch concurrently
                tasks = [self._fetch_and_store_index_data_for_asset(asset) for asset in batch]
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                for result in results:
                    if isinstance(result, Exception):
                        self.log_progress(f"Index processing error: {result}", "error")
                    else:
                        total_processed += 1
                        if result.get("success", False):
                            total_updated += 1
                
                # Rate limiting between batches
                if i + batch_size < len(index_assets):
                    await asyncio.sleep(2)
            
            return {
                "processed_indices": total_processed,
                "updated_indices": total_updated,
                "message": f"Successfully processed {total_processed} indices, updated {total_updated}"
            }
            
        except Exception as e:
            self.log_progress(f"Index collection failed: {e}", "error")
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
    
    async def _fetch_fmp_quote(self, client: httpx.AsyncClient, ticker: str, api_key: str) -> Optional[dict]:
        """Fetch real-time quote from FMP"""
        try:
            url = f"https://financialmodelingprep.com/api/v3/quote/{ticker}?apikey={api_key}"
            data = await self._fetch_async(client, url, "FMP Quote", ticker)
            
            if isinstance(data, list) and len(data) > 0:
                return data[0]
            elif isinstance(data, dict) and data.get('success', False):
                return data.get('data', [{}])[0] if data.get('data') else None
            return None
        except Exception as e:
            self.log_progress(f"FMP quote fetch failed for {ticker}: {e}", "error")
            return None
    
    async def _fetch_and_store_index_data_for_asset(self, asset: Asset) -> Dict[str, Any]:
        """Fetch and store index data for a single asset"""
        try:
            self.log_progress(f"[{asset.ticker}] Starting index data collection")
            
            # Get API key
            from ..core.config import GLOBAL_APP_CONFIGS
            fmp_api_key = GLOBAL_APP_CONFIGS.get("FMP_API_KEY")
            
            if not fmp_api_key:
                self.log_progress(f"[{asset.ticker}] FMP API key not configured", "error")
                return {"success": False, "error": "FMP API key not configured"}
            
            # Fetch data from FMP
            async with httpx.AsyncClient() as client:
                fmp_quote = await self._fetch_fmp_quote(client, asset.ticker, fmp_api_key)
            
            if not isinstance(fmp_quote, dict):
                self.log_progress(f"[{asset.ticker}] No index data found", "warning")
                return {"success": False, "error": "No index data found"}
            
            # Transform and store data
            success = await self._store_index_data(asset, fmp_quote)
            
            if success:
                self.log_progress(f"[{asset.ticker}] Index data collection completed successfully")
                return {"success": True, "message": "Index data collected and stored"}
            else:
                return {"success": False, "error": "Failed to store index data"}
                
        except Exception as e:
            self.log_progress(f"[{asset.ticker}] Index data collection failed: {e}", "error")
            return {"success": False, "error": str(e)}
    
    async def _store_index_data(self, asset: Asset, quote_data: dict) -> bool:
        """Store index data in database"""
        db = self.get_db_session()
        
        try:
            # Transform data
            index_data = {
                'asset_id': asset.asset_id,
                'snapshot_date': datetime.now().date(),
                'price': self._safe_float(quote_data.get('price')),
                'change_percentage': self._safe_float(quote_data.get('changePercentage')),
                'volume': self._safe_int(quote_data.get('volume')),
                'day_low': self._safe_float(quote_data.get('dayLow')),
                'day_high': self._safe_float(quote_data.get('dayHigh')),
                'year_low': self._safe_float(quote_data.get('yearLow')),
                'year_high': self._safe_float(quote_data.get('yearHigh')),
                'price_avg_50': self._safe_float(quote_data.get('priceAvg50')),
                'price_avg_200': self._safe_float(quote_data.get('priceAvg200'))
            }
            
            # Store in database
            success = crud_index_info.upsert_index_info(db, index_data)
            
            if success:
                # Update last collection time
                crud_index_info.update_ticker_settings(db, asset.asset_id, {'last_price_collection': datetime.now()})
            
            return success
            
        except Exception as e:
            db.rollback()
            self.log_progress(f"Error storing index data: {e}", "error")
            return False
    
    def _safe_int(self, value: Any) -> Optional[int]:
        """Safely convert value to integer"""
        if value is None or value == "None" or value == "N/A" or value == "":
            return None
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return None
    
    def _safe_float(self, value: Any) -> Optional[float]:
        """Safely convert value to float"""
        if value is None:
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None 