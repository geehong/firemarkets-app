import sys
import os
import logging
from unittest.mock import MagicMock, patch

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# MOCK ALL THE THINGS BEFORE IMPORT
# We must mock 'app.core.database' and 'app.models.asset' to prevent DB connection
# AND also `app.core.config` if it's imported.

sys.modules['app.core.database'] = MagicMock()
sys.modules['app.models'] = MagicMock()
sys.modules['app.models.asset'] = MagicMock()

# Now import the service under test
from app.services.asset_identity_service import AssetIdentityService

def test_identity_service_logic():
    service = AssetIdentityService()
    
    # Verify mapping loaded (Implementation detail check or black box via known keys)
    # We know 'BTC' is in the mapping file based on previous reads
    
    # Mock Session
    mock_db = MagicMock()
    
    # Case 1: DB has the asset (e.g. AAPL)
    logger.info("Test Case 1: DB Hit (AAPL)")
    mock_asset = MagicMock()
    mock_asset.ticker = "AAPL"
    mock_asset.name = "Apple Inc."
    mock_asset.asset_type_id = 2 # Stocks
    
    # Set up query return
    mock_query = mock_db.query.return_value
    mock_filter = mock_query.filter.return_value
    mock_filter.first.return_value = mock_asset
    
    result = service.identify_asset(mock_db, "AAPL")
    logger.info(f"Result: {result}")
    
    assert result['is_valid'] == True
    assert result['asset_type_category'] == 'stocks'
    assert result['name'] == "Apple Inc."
    
    # Case 2: DB Miss, Mapping Hit (e.g. BTC)
    logger.info("Test Case 2: DB Miss, Mapping Hit (BTC)")
    mock_filter.first.return_value = None # DB returns nothing for BTC
    
    # The service internals should look up "BTC" in the loaded JSON
    # We assume 'BTC' -> 8 (crypto) in the real JSON file
    
    result = service.identify_asset(mock_db, "BTC")
    logger.info(f"Result: {result}")
    
    assert result['is_valid'] == True
    assert result['asset_type_category'] == 'crypto'
    assert result['normalized_ticker'] == 'BTC'
    # Name might be 'Bitcoin' based on name_mapping in JSON
    if result['name'] == "Bitcoin":
        logger.info("Name correctly mapped to Bitcoin")
        
    # Case 3: DB Miss, Mapping Miss (e.g. UNKNOWN)
    logger.info("Test Case 3: Totally Unknown")
    mock_filter.first.return_value = None
    
    result = service.identify_asset(mock_db, "UNKNOWN_TICKER")
    logger.info(f"Result: {result}")
    
    assert result['is_valid'] == False
    assert result['asset_type_category'] == 'general'
    
    logger.info("Identity Service Logic Test Passed")

if __name__ == "__main__":
    test_identity_service_logic()
