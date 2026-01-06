
import logging
from datetime import datetime, timedelta
import pytz
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.blog import Post
from app.core.database import POSTGRES_DATABASE_URL

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def cleanup_raw_news():
    engine = create_engine(POSTGRES_DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Calculate cutoff time: Yesterday (KST) end / Today (KST) start
        # Current KST Time
        kst = pytz.timezone('Asia/Seoul')
        now_kst = datetime.now(kst)
        
        # Today KST 00:00:00 (Start of today)
        today_start_kst = now_kst.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Convert to UTC for DB comparison (DB stores naive UTC normally, or tz-aware?)
        # Base class defines created_at as TIMESTAMP (usually naive UTC in many setups, but let's check)
        # If DB stores naive UTC, we must convert KST time to UTC and strip tzinfo if needed.
        
        today_start_utc = today_start_kst.astimezone(pytz.UTC)
        # Ensure it's naive if DB expects naive, or aware if aware. 
        # SQLAlchemy and PG usually handle aware objects if configured, but safe bet is usually aware UTC.
        
        logger.info(f"Current KST: {now_kst}")
        logger.info(f"Cleanup Cutoff (KST): {today_start_kst} (Deleting entries before this)")
        logger.info(f"Cleanup Cutoff (UTC): {today_start_utc}")

        # Query posts to delete
        # post_type = 'raw_news'
        # status = 'draft'
        # created_at < cutoff
        
        query = db.query(Post).filter(
            Post.post_type == 'raw_news',
            Post.status == 'draft',
            Post.created_at < today_start_utc
        )
        
        count = query.count()
        
        if count > 0:
            logger.info(f"Found {count} stale raw_news drafts. Deleting...")
            # Use delete execution
            deleted_rows = query.delete(synchronize_session=False)
            db.commit()
            logger.info(f"Successfully deleted {deleted_rows} posts.")
        else:
            logger.info("No stale raw_news drafts found to delete.")

    except Exception as e:
        logger.error(f"Error during cleanup: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_raw_news()
