
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import POSTGRES_DATABASE_URL
from app.models.blog import Post

# Setup database connection
engine = create_engine(POSTGRES_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def remove_english_promo():
    db = SessionLocal()
    try:
        target_phrase = "You can check the real-time on-chain signals and technical charts for Bitcoin and Ethereum on the FireMarkets Dashboard."
        
        # Search for posts containing the phrase in content_ko
        posts = db.query(Post).filter(Post.content_ko.like(f"%{target_phrase}%")).all()
        
        print(f"Found {len(posts)} posts containing the target phrase.")
        
        count = 0
        for post in posts:
            if post.content_ko:
                updated_content = post.content_ko.replace(target_phrase, "")
                # remove any double spaces created
                updated_content = updated_content.replace("  ", " ") 
                post.content_ko = updated_content
                count += 1
        
        db.commit()
        print(f"Successfully cleaned up {count} posts.")
        
    except Exception as e:
        print(f"Error during cleanup: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Add backend directory to path to import app modules
    # ../backend/scripts/cleanup.py -> ../backend
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    remove_english_promo()
