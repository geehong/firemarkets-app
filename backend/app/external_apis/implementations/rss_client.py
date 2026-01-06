import feedparser
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import hashlib
import time

logger = logging.getLogger(__name__)

class RSSClient:
    """RSS 피드 수집 클라이언트"""
    
    FEEDS = {
        "coindesk": {
            "url": "https://www.coindesk.com/arc/outboundfeeds/rss/",
            "category": "crypto",
            "source_name": "CoinDesk"
        },
        "cointelegraph": {
            "url": "https://cointelegraph.com/rss",
            "category": "crypto",
            "source_name": "Cointelegraph"
        },
        "bitcoin_magazine": {
            "url": "https://bitcoinmagazine.com/feed",
            "category": "crypto",
            "source_name": "Bitcoin Magazine"
        },
        "decrypt": {
            "url": "https://decrypt.co/feed",
            "category": "crypto",
            "source_name": "Decrypt"
        },
        "yahoo_finance": {
            "url": "https://finance.yahoo.com/news/rssindex",
            "category": "stocks",
            "source_name": "Yahoo Finance"
        },
        "marketwatch": {
            "url": "https://feeds.marketwatch.com/marketwatch/topstories/",
            "category": "stocks",
            "source_name": "MarketWatch"
        },
        "cnbc": {
            "url": "https://www.cnbc.com/id/100003114/device/rss/rss.html",
            "category": "stocks",
            "source_name": "CNBC"
        },
        "investing_com": {
            "url": "https://www.investing.com/rss/news.rss",
            "category": "stocks",
            "source_name": "Investing.com"
        },
        "wsj_markets": {
            "url": "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",
            "category": "stocks",
            "source_name": "WSJ Markets"
        },
        "hankyung": {
            "url": "https://www.hankyung.com/feed/economy",
            "category": "korea",
            "source_name": "한경"
        },
        "mk_stock": {
            "url": "https://www.mk.co.kr/rss/30100041/",
            "category": "korea",
            "source_name": "매경"
        }
    }

    def fetch_all_feeds(self) -> Dict[str, List[dict]]:
        """Fetch all configured feeds and normalize them."""
        results = {}
        for key, config in self.FEEDS.items():
            results[key] = self.fetch_feed(key)
        return results

    def fetch_feed(self, feed_key: str) -> List[dict]:
        """Fetch and normalize a single feed."""
        if feed_key not in self.FEEDS:
            logger.warning(f"Unknown feed key: {feed_key}")
            return []
            
        config = self.FEEDS[feed_key]
        url = config["url"]
        source_name = config["source_name"]
        
        logger.info(f"Fetching RSS feed: {source_name} ({url})")
        
        try:
            feed = feedparser.parse(url)
            if feed.bozo:
                logger.warning(f"Result for {source_name} might be malformed: {feed.bozo_exception}")

            normalized_items = []
            for entry in feed.entries:
                normalized = self._normalize_entry(entry, feed_key, source_name)
                if normalized:
                    normalized_items.append(normalized)
            
            logger.info(f"Fetched {len(normalized_items)} items from {source_name}")
            return normalized_items
            
        except Exception as e:
            logger.error(f"Failed to fetch RSS feed {source_name}: {e}")
            return []

    def _normalize_entry(self, entry: Any, feed_key: str, source_name: str) -> Optional[dict]:
        """Normalize feedparser entry to common dict format."""
        try:
            # 1. ID / Link
            link = getattr(entry, "link", "")
            guid = getattr(entry, "id", link)
            
            if not guid:
                # If no ID, hash the link or title
                base = link or getattr(entry, "title", str(time.time()))
                guid = hashlib.md5(base.encode()).hexdigest()

            # 2. Title / Desc
            title = getattr(entry, "title", "No Title")
            description = getattr(entry, "summary", "") or getattr(entry, "description", "")
            
            # Clean HTML from description if needed (simple check)
            # For now, we assume simple text or basic HTML is fine for raw_news
            
            # 3. Date
            published_parsed = getattr(entry, "published_parsed", None)
            updated_parsed = getattr(entry, "updated_parsed", None)
            
            dt = datetime.now()
            if published_parsed:
                dt = datetime(*published_parsed[:6])
            elif updated_parsed:
                dt = datetime(*updated_parsed[:6])

            # 4. Image?
            image_url = None
            # Try to find media_content or enclosures
            if hasattr(entry, "media_content"):
                # media_content is usually a list of dicts
                # e.g. [{'url': '...', 'medium': 'image'}]
                 for media in entry.media_content:
                     if media.get('medium') == 'image' or 'image' in media.get('type', ''):
                         image_url = media.get('url')
                         break
            
            if not image_url and hasattr(entry, "enclosures"):
                 for enclosure in entry.enclosures:
                     if 'image' in enclosure.get('type', ''):
                         image_url = enclosure.get('href')
                         break

            # 5. Author
            author = getattr(entry, "author", None)

            # 6. Slug generation (to ensure uniqueness)
            # slug = f"rss-{feed_key}-{hash(guid)}" -> but simple hash might be better
            # Use md5 of guid to be safe for URL
            guid_hash = hashlib.md5(str(guid).encode()).hexdigest()[:12]
            slug = f"rss-{feed_key}-{guid_hash}"

            return {
                "external_id": guid,
                "slug": slug,
                "title": title,
                "description": description,
                "url": link,
                "published_at": dt,
                "source": source_name, # Display name
                "tickers": [], # RSS usually doesn't give tickers easily
                "image_url": image_url,
                "author": author,
                "raw_feed_key": feed_key 
            }
        except Exception as e:
            logger.warning(f"Error normalizing entry from {source_name}: {e}")
            return None
