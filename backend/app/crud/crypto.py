"""
CRUD operations for Crypto models.
"""
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from datetime import date, datetime

from .base import CRUDBase
from ..models.crypto import CryptoMetric, CryptoData

logger = logging.getLogger(__name__)


class CRUDCryptoMetric(CRUDBase[CryptoMetric]):
    """CRUD operations for CryptoMetric model."""
    
    def __init__(self):
        super().__init__(CryptoMetric)
    
    def get_latest_metrics(self, db: Session, asset_id: int) -> Optional[CryptoMetric]:
        """Get latest crypto metrics for an asset."""
        return (
            db.query(CryptoMetric)
            .filter(CryptoMetric.asset_id == asset_id)
            .order_by(desc(CryptoMetric.timestamp_utc))
            .first()
        )
    
    def get_metrics_history(
        self, 
        db: Session, 
        asset_id: int, 
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 100
    ) -> List[CryptoMetric]:
        """Get crypto metrics history for an asset."""
        query = db.query(CryptoMetric).filter(CryptoMetric.asset_id == asset_id)
        
        if start_date:
            query = query.filter(CryptoMetric.timestamp_utc >= start_date)
        if end_date:
            query = query.filter(CryptoMetric.timestamp_utc <= end_date)
        
        return query.order_by(desc(CryptoMetric.timestamp_utc)).limit(limit).all()
    
    def get_metrics_by_date(self, db: Session, asset_id: int, target_date: date) -> Optional[CryptoMetric]:
        """Get crypto metrics for a specific date."""
        return (
            db.query(CryptoMetric)
            .filter(
                and_(
                    CryptoMetric.asset_id == asset_id,
                    CryptoMetric.timestamp_utc == target_date
                )
            )
            .first()
        )
    
    def bulk_upsert_metrics(self, db: Session, metrics_list: List[Dict[str, Any]]) -> int:
        """Bulk upsert crypto metrics."""
        if not metrics_list:
            return 0
        
        added_count = 0
        
        try:
            for metric_data in metrics_list:
                # Check if record already exists
                existing = db.query(CryptoMetric).filter(
                    and_(
                        CryptoMetric.asset_id == metric_data['asset_id'],
                        CryptoMetric.timestamp_utc == metric_data['timestamp_utc']
                    )
                ).first()
                
                if existing:
                    # Update existing record
                    for key, value in metric_data.items():
                        if hasattr(existing, key):
                            setattr(existing, key, value)
                else:
                    # Create new record
                    new_metric = CryptoMetric(**metric_data)
                    db.add(new_metric)
                    added_count += 1
            
            db.commit()
            return added_count
            
        except Exception as e:
            logger.error(f"Bulk crypto metrics upsert failed: {e}")
            db.rollback()
            return 0
    
    def upsert_metric(self, db: Session, metric_data: Dict[str, Any]) -> bool:
        """Upsert a single crypto metric."""
        try:
            asset_id = metric_data['asset_id']
            timestamp_utc = metric_data['timestamp_utc']
            
            existing = db.query(CryptoMetric).filter(
                and_(
                    CryptoMetric.asset_id == asset_id,
                    CryptoMetric.timestamp_utc == timestamp_utc
                )
            ).first()
            
            if existing:
                # Update existing record
                for key, value in metric_data.items():
                    if key not in ['asset_id', 'timestamp_utc'] and hasattr(existing, key):
                        setattr(existing, key, value)
            else:
                # Create new record
                new_metric = CryptoMetric(**metric_data)
                db.add(new_metric)
            
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Crypto metric upsert failed: {e}")
            db.rollback()
            return False


