
import sys
import os
sys.path.append(os.getcwd())

from sqlalchemy import create_engine, text
from app.core.database import SessionLocal

def fix_database():
    print("Connecting to database...")
    db = SessionLocal()
    try:
        # 1. Check for duplicates
        print("Checking for duplicates...")
        check_dupes_sql = text("""
            SELECT asset_id, timestamp_utc, COUNT(*) 
            FROM crypto_metrics 
            GROUP BY asset_id, timestamp_utc 
            HAVING COUNT(*) > 1;
        """)
        dupes = db.execute(check_dupes_sql).fetchall()
        
        if dupes:
            print(f"Found {len(dupes)} sets of duplicates. Cleaning up...")
            # Keep the one with highest metric_id (latest)
            delete_dupes_sql = text("""
                DELETE FROM crypto_metrics a USING (
                    SELECT MIN(metric_id) as min_id, asset_id, timestamp_utc 
                    FROM crypto_metrics 
                    GROUP BY asset_id, timestamp_utc 
                    HAVING COUNT(*) > 1
                ) b 
                WHERE a.asset_id = b.asset_id 
                  AND a.timestamp_utc = b.timestamp_utc 
                  AND a.metric_id <> b.min_id; -- Actually we might want to keep MAX. Let's keep MAX.
            """)
            
            # Correct cleanup: Keep row with MAX metric_id
            cleanup_sql = text("""
                DELETE FROM crypto_metrics
                WHERE metric_id NOT IN (
                    SELECT MAX(metric_id)
                    FROM crypto_metrics
                    GROUP BY asset_id, timestamp_utc
                );
            """)
            result = db.execute(cleanup_sql)
            db.commit()
            print(f"Deleted {result.rowcount} duplicate rows.")
        else:
            print("No duplicates found.")

        # 2. Add Primary Key if missing
        print("Checking/Adding Primary Key...")
        try:
            db.execute(text("ALTER TABLE crypto_metrics ADD PRIMARY KEY (metric_id);"))
            db.commit()
            print("Primary Key added.")
        except Exception as e:
            db.rollback()
            print(f"PK addition skipped/failed (likely exists): {e}")

        # 3. Add Unique Constraint if missing
        print("Checking/Adding Unique Constraint...")
        try:
            db.execute(text("ALTER TABLE crypto_metrics ADD CONSTRAINT ux_crypto_metrics_asset_ts UNIQUE (asset_id, timestamp_utc);"))
            db.commit()
            print("Unique Constraint added.")
        except Exception as e:
            db.rollback()
            print(f"Unique Constraint addition skipped/failed (likely exists): {e}")

    except Exception as e:
        print(f"Error checking/fixing database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_database()
