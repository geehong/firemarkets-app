from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.collectors.base_collector import BaseCollector
from app.external_apis.implementations.cryptopanic_client import CryptoPanicClient
from app.external_apis.implementations.tiingo_client import TiingoClient
from app.external_apis.implementations.finnhub_client import FinnhubClient
from app.external_apis.implementations.polygon_client import PolygonClient
from app.services.news_ai_agent import NewsAIEditorAgent
from app.models.blog import Post
from app.core.config_manager import ConfigManager
from app.collectors.news_ingestion_mixin import NewsIngestionMixin
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class NewsCollector(BaseCollector, NewsIngestionMixin):
    """뉴스 수집기 - BaseCollector 상속"""
    
    def __init__(self, db: Session, config_manager=None, api_manager=None, redis_queue_manager=None):
        super().__init__(db, config_manager, api_manager, redis_queue_manager)
        self.cryptopanic = CryptoPanicClient()
        self.tiingo = TiingoClient()
        self.finnhub = FinnhubClient()
        self.polygon = PolygonClient()
        try:
            self.ai_agent = NewsAIEditorAgent()
        except Exception as e:
            logger.warning(f"AI Agent init failed (Translation will be disabled): {e}")
            self.ai_agent = None
    
    async def _collect_data(self) -> dict:
        """BaseCollector abstract method implementation"""
        total = 0
        total += await self._collect_cryptopanic()
        total += await self._collect_tiingo()
        total += await self._collect_finnhub()
        total += await self._collect_polygon()
        
        return {
            "total_added_records": total,
            "sources_processed": ["cryptopanic", "tiingo", "finnhub", "polygon"]
        }

    async def collect(self) -> int:
        """Public helper for backward compatibility or simple usage"""
        result = await self._collect_data()
        return result.get("total_added_records", 0)

    # _save_posts is removed as it's provided by NewsIngestionMixin (as _save_posts_with_ai)
    # We will update callsites to use self._save_posts_with_ai(...)

    # _get_top_tickers moved to NewsIngestionMixin

    async def _collect_cryptopanic(self) -> int:
        """CryptoPanic에서 뉴스 수집 (Top Crypto 위주)"""
        try:
            # 1. Get Top Cryptos
            top_assets = self._get_top_tickers(limit=50)
            target_currencies = top_assets.get("crypto", [])
            
            # 2. Join for API (comma separated)
            # Default to BTC,ETH if empty
            if not target_currencies:
                currencies_str = "BTC,ETH"
            else:
                currencies_str = ",".join(target_currencies[:10]) # URL length limit precaution, take top 10 crypto
            
            logger.info(f"Collecting CryptoPanic news for: {currencies_str}")
            
            # 3. Fetch
            raw_posts = await self.cryptopanic.get_posts(
                currencies=currencies_str, 
                filter="hot"
            )
            normalized_posts = []
            for p in raw_posts:
                norm = self.cryptopanic.normalize(p)
                # Map 'currencies' to 'tickers' so it's consistent for filtering
                if 'currencies' in norm and norm['currencies']:
                    norm['tickers'] = norm['currencies']
                normalized_posts.append(norm)
                
            return await self._save_posts_with_ai(normalized_posts, "cryptopanic")
        except Exception as e:
            logger.error(f"CryptoPanic collection failed: {e}")
            return 0

    async def _collect_tiingo(self) -> int:
        """Tiingo에서 뉴스 수집 (Top 50 Assets 위주)"""
        try:
            # 1. Get Top Assets (Stocks + Crypto)
            top_assets = self._get_top_tickers(limit=50)
            target_tickers = top_assets.get("all", [])
            
            # 2. Join for API
            if not target_tickers:
                tickers_str = None # Default to general
            else:
                # Tiingo can handle many, but let's stick to top 20 to be safe/relevant
                tickers_str = ",".join(target_tickers[:20])
                
            logger.info(f"Collecting Tiingo news for: {tickers_str if tickers_str else 'General'}")
            
            # 3. Fetch
            raw = await self.tiingo.get_news(limit=20, tickers=tickers_str)
            normalized = []
            for item in raw:
                pub_date = item.get("publishedDate")
                if pub_date:
                    try:
                        dt = datetime.fromisoformat(pub_date.replace('Z', '+00:00'))
                    except:
                        dt = datetime.now()
                else:
                    dt = datetime.now()

                normalized.append({
                    "external_id": str(item.get("id")),
                    "title": item.get("title"),
                    "description": item.get("description"),
                    "url": item.get("url"),
                    "published_at": dt,
                    "source": item.get("source", "Tiingo"),
                    "tickers": item.get("tickers", []),
                    "image_url": None
                })
            return await self._save_posts_with_ai(normalized, "tiingo")
        except Exception as e:
            logger.error(f"Tiingo collection failed: {e}")
            return 0

    async def _collect_finnhub(self) -> int:
        """Finnhub에서 뉴스 수집 (General Market)"""
        try:
            # Finnhub 'category=general' covers top market news well.
            # Specific ticker news requires separate calls per symbol, which hits rate limits.
            raw = await self.finnhub.get_news(category="general")
            normalized = []
            for item in raw:
                ts = item.get("datetime")
                dt = datetime.fromtimestamp(ts, tz=timezone.utc) if ts else datetime.now()

                normalized.append({
                    "external_id": str(item.get("id")),
                    "title": item.get("headline"),
                    "description": item.get("summary"),
                    "url": item.get("url"),
                    "published_at": dt,
                    "source": item.get("source", "Finnhub"),
                    "tickers": [item.get("related", "")] if item.get("related") else [], 
                    "image_url": item.get("image"),
                    "author": None
                })
            return await self._save_posts_with_ai(normalized, "finnhub")
        except Exception as e:
            logger.error(f"Finnhub collection failed: {e}")
            return 0

    async def _collect_polygon(self) -> int:
        """Polygon에서 뉴스 수집 (General Market)"""
        try:
            # Polygon market news usually highlights top movers/caps.
            raw = await self.polygon.get_news(limit=20)
            normalized = []
            for item in raw:
                dt_str = item.get("published_utc")
                try:
                     dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00')) if dt_str else datetime.now()
                except:
                    dt = datetime.now()

                normalized.append({
                    "external_id": str(item.get("id")),
                    "title": item.get("title"),
                    "description": item.get("description"),
                    "url": item.get("article_url"),
                    "published_at": dt,
                    "source": item.get("publisher", {}).get("name", "Polygon"),
                    "tickers": item.get("tickers", []),
                    "image_url": item.get("image_url"),
                    "author": item.get("author")
                })
            return await self._save_posts_with_ai(normalized, "polygon")
        except Exception as e:
            logger.error(f"Polygon collection failed: {e}")
            return 0
