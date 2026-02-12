import sys
import os
import logging
from unittest.mock import MagicMock

sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.utils.promo_template_loader import get_promo_candidates

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_loader_logic():
    logger.info("Testing PromoTemplateLoader with Category override...")
    
    # Test 1: Forced Category
    # 'BTC' usually maps to crypto, but let's force 'stocks' to see if it respects it
    # (Just for logic test, semantically wrong)
    candidates = get_promo_candidates(["BTC"], category="stocks", count=1)
    logger.info(f"Forced Stocks (BTC): {candidates.get('ko')}")
    
    # Check if we got stock templates (usually contain specific keywords or we can check simple length)
    # Just ensure it didn't crash and returning something
    assert len(candidates.get('ko', [])) > 0
    
    # Test 2: Forced General
    candidates = get_promo_candidates(["AAPL"], category="general", count=1)
    logger.info(f"Forced General (AAPL): {candidates.get('ko')}")
    assert len(candidates.get('ko', [])) > 0
    
    logger.info("Loader Category Override Test Passed")

if __name__ == "__main__":
    test_loader_logic()
