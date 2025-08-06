"""
CRUD operations for World Assets models.
"""
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from datetime import date, datetime, timedelta

from .base import CRUDBase
from ..models.world_assets import WorldAssetsRanking, BondMarketData, ScrapingLogs

logger = logging.getLogger(__name__)


class CRUDWorldAssetsRanking(CRUDBase[WorldAssetsRanking]):
    """CRUD operations for WorldAssetsRanking model."""
    
    def __init__(self):
        super().__init__(WorldAssetsRanking)
    
    def get_top_assets(self, db: Session, limit: int = 100) -> List[WorldAssetsRanking]:
        """Get top assets by market cap."""
        return (
            db.query(WorldAssetsRanking)
            .filter(WorldAssetsRanking.market_cap_usd.isnot(None))
            .order_by(desc(WorldAssetsRanking.market_cap_usd))
            .limit(limit)
            .all()
        )
    
    def get_assets_by_country(self, db: Session, country: str, limit: int = 100) -> List[WorldAssetsRanking]:
        """Get assets by country."""
        return (
            db.query(WorldAssetsRanking)
            .filter(WorldAssetsRanking.country == country)
            .order_by(desc(WorldAssetsRanking.market_cap_usd))
            .limit(limit)
            .all()
        )
    
    def get_assets_by_sector(self, db: Session, sector: str, limit: int = 100) -> List[WorldAssetsRanking]:
        """Get assets by sector."""
        return (
            db.query(WorldAssetsRanking)
            .filter(WorldAssetsRanking.sector == sector)
            .order_by(desc(WorldAssetsRanking.market_cap_usd))
            .limit(limit)
            .all()
        )
    
    def get_top_gainers(self, db: Session, limit: int = 50) -> List[WorldAssetsRanking]:
        """Get top gainers by daily change percentage."""
        return (
            db.query(WorldAssetsRanking)
            .filter(WorldAssetsRanking.daily_change_percent.isnot(None))
            .order_by(desc(WorldAssetsRanking.daily_change_percent))
            .limit(limit)
            .all()
        )
    
    def get_top_losers(self, db: Session, limit: int = 50) -> List[WorldAssetsRanking]:
        """Get top losers by daily change percentage."""
        return (
            db.query(WorldAssetsRanking)
            .filter(WorldAssetsRanking.daily_change_percent.isnot(None))
            .order_by(WorldAssetsRanking.daily_change_percent)
            .limit(limit)
            .all()
        )
    
    def search_assets(self, db: Session, search_term: str, limit: int = 100) -> List[WorldAssetsRanking]:
        """Search assets by name or ticker."""
        return (
            db.query(WorldAssetsRanking)
            .filter(
                and_(
                    WorldAssetsRanking.name.ilike(f"%{search_term}%"),
                    WorldAssetsRanking.ticker.ilike(f"%{search_term}%")
                )
            )
            .order_by(desc(WorldAssetsRanking.market_cap_usd))
            .limit(limit)
            .all()
        )
    
    def get_asset_by_name(self, db: Session, name: str) -> Optional[WorldAssetsRanking]:
        """Get asset by name."""
        return db.query(WorldAssetsRanking).filter(WorldAssetsRanking.name == name).first()
    
    def get_asset_by_ticker(self, db: Session, ticker: str) -> Optional[WorldAssetsRanking]:
        """Get asset by ticker."""
        return db.query(WorldAssetsRanking).filter(WorldAssetsRanking.ticker == ticker).first()
    
    def upsert_asset_ranking(self, db: Session, asset_data: Dict[str, Any]) -> bool:
        """Upsert asset ranking data."""
        try:
            name = asset_data['name']
            
            existing = db.query(WorldAssetsRanking).filter(WorldAssetsRanking.name == name).first()
            
            if existing:
                # Update existing record
                for key, value in asset_data.items():
                    if hasattr(existing, key):
                        setattr(existing, key, value)
            else:
                # Create new record
                new_asset = WorldAssetsRanking(**asset_data)
                db.add(new_asset)
            
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Asset ranking upsert failed: {e}")
            db.rollback()
            return False
    
    def bulk_upsert_rankings(self, db: Session, assets_list: List[Dict[str, Any]]) -> int:
        """Bulk upsert asset rankings."""
        if not assets_list:
            return 0
        
        updated_count = 0
        
        try:
            for asset_data in assets_list:
                success = self.upsert_asset_ranking(db, asset_data)
                if success:
                    updated_count += 1
            
            return updated_count
            
        except Exception as e:
            logger.error(f"Bulk asset rankings upsert failed: {e}")
            return 0
    
    def get_market_summary(self, db: Session) -> Dict[str, Any]:
        """Get world assets market summary."""
        try:
            total_assets = db.query(WorldAssetsRanking).count()
            
            # Get total market cap
            total_market_cap_result = db.query(WorldAssetsRanking.market_cap_usd).filter(
                WorldAssetsRanking.market_cap_usd.isnot(None)
            ).all()
            total_market_cap = sum([r[0] for r in total_market_cap_result if r[0] is not None])
            
            # Get average daily change
            avg_change_result = db.query(WorldAssetsRanking.daily_change_percent).filter(
                WorldAssetsRanking.daily_change_percent.isnot(None)
            ).all()
            avg_change = sum([r[0] for r in avg_change_result if r[0] is not None]) / len(avg_change_result) if avg_change_result else 0
            
            # Get top countries
            top_countries = (
                db.query(WorldAssetsRanking.country, db.func.count(WorldAssetsRanking.id))
                .filter(WorldAssetsRanking.country.isnot(None))
                .group_by(WorldAssetsRanking.country)
                .order_by(desc(db.func.count(WorldAssetsRanking.id)))
                .limit(5)
                .all()
            )
            
            return {
                "total_assets": total_assets,
                "total_market_cap": total_market_cap,
                "average_daily_change": avg_change,
                "top_countries": [
                    {"country": country, "count": count}
                    for country, count in top_countries
                ]
            }
            
        except Exception as e:
            logger.error(f"Error in get_market_summary: {e}")
            return {}


