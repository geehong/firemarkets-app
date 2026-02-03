
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.core.database import SessionLocal
from app.models.asset import AssetType

db = SessionLocal()
types = db.query(AssetType).all()
for t in types:
    print(f"{t.asset_type_id}: {t.type_name}")
db.close()
