
import logging
import sys
import os
from sqlalchemy import text

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import SessionLocal

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def reset_change_percent():
    db = SessionLocal()
    try:
        logger.info("Starting to reset change_percent to NULL in all tables...")
        
        tables = [
            'ohlcv_day_data',
            'ohlcv_intraday_data',
            'realtime_quotes_time_delay'
        ]
        
        for table in tables:
            logger.info(f"Targeting table: {table}")
            try:
                # Check if column exists just in case (optional, but safe)
                # For now assuming it exists as per schema
                
                stmt = text(f"UPDATE {table} SET change_percent = NULL")
                result = db.execute(stmt)
                logger.info(f"Updated {result.rowcount} rows in {table}.")
                
            except Exception as e:
                logger.error(f"Error updating {table}: {e}")
                
        db.commit()
        logger.info("Successfully committed changes to database.")
        
    except Exception as e:
        logger.error(f"Critical error during reset: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_change_percent()
