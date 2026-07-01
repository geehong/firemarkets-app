import sys
sys.path.append('/home/geehong/firemarkets-app/backend')

from app.core.database import SessionLocal
from app.models.asset import Asset

db = SessionLocal()

assets = db.query(Asset).order_by(Asset.asset_id.desc()).limit(5).all()
for a in assets:
    print(f"{a.asset_id}: {a.ticker} - {a.name} (type: {a.asset_type_id})")

db.close()
