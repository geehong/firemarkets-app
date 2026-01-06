
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.blog import Post
from app.core.database import POSTGRES_DATABASE_URL

def check_news():
    engine = create_engine(POSTGRES_DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        posts = db.query(Post.id, Post.title, Post.post_type, Post.status, Post.published_at)\
            .filter(Post.status == 'published')\
            .order_by(Post.published_at.desc())\
            .limit(10).all()
            
        print(f"Found {len(posts)} recent published posts:")
        for p in posts:
            print(f"ID: {p.id}, Type: {p.post_type}, Title: {p.title}, Published: {p.published_at}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_news()
