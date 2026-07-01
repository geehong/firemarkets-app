import sys
sys.path.append('/home/geehong/firemarkets-app/backend')

from app.core.database import SessionLocal
from app.models.asset import Asset

db = SessionLocal()

mstr = db.query(Asset).filter(Asset.ticker == 'MSTR').first()
if mstr:
    print(f"MSTR found: id={mstr.asset_id}, name={mstr.name}")
else:
    print("MSTR not found")

db.close()
