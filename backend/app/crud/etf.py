"""
CRUD operations for ETF models.
"""
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from datetime import date, datetime

from .base import CRUDBase
from ..models.etf import EtfInfo, EtfSectorExposure, EtfHolding

logger = logging.getLogger(__name__)


class CRUDEtfInfo(CRUDBase[EtfInfo]):
    """CRUD operations for EtfInfo model."""
    
    def __init__(self):
        super().__init__(EtfInfo)
    
    def get_etf_info(self, db: Session, asset_id: int) -> Optional[EtfInfo]:
        """Get ETF information for an asset."""
        return db.query(EtfInfo).filter(EtfInfo.asset_id == asset_id).first()
    
    def get_etfs_by_category(self, db: Session, category: str, limit: int = 100) -> List[EtfInfo]:
        """Get ETFs by category."""
        return (
            db.query(EtfInfo)
            .filter(EtfInfo.category == category)
            .order_by(desc(EtfInfo.aum))
            .limit(limit)
            .all()
        )
    
    def get_etfs_by_asset_class(self, db: Session, asset_class: str, limit: int = 100) -> List[EtfInfo]:
        """Get ETFs by asset class."""
        return (
            db.query(EtfInfo)
            .filter(EtfInfo.asset_class == asset_class)
            .order_by(desc(EtfInfo.aum))
            .limit(limit)
            .all()
        )
    
    def get_top_etfs_by_aum(self, db: Session, limit: int = 100) -> List[EtfInfo]:
        """Get top ETFs by Assets Under Management."""
        return (
            db.query(EtfInfo)
            .filter(EtfInfo.aum.isnot(None))
            .order_by(desc(EtfInfo.aum))
            .limit(limit)
            .all()
        )
    
    def get_etfs_by_expense_ratio_range(
        self, 
        db: Session, 
        min_ratio: float = None, 
        max_ratio: float = None,
        limit: int = 100
    ) -> List[EtfInfo]:
        """Get ETFs by expense ratio range."""
        query = db.query(EtfInfo).filter(EtfInfo.expense_ratio.isnot(None))
        
        if min_ratio is not None:
            query = query.filter(EtfInfo.expense_ratio >= min_ratio)
        if max_ratio is not None:
            query = query.filter(EtfInfo.expense_ratio <= max_ratio)
        
        return query.order_by(EtfInfo.expense_ratio).limit(limit).all()
    
    def search_etfs(self, db: Session, search_term: str, limit: int = 100) -> List[EtfInfo]:
        """Search ETFs by fund name or issuer."""
        return (
            db.query(EtfInfo)
            .filter(
                and_(
                    EtfInfo.fund_name.ilike(f"%{search_term}%"),
                    EtfInfo.issuer.ilike(f"%{search_term}%")
                )
            )
            .order_by(desc(EtfInfo.aum))
            .limit(limit)
            .all()
        )
    
    def upsert_etf_info(self, db: Session, etf_data: Dict[str, Any]) -> bool:
        """Upsert ETF information."""
        try:
            asset_id = etf_data['asset_id']
            
            existing = db.query(EtfInfo).filter(EtfInfo.asset_id == asset_id).first()
            
            if existing:
                # Update existing record
                for key, value in etf_data.items():
                    if key != 'asset_id' and hasattr(existing, key):
                        setattr(existing, key, value)
            else:
                # Create new record
                new_etf = EtfInfo(**etf_data)
                db.add(new_etf)
            
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"ETF info upsert failed: {e}")
            db.rollback()
            return False
    
    def get_etf_summary(self, db: Session) -> Dict[str, Any]:
        """Get ETF market summary statistics."""
        try:
            total_etfs = db.query(EtfInfo).count()
            
            # Get total AUM
            total_aum_result = db.query(EtfInfo.aum).filter(EtfInfo.aum.isnot(None)).all()
            total_aum = sum([r[0] for r in total_aum_result if r[0] is not None])
            
            # Get average expense ratio
            avg_expense_result = db.query(EtfInfo.expense_ratio).filter(EtfInfo.expense_ratio.isnot(None)).all()
            avg_expense = sum([r[0] for r in avg_expense_result if r[0] is not None]) / len(avg_expense_result) if avg_expense_result else 0
            
            # Get top categories
            top_categories = (
                db.query(EtfInfo.category, db.func.count(EtfInfo.id))
                .filter(EtfInfo.category.isnot(None))
                .group_by(EtfInfo.category)
                .order_by(desc(db.func.count(EtfInfo.id)))
                .limit(5)
                .all()
            )
            
            # Get top issuers
            top_issuers = (
                db.query(EtfInfo.issuer, db.func.count(EtfInfo.id))
                .filter(EtfInfo.issuer.isnot(None))
                .group_by(EtfInfo.issuer)
                .order_by(desc(db.func.count(EtfInfo.id)))
                .limit(5)
                .all()
            )
            
            return {
                "total_etfs": total_etfs,
                "total_aum": total_aum,
                "average_expense_ratio": avg_expense,
                "top_categories": [
                    {"category": cat, "count": count}
                    for cat, count in top_categories
                ],
                "top_issuers": [
                    {"issuer": issuer, "count": count}
                    for issuer, count in top_issuers
                ]
            }
            
        except Exception as e:
            logger.error(f"ETF summary calculation failed: {e}")
            return {
                "total_etfs": 0,
                "total_aum": 0,
                "average_expense_ratio": 0,
                "top_categories": [],
                "top_issuers": []
            }


