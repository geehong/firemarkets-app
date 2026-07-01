import sys
sys.path.append('/home/geehong/firemarkets-app/backend')

from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

print("--- stock_info_view definition ---")
res = db.execute(text("SELECT pg_get_viewdef('stock_info_view', true)")).scalar()
print(res)

print("\n--- mv_treemap_performance definition ---")
res2 = db.execute(text("SELECT pg_get_viewdef('mv_treemap_performance', true)")).scalar()
print(res2)

db.close()
