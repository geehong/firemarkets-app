import sys
import os
sys.path.append('/home/geehong/firemarkets-app/backend')

from app.core.database import SessionLocal
from app.models.asset import Asset, AssetType

db = SessionLocal()

# Check if MSTR exists
mstr = db.query(Asset).filter(Asset.ticker == 'MSTR').first()
if mstr:
    print(f"MSTR already exists with asset_id {mstr.asset_id}")
else:
    # Get asset_type_id for stocks
    stock_type = db.query(AssetType).filter(AssetType.type_name.in_(['Stock', 'stock', 'STOCKS', 'stocks'])).first()
    if not stock_type:
        stock_type_id = 2  # default to 2 as seen in asset_mapping.json
    else:
        stock_type_id = stock_type.asset_type_id
        
    print(f"Using asset_type_id {stock_type_id} for MSTR")
    
    new_asset = Asset(
        ticker='MSTR',
        asset_type_id=stock_type_id,
        name='MicroStrategy Inc',
        exchange='NASDAQ',
        currency='USD',
        is_active=True,
        data_source='fmp'
    )
    db.add(new_asset)
    db.commit()
    print("MSTR added successfully.")

db.close()
