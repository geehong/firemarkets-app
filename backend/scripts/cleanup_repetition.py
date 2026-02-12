import sys
import os
import re

# Add backend directory to sys.path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import SessionLocal
from app.models.blog import Post
from sqlalchemy import or_

def cleanup_repetition():
    db = SessionLocal()
    try:
        # Regex pattern for repetition (case insensitive)
        # Matches "FireMarkets FireMarkets" with optional spaces/punctuation in between
        pattern = re.compile(r'FireMarkets\s+FireMarkets', re.IGNORECASE)
        replacement = 'FireMarkets'

        print("🔍 Scanning for repetitive 'FireMarkets' phrases...")

        # Fetch posts that might contain the phrase
        # We check content, content_ko, description, title
        posts = db.query(Post).filter(
            or_(
                Post.content.ilike('%FireMarkets FireMarkets%'),
                Post.content_ko.ilike('%FireMarkets FireMarkets%'),
                Post.description.cast(String).ilike('%FireMarkets FireMarkets%'), # Cast JSON to string if needed, but description is JSON in model? 
                # Model definition says description is JSON. SQLAlchemy might need specific handling or just fetch all and process in python for simplicity if dataset is small.
                # Given the previous context, let's process in Python to be safe with JSON fields.
            )
        ).all()

        # Actually, let's just fetch ALL posts to be safe and iterate. 
        # If dataset is huge, this is bad, but for now provided the user's scale it's likely fine.
        # Better: Filter by ID to do batch processing if needed.
        # Let's stick to Python processing for JSON fields safety.
        
        all_posts = db.query(Post).all()
        count = 0

        for post in all_posts:
            modified = False
            
            # Helper to clean string
            def clean_text(text):
                if not text: return text
                return pattern.sub(replacement, text)

            # Clean content (Text)
            if post.content:
                new_content = clean_text(post.content)
                if new_content != post.content:
                    post.content = new_content
                    modified = True

            if post.content_ko:
                new_content_ko = clean_text(post.content_ko)
                if new_content_ko != post.content_ko:
                    post.content_ko = new_content_ko
                    modified = True

            # Clean JSON fields (Title, Description)
            # Title
            if post.title and isinstance(post.title, dict):
                new_title = post.title.copy()
                title_changed = False
                for lang in ['en', 'ko']:
                    if lang in new_title and new_title[lang]:
                        cleaned = clean_text(new_title[lang])
                        if cleaned != new_title[lang]:
                            new_title[lang] = cleaned
                            title_changed = True
                if title_changed:
                    post.title = new_title
                    modified = True

            # Description
            if post.description and isinstance(post.description, dict):
                new_desc = post.description.copy()
                desc_changed = False
                for lang in ['en', 'ko']:
                    if lang in new_desc and new_desc[lang]:
                        cleaned = clean_text(new_desc[lang])
                        if cleaned != new_desc[lang]:
                            new_desc[lang] = cleaned
                            desc_changed = True
                if desc_changed:
                    post.description = new_desc
                    modified = True

            if modified:
                print(f"✅ Fixed Post ID {post.id}")
                count += 1

        if count > 0:
            db.commit()
            print(f"🎉 Successfully cleaned {count} posts.")
        else:
            print("✨ No repetitive phrases found.")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    from sqlalchemy import String # Import here for the filter above if we used it, but we switched to hydration.
    cleanup_repetition()