class CRUDBondMarketData(CRUDBase[BondMarketData]):
    """CRUD operations for BondMarketData model."""
    
    def __init__(self):
        super().__init__(BondMarketData)
    
    def get_latest_bond_data(self, db: Session) -> Optional[BondMarketData]:
        """Get latest bond market data."""
        return (
            db.query(BondMarketData)
            .order_by(desc(BondMarketData.timestamp))
            .first()
        )
    
    def get_bond_data_history(self, db: Session, limit: int = 10) -> List[BondMarketData]:
        """Get bond market data history."""
        return (
            db.query(BondMarketData)
            .order_by(desc(BondMarketData.timestamp))
            .limit(limit)
            .all()
        )
    
    def get_bond_data_by_source(self, db: Session, data_source: str, limit: int = 10) -> List[BondMarketData]:
        """Get bond market data by source."""
        return (
            db.query(BondMarketData)
            .filter(BondMarketData.data_source == data_source)
            .order_by(desc(BondMarketData.timestamp))
            .limit(limit)
            .all()
        )
    
    def create_bond_data(self, db: Session, bond_data: Dict[str, Any]) -> bool:
        """Create new bond market data."""
        try:
            new_bond_data = BondMarketData(**bond_data)
            db.add(new_bond_data)
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Bond market data creation failed: {e}")
            db.rollback()
            return False


class CRUDScrapingLogs(CRUDBase[ScrapingLogs]):
    """CRUD operations for ScrapingLogs model."""
    
    def __init__(self):
        super().__init__(ScrapingLogs)
    
    def get_recent_logs(self, db: Session, limit: int = 100) -> List[ScrapingLogs]:
        """Get recent scraping logs."""
        return (
            db.query(ScrapingLogs)
            .order_by(desc(ScrapingLogs.timestamp))
            .limit(limit)
            .all()
        )
    
    def get_logs_by_source(self, db: Session, source: str, limit: int = 100) -> List[ScrapingLogs]:
        """Get scraping logs by source."""
        return (
            db.query(ScrapingLogs)
            .filter(ScrapingLogs.source == source)
            .order_by(desc(ScrapingLogs.timestamp))
            .limit(limit)
            .all()
        )
    
    def get_logs_by_status(self, db: Session, status: str, limit: int = 100) -> List[ScrapingLogs]:
        """Get scraping logs by status."""
        return (
            db.query(ScrapingLogs)
            .filter(ScrapingLogs.status == status)
            .order_by(desc(ScrapingLogs.timestamp))
            .limit(limit)
            .all()
        )
    
    def create_scraping_log(self, db: Session, log_data: Dict[str, Any]) -> bool:
        """Create new scraping log."""
        try:
            new_log = ScrapingLogs(**log_data)
            db.add(new_log)
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Scraping log creation failed: {e}")
            db.rollback()
            return False
    
    def get_scraping_summary(self, db: Session) -> Dict[str, Any]:
        """Get scraping activity summary."""
        try:
            total_logs = db.query(ScrapingLogs).count()
            
            # Get logs by status
            status_counts = (
                db.query(ScrapingLogs.status, db.func.count(ScrapingLogs.id))
                .group_by(ScrapingLogs.status)
                .all()
            )
            
            # Get logs by source
            source_counts = (
                db.query(ScrapingLogs.source, db.func.count(ScrapingLogs.id))
                .group_by(ScrapingLogs.source)
                .all()
            )
            
            # Get recent activity (last 24 hours)
            yesterday = datetime.now() - timedelta(days=1)
            recent_logs = (
                db.query(ScrapingLogs)
                .filter(ScrapingLogs.timestamp >= yesterday)
                .count()
            )
            
            return {
                "total_logs": total_logs,
                "recent_logs_24h": recent_logs,
                "status_breakdown": [
                    {"status": status, "count": count}
                    for status, count in status_counts
                ],
                "source_breakdown": [
                    {"source": source, "count": count}
                    for source, count in source_counts
                ]
            }
            
        except Exception as e:
            logger.error(f"Scraping summary calculation failed: {e}")
            return {
                "total_logs": 0,
                "recent_logs_24h": 0,
                "status_breakdown": [],
                "source_breakdown": []
            }


# Create instances
crud_world_assets_ranking = CRUDWorldAssetsRanking()
crud_bond_market_data = CRUDBondMarketData()
crud_scraping_logs = CRUDScrapingLogs()




