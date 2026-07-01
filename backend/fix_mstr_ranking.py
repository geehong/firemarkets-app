import sys
sys.path.append('/home/geehong/firemarkets-app/backend')

from app.core.database import SessionLocal
from sqlalchemy import text
from datetime import datetime

def fix_mstr_ranking():
    db = SessionLocal()
    
    mcap = 73241666610.0
    price = 86.93
    today = datetime.now().strftime('%Y-%m-%d')
    
    # Delete if exists
    db.execute(text("DELETE FROM world_assets_ranking WHERE asset_id = 35 AND ranking_date = :today AND data_source = 'companiesmarketcap'"), {"today": today})
    
    # Insert
    query = text("""
        INSERT INTO world_assets_ranking (
            asset_id, asset_type_id, rank, ticker, name, 
            market_cap_usd, price_usd, daily_change_percent, 
            ranking_date, data_source, last_updated
        ) VALUES (
            35, 2, 50, 'MSTR', 'MicroStrategy Inc.',
            :mcap, :price, 0.0,
            :today, 'companiesmarketcap', NOW()
        )
    """)
    
    db.execute(query, {"mcap": mcap, "price": price, "today": today})
    db.commit()
    print("Inserted into world_assets_ranking.")
    
    # Refresh materialized view
    print("Refreshing mv_treemap_performance...")
    db.execute(text("REFRESH MATERIALIZED VIEW mv_treemap_performance"))
    db.commit()
    
    # Check if MSTR is now top 100
    check = db.execute(text("SELECT asset_id, ticker, market_cap FROM mv_treemap_performance WHERE ticker = 'MSTR'")).fetchone()
    if check:
        print(f"MSTR in view: {dict(check._mapping)}")
    else:
        print("MSTR NOT IN VIEW")
        
    db.close()

if __name__ == "__main__":
    fix_mstr_ranking()
