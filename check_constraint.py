
import os
import sys
from sqlalchemy import create_engine, text

# Add backend to path
sys.path.append('/app')
from app.core.database import SessionLocal

db = SessionLocal()
try:
    result = db.execute(text("SELECT check_clause FROM information_schema.check_constraints WHERE constraint_name = 'chk_status'"))
    row = result.fetchone()
    if row:
        print(f"Constraint Definition: {row[0]}")
    else:
        print("Constraint chk_status not found.")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
