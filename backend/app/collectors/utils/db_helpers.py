from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ...models.asset import CryptoMetric
import logging

logger = logging.getLogger(__name__)

def get_latest_metric_date(db: Session, asset_id: int, metric_name: str) -> datetime | None:
    """
    Retrieves the latest collected timestamp for a specific metric and asset from the database.
    """
    try:
        # Map metric_name to database field if necessary, or assume 1:1 if already mapped
        # In current design, CryptoMetric model has fields matching metric_name for most part
        # But we need to be careful if variable names differ.
        # Based on OnchainCollector._convert_onchain_data, the DB fields match the metric keys well.
        
        # Verify field exists in model to prevent errors
        if not hasattr(CryptoMetric, metric_name):
            # Try some common aliases or return None if not found
            if metric_name == 'mvrv': # example alias handling
                if hasattr(CryptoMetric, 'mvrv_z_score'): 
                   pass # This is actually different.
            
            # If standard field doesn't exist, we can't query it easily with ORM attribute access by name
            # unless we use getattr, which is fine.
            # But we should check if it's a valid column.
            return None

        db_field = getattr(CryptoMetric, metric_name)
        
        latest_record = db.query(CryptoMetric.timestamp_utc).filter(
            CryptoMetric.asset_id == asset_id,
            db_field.isnot(None)
        ).order_by(desc(CryptoMetric.timestamp_utc)).first()
        
        if latest_record:
            return latest_record[0]
            
        return None
    except Exception as e:
        logger.error(f"Error fetching latest date for {metric_name}: {e}")
        return None
