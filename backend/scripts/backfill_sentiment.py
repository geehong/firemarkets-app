
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
        target_types = ['news', 'post', 'raw_news', 'ai_draft_news', 'brief_news']
        posts = db.query(Post).filter(Post.post_type.in_(target_types)).all()
        
        target_posts = []
        for p in posts:
            if not p.post_info:
                # Initialize empty dict if None so we can add sentiment
                p.post_info = {}
                target_posts.append(p)
                continue
                
            if not p.post_info.get('sentiment'):
                target_posts.append(p)

        logger.info(f"Found {len(target_posts)} posts to process.")
        
        count = 0
        for p in target_posts:
            title = p.title.get('en') if isinstance(p.title, dict) else str(p.title)
            desc = p.description.get('en') if isinstance(p.description, dict) else str(p.description)
            
            text = f"{title} {desc}".strip()
            if not text:
                continue
                
            sentiment = sentiment_analyzer.analyze(text)
            
            # Update post_info
            # IMPORTANT: modifying JSON field in place requires reassignment or flag_modified in some ORMs
            # In SQLAlchemy, reassignment is safest:
            new_info = dict(p.post_info)
            new_info['sentiment'] = sentiment
            p.post_info = new_info
            
            count += 1
            if count % 10 == 0:
                logger.info(f"Processed {count} posts...")
                db.commit() # Commit periodically
                
        db.commit()
        logger.info(f"Successfully backfilled {count} posts.")
        
    except Exception as e:
        logger.error(f"Backfill failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    backfill_sentiment()
