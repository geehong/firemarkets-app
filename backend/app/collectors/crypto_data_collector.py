"""
Crypto Data Collector for collecting detailed cryptocurrency information from CoinMarketCap
"""
import logging
import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime, date
from sqlalchemy.orm import Session

from .base_collector import BaseCollector
from ..models.asset import Asset, AssetType
from ..models.crypto import CryptoData
from ..core.config import GLOBAL_APP_CONFIGS
from ..core.database import SessionLocal

logger = logging.getLogger(__name__)


class CryptoDataCollector(BaseCollector):
    """Crypto Data Collector for detailed cryptocurrency information"""
    
    def __init__(self):
        super().__init__()
        self.collection_type = "crypto_data"
    
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
            
            await self.safe_emit('scheduler_log', {
                'message': f"크립토 데이터 수집 시작: {len(assets)}개 자산 (설정 기반)", 
                'type': 'info'
            })
            
            return await self._collect_data()
            
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
                for asset in crypto_assets:
                    try:
                        result = await self._collect_crypto_data_for_asset(client, asset, db)
                        if result["success"]:
                            total_updated += result["updated_count"]
                        total_processed += 1
                        
                        # Log progress
                        self.log_progress(
                            f"Processed {asset.ticker}: {result['message']}", 
                            "info" if result["success"] else "warning"
                        )
                        
                    except Exception as e:
                        error_msg = f"Error processing {asset.ticker}: {str(e)}"
                        logger.error(error_msg)
                        errors.append(error_msg)
                        total_processed += 1
            
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
            
            # Get CoinMarketCap API key
            api_key = GLOBAL_APP_CONFIGS.get("COINMARKETCAP_API_KEY")
            if not api_key:
                return {
                    "success": False,
                    "message": "CoinMarketCap API key not configured",
                    "updated_count": 0
                }
            
            # Fetch crypto data from CoinMarketCap
            crypto_data = await self._fetch_crypto_data_from_coinmarketcap(client, asset.ticker, api_key)
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
    
    async def _fetch_crypto_data_from_coinmarketcap(self, client: httpx.AsyncClient, ticker: str, api_key: str) -> Optional[Dict[str, Any]]:
        """Fetch crypto data from CoinMarketCap API"""
        try:
            # Clean ticker symbol for CoinMarketCap API
            symbol = ticker.replace("USDT", "").replace("USD", "").replace("BTC", "")
            
            # Get quotes data
            quotes_url = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest"
            quotes_params = {
                "symbol": symbol,
                "convert": "USD"
            }
            headers = {
                "X-CMC_PRO_API_KEY": api_key,
                "Accept": "application/json"
            }
            
            quotes_response = await client.get(quotes_url, params=quotes_params, headers=headers, timeout=30)
            quotes_response.raise_for_status()
            quotes_data = quotes_response.json()
            
            if "data" not in quotes_data or symbol not in quotes_data["data"]:
                logger.warning(f"Symbol {symbol} not found in CoinMarketCap quotes data")
                return None
            
            crypto_info = quotes_data["data"][symbol]
            quote = crypto_info.get("quote", {}).get("USD", {})
            
            # Get additional info data
            info_url = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/info"
            info_params = {"symbol": symbol}
            
            info_response = await client.get(info_url, params=info_params, headers=headers, timeout=30)
            info_response.raise_for_status()
            info_data = info_response.json()
            
            if "data" not in info_data or symbol not in info_data["data"]:
                logger.warning(f"Symbol {symbol} not found in CoinMarketCap info data")
                return None
            
            info = info_data["data"][symbol]
            
            # Prepare crypto data
            crypto_data = {
                "symbol": symbol,
                "name": crypto_info.get("name", ""),
                "market_cap": float(quote.get("market_cap", 0)),
                "current_price": float(quote.get("price", 0)),
                "price": float(quote.get("price", 0)),
                "volume_24h": float(quote.get("volume_24h", 0)),
                "circulating_supply": float(crypto_info.get("circulating_supply", 0)),
                "total_supply": float(crypto_info.get("total_supply", 0)) if crypto_info.get("total_supply") else None,
                "max_supply": float(crypto_info.get("max_supply", 0)) if crypto_info.get("max_supply") else None,
                "percent_change_1h": float(quote.get("percent_change_1h", 0)),
                "percent_change_24h": float(quote.get("percent_change_24h", 0)),
                "percent_change_7d": float(quote.get("percent_change_7d", 0)),
                "percent_change_30d": float(quote.get("percent_change_30d", 0)),
                "cmc_rank": crypto_info.get("cmc_rank"),
                "category": info.get("category", ""),
                "description": info.get("description", ""),
                "logo_url": info.get("logo", ""),
                "website_url": info.get("urls", {}).get("website", [""])[0] if info.get("urls", {}).get("website") else None,
                "slug": crypto_info.get("slug", ""),
                "date_added": datetime.fromisoformat(info.get("date_added", "").replace("Z", "+00:00")) if info.get("date_added") else None,
                "platform": info.get("platform", {}).get("name") if info.get("platform") else None,
                "explorer": info.get("urls", {}).get("explorer", [""])[0] if info.get("urls", {}).get("explorer") else None,
                "source_code": info.get("urls", {}).get("source_code", [""])[0] if info.get("urls", {}).get("source_code") else None,
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