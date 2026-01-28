import os
from sqlalchemy import create_url
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, text

db_url = 'postgresql://geehong:Power6100@localhost:5432/markets'
engine = create_engine(db_url)

try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT ticker FROM assets WHERE asset_id = 1"))
        row = result.fetchone()
        print(f"Asset 1 ticker: {row[0]}")
except Exception as e:
    print(f"Error: {e}")
