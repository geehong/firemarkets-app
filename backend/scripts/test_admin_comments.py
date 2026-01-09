import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))


from app.crud.blog import post_comment
from app.schemas.blog import PostCommentListResponse, PostCommentResponse
from app.models.blog import PostComment
from app.core.database import SessionLocal

def test_admin_comments():
    try:
        db = SessionLocal()
        print("Database session created.")
        
        # Test get_multi_with_filters
        print("Calling get_multi_with_filters...")
        comments, total = post_comment.get_multi_with_filters(db, skip=0, limit=20)
        print(f"Got {len(comments)} comments, total {total}")
        
        # Test serialization
        print("Testing serialization...")
        # Manually convert to schema to check for Pydantic errors
        comment_schemas = []
        for c in comments:
            try:
                # This mimics what FastAPI does
                schema = PostCommentResponse.model_validate(c)
                comment_schemas.append(schema)
            except Exception as e:
                print(f"Failed to serialize comment {c.id}: {e}")
                # Print details of the comment to see what's wrong
                print(f"Comment vars: {vars(c)}")
                raise e
                
        response = PostCommentListResponse(
            comments=comment_schemas,
            total=total,
            page=1,
            page_size=20,
            total_pages=(total + 20 - 1) // 20
        )
        print("Serialization successful.")
        
    except Exception as e:
        print(f"Error occurred: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_admin_comments()
