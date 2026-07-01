import sys
sys.path.append('/home/geehong/firemarkets-app/backend')

from app.core.database import SessionLocal
from sqlalchemy import text
import json

db = SessionLocal()

print("--- Checking MSTR in stock_financials ---")
res = db.execute(text("SELECT snapshot_date, market_cap FROM stock_financials WHERE asset_id = 35 ORDER BY snapshot_date DESC LIMIT 1")).fetchone()

if res:
    print(dict(res._mapping))
else:
    print("Not found in stock_financials")

db.close()
