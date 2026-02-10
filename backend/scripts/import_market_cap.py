import json
import sys
import os
from datetime import datetime
from decimal import Decimal

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
# from app.core.config import settings
from app.models.asset import CryptoMetric
from sqlalchemy.dialects.postgresql import insert

import traceback

import traceback
from sqlalchemy import literal_column

def import_market_cap():
    # Database connection
    database_url = os.getenv("POSTGRES_DATABASE_URL")
    if not database_url:
        print("Error: POSTGRES_DATABASE_URL environment variable not set.")
        return
        
    engine = create_engine(database_url)

    try:
        # Load JSON data
        json_path = '/app/temp_data.json'
        with open(json_path, 'r') as f:
            data = json.load(f)
        
        print(f"Loaded {len(data)} records from {json_path}")
        
        # Process data
        record_map = {}
        for item in data:
            date_str = item.get('d')
            bitcoin_dominance_value = item.get('bitcoinDominance')
            
            if date_str and bitcoin_dominance_value is not None:
                # Convert date string to python date object
                # Handle multiple formats: 'YYYY-MM-DD', 'YYYY-MM-DD HH:MM:SS', 'YYYY-MM-DD HH:MM:SS.mmm'
                try:
                    if ' ' in date_str:
                        # Try with milliseconds first, then without
                        try:
                            date_obj = datetime.strptime(date_str.split('.')[0], '%Y-%m-%d %H:%M:%S').date()
                        except ValueError:
                            date_obj = datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S').date()
                    else:
                        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
                except ValueError:
                    print(f"Warning: Could not parse date '{date_str}', skipping...")
                    continue
                
                # NOTE: 현재 JSON의 bitcoinDominance 값을 crypto_metrics.bitcoin_dominance에 매핑
                record = {
                    'asset_id': 1,  # Assuming Bitcoin
                    'timestamp_utc': date_obj,
                    'bitcoin_dominance': Decimal(str(bitcoin_dominance_value))
                }
                record_map[date_obj] = record
        
        records_to_upsert = list(record_map.values())
        
        if not records_to_upsert:
            print("No valid records found to insert.")
            return

        print(f"Preparing to upsert {len(records_to_upsert)} records...")
        
        # Access the Table object directly for Core operations
        table = CryptoMetric.__table__
        
        # Debug: log table columns
        sys.stderr.write(f"Table columns: {[c.name for c in table.c]}\n")
        
        with engine.connect() as conn:
            # Batch processing
            batch_size = 500
            for i in range(0, len(records_to_upsert), batch_size):
                batch = records_to_upsert[i:i + batch_size]
                sys.stderr.write(f"Upserting batch {i//batch_size + 1} ({len(batch)} records)...\n")
                
                stmt = insert(table).values(batch)
                
                # On conflict (same asset_id, timestamp_utc), update bitcoin_dominance to the new value
                stmt = stmt.on_conflict_do_update(
                    index_elements=['asset_id', 'timestamp_utc'],
                    set_={
                        'bitcoin_dominance': stmt.excluded.bitcoin_dominance,
                        'updated_at': func.now()
                    }
                )
                
                conn.execute(stmt)
                conn.commit()
                
        print("Successfully imported market cap data.")
        
    except Exception:
        print("Error importing data:")
        print(traceback.format_exc())

if __name__ == "__main__":
    import_market_cap()
