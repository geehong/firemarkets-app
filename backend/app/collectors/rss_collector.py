from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.collectors.base_collector import BaseCollector
from app.collectors.news_ingestion_mixin import NewsIngestionMixin
from app.external_apis.implementations.rss_client import RSSClient
from app.services.news_ai_agent import NewsAIEditorAgent
import logging

logger = logging.getLogger(__name__)

class RSSCollector(BaseCollector, NewsIngestionMixin):
    """RSS 피드 수집기"""
    
    def __init__(self, db: Session, config_manager=None, api_manager=None, redis_queue_manager=None):
        super().__init__(db, config_manager, api_manager, redis_queue_manager)
        self.rss_client = RSSClient()
        try:
            self.ai_agent = NewsAIEditorAgent()
        except Exception as e:
            logger.warning(f"AI Agent init failed (Translation will be disabled): {e}")
            self.ai_agent = None

    async def _collect_data(self) -> dict:
        """Collects data from all configured RSS feeds with Top Logic."""
        import re
        
        # 1. Get Top Tickers (Limit 50 to cover variations)
        top_data = self._get_top_tickers(limit=50)
        target_tickers = set(top_data.get("all", [])) # Set for O(1) if exact match needed, but we loop for regex
        
        # Sort by length desc to match longer tickers first (though boundaries handle this)
        sorted_tickers = sorted(list(target_tickers), key=len, reverse=True)
        
        total_added = 0
        all_results = self.rss_client.fetch_all_feeds()
        
        sources_processed = []
        
        for feed_key, normalized_items in all_results.items():
            if not normalized_items:
                continue
                
            source_name = self.rss_client.FEEDS[feed_key]["source_name"]
            
            # Enforce tagging with Top Tickers
            for item in normalized_items:
                # Do NOT uppercase text content to avoid matching common words like "cost" with "COST"
                text_content = item.get("title", "") + " " + item.get("description", "")
                
                found_tickers = []
                for t in sorted_tickers:
                    # Basic word boundary check. Case sensitive for Tickers (e.g. COST vs cost)
                    if re.search(r'\b' + re.escape(t) + r'\b', text_content):
                        found_tickers.append(t)
                
                # Combine with existing (if any)
                current_tickers = item.get("tickers", [])
                # dedupe
                item["tickers"] = list(set(current_tickers + found_tickers))
            
            # Use the mixin's save logic (handles dedupe and AI)
            count = await self._save_posts_with_ai(normalized_items, source_name)
            
            total_added += count
            if count > 0:
                sources_processed.append(f"{source_name}({count})")
        
        return {
            "total_added_records": total_added,
            "sources_processed": sources_processed
        }
