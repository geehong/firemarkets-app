
from sqlalchemy import text
from app.core.database import SessionLocal

def check_counts():
    db = SessionLocal()
    try:
        # Check raw_news count
        raw_count = db.execute(text("SELECT count(*) FROM posts WHERE post_type = 'raw_news'")).scalar()
        ai_count = db.execute(text("SELECT count(*) FROM posts WHERE post_type = 'ai_draft_news'")).scalar()
        ranking_count = db.execute(text("SELECT count(*) FROM world_assets_ranking")).scalar()
        latest_ranking_date = db.execute(text("SELECT MAX(ranking_date) FROM world_assets_ranking")).scalar()
        
        print(f"Total raw_news: {raw_count}")
        print(f"Total ai_draft_news: {ai_count}")
        print(f"Total ranking records: {ranking_count}")
        print(f"Latest ranking date: {latest_ranking_date}")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_counts()
