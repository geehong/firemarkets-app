
import sys
import os
import asyncio
import logging

# Add backend directory to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from app.core.database import SessionLocal
from app.models.blog import Post
from app.analysis.speculative import sentiment_analyzer

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def backfill_sentiment():
    db = SessionLocal()

    try:
        # 1. Fetch posts without sentiment
        # JSONB query: post_info -> 'sentiment' IS NULL
        logger.info("Fetching posts needing sentiment analysis...")
        
        # Using python-side filtering for simplicity and compatibility
        target_types = ['brief_news', 'ai_draft_news', 'news']
        posts = db.query(Post).filter(Post.post_type.in_(target_types)).all()
        
        target_posts = []
        for p in posts:
            if not p.post_info:
                p.post_info = {}
            
            # Check if sentiment is missing or empty
            info = p.post_info
            if not info.get('sentiment') or not info['sentiment'].get('label'):
                target_posts.append(p)

        logger.info(f"Found {len(target_posts)} posts ensuring they have sentiment (Target types: {target_types}).")
        
        count = 0
        total = len(target_posts)
        
        for p in target_posts:
            # Prepare text for analysis
            # Prioritize content > description > title
            text_to_analyze = ""
            
            if p.content and len(str(p.content)) > 10:
                text_to_analyze = p.content
            else:
                 # Fallback to description
                 desc = p.description
                 if isinstance(desc, dict):
                     text_to_analyze = desc.get('en') or desc.get('ko') or ""
                 else:
                     text_to_analyze = str(desc) if desc else ""
                     
                 # Fallback to title if description is empty
                 if not text_to_analyze:
                     if isinstance(p.title, dict):
                         text_to_analyze = p.title.get('en') or p.title.get('ko') or ""
                     else:
                         text_to_analyze = str(p.title)

            # Strip HTML
            import re
            clean_text = re.sub('<[^<]+?>', '', str(text_to_analyze)).strip()
            
            if not clean_text or len(clean_text) < 5:
                logger.warning(f"Skipping post {p.id} due to empty content.")
                continue
                
            sentiment = sentiment_analyzer.analyze(clean_text)
            
            # Update post_info
            new_info = dict(p.post_info) if p.post_info else {}
            new_info['sentiment'] = sentiment
            p.post_info = new_info
            
            count += 1
            if count % 10 == 0:
                logger.info(f"Processed {count}/{total} posts...")
                db.commit()
                
        db.commit()
        logger.info(f"Successfully backfilled {count} posts.")
        
    except Exception as e:
        logger.error(f"Backfill failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    backfill_sentiment()
