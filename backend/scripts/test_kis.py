import asyncio
import os
import sys
from unittest.mock import MagicMock

# Add the project root to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

# --- MOCKING DEPENDENCIES TO AVOID DB CONNECTION ---
# Mock app.core.config
if 'app.core.config' not in sys.modules:
    mock_config = MagicMock()
    mock_config.API_REQUEST_TIMEOUT_SECONDS = 30
    sys.modules['app.core.config'] = mock_config

# Mock app.core.database
if 'app.core.database' not in sys.modules:
    mock_db = MagicMock()
    mock_db.SessionLocal = MagicMock()
    sys.modules['app.core.database'] = mock_db

# Mock app.utils.logging_helper
if 'app.utils.logging_helper' not in sys.modules:
    mock_log_helper = MagicMock()
    sys.modules['app.utils.logging_helper'] = mock_log_helper

# Mock api logging logic in BaseAPIClient if it's imported via other paths
# But since we mock logging_helper, it might be enough.
# However, BaseAPIClient might have already been imported by something else? No.

# --- NOW IMPORT ---
try:
    from app.external_apis.implementations.kis_client import KisClient
    # Force patch _log_api_call just in case
    from app.external_apis.base.base_client import BaseAPIClient
    BaseAPIClient._log_api_call = MagicMock()
except ImportError as e:
    print(f"ImportError: {e}")
    sys.exit(1)

async def test_kis():
    print("Initializing KisClient...")
    
    # Check Env Vars
    app_key = os.getenv("KIS_APP_KEY")
    app_secret = os.getenv("KIS_APP_SECRET")
    
    if not app_key or not app_secret:
        print("WARNING: KIS_APP_KEY or KIS_APP_SECRET not found in env.")
        # For testing purposes without keys, we can stop here or let it fail gracefully
        if not app_key:
            print("Cannot proceed without KIS_APP_KEY/SECRET for actual API call.")
            return

    try:
        client = KisClient()
    except Exception as e:
        print(f"Failed to instantiate KisClient: {e}")
        return
    
    ticker = "005930" # Samsung Electronics
    print(f"\nTesting KIS API for {ticker} (Samsung Electronics)...")
    
    # Test Realtime Quote
    print("\n[1] Fetching Realtime Quote...")
    quote = await client.get_realtime_quote(ticker)
    if quote:
        print(f"✅ Quote received: Price={quote.price}, Change={quote.change_percent}%")
    else:
        print("❌ Failed to fetch quote (Check credentials provided).")
        
    # Test OHLCV (Daily)
    print("\n[2] Fetching OHLCV (Daily)...")
    ohlcv = await client.get_ohlcv_data(ticker, interval="1d", limit=5)
    if ohlcv:
        print(f"✅ OHLCV received: {len(ohlcv)} records")
        for item in ohlcv[:3]: # Show first 3
            print(f"   Date: {item.timestamp_utc.date()}, Close: {item.close_price}, Vol: {item.volume}")
    else:
        print("❌ Failed to fetch OHLCV (Check credentials provided).")

if __name__ == "__main__":
    asyncio.run(test_kis())
