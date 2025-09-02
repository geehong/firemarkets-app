"""
Crypto Data Collector for collecting detailed cryptocurrency information from CoinMarketCap
"""
import logging
import asyncio
import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime, date
from sqlalchemy.orm import Session

from .base_collector import BaseCollector
from ..models.asset import Asset, AssetType
from ..models.crypto import CryptoData
from ..models.system import AppConfiguration
from ..core.config import GLOBAL_APP_CONFIGS
from ..core.database import SessionLocal
from ..services.api_strategy_manager import api_manager

logger = logging.getLogger(__name__)


class CryptoDataCollector(BaseCollector):
    """Crypto Data Collector for detailed cryptocurrency information"""
    
    def __init__(self):
        super().__init__()
        self.collection_type = "crypto_data"
        # CoinMarketCap API 설정 - 데이터베이스에서 직접 조회
        self.coinmarketcap_base_url = "https://pro-api.coinmarketcap.com"
        db = SessionLocal()
        try:
            api_key_config = db.query(AppConfiguration).filter(
                AppConfiguration.config_key == "COINMARKETCAP_API_KEY"
            ).first()
            self.api_key = api_key_config.config_value if api_key_config else None
        finally:
            db.close()
        
        # 로깅 헬퍼 초기화
        from ..utils.logging_helper import CollectorLoggingHelper
        self.logging_helper = CollectorLoggingHelper("CryptoDataCollector", self)
    
    async def collect_with_settings(self) -> Dict[str, Any]:
        """Collect crypto data with individual asset settings"""
        try:
            # Get assets that have crypto collection enabled in their settings
            # 하이브리드 방식: True/False와 true/false 모두 지원
            from sqlalchemy import or_, text
            
            db = self.get_db_session()
            condition1 = Asset.collection_settings.contains({"collect_crypto_data": True})
            condition2 = text("JSON_EXTRACT(collection_settings, '$.collect_crypto_data') = true")
            
            assets = db.query(Asset).filter(
                Asset.is_active == True,
                or_(condition1, condition2)
            ).all()
            
            if not assets:
                await self.safe_emit('scheduler_log', {
                    'message': "크립토 데이터 수집이 활성화된 자산이 없습니다.", 
                    'type': 'warning'
                })
                return {"message": "No assets with crypto collection enabled", "processed": 0}
            
            # 상세 로깅 시작
            self.logging_helper.start_collection("crypto_data", len(assets), api_provider="CoinMarketCap")
            
            await self.safe_emit('scheduler_log', {
                'message': f"크립토 데이터 수집 시작: {len(assets)}개 자산 (설정 기반)", 
                'type': 'info'
            })
            
            result = await self._collect_data()
            
            # 상세 로깅 완료
            self.logging_helper.log_collection_completion(
                len(assets), 
                result.get("updated", 0),
                api_provider="CoinMarketCap",
                collection_type="crypto_data"
            )
            
            return result
            
        except Exception as e:
            self.log_progress(f"Crypto collection with settings failed: {e}", "error")
            raise
    
    async def collect(self) -> Dict[str, Any]:
        """Collect crypto data for all cryptocurrency assets"""
        logger.info("Starting crypto data collection...")
        
        db = SessionLocal()
        try:
            # Get all cryptocurrency assets
            crypto_assets = db.query(Asset).join(AssetType).filter(
                AssetType.type_name == "Crypto",
                Asset.is_active == True
            ).all()
            
            if not crypto_assets:
                logger.info("No active cryptocurrency assets found")
                return {"success": True, "message": "No crypto assets to collect", "processed": 0}
            
            total_processed = 0
            total_updated = 0
            errors = []
            
            async with httpx.AsyncClient() as client:
                # 배치 처리로 개선
                batch_size = 3
                for i in range(0, len(crypto_assets), batch_size):
                    batch = crypto_assets[i:i + batch_size]
                    
                    async def process_crypto_with_semaphore(asset):
                        return await self.process_with_semaphore(
                            self._collect_crypto_data_for_asset(client, asset, db)
                        )
                    
                    tasks = [process_crypto_with_semaphore(asset) for asset in batch]
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    
                    for j, result in enumerate(results):
                        asset = batch[j]
                        if isinstance(result, Exception):
                            error_msg = f"Error processing {asset.ticker}: {str(result)}"
                            logger.error(error_msg)
                            errors.append(error_msg)
                            total_processed += 1
                        else:
                            if result["success"]:
                                total_updated += result["updated_count"]
                            total_processed += 1
                            
                            # Log progress
                            self.log_progress(
                                f"Processed {asset.ticker}: {result['message']}", 
                                "info" if result["success"] else "warning"
                            )
                    
                    # 배치 간 지연
                    if i + batch_size < len(crypto_assets):
                        await asyncio.sleep(1)
            
            success_message = f"Crypto data collection completed. Processed: {total_processed}, Updated: {total_updated}"
            if errors:
                success_message += f", Errors: {len(errors)}"
            
            return {
                "success": True,
                "message": success_message,
                "processed": total_processed,
                "updated": total_updated,
                "errors": errors
            }
            
        except Exception as e:
            error_msg = f"Crypto data collection failed: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return {"success": False, "message": error_msg}
        finally:
            db.close()
    
    async def _collect_data(self) -> Dict[str, Any]:
        return await self.collect()
    
    async def _collect_crypto_data_for_asset(self, client: httpx.AsyncClient, asset: Asset, db: Session) -> Dict[str, Any]:
        """Collect crypto data for a single asset"""
        try:
            # Check if crypto data collection is enabled for this asset
            if not asset.get_setting('collect_crypto_data', True):
                return {
                    "success": True,
                    "message": "Crypto data collection disabled",
                    "updated_count": 0
                }
            
            # Check if API key is configured
            if not self.api_key:
                return {
                    "success": False,
                    "message": "CoinMarketCap API key not configured",
                    "updated_count": 0
                }
            
            # Fetch crypto data from CoinMarketCap
            crypto_data = await self._fetch_crypto_data_from_coinmarketcap(client, asset.ticker)
            if not crypto_data:
                return {
                    "success": False,
                    "message": "Failed to fetch crypto data",
                    "updated_count": 0
                }
            
            # Store or update crypto data
            updated_count = await self._store_crypto_data(asset.asset_id, crypto_data, db)
            
            # Update last collection time
            asset.set_last_collection('crypto_data', datetime.now())
            db.commit()
            
            return {
                "success": True,
                "message": f"Updated crypto data for {asset.ticker}",
                "updated_count": updated_count
            }
            
        except Exception as e:
            logger.error(f"Error collecting crypto data for {asset.ticker}: {e}")
            return {
                "success": False,
                "message": str(e),
                "updated_count": 0
            }
    
    async def _fetch_crypto_data_from_coinmarketcap(self, client: httpx.AsyncClient, ticker: str) -> Optional[Dict[str, Any]]:
        """Fetch crypto data from CoinMarketCap API using common request method"""
        try:
            # Clean ticker symbol for CoinMarketCap API
            symbol = ticker.replace("USDT", "").replace("USD", "").replace("BTC", "")
            
            # Skip if symbol is empty after cleaning
            if not symbol:
                logger.warning(f"Empty symbol after cleaning ticker: {ticker}")
                return None
            
            # Common headers for CoinMarketCap API
            headers = {
                "X-CMC_PRO_API_KEY": self.api_key,
                "Accept": "application/json"
            }
            
            # Get quotes data using common request method
            quotes_url = f"{self.coinmarketcap_base_url}/v1/cryptocurrency/quotes/latest"
            quotes_params = {
                "symbol": symbol,
                "convert": "USD"
            }
            
            quotes_data = await self._make_request(
                client=client,
                url=quotes_url,
                api_name="CoinMarketCap Quotes",
                params=quotes_params,
                headers=headers,
                ticker=ticker
            )
            
            if not quotes_data or "data" not in quotes_data or symbol not in quotes_data["data"]:
                logger.warning(f"Symbol {symbol} not found in CoinMarketCap quotes data")
                return None
            
            crypto_info = quotes_data["data"][symbol]
            quote = crypto_info.get("quote", {}).get("USD", {})
            
            # Get additional info data using common request method
            info_url = f"{self.coinmarketcap_base_url}/v1/cryptocurrency/info"
            info_params = {"symbol": symbol}
            
            info_data = await self._make_request(
                client=client,
                url=info_url,
                api_name="CoinMarketCap Info",
                params=info_params,
                headers=headers,
                ticker=ticker
            )
            
            if not info_data or "data" not in info_data or symbol not in info_data["data"]:
                logger.warning(f"Symbol {symbol} not found in CoinMarketCap info data")
                return None
            
            info = info_data["data"][symbol]
            
            # Prepare crypto data
            crypto_data = {
                "symbol": symbol,
                "name": crypto_info.get("name", ""),
                "market_cap": self._safe_float(quote.get("market_cap"), 0),
                "current_price": self._safe_float(quote.get("price"), 0),
                "price": self._safe_float(quote.get("price"), 0),
                "volume_24h": self._safe_float(quote.get("volume_24h"), 0),
                "circulating_supply": self._safe_float(crypto_info.get("circulating_supply"), 0),
                "total_supply": self._safe_float(crypto_info.get("total_supply")) if crypto_info.get("total_supply") else None,
                "max_supply": self._safe_float(crypto_info.get("max_supply")) if crypto_info.get("max_supply") else None,
                "percent_change_1h": self._safe_float(quote.get("percent_change_1h"), 0),
                "percent_change_24h": self._safe_float(quote.get("percent_change_24h"), 0),
                "percent_change_7d": self._safe_float(quote.get("percent_change_7d"), 0),
                "percent_change_30d": self._safe_float(quote.get("percent_change_30d"), 0),
                "cmc_rank": crypto_info.get("cmc_rank"),
                "category": info.get("category", ""),
                "description": info.get("description", ""),
                "logo_url": info.get("logo", ""),
                "website_url": info.get("urls", {}).get("website", [""])[0] if info.get("urls", {}).get("website") else None,
                "slug": crypto_info.get("slug", ""),
                "date_added": datetime.fromisoformat(info.get("date_added", "").replace("Z", "+00:00")) if info.get("date_added") else None,
                "platform": info.get("platform", {}).get("name") if info.get("platform") else None,
                "explorer": info.get("urls", {}).get("explorer", [""])[0] if info.get("urls", {}).get("explorer") else "",
                "source_code": info.get("urls", {}).get("source_code", [""])[0] if info.get("urls", {}).get("source_code") else "",
                "tags": ",".join(info.get("tags", [])),
                "is_active": True,
                "last_updated": datetime.now(),
                "created_at": datetime.now()
            }
            
            return crypto_data
            
        except Exception as e:
            logger.error(f"Error fetching crypto data from CoinMarketCap for {ticker}: {e}")
            return None
    
    async def _store_crypto_data(self, asset_id: int, crypto_data: Dict[str, Any], db: Session) -> int:
        """Store or update crypto data in database"""
        try:
            # Check if crypto data already exists
            existing_data = db.query(CryptoData).filter(CryptoData.asset_id == asset_id).first()
            
            if existing_data:
                # Update existing data
                for key, value in crypto_data.items():
                    if hasattr(existing_data, key):
                        setattr(existing_data, key, value)
                existing_data.last_updated = datetime.now()
                db.commit()
                return 1
            else:
                # Create new crypto data
                new_crypto_data = CryptoData(
                    asset_id=asset_id,
                    **crypto_data
                )
                db.add(new_crypto_data)
                db.commit()
                return 1
                
        except Exception as e:
            logger.error(f"Error storing crypto data for asset {asset_id}: {e}")
            db.rollback()
            return 0 