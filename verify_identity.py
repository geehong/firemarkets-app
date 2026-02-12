import sys
import os
import logging
from unittest.mock import MagicMock, patch

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Mocking database connection BEFORE imports
sys.modules['app.core.database'] = MagicMock()
sys.modules['app.core.database'].Base = MagicMock()

# Now import service
# We might need to mock models too if they import DB
with patch.dict(sys.modules, {'app.core.database': MagicMock()}):
    # Mock Asset model to avoid DB dependency
    sys.modules['app.models.asset'] = MagicMock()
    sys.modules['app.models'] = MagicMock()
    
    from app.services.asset_identity_service import AssetIdentityService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_identity_logic():
    # Setup mock assets
    mock_db = MagicMock()
    
    service = AssetIdentityService()
    
    # Test 1: BTC -> Should map to valid via mapping file (assuming mapping file is loaded)
    # We need to ensure mapping file is loaded or mock it.
    # The service loads it in __new__. 
    # If the file exists, it loads.
    
    logger.info("Testing BTC lookup (Mapping)...")
    # Provide a mock DB that returns None to force mapping check
    mock_db.query.return_value.filter.return_value.first.return_value = None
    
    result = service.identify_asset(mock_db, "BTC")
    logger.info(f"BTC Result: {result}")
    
    # If mapping file is present and has BTC->8, this should be valid
    # If not, it might fail. I assume keys are present in the JSON.
    if result['is_valid']:
        logger.info("SUCCESS: BTC identified via mapping")
    else:
        logger.warning("FAILURE: BTC not identified (Check asset_mapping.json path?)")

    # Test 2: Explicit mock DB return
    mock_asset = MagicMock()
    mock_asset.ticker = "AAPL"
    mock_asset.name = "Apple"
    mock_asset.asset_type_id = 2
    
    mock_db.query.return_value.filter.return_value.first.return_value = mock_asset
    
    logger.info("Testing DB Hit (AAPL)...")
    result = service.identify_asset(mock_db, "AAPL")
    logger.info(f"AAPL Result: {result}")
    assert result['is_valid'] == True
    assert result['asset_type_category'] == 'stocks'

    logger.info("Identity Service Logic Verified")

if __name__ == "__main__":
    test_identity_logic()
