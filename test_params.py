import asyncio
import sys
import os
from datetime import datetime, timedelta

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

async def main():
    print("Test Params started")
    # Simulate DB state for asset 1, 1m
    # newest_ts: 2026-01-08 16:39:00
    # oldest_ts: (doesn't matter as much for recent fetch)
    
    newest_ts = datetime(2026, 1, 8, 16, 39, 0)
    today = datetime.now()
    
    latest_date = newest_ts.date()
    days_diff = (today.date() - latest_date).days
    print(f"Latest Date: {latest_date}")
    print(f"Today: {today.date()}")
    print(f"Days Diff: {days_diff}")
    
    interval = '1m'
    
    def _get_interval_limit(iv, days):
        if iv == '1m': return 4320
        return days
        
    if days_diff >= 1:
        start_date = latest_date + timedelta(days=1) if days_diff > 1 else latest_date
        days_to_fetch = max(days_diff, 1)
        limit = _get_interval_limit(interval, days_to_fetch)
        print(f"Result: start_date={start_date}, end_date={today.date()}, limit={limit}, is_backfill={days_diff > 1}")

if __name__ == "__main__":
    asyncio.run(main())
