import sys
sys.path.append('/home/geehong/firemarkets-app/backend')

from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

print("--- Checking MSTR in Assets Table ---")
res = db.execute(text("SELECT asset_id, ticker, name FROM assets WHERE ticker = 'MSTR'")).fetchall()
print(res)

print("--- Checking MSTR in World Assets Ranking ---")
res2 = db.execute(text("SELECT * FROM world_assets_ranking WHERE ticker = 'MSTR' ORDER BY ranking_date DESC LIMIT 1")).fetchall()
print(res2)

print("--- Checking MSTR in mv_treemap_performance ---")
res3 = db.execute(text("SELECT asset_id, ticker, name FROM mv_treemap_performance WHERE ticker = 'MSTR'")).fetchall()
print(res3)

db.close()
