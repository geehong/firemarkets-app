import asyncio
import os
from sqlalchemy import create_engine, text
from app.core.config import GLOBAL_APP_CONFIGS, load_and_set_global_configs

def inspect_function():
    load_and_set_global_configs()
    
    # Construct DB URL
    user = os.getenv("POSTGRES_USER", "user")
    password = os.getenv("POSTGRES_PASSWORD", "password")
    server = os.getenv("POSTGRES_SERVER", "postgres")
    port = os.getenv("POSTGRES_PORT", "5432")
    db = os.getenv("POSTGRES_DB", "fire_markets")
    
    # Use config if available
    db_url = GLOBAL_APP_CONFIGS.get("POSTGRES_DATABASE_URL")
    if not db_url:
        db_url = f"postgresql://{user}:{password}@{server}:{port}/{db}"
        
    print(f"Connecting to {db_url}")
    engine = create_engine(db_url)
    
    with engine.connect() as conn:
        query = text("SELECT prosrc FROM pg_proc WHERE proname = 'refresh_dynamic_menus';")
        result = conn.execute(query).fetchone()
        
        if result:
            print("--- FUNCTION SOURCE ---")
            print(result[0])
            print("-----------------------")
        else:
            print("Function refresh_dynamic_menus not found.")

if __name__ == "__main__":
    inspect_function()
