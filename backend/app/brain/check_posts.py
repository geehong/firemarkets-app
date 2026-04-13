
from app.core.database import SessionLocal
from app.models.blog import Post
from sqlalchemy import func

db = SessionLocal()
try:
    # Count by post_type and status
    counts = db.query(Post.post_type, Post.status, func.count(Post.id)).group_by(Post.post_type, Post.status).all()
    print("Post counts by type and status:")
    for pt, st, count in counts:
        print(f"  {pt} | {st}: {count}")

    # Latest 10 posts
    latest = db.query(Post).order_by(Post.created_at.desc()).limit(10).all()
    print("\nLatest 10 posts:")
    for p in latest:
        print(f"  ID: {p.id} | Type: {p.post_type} | Status: {p.status} | Title: {p.title.get('ko') if isinstance(p.title, dict) else p.title} | Created: {p.created_at}")

finally:
    db.close()
