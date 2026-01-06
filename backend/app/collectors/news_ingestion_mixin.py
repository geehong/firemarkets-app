from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
import logging
import asyncio
from datetime import datetime

from app.models.blog import Post
from app.services.news_ai_agent import NewsAIEditorAgent

logger = logging.getLogger(__name__)

class NewsIngestionMixin:
    """
    Mixin to provide common news ingestion, AI processing, and storage logic.
    Requires the host class to have:
    - self.db: sqlalchemy.orm.Session
    - self.ai_agent: Optional[NewsAIEditorAgent]
    """

    async def _save_posts_with_ai(self, normalized_posts: List[dict], source_name: str, ai_agent: Optional[NewsAIEditorAgent] = None) -> int:
        """
        Common logic to:
        1. Deduplicate by slug
        2. Process with AI (optional/limited)
        3. Save to DB
        """
        saved = 0
        posts_to_process = []
        
        # We need access to db. If mixed into BaseCollector, it's self.db
        db = getattr(self, 'db', None)
        if not db:
            logger.error(f"[{source_name}] DB session not found in collector instance.")
            return 0

        # Use the passed ai_agent or try to find it on self
        agent = ai_agent or getattr(self, 'ai_agent', None)

        # 1. Filter duplicates and prepare
        for normalized in normalized_posts:
            # Slug generation: Ensure it's unique enough. 
            # normalized['slug'] might already be set by caller, else generate default
            if 'slug' not in normalized or not normalized['slug']:
                normalized['slug'] = f"{source_name.lower()}-{normalized['external_id']}"
            
            slug = normalized['slug']
            
            # Check existence
            try:
                existing = db.query(Post).filter(Post.slug == slug).first()
                if existing:
                    continue
            except Exception as e:
                logger.warning(f"Error checking duplicate for {slug}: {e}")
                continue
            
            posts_to_process.append(normalized)
            
        if not posts_to_process:
            return 0

        # 2. Batch Processing with AI (Enrichment & Translation)
        if agent:
            # Rate limiting settings for Gemini Free Tier (15 requests/min)
            MAX_ITEMS_PER_RUN = 15
            CHUNK_SIZE = 3
            DELAY_BETWEEN_CHUNKS = 5
            
            items_for_ai = posts_to_process[:MAX_ITEMS_PER_RUN]
            items_without_ai = posts_to_process[MAX_ITEMS_PER_RUN:]
            
            # Fill defaults for non-AI items
            for p in items_without_ai:
                self._fill_fallback_content(p)
            
            if items_without_ai:
                logger.info(f"[{source_name}] Rate limit: {len(items_without_ai)} items skipped AI processing (max {MAX_ITEMS_PER_RUN}/run)")
            
            # Process chunks
            chunks = [items_for_ai[i:i + CHUNK_SIZE] for i in range(0, len(items_for_ai), CHUNK_SIZE)]
            total_chunks = len(chunks)
            
            for chunk_idx, chunk in enumerate(chunks):
                trans_input = []
                for p in chunk:
                    trans_input.append({
                        "id": p['external_id'],
                        "title": p.get('title', ''),
                        "description": p.get('description', '')
                    })
                
                try:
                    enriched_items = await agent.translate_batch(trans_input)
                    t_map = {str(t['id']): t for t in enriched_items}
                    
                    for p in chunk:
                        tid = str(p['external_id'])
                        if tid in t_map:
                            item_data = t_map[tid]
                            p['title_en'] = item_data.get('title_en', p.get('title', ''))
                            p['title_ko'] = item_data.get('title_ko', p.get('title', ''))
                            p['desc_en'] = item_data.get('description_en', p.get('description', ''))
                            p['desc_ko'] = item_data.get('description_ko', '')
                            p['content_en'] = item_data.get('content_en', '')
                            p['content_ko'] = item_data.get('content_ko', '')
                        else:
                            self._fill_fallback_content(p)
                            
                except Exception as e:
                    logger.error(f"[{source_name}] Enrichment batch failed: {e}")
                    for p in chunk:
                        self._fill_fallback_content(p)
                
                # Rate limiting delay
                if chunk_idx < total_chunks - 1:
                    logger.debug(f"[{source_name}] Rate limit: waiting {DELAY_BETWEEN_CHUNKS}s...")
                    await asyncio.sleep(DELAY_BETWEEN_CHUNKS)

        else:
            # No AI
            for p in posts_to_process:
                self._fill_fallback_content(p)

        # 3. Save to DB
        saved_count = 0
        try:
            for p in posts_to_process:
                title_dict = {"en": p.get("title_en", p.get("title")), "ko": p.get("title_ko", p.get("title"))}
                desc_dict = {"en": p.get("desc_en", ""), "ko": p.get("desc_ko", "")}
                
                content_en = p.get("content_en", "") or p.get("desc_en", "") or p.get("description", "")
                content_ko = p.get("content_ko", "") or p.get("desc_ko", "")
                
                # Ensure published_at is timezone-aware or valid
                pub_at = p.get("published_at") or datetime.utcnow()

                post = Post(
                    slug=p['slug'],
                    title=title_dict,
                    description=desc_dict,
                    content=content_en, 
                    content_ko=content_ko,
                    post_type="raw_news",
                    status="draft", 
                    post_info={
                        "source": p.get("source", source_name),
                        "external_id": p.get("external_id", ""),
                        "url": p.get("url", ""),
                        "tickers": p.get("tickers", []),
                        "image_url": p.get("image_url"),
                        "author": p.get("author")
                    },
                    published_at=pub_at
                )
                db.add(post)
                saved_count += 1
            
            if saved_count > 0:
                db.commit()
                logger.info(f"[{source_name}] {saved_count} new articles saved")
            else:
                pass # Nothing new

        except Exception as e:
            logger.error(f"[{source_name}] Save failed: {e}")
            db.rollback()
            return 0
            
        return saved_count

    def _fill_fallback_content(self, p: dict):
        """Helper to fill AI fields with fallback values"""
        p['title_en'] = p.get('title', '')
        p['title_ko'] = p.get('title', '')
        p['desc_en'] = p.get('description', '')
        p['desc_ko'] = p.get('description', '') 
        p['content_en'] = p.get('description', '')
        p['content_ko'] = p.get('description', '')

    def _get_top_tickers(self, limit: int = 50) -> Dict[str, List[str]]:
        """Get top tickers from world_assets_ranking (Shared Logic)"""
        try:
            # Check if self.db exists
            db = getattr(self, 'db', None)
            if not db:
                logger.error("DB session not found for getting top tickers")
                return {"all": [], "crypto": [], "stock": []}

            from sqlalchemy import text
            query = text("""
                SELECT ticker, asset_type_id 
                FROM world_assets_ranking 
                WHERE ranking_date = (SELECT MAX(ranking_date) FROM world_assets_ranking) 
                ORDER BY market_cap_usd DESC 
                LIMIT :limit
            """)
            result = db.execute(query, {"limit": limit})
            
            all_tickers = []
            cryptos = []
            stocks = []
            
            commodities = {'GOLD', 'SILVER', 'PLAT', 'PALLAD', 'COPPER'}
            
            for row in result:
                ticker = row[0]
                atype = row[1]
                
                if ticker:
                    all_tickers.append(ticker)
                    if atype is None:
                        # Likely Crypto or Commodity
                        if ticker.upper() not in commodities and '.' not in ticker:
                            cryptos.append(ticker)
                    else:
                        # Stock or ETF
                        stocks.append(ticker)
                        
            return {
                "all": all_tickers,
                "crypto": cryptos,
                "stock": stocks
            }
        except Exception as e:
            logger.error(f"Failed to get top tickers: {e}")
            return {"all": [], "crypto": [], "stock": []}
