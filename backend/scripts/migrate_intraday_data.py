# backend/scripts/migrate_intraday_data.py
import subprocess
import time

def run_psql(cmd):
    full_cmd = ["docker", "exec", "fire_markets_db_postgres", "psql", "-U", "geehong", "-d", "markets", "-c", cmd]
    res = subprocess.run(full_cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Error: {res.stderr}")
    return res.stdout

def main():
    print("🚀 Starting data migration for partitioned ohlcv_intraday_data...")
    
    # 1. 2026 (Latest first)
    months_2026 = [3, 2, 1]
    for month in months_2026:
        start = f"2026-{month:02d}-01"
        end = f"2026-{month+1:02d}-01" if month < 12 else "2027-01-01"
        print(f"Migrating {start} to {end}...")
        run_psql(f"INSERT INTO ohlcv_intraday_data SELECT * FROM ohlcv_intraday_data_old WHERE timestamp_utc >= '{start}' AND timestamp_utc < '{end}' ON CONFLICT DO NOTHING;")
        time.sleep(1)

    # 2. 2025 (Monthly backward - retrying all for safety)
    for month in range(12, 0, -1):
        start = f"2025-{month:02d}-01"
        end = f"2025-{month+1:02d}-01" if month < 12 else "2026-01-01"
        print(f"Migrating {start} to {end}...")
        run_psql(f"INSERT INTO ohlcv_intraday_data SELECT * FROM ohlcv_intraday_data_old WHERE timestamp_utc >= '{start}' AND timestamp_utc < '{end}' ON CONFLICT DO NOTHING;")
        time.sleep(1)

    # 3. 2024 and earlier
    print("Migrating 2024 and earlier...")
    run_psql("INSERT INTO ohlcv_intraday_data SELECT * FROM ohlcv_intraday_data_old WHERE timestamp_utc < '2025-01-01' ON CONFLICT DO NOTHING;")

    print("✅ Migration complete!")

if __name__ == "__main__":
    main()
