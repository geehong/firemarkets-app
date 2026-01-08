
import sys
import os
import re
from sqlalchemy import or_

# Add backend directory to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)
project_root = os.path.dirname(backend_dir)  # Go up to firemarkets-app

from dotenv import load_dotenv
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

from app.core.database import SessionLocal
from app.models.blog import Post

def is_mostly_english(text):
    """
    Heuristic to check if text in a Korean field is actually mostly English.
    Returns True if the proportion of Korean characters is too low.
    """
    if not text:
        return False
        
    # Strip HTML tags
    clean_text = re.sub('<[^<]+?>', '', text)
    clean_text = clean_text.strip()
    
    if not clean_text:
        return False
        
    # Count Korean characters (Syllables)
    ko_chars = len(re.findall('[가-힣]', clean_text))
    # Count English alphabet characters
    en_chars = len(re.findall('[a-zA-Z]', clean_text))
    
    # Heuristic: If English characters are dominant (e.g. > 100) and Korean characters 
    # make up less than 20% of the total alpha count, it's likely a failed translation.
    total_alpha = ko_chars + en_chars
    if total_alpha > 50:
        ratio = ko_chars / total_alpha
        if ratio < 0.25: # Less than 25% Korean
            return True
            
    return False

def delete_bad_news():
    db = SessionLocal()
    try:
        print("Scanning for 'raw_news' and 'brief_news' with empty content or broken translations...")
        
        # 1. Fetch candidates (raw_news and brief_news)
        posts = db.query(Post).filter(
            Post.post_type.in_(['raw_news', 'brief_news'])
        ).all()
        
        to_delete_ids = []
        
        for p in posts:
            # Check 1: Empty Content/Description (Original logic)
            content_empty = not p.content or not p.content.strip()
            
            # Check description emptiness
            desc = p.description
            is_desc_empty = False
            
            if desc is None:
                is_desc_empty = True
            elif isinstance(desc, dict):
                has_text = False
                for val in desc.values():
                    if val and str(val).strip():
                        has_text = True
                        break
                if not has_text:
                    is_desc_empty = True
            elif isinstance(desc, str):
                 if not desc.strip():
                     is_desc_empty = True
            else:
                if not desc:
                    is_desc_empty = True

            # If both are empty, mark for deletion
            if content_empty and is_desc_empty:
                to_delete_ids.append(p.id)
                continue

            # Check 2: Mixed English/Korean content in content_ko (New logic)
            # This is specifically for failed AI translations where content_ko is mostly English.
            if hasattr(p, 'content_ko') and p.content_ko:
                if is_mostly_english(p.content_ko):
                    print(f"Post {p.id} ({p.post_type}): Korean content is mostly English. Marking for deletion.")
                    to_delete_ids.append(p.id)
                    continue

        count = len(to_delete_ids)
        print(f"Found {count} records matching deletion criteria.")
        
        if count > 0:
            # Bulk delete
            chunk_size = 1000
            deleted_total = 0
            
            for i in range(0, count, chunk_size):
                chunk = to_delete_ids[i:i+chunk_size]
                db.query(Post).filter(Post.id.in_(chunk)).delete(synchronize_session=False)
                deleted_total += len(chunk)
                print(f"Deleted chunk {i//chunk_size + 1}...")
            
            db.commit()
            print(f"Successfully deleted {deleted_total} records.")
        else:
            print("No bad records found to delete.")

    except Exception as e:
        print(f"Error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    delete_bad_news()
