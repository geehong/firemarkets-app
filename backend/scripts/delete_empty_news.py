
import sys
import os
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

def delete_empty_raw_news():
    db = SessionLocal()
    try:
        print("Scanning for 'raw_news' records with ONLY title (empty content and description)...")
        
        # Fetch generic candidates (empty content)
        # Note: We filter mostly in Python for JSON description complexity
        query = db.query(Post).filter(
            Post.post_type == 'raw_news',
            or_(Post.content == None, Post.content == '')
        )
        
        candidates = query.all()
        
        to_delete_ids = []
        
        for p in candidates:
            # Check description emptiness
            desc = p.description
            is_desc_empty = False
            
            if desc is None:
                is_desc_empty = True
            elif isinstance(desc, dict):
                # Check if dictionary is empty OR all values are empty strings
                # e.g. {} or {"en": ""} or {"en": None}
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
                # Other types (list?), assume empty if falsy
                if not desc:
                    is_desc_empty = True

            if is_desc_empty:
                to_delete_ids.append(p.id)
        
        count = len(to_delete_ids)
        print(f"Found {count} records matches criteria.")
        
        if count > 0:
            # Bulk delete
            # Process in chunks to avoid huge SQL statements if many
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
            print("No records found to delete.")

    except Exception as e:
        print(f"Error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    delete_empty_raw_news()
