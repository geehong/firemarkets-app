
import logging
from datetime import datetime, timedelta
import pytz
from sqlalchemy.orm import Session
from app.models.blog import Post

logger = logging.getLogger(__name__)

class CleanupService:
    @staticmethod
    def cleanup_old_raw_news(db: Session) -> int:
        """
        Delete old raw news entries.
        Includes both 'draft' and 'archived' status items from before today (KST).
        """
        try:
            kst = pytz.timezone('Asia/Seoul')
            now_kst = datetime.now(kst)
            today_start_kst = now_kst.replace(hour=0, minute=0, second=0, microsecond=0)
            today_start_utc = today_start_kst.astimezone(pytz.UTC)

            logger.info(f"[CleanupService] Deleting raw_news (draft/archived) before {today_start_kst} (KST) / {today_start_utc} (UTC)")

            query = db.query(Post).filter(
                Post.post_type == 'raw_news',
                Post.status.in_(['draft', 'archived']),
                Post.created_at < today_start_utc
            )
            
            deleted_count = query.delete(synchronize_session=False)
            db.commit()
            
            logger.info(f"[CleanupService] Deleted {deleted_count} stale raw_news items.")
            return deleted_count
        except Exception as e:
            logger.error(f"[CleanupService] Error cleaning raw news: {e}", exc_info=True)
            db.rollback()
            return 0

    @staticmethod
    def cleanup_old_ai_news(db: Session, retention_days: int = 2) -> int:
        """
        Delete old AI draft news entries.
        """
        try:
            kst = pytz.timezone('Asia/Seoul')
            now_kst = datetime.now(kst)
            cutoff_kst = now_kst.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=retention_days)
            cutoff_utc = cutoff_kst.astimezone(pytz.UTC)

            logger.info(f"[CleanupService] Deleting ai_draft_news drafts before {cutoff_kst} (KST) / {cutoff_utc} (UTC)")

            query = db.query(Post).filter(
                Post.post_type == 'ai_draft_news',
                Post.status == 'draft',
                Post.created_at < cutoff_utc
            )

            deleted_count = query.delete(synchronize_session=False)
            db.commit()
            
            logger.info(f"[CleanupService] Deleted {deleted_count} stale ai_draft_news drafts.")
            return deleted_count
        except Exception as e:
            logger.error(f"[CleanupService] Error cleaning ai news: {e}", exc_info=True)
            db.rollback()
            return 0