class CRUDEtfSectorExposure(CRUDBase[EtfSectorExposure]):
    """CRUD operations for EtfSectorExposure model."""
    
    def __init__(self):
        super().__init__(EtfSectorExposure)
    
    def get_sector_exposure(self, db: Session, etf_info_id: int) -> List[EtfSectorExposure]:
        """Get sector exposure for an ETF."""
        return (
            db.query(EtfSectorExposure)
            .filter(EtfSectorExposure.etf_info_id == etf_info_id)
            .order_by(desc(EtfSectorExposure.weight))
            .all()
        )
    
    def get_sector_exposure_by_sector(self, db: Session, sector: str, limit: int = 100) -> List[EtfSectorExposure]:
        """Get ETFs with exposure to a specific sector."""
        return (
            db.query(EtfSectorExposure)
            .filter(EtfSectorExposure.sector == sector)
            .order_by(desc(EtfSectorExposure.weight))
            .limit(limit)
            .all()
        )
    
    def upsert_sector_exposure(self, db: Session, sector_data: Dict[str, Any]) -> bool:
        """Upsert sector exposure data."""
        try:
            etf_info_id = sector_data['etf_info_id']
            sector = sector_data['sector']
            
            existing = db.query(EtfSectorExposure).filter(
                and_(
                    EtfSectorExposure.etf_info_id == etf_info_id,
                    EtfSectorExposure.sector == sector
                )
            ).first()
            
            if existing:
                # Update existing record
                for key, value in sector_data.items():
                    if key not in ['etf_info_id', 'sector'] and hasattr(existing, key):
                        setattr(existing, key, value)
            else:
                # Create new record
                new_exposure = EtfSectorExposure(**sector_data)
                db.add(new_exposure)
            
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Sector exposure upsert failed: {e}")
            db.rollback()
            return False
    
    def bulk_upsert_sector_exposure(self, db: Session, exposure_list: List[Dict[str, Any]]) -> int:
        """Bulk upsert sector exposure data."""
        if not exposure_list:
            return 0
        
        added_count = 0
        
        try:
            for exposure_data in exposure_list:
                success = self.upsert_sector_exposure(db, exposure_data)
                if success:
                    added_count += 1
            
            return added_count
            
        except Exception as e:
            logger.error(f"Bulk sector exposure upsert failed: {e}")
            return 0


class CRUDEtfHolding(CRUDBase[EtfHolding]):
    """CRUD operations for EtfHolding model."""
    
    def __init__(self):
        super().__init__(EtfHolding)
    
    def get_etf_holdings(self, db: Session, etf_info_id: int, limit: int = 50) -> List[EtfHolding]:
        """Get holdings for an ETF."""
        return (
            db.query(EtfHolding)
            .filter(EtfHolding.etf_info_id == etf_info_id)
            .order_by(desc(EtfHolding.weight))
            .limit(limit)
            .all()
        )
    
    def get_holdings_by_ticker(self, db: Session, ticker: str, limit: int = 100) -> List[EtfHolding]:
        """Get ETFs that hold a specific ticker."""
        return (
            db.query(EtfHolding)
            .filter(EtfHolding.ticker == ticker)
            .order_by(desc(EtfHolding.weight))
            .limit(limit)
            .all()
        )
    
    def get_top_holdings(self, db: Session, etf_info_id: int, limit: int = 10) -> List[EtfHolding]:
        """Get top holdings for an ETF by weight."""
        return (
            db.query(EtfHolding)
            .filter(EtfHolding.etf_info_id == etf_info_id)
            .order_by(desc(EtfHolding.weight))
            .limit(limit)
            .all()
        )
    
    def upsert_holding(self, db: Session, holding_data: Dict[str, Any]) -> bool:
        """Upsert ETF holding data."""
        try:
            etf_info_id = holding_data['etf_info_id']
            ticker = holding_data['ticker']
            
            existing = db.query(EtfHolding).filter(
                and_(
                    EtfHolding.etf_info_id == etf_info_id,
                    EtfHolding.ticker == ticker
                )
            ).first()
            
            if existing:
                # Update existing record
                for key, value in holding_data.items():
                    if key not in ['etf_info_id', 'ticker'] and hasattr(existing, key):
                        setattr(existing, key, value)
            else:
                # Create new record
                new_holding = EtfHolding(**holding_data)
                db.add(new_holding)
            
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"ETF holding upsert failed: {e}")
            db.rollback()
            return False
    
    def bulk_upsert_holdings(self, db: Session, holdings_list: List[Dict[str, Any]]) -> int:
        """Bulk upsert ETF holdings data."""
        if not holdings_list:
            return 0
        
        added_count = 0
        
        try:
            for holding_data in holdings_list:
                success = self.upsert_holding(db, holding_data)
                if success:
                    added_count += 1
            
            return added_count
            
        except Exception as e:
            logger.error(f"Bulk ETF holdings upsert failed: {e}")
            return 0


# Create instances
crud_etf_info = CRUDEtfInfo()
crud_etf_sector_exposure = CRUDEtfSectorExposure()
crud_etf_holding = CRUDEtfHolding()



