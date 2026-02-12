import sys
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add backend to path BEFORE importing app modules
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.blog import Post
from app.core.config import settings

def check_posts():
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Search for the string
        # English version (with HTML or plain text)
        search_terms = [
            "%FireMarkets Dashboard%",
            "%FireMarkets 대시보드%",
            "%You can check the real-time%",
            "%FireMarkets Dashboard</a>.%",
        ]
        
        from sqlalchemy import or_
        filter_expr = or_(*[Post.content.ilike(term) for term in search_terms])
        
        posts = session.query(Post).filter(filter_expr).all()
        
        logger.info(f"Found {len(posts)} posts matching restricted terms.")
        
        for post in posts[:5]:
            logger.info(f"Post ID: {post.post_id}, Title: {post.title}")
            content = post.content
            # Locate snippet
            for term in ["FireMarkets Dashboard", "FireMarkets 대시보드", "check the real-time"]:
                idx = content.find(term)
                if idx != -1:
                    start = max(0, idx - 100)
                    end = min(len(content), idx + 200)
                    logger.info(f"Snippet found ({term}): ...{content[start:end]}...")
                    break
            logger.info("-" * 50)
            
    except Exception as e:
        logger.error(f"Error checking posts: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    check_posts()
