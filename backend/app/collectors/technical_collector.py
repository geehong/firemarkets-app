"""
Technical indicators collector for fetching and storing technical analysis data.
DEPRECATED: Technical indicators collector is not used in the current plan.
This file is kept for potential future reference but is not active.
"""
import logging
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any

import httpx
import backoff
from sqlalchemy.orm import Session

from .base_collector import BaseCollector
from app.models.asset import Asset
from app.core.config_manager import ConfigManager
from app.services.api_strategy_manager import ApiStrategyManager
from app.utils.redis_queue_manager import RedisQueueManager

logger = logging.getLogger(__name__)


class TechnicalCollector(BaseCollector):
    """Collects technical indicators from various APIs"""
    
    def __init__(
        self,
        db: Session,
        config_manager: ConfigManager,
        api_manager: ApiStrategyManager,
        redis_queue_manager: RedisQueueManager,
    ):
        super().__init__(db, config_manager, api_manager, redis_queue_manager)
    
    async def _collect_data(self) -> Dict[str, Any]:
        """Collect technical indicators for all FMP assets"""
        db = self.get_db_session()
        
        try:
            # Get all FMP assets (technical indicators are only available from FMP)
            fmp_assets = db.query(Asset).filter(
                Asset.is_active == True,
                Asset.data_source == 'fmp'
            ).all()
            
            if not fmp_assets:
                return {"message": "No active FMP assets found", "processed": 0}
            
            self.log_progress(f"Starting technical indicators collection for {len(fmp_assets)} assets")
            
            # Process assets in batches
            batch_size = 3
            total_processed = 0
            total_updated = 0
            
            for i in range(0, len(fmp_assets), batch_size):
                batch = fmp_assets[i:i + batch_size]
                
                # Process batch concurrently
                tasks = [self._fetch_and_store_technical_indicators_for_asset(asset) for asset in batch]
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                for result in results:
                    if isinstance(result, Exception):
                        self.log_progress(f"Technical indicators processing error: {result}", "error")
                    else:
                        total_processed += 1
                        if result.get("success", False):
                            total_updated += 1
                
                # Rate limiting between batches
                if i + batch_size < len(fmp_assets):
                    await asyncio.sleep(2)
            
            return {
                "processed_assets": total_processed,
                "updated_assets": total_updated,
                "message": f"Successfully processed {total_processed} assets, updated {total_updated}"
            }
            
        except Exception as e:
            self.log_progress(f"Technical indicators collection failed: {e}", "error")
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
    
    async def _fetch_technical_indicators_from_fmp(self, client: httpx.AsyncClient, ticker: str, api_key: str) -> Optional[dict]:
        """Fetch technical indicators from FMP"""
        try:
            url = f"https://financialmodelingprep.com/api/v3/technical-indicators/{ticker}?apikey={api_key}"
            data = await self._fetch_async(client, url, "FMP Technical Indicators", ticker)
            
            if isinstance(data, list) and len(data) > 0:
                return data[0]
            elif isinstance(data, dict):
                return data
            else:
                return None
                
        except Exception as e:
            self.log_progress(f"FMP technical indicators fetch failed for {ticker}: {e}", "error")
            return None
    
    async def _fetch_and_store_technical_indicators_for_asset(self, asset: Asset) -> Dict[str, Any]:
        """Fetch and store technical indicators for a single asset"""
        try:
            self.log_progress(f"[{asset.ticker}] Starting technical indicators collection")
            
            # Get API key
            from ..core.config import GLOBAL_APP_CONFIGS
            fmp_api_key = GLOBAL_APP_CONFIGS.get("FMP_API_KEY")
            
            if not fmp_api_key:
                self.log_progress(f"[{asset.ticker}] FMP API key not configured", "error")
                return {"success": False, "error": "FMP API key not configured"}
            
            # Fetch data from FMP
            async with httpx.AsyncClient() as client:
                indicators_data = await self._fetch_technical_indicators_from_fmp(client, asset.ticker, fmp_api_key)
            
            if not isinstance(indicators_data, dict):
                self.log_progress(f"[{asset.ticker}] No technical indicators data found", "warning")
                return {"success": False, "error": "No technical indicators data found"}
            
            # Enqueue for DataProcessor
            if getattr(self, 'redis_queue_manager', None) is None:
                self.log_progress("redis_queue_manager not configured; skipping enqueue", "warning")
                return {"success": False, "error": "queue manager not available"}
            await self.redis_queue_manager.push_batch_task("technical_indicators", {
                'asset_id': asset.asset_id,
                'indicators': indicators_data,
                'timestamp_utc': datetime.now().isoformat()
            })
            await self.redis_queue_manager.push_batch_task("asset_settings_update", {
                'asset_id': asset.asset_id,
                'settings': {'last_technical_indicators_collection': datetime.now().isoformat()}
            })
            self.log_progress(f"[{asset.ticker}] Technical indicators enqueued successfully")
            return {"success": True, "message": "Technical indicators enqueued"}
                
        except Exception as e:
            self.log_progress(f"[{asset.ticker}] Technical indicators collection failed: {e}", "error")
            return {"success": False, "error": str(e)}
    
    async def _store_technical_indicators(self, asset: Asset, indicators_data: dict) -> bool:
        """Enqueue technical indicators for DataProcessor instead of direct DB writes."""
        if getattr(self, 'redis_queue_manager', None) is None:
            self.log_progress("redis_queue_manager not configured; skipping enqueue", "warning")
            return False
        await self.redis_queue_manager.push_batch_task("technical_indicators", {
            'asset_id': asset.asset_id,
            'indicators': indicators_data,
            'timestamp_utc': datetime.now().isoformat()
        })
        return True
    
    def _safe_float(self, value: Any) -> Optional[float]:
        """Safely convert value to float"""
        if value is None:
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None 