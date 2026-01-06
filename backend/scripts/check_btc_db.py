import sys
import os
from sqlalchemy import text, create_engine
from dotenv import load_dotenv

# Load env
env_path = os.path.join(os.path.dirname(__file__), '../.env')
load_dotenv(env_path)

db_url = os.getenv("POSTGRES_DATABASE_URL").replace("postgres://", "postgresql://")
engine = create_engine(db_url)

with engine.connect() as conn:
    print("--- BTC (ID=1) Latest 5 Daily Records ---")
    result = conn.execute(text("SELECT * FROM ohlcv_day_data WHERE asset_id = 1 ORDER BY timestamp_utc DESC LIMIT 5"))
    rows = result.fetchall()
    for row in rows:
        print(row)
    
    if not rows:
        print("No records found for BTC.")
