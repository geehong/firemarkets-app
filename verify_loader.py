import sys
import os
import logging

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.utils.promo_template_loader import get_promo_candidates

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_loader():
    logger.info("Testing PromoTemplateLoader with DB Tickers...")
    
    # Test 1: New Crypto Ticker (BTC)
    tickers = ["BTC"]
    candidates = get_promo_candidates(tickers)
    logger.info(f"New Crypto (BTC): {len(candidates.get('ko', []))} KO")
    if candidates.get('ko'):
        # Check if BTC was correctly replaced in name
        assert "BTC" in candidates['ko'][0] or "{Name}" not in candidates['ko'][0]
        
    # Test 2: New Stock Ticker (WMT)
    tickers = ["WMT"]
    candidates = get_promo_candidates(tickers)
    logger.info(f"New Stock (WMT): {len(candidates.get('ko', []))} KO")
    
    # Test 3: New ETF (ICOD)
    tickers = ["ICOD"]
    candidates = get_promo_candidates(tickers)
    logger.info(f"New ETF (ICOD): {len(candidates.get('ko', []))} KO")

    logger.info("Extended Loader Test Passed")

if __name__ == "__main__":
    test_loader()
