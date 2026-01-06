import sys
import os
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta

# Add project root to sys path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config_manager import ConfigManager

def check_gaps():
    config = ConfigManager()
    db_url = os.getenv("POSTGRES_DATABASE_URL")
    if not db_url:
        print("POSTGRES_DATABASE_URL not set")
        return

    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            # 1. Get Crypto Asset Type ID
            result = conn.execute(text("SELECT asset_type_id FROM asset_types WHERE lower(type_name) LIKE '%crypto%'"))
            type_row = result.fetchone()
            if not type_row:
                print("Crypto asset type not found")
                return
            crypto_type_id = type_row[0]
            print(f"Crypto Asset Type ID: {crypto_type_id}")

            # 2. Get All Crypto Assets
            result = conn.execute(text(f"SELECT asset_id, ticker, name FROM assets WHERE asset_type_id = {crypto_type_id} AND is_active = true"))
            assets = result.fetchall()
            print(f"Found {len(assets)} active crypto assets.")

            # 3. Check for gaps in the last 50 days
            start_check_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=50)
            
            print(f"\nChecking gaps since {start_check_date.strftime('%Y-%m-%d')}...\n")
            print(f"{'Ticker':<10} {'Name':<20} {'Missing Days':<15} {'Gap Dates'}")
            print("-" * 80)

            assets_with_gaps = []

            for asset in assets:
                asset_id = asset.asset_id
                ticker = asset.ticker
                name = asset.name

                # Fetch dates for this asset
                query = text(f"""
                    SELECT timestamp_utc 
                    FROM ohlcv_day_data 
                    WHERE asset_id = {asset_id} 
                    AND timestamp_utc >= :start_date
                    ORDER BY timestamp_utc ASC
                """)
                rows = conn.execute(query, {"start_date": start_check_date}).fetchall()
                
                existing_dates = set()
                for r in rows:
                    if isinstance(r[0], str): # Should be datetime but safe guard
                        d = datetime.fromisoformat(r[0])
                    else:
                        d = r[0]
                    existing_dates.add(d.strftime('%Y-%m-%d'))
                
                # Generate expected dates
                expected_dates = []
                # Check up to yesterday (since today might not be closed/collected yet depending on time)
                # Or check up to today. User saw gaps up to Jan 3 (when query was Jan 5).
                # Let's check up to yesterday.
                check_end_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=1)
                
                curr = start_check_date
                missing_for_asset = []
                while curr <= check_end_date:
                    date_str = curr.strftime('%Y-%m-%d')
                    # We might have data at 09:00:00 or 00:00:00. Just check YYYY-MM-DD match.
                    # The existing_dates set uses formatted string so it ignores time if we formatted consistently.
                    # Wait, DB has time. If we formatted `existing_dates` using `strftime('%Y-%m-%d')`, we are good.
                    
                    # Need to check if ANY timestamp on that day exists (or specifically close to standard time?)
                    # Simplified: if string match exists.
                    
                    # However, timezones issue. 
                    # Usually collection is UTC 00:00 or 09:00 (KST 18:00?).
                    # Let's assume if we find a record for that calendar day (UTC) it's fine.
                    
                    found = False
                    # Check if date_str is in existing_dates (which were formatted from DB UTC)
                    if date_str in existing_dates:
                        found = True
                    else:
                        # Try next day? (Timezone diff might shift it?)
                        # DB timestamp is UTC.
                        pass
                    
                    if not found:
                        missing_for_asset.append(date_str)
                    
                    curr += timedelta(days=1)
                
                if missing_for_asset:
                    # Ignore if missing ALL data (maybe new asset or broken)
                    if len(missing_for_asset) == 50:
                         print(f"{ticker:<10} {name[:20]:<20} ALL (50 days)    -")
                         assets_with_gaps.append(ticker)
                    else:
                        # Summarize gaps
                        gap_msg = ", ".join(missing_for_asset[:3]) 
                        if len(missing_for_asset) > 3:
                            gap_msg += f" ... (+{len(missing_for_asset)-3})"
                        print(f"{ticker:<10} {name[:20]:<20} {len(missing_for_asset):<15} {gap_msg}")
                        assets_with_gaps.append(ticker)

            if not assets_with_gaps:
                print("\nNo gaps found in any crypto asset for the checked period.")
            else:
                print(f"\nFound gaps in {len(assets_with_gaps)} assets.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_gaps()
