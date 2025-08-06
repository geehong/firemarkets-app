"""
CRUD operations for Onchain models.
"""
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from datetime import date, datetime

from .base import CRUDBase
from ..models.crypto import CryptoMetric

logger = logging.getLogger(__name__)


class CRUDCryptoMetric(CRUDBase[CryptoMetric]):
    """CRUD operations for CryptoMetric model (onchain data)."""
    
    def __init__(self):
        super().__init__(CryptoMetric)
    
    def get_metric_by_id(self, db: Session, metric_id: str) -> Optional[CryptoMetric]:
        """Get onchain metric by ID."""
        return db.query(CryptoMetric).filter(CryptoMetric.metric_id == metric_id).first()
    
    def get_active_metrics(self, db: Session) -> List[CryptoMetric]:
        """Get all active onchain metrics."""
        return (
            db.query(CryptoMetric)
            .filter(CryptoMetric.is_active == True)
            .order_by(CryptoMetric.display_order)
            .all()
        )
    
    def get_metrics_by_category(self, db: Session, category: str) -> List[CryptoMetric]:
        """Get onchain metrics by category."""
        return (
            db.query(CryptoMetric)
            .filter(
                and_(
                    CryptoMetric.category == category,
                    CryptoMetric.is_active == True
                )
            )
            .order_by(CryptoMetric.display_order)
            .all()
        )
    
    def get_metrics_by_asset(self, db: Session, asset_id: int) -> List[CryptoMetric]:
        """Get onchain metrics for a specific asset."""
        return (
            db.query(CryptoMetric)
            .filter(
                and_(
                    CryptoMetric.asset_id == asset_id,
                    CryptoMetric.is_active == True
                )
            )
            .order_by(CryptoMetric.display_order)
            .all()
        )
    
    def update_metric_config(self, db: Session, metric_id: str, config_data: Dict[str, Any]) -> bool:
        """Update onchain metric configuration."""
        try:
            metric = db.query(CryptoMetric).filter(CryptoMetric.metric_id == metric_id).first()
            if not metric:
                return False
            
            for key, value in config_data.items():
                if hasattr(metric, key):
                    setattr(metric, key, value)
            
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Onchain metric config update failed: {e}")
            db.rollback()
            return False





# Create instances
crud_onchain_metric = CRUDCryptoMetric()
crud_onchain_metric_data = CRUDCryptoMetric()



