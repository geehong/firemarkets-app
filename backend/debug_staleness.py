
import os
import sys
import json
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import text
from app.core.database import SessionLocal
from app.core.config_manager import ConfigManager

def check_staleness():
    db = SessionLocal()
    config_manager = ConfigManager()

    print("--- Scheduler Config ---")
    try:
        scheduler_config = config_manager.get_scheduler_config()
        if scheduler_config:
            parsed = json.loads(scheduler_config)
            print(json.dumps(parsed, indent=2))
        else:
            print("No scheduler_config found in AppConfiguration.")
    except Exception as e:
        print(f"Error reading config: {e}")

    print("\n--- Checking Stale Assets in treemap_live_view ---")
    try:
        # Check for assets with daily_data_updated_at older than 5 days
        # Also check price_change_percentage_24h is null case
        sql = """
        SELECT ticker, asset_type, daily_data_updated_at, price_change_percentage_24h, market_status
        FROM treemap_live_view 
        WHERE (daily_data_updated_at < NOW() - INTERVAL '5 days' OR daily_data_updated_at IS NULL)
        AND market_status != 'STATIC_CLOSED'
        LIMIT 20;
        """
        rows = db.execute(text(sql)).fetchall()
        if rows:
            print(f"Found {len(rows)} potentially stale assets (showing top 20):")
            for row in rows:
                print(f"Ticker: {row.ticker}, Type: {row.asset_type}, Updated: {row.daily_data_updated_at}, Change%: {row.price_change_percentage_24h}, Status: {row.market_status}")
        else:
            print("No stale assets found (older than 5 days).")

        print("\n--- Checking Assets with NULL price_change_percentage_24h ---")
        sql_null = """
        SELECT ticker, asset_type, daily_data_updated_at, price_change_percentage_24h, market_status
        FROM treemap_live_view
        WHERE price_change_percentage_24h IS NULL
        LIMIT 20;
        """
        rows_null = db.execute(text(sql_null)).fetchall()
        for row in rows_null:
             print(f"Null Change%: {row.ticker}, Type: {row.asset_type}, Updated: {row.daily_data_updated_at}, Status: {row.market_status}")

    except Exception as e:
        print(f"Error querying view: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_staleness()