class CRUDCryptoData(CRUDBase[CryptoData]):
    """CRUD operations for CryptoData model (CoinMarketCap data)."""
    
    def __init__(self):
        super().__init__(CryptoData)
    
    def get_latest_data(self, db: Session, asset_id: int) -> Optional[CryptoData]:
        """Get latest crypto data for an asset."""
        return (
            db.query(CryptoData)
            .filter(CryptoData.asset_id == asset_id)
            .order_by(desc(CryptoData.last_updated))
            .first()
        )
    
    def get_data_by_rank(self, db: Session, cmc_rank: int) -> Optional[CryptoData]:
        """Get crypto data by CoinMarketCap rank."""
        return (
            db.query(CryptoData)
            .filter(CryptoData.cmc_rank == cmc_rank)
            .first()
        )
    
    def get_top_cryptos(self, db: Session, limit: int = 100) -> List[CryptoData]:
        """Get top cryptocurrencies by market cap."""
        return (
            db.query(CryptoData)
            .filter(CryptoData.market_cap.isnot(None))
            .order_by(desc(CryptoData.market_cap))
            .limit(limit)
            .all()
        )
    
    def get_cryptos_by_category(self, db: Session, category: str, limit: int = 100) -> List[CryptoData]:
        """Get cryptocurrencies by category."""
        return (
            db.query(CryptoData)
            .filter(CryptoData.category == category)
            .order_by(desc(CryptoData.market_cap))
            .limit(limit)
            .all()
        )
    
    def search_cryptos(self, db: Session, search_term: str, limit: int = 100) -> List[CryptoData]:
        """Search cryptocurrencies by name."""
        return (
            db.query(CryptoData)
            .filter(CryptoData.name.ilike(f"%{search_term}%"))
            .order_by(desc(CryptoData.market_cap))
            .limit(limit)
            .all()
        )
    
    def get_cryptos_with_price_change(
        self, 
        db: Session, 
        min_change: float = None, 
        max_change: float = None,
        limit: int = 100
    ) -> List[CryptoData]:
        """Get cryptocurrencies with specific price change range."""
        query = db.query(CryptoData).filter(CryptoData.percent_change_24h.isnot(None))
        
        if min_change is not None:
            query = query.filter(CryptoData.percent_change_24h >= min_change)
        if max_change is not None:
            query = query.filter(CryptoData.percent_change_24h <= max_change)
        
        return query.order_by(desc(CryptoData.percent_change_24h)).limit(limit).all()
    
    def upsert_crypto_data(self, db: Session, crypto_data: Dict[str, Any]) -> bool:
        """Upsert crypto data."""
        try:
            asset_id = crypto_data['asset_id']
            
            existing = db.query(CryptoData).filter(CryptoData.asset_id == asset_id).first()
            
            if existing:
                # Update existing record
                for key, value in crypto_data.items():
                    if key != 'asset_id' and hasattr(existing, key):
                        setattr(existing, key, value)
            else:
                # Create new record
                new_data = CryptoData(**crypto_data)
                db.add(new_data)
            
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Crypto data upsert failed: {e}")
            db.rollback()
            return False
    
    def get_market_summary(self, db: Session) -> Dict[str, Any]:
        """Get crypto market summary statistics."""
        try:
            total_cryptos = db.query(CryptoData).count()
            
            # Get total market cap
            total_market_cap_result = db.query(CryptoData.market_cap).filter(
                CryptoData.market_cap.isnot(None)
            ).all()
            total_market_cap = sum([r[0] for r in total_market_cap_result if r[0] is not None])
            
            # Get average 24h change
            avg_change_result = db.query(CryptoData.percent_change_24h).filter(
                CryptoData.percent_change_24h.isnot(None)
            ).all()
            avg_change = sum([r[0] for r in avg_change_result if r[0] is not None]) / len(avg_change_result) if avg_change_result else 0
            
            # Get top gainers and losers
            top_gainers = (
                db.query(CryptoData)
                .filter(CryptoData.percent_change_24h.isnot(None))
                .order_by(desc(CryptoData.percent_change_24h))
                .limit(5)
                .all()
            )
            
            top_losers = (
                db.query(CryptoData)
                .filter(CryptoData.percent_change_24h.isnot(None))
                .order_by(CryptoData.percent_change_24h)
                .limit(5)
                .all()
            )
            
            return {
                "total_cryptocurrencies": total_cryptos,
                "total_market_cap": total_market_cap,
                "average_24h_change": avg_change,
                "top_gainers": [
                    {
                        "name": crypto.name,
                        "ticker": crypto.asset_id,  # Assuming this maps to ticker
                        "change_24h": crypto.percent_change_24h,
                        "market_cap": crypto.market_cap
                    }
                    for crypto in top_gainers
                ],
                "top_losers": [
                    {
                        "name": crypto.name,
                        "ticker": crypto.asset_id,  # Assuming this maps to ticker
                        "change_24h": crypto.percent_change_24h,
                        "market_cap": crypto.market_cap
                    }
                    for crypto in top_losers
                ]
            }
            
        except Exception as e:
            logger.error(f"Market summary calculation failed: {e}")
            return {
                "total_cryptocurrencies": 0,
                "total_market_cap": 0,
                "average_24h_change": 0,
                "top_gainers": [],
                "top_losers": []
            }


# Create instances
crud_crypto_metric = CRUDCryptoMetric()
crud_crypto_data = CRUDCryptoData()






