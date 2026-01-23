from app.core.database import SessionLocal
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def debug():
    db = SessionLocal()
    try:
        print("--- Debugging Treemap View ---")
        
        # 1. Check if view exists and has data
        count = db.execute(text("SELECT count(*) FROM treemap_live_view")).scalar()
        print(f"Total rows in view: {count}")
        
        # 2. Check distinct asset_type
        print("--- Distinct Asset Types ---")
        rows = db.execute(text("SELECT DISTINCT asset_type FROM treemap_live_view")).fetchall()
        types = [r[0] for r in rows]
        print(types)
        
        # 3. Test Exact Match
        print("--- Testing Exact Match 'Crypto' ---")
        cnt_exact = db.execute(text("SELECT count(*) FROM treemap_live_view WHERE asset_type = 'Crypto'")).scalar()
        print(f"Count for = 'Crypto': {cnt_exact}")
        
        # 4. Test ILIKE
        print("--- Testing ILIKE 'crypto' ---")
        cnt_ilike = db.execute(text("SELECT count(*) FROM treemap_live_view WHERE asset_type ILIKE 'crypto'")).scalar()
        print(f"Count for ILIKE 'crypto': {cnt_ilike}")
        
        # 5. Test Parameter Binding
        print("--- Testing Parameter Binding ---")
        query = text("SELECT count(*) FROM treemap_live_view WHERE asset_type ILIKE :type_name")
        cnt_bind = db.execute(query, {"type_name": "crypto"}).scalar()
        print(f"Count for bound param 'crypto': {cnt_bind}")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug()
