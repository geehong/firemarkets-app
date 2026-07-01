import sys
sys.path.append('/home/geehong/firemarkets-app/backend')

from app.core.database import SessionLocal
from sqlalchemy import text
import json

db = SessionLocal()

print("--- MSTR row in mv_treemap_performance ---")
res = db.execute(text("SELECT * FROM mv_treemap_performance WHERE ticker = 'MSTR'")).fetchone()

if res:
    print(dict(res._mapping))
else:
    print("Not found in mv_treemap_performance")

db.close()
