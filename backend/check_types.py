from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    # Check distinct asset_type from view
    result = db.execute(text("SELECT DISTINCT asset_type FROM treemap_live_view"))
    types = [row[0] for row in result.fetchall()]
    print("Distinct asset_types in view:", types)
    
    # Check asset_types table
    result2 = db.execute(text("SELECT * FROM asset_types"))
    types2 = [dict(row._mapping) for row in result2.fetchall()]
    print("Asset Types Table:", types2)
finally:
    db.close()
