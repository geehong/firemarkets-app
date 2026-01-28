import asyncio
import sys
import os

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ['POSTGRES_DATABASE_URL'] = 'postgresql://geehong:Power6100@localhost:5432/markets'

async def main():
    try:
        from app.models.asset import Asset, AssetType
        from app.core.database import SessionLocal
        
        db = SessionLocal()
        # Find some indices
        indices = db.query(Asset).join(AssetType).filter(AssetType.type_name == 'Indices', Asset.is_active == True).limit(5).all()
        for idx in indices:
            print(f"Index: {idx.ticker}, ID: {idx.asset_id}")
    except Exception as e:
        # If DB connection fails, we'll know
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
