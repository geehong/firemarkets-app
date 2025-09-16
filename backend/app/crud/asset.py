"""
CRUD operations for Asset model.
"""
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
# ORM 사용으로 mysql_insert 제거
from datetime import date, datetime

from .base import CRUDBase
from ..models.asset import Asset, AssetType, OHLCVData, OHLCVIntradayData, StockFinancial, StockProfile, StockAnalystEstimate, IndexInfo, WorldAssetsRanking, BondMarketData, ScrapingLogs, CryptoData
# CryptoMetric removed - using CryptoData instead

logger = logging.getLogger(__name__)


class CRUDAsset(CRUDBase[Asset]):
    """CRUD operations for Asset model."""
    
    def __init__(self):
        super().__init__(Asset)
    
    def get_by_ticker(self, db: Session, ticker: str) -> Optional[Asset]:
        """Get asset by ticker symbol using ORM."""
        return self.get_by_field(db, "ticker", ticker)
    
    def get_by_name(self, db: Session, name: str) -> Optional[Asset]:
        """Get asset by name using ORM."""
        return self.get_by_field(db, "name", name)
    
    def get_active_assets(self, db: Session, skip: int = 0, limit: int = 100) -> List[Asset]:
        """Get all active assets using ORM."""
        return self.get_multi_by_field(db, "is_active", True, skip, limit)
    
    def get_assets_by_type(self, db: Session, asset_type_id: int, skip: int = 0, limit: int = 100) -> List[Asset]:
        """Get assets by asset type ID using ORM."""
        return self.get_multi_by_field(db, "asset_type_id", asset_type_id, skip, limit)
    
    def get_assets_by_type_name(self, db: Session, type_name: str, skip: int = 0, limit: int = 100) -> List[Asset]:
        """Get assets by asset type name."""
        return (
            db.query(Asset)
            .join(Asset.asset_type)
            .filter(AssetType.type_name == type_name)
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_assets_with_ohlcv(self, db: Session, skip: int = 0, limit: int = 100) -> List[Asset]:
        """Get assets that have OHLCV data."""
        return (
            db.query(Asset)
            .join(OHLCVData, Asset.id == OHLCVData.asset_id)
            .distinct()
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def search_assets(self, db: Session, search_term: str, skip: int = 0, limit: int = 100) -> List[Asset]:
        """Search assets by name or ticker using ORM."""
        return self.search(db, ["name", "ticker"], search_term, skip, limit)
    
    def update_asset_settings(self, db: Session, asset_id: int, update_data: Dict[str, Any]) -> bool:
        """Update asset settings."""
        try:
            # Use correct primary key column name
            asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
            if not asset:
                return False
            
            for key, value in update_data.items():
                if hasattr(asset, key):
                    setattr(asset, key, value)
            
            db.commit()
            return True
        except Exception as e:
            logger.error(f"Asset settings update failed: {e}")
            db.rollback()
            return False
    
    def get_assets_with_latest_ohlcv(self, db: Session, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Get assets with their latest OHLCV data."""
        # Subquery to get latest OHLCV for each asset
        latest_ohlcv_subquery = (
            db.query(
                OHLCVData.asset_id,
                OHLCVData.timestamp_utc,
                OHLCVData.close_price,
                OHLCVData.change_percent
            )
            .distinct(OHLCVData.asset_id)
            .order_by(OHLCVData.asset_id, desc(OHLCVData.timestamp_utc))
            .subquery()
        )
        
        return (
            db.query(
                Asset,
                latest_ohlcv_subquery.c.timestamp_utc,
                latest_ohlcv_subquery.c.close_price,
                latest_ohlcv_subquery.c.change_percent
            )
            .outerjoin(latest_ohlcv_subquery, Asset.id == latest_ohlcv_subquery.c.asset_id)
            .filter(Asset.is_active == True)
            .offset(skip)
            .limit(limit)
            .all()
        )


class CRUDOHLCV(CRUDBase[OHLCVData]):
    """CRUD operations for OHLCV data."""
    
    def __init__(self):
        super().__init__(OHLCVData)
    
    def get_latest_ohlcv(self, db: Session, asset_id: int) -> Optional[OHLCVData]:
        """Get latest OHLCV data for an asset."""
        return (
            db.query(OHLCVData)
            .filter(OHLCVData.asset_id == asset_id)
            .order_by(desc(OHLCVData.timestamp_utc))
            .first()
        )
    
    def get_latest_timestamp(self, db: Session, asset_id: int, interval: str = '1d') -> Optional[datetime]:
        """Get latest timestamp for a specific asset and interval."""
        return (
            db.query(OHLCVData.timestamp_utc)
            .filter(
                and_(
                    OHLCVData.asset_id == asset_id,
                    OHLCVData.data_interval == interval
                )
            )
            .order_by(desc(OHLCVData.timestamp_utc))
            .first()
        )
    
    def get_date_range(self, db: Session, asset_id: int, interval: str = '1d') -> tuple[Optional[datetime], Optional[datetime]]:
        """Get both oldest and newest timestamps for a specific asset and interval."""
        oldest = (
            db.query(OHLCVData.timestamp_utc)
            .filter(
                and_(
                    OHLCVData.asset_id == asset_id,
                    OHLCVData.data_interval == interval
                )
            )
            .order_by(OHLCVData.timestamp_utc)
            .first()
        )
        
        newest = (
            db.query(OHLCVData.timestamp_utc)
            .filter(
                and_(
                    OHLCVData.asset_id == asset_id,
                    OHLCVData.data_interval == interval
                )
            )
            .order_by(desc(OHLCVData.timestamp_utc))
            .first()
        )
        
        return (oldest[0] if oldest else None, newest[0] if newest else None)
    
    def get_ohlcv_data(
        self, 
        db: Session, 
        asset_id: int, 
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        data_interval: str = '1d',
        limit: int = 1000
    ) -> List[OHLCVData]:
        """Get OHLCV data with date range filtering."""
        query = (
            db.query(OHLCVData)
            .filter(
                and_(
                    OHLCVData.asset_id == asset_id,
                    OHLCVData.data_interval == data_interval
                )
            )
        )
        
        if start_date:
            query = query.filter(OHLCVData.timestamp_utc >= start_date)
        if end_date:
            query = query.filter(OHLCVData.timestamp_utc <= end_date)
        
        return query.order_by(desc(OHLCVData.timestamp_utc)).limit(limit).all()
    
    def get_previous_day_ohlcv(self, db: Session, asset_id: int, target_date: date) -> Optional[OHLCVData]:
        """Get OHLCV data for the day before the target date."""
        return (
            db.query(OHLCVData)
            .filter(
                and_(
                    OHLCVData.asset_id == asset_id,
                    OHLCVData.timestamp_utc < target_date
                )
            )
            .order_by(desc(OHLCVData.timestamp_utc))
            .first()
        )
    
    def bulk_upsert_ohlcv(self, db: Session, ohlcv_list: List[Dict[str, Any]]) -> int:
        """Bulk upsert OHLCV data."""
        if not ohlcv_list:
            return 0
        
        added_count = 0
        updated_count = 0
        
        try:
            # Coerce timestamp_utc to UTC-naive datetime for MySQL DATETIME compatibility
            from datetime import datetime, timezone
            def _normalize_ts(ts_val: Any) -> Any:
                try:
                    if isinstance(ts_val, datetime):
                        if ts_val.tzinfo is not None and ts_val.tzinfo.utcoffset(ts_val) is not None:
                            ts_val = ts_val.astimezone(timezone.utc).replace(tzinfo=None)
                        return ts_val.replace(microsecond=0)
                    # handle strings like '2024-09-05T00:00:00Z' or '2024-09-05 00:00:00+00:00'
                    s = str(ts_val)
                    if not s:
                        return ts_val
                    if s.endswith('Z'):
                        s = s[:-1]
                    s = s.replace('T', ' ')
                    if '+' in s:
                        s = s.split('+')[0]
                    if '.' in s:
                        s = s.split('.', 1)[0]
                    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S")
                except Exception:
                    return ts_val

            for ohlcv_data in ohlcv_list:
                # Normalize timestamp before querying/inserting
                if 'timestamp_utc' in ohlcv_data:
                    ohlcv_data['timestamp_utc'] = _normalize_ts(ohlcv_data['timestamp_utc'])
                # Check if record already exists
                existing = db.query(OHLCVData).filter(
                    and_(
                        OHLCVData.asset_id == ohlcv_data['asset_id'],
                        OHLCVData.timestamp_utc == ohlcv_data['timestamp_utc'],
                        OHLCVData.data_interval == (ohlcv_data.get('data_interval') if ohlcv_data.get('data_interval') != '1d' else None)
                    )
                ).first()
                
                if existing:
                    # Update existing record
                    updated = False
                    for key, value in ohlcv_data.items():
                        if hasattr(existing, key) and getattr(existing, key) != value:
                            setattr(existing, key, value)
                            updated = True
                    if updated:
                        updated_count += 1
                else:
                    # Create new record
                    new_ohlcv = OHLCVData(**ohlcv_data)
                    db.add(new_ohlcv)
                    added_count += 1
            
            db.commit()
            total_count = added_count + updated_count
            logger.info(f"OHLCV bulk upsert: {added_count} new, {updated_count} updated, total {total_count}")
            return total_count
            
        except Exception as e:
            logger.error(f"Bulk OHLCV upsert failed: {e}")
            db.rollback()
            return 0

    def bulk_upsert_ohlcv_daily(self, db: Session, ohlcv_list: List[Dict[str, Any]]) -> int:
        """Bulk upsert OHLCV daily data to ohlcv_day_data table."""
        if not ohlcv_list:
            return 0
        
        added_count = 0
        updated_count = 0
        
        try:
            # Coerce timestamp_utc to UTC-naive datetime for MySQL DATETIME compatibility
            from datetime import datetime, timezone
            def _normalize_ts(ts_val: Any) -> Any:
                try:
                    if isinstance(ts_val, datetime):
                        if ts_val.tzinfo is not None and ts_val.tzinfo.utcoffset(ts_val) is not None:
                            ts_val = ts_val.astimezone(timezone.utc).replace(tzinfo=None)
                        return ts_val.replace(microsecond=0)
                    # handle strings like '2024-09-05T00:00:00Z' or '2024-09-05 00:00:00+00:00'
                    s = str(ts_val)
                    if not s:
                        return ts_val
                    if s.endswith('Z'):
                        s = s[:-1]
                    s = s.replace('T', ' ')
                    if '+' in s:
                        s = s.split('+')[0]
                    if '.' in s:
                        s = s.split('.', 1)[0]
                    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S")
                except Exception:
                    return ts_val

            for ohlcv_data in ohlcv_list:
                # Normalize timestamp before querying/inserting
                if 'timestamp_utc' in ohlcv_data:
                    ohlcv_data['timestamp_utc'] = _normalize_ts(ohlcv_data['timestamp_utc'])
                # Check if record already exists (asset_id, data_interval, timestamp_utc로 고유성 보장)
                existing = db.query(OHLCVData).filter(
                    and_(
                        OHLCVData.asset_id == ohlcv_data['asset_id'],
                        OHLCVData.data_interval == ohlcv_data.get('data_interval', '1d'),
                        OHLCVData.timestamp_utc == ohlcv_data['timestamp_utc']
                    )
                ).first()
                
                if existing:
                    # Update existing record
                    updated = False
                    for key, value in ohlcv_data.items():
                        if hasattr(existing, key) and getattr(existing, key) != value:
                            setattr(existing, key, value)
                            updated = True
                    if updated:
                        updated_count += 1
                else:
                    # Create new record
                    new_ohlcv = OHLCVData(**ohlcv_data)
                    db.add(new_ohlcv)
                    added_count += 1
            
            db.commit()
            return added_count
            
        except Exception as e:
            db.rollback()
            return 0

    def bulk_upsert_ohlcv_intraday(self, db: Session, ohlcv_list: List[Dict[str, Any]]) -> int:
        """Bulk upsert OHLCV intraday data to ohlcv_intraday_data table."""
        if not ohlcv_list:
            return 0
        
        added_count = 0
        updated_count = 0
        
        try:
            # Import the intraday model
            from ..models.asset import OHLCVIntradayData
            
            # Coerce timestamp_utc to UTC-naive datetime for MySQL DATETIME compatibility
            from datetime import datetime, timezone
            def _normalize_ts(ts_val: Any) -> Any:
                try:
                    if isinstance(ts_val, datetime):
                        if ts_val.tzinfo is not None and ts_val.tzinfo.utcoffset(ts_val) is not None:
                            ts_val = ts_val.astimezone(timezone.utc).replace(tzinfo=None)
                        return ts_val.replace(microsecond=0)
                    # handle strings like '2024-09-05T00:00:00Z' or '2024-09-05 00:00:00+00:00'
                    s = str(ts_val)
                    if not s:
                        return ts_val
                    if s.endswith('Z'):
                        s = s[:-1]
                    s = s.replace('T', ' ')
                    if '+' in s:
                        s = s.split('+')[0]
                    if '.' in s:
                        s = s.split('.', 1)[0]
                    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S")
                except Exception:
                    return ts_val

            for ohlcv_data in ohlcv_list:
                # Normalize timestamp before querying/inserting
                if 'timestamp_utc' in ohlcv_data:
                    ohlcv_data['timestamp_utc'] = _normalize_ts(ohlcv_data['timestamp_utc'])
                # Check if record already exists
                existing = db.query(OHLCVIntradayData).filter(
                    and_(
                        OHLCVIntradayData.asset_id == ohlcv_data['asset_id'],
                        OHLCVIntradayData.timestamp_utc == ohlcv_data['timestamp_utc'],
                        OHLCVIntradayData.data_interval == ohlcv_data.get('data_interval', '1d')
                    )
                ).first()
                
                if existing:
                    # Update existing record
                    updated = False
                    for key, value in ohlcv_data.items():
                        if hasattr(existing, key) and getattr(existing, key) != value:
                            setattr(existing, key, value)
                            updated = True
                    if updated:
                        updated_count += 1
                else:
                    # Create new record
                    new_ohlcv = OHLCVIntradayData(**ohlcv_data)
                    db.add(new_ohlcv)
                    added_count += 1
            
            db.commit()
            return added_count
            
        except Exception as e:
            db.rollback()
            return 0


class CRUDStockFinancial(CRUDBase[StockFinancial]):
    """CRUD operations for Stock Financial data."""
    
    def __init__(self):
        super().__init__(StockFinancial)
    
    def get_latest_financials(self, db: Session, asset_id: int) -> Optional[StockFinancial]:
        """Get latest financial data for an asset."""
        return (
            db.query(StockFinancial)
            .filter(StockFinancial.asset_id == asset_id)
            .order_by(desc(StockFinancial.snapshot_date))
            .first()
        )
    
    def get_financials_history(
        self, 
        db: Session, 
        asset_id: int, 
        limit: int = 10
    ) -> List[StockFinancial]:
        """Get financial data history for an asset."""
        return (
            db.query(StockFinancial)
            .filter(StockFinancial.asset_id == asset_id)
            .order_by(desc(StockFinancial.snapshot_date))
            .limit(limit)
            .all()
        )
    
    def upsert_financials(self, db: Session, financial_data: Dict[str, Any]) -> bool:
        """Upsert financial data."""
        try:
            asset_id = financial_data['asset_id']
            snapshot_date = financial_data['snapshot_date']
            
            existing = db.query(StockFinancial).filter(
                and_(
                    StockFinancial.asset_id == asset_id,
                    StockFinancial.snapshot_date == snapshot_date
                )
            ).first()
            
            if existing:
                # Update existing record
                for key, value in financial_data.items():
                    if key not in ['asset_id', 'snapshot_date'] and hasattr(existing, key):
                        setattr(existing, key, value)
            else:
                # Create new record
                new_financial = StockFinancial(**financial_data)
                db.add(new_financial)
            
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Financial data upsert failed: {e}")
            db.rollback()
            return False


class CRUDStockProfile(CRUDBase[StockProfile]):
    """CRUD operations for Stock Profile data."""
    
    def __init__(self):
        super().__init__(StockProfile)
    
    def get_profile(self, db: Session, asset_id: int) -> Optional[StockProfile]:
        """Get stock profile for an asset."""
        return db.query(StockProfile).filter(StockProfile.asset_id == asset_id).first()
    
    def upsert_profile(self, db: Session, profile_data: Dict[str, Any]) -> bool:
        """Upsert stock profile data."""
        try:
            asset_id = profile_data['asset_id']
            
            existing = db.query(StockProfile).filter(StockProfile.asset_id == asset_id).first()
            
            if existing:
                # Update existing record
                for key, value in profile_data.items():
                    if key != 'asset_id' and hasattr(existing, key):
                        setattr(existing, key, value)
            else:
                # Create new record
                new_profile = StockProfile(**profile_data)
                db.add(new_profile)
            
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Stock profile upsert failed: {e}")
            db.rollback()
            return False


class CRUDStockEstimate(CRUDBase[StockAnalystEstimate]):
    """CRUD operations for Stock Analyst Estimates."""
    
    def __init__(self):
        super().__init__(StockAnalystEstimate)
    
    def get_estimates(
        self, 
        db: Session, 
        asset_id: int, 
        limit: int = 10
    ) -> List[StockAnalystEstimate]:
        """Get analyst estimates for an asset."""
        return (
            db.query(StockAnalystEstimate)
            .filter(StockAnalystEstimate.asset_id == asset_id)
            .order_by(desc(StockAnalystEstimate.fiscal_date))
            .limit(limit)
            .all()
        )
    
    def upsert_estimate(self, db: Session, estimate_data: Dict[str, Any]) -> bool:
        """Upsert analyst estimate data."""
        try:
            asset_id = estimate_data['asset_id']
            fiscal_date = estimate_data['fiscal_date']
            
            existing = db.query(StockAnalystEstimate).filter(
                and_(
                    StockAnalystEstimate.asset_id == asset_id,
                    StockAnalystEstimate.fiscal_date == fiscal_date
                )
            ).first()
            
            if existing:
                # Update existing record
                for key, value in estimate_data.items():
                    if key not in ['asset_id', 'fiscal_date'] and hasattr(existing, key):
                        setattr(existing, key, value)
            else:
                # Create new record
                new_estimate = StockAnalystEstimate(**estimate_data)
                db.add(new_estimate)
            
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Stock estimate upsert failed: {e}")
            db.rollback()
            return False


class CRUDIndexInfo(CRUDBase[IndexInfo]):
    """CRUD operations for Index Information."""
    
    def __init__(self):
        super().__init__(IndexInfo)
    
    def get_index_info(
        self, 
        db: Session, 
        asset_id: int, 
        limit: int = 10
    ) -> List[IndexInfo]:
        """Get index information for an asset."""
        return (
            db.query(IndexInfo)
            .filter(IndexInfo.asset_id == asset_id)
            .order_by(desc(IndexInfo.snapshot_date))
            .limit(limit)
            .all()
        )
    
    def upsert_index_info(self, db: Session, index_data: Dict[str, Any]) -> bool:
        """Upsert index information."""
        try:
            asset_id = index_data['asset_id']
            snapshot_date = index_data['snapshot_date']
            
            existing = db.query(IndexInfo).filter(
                and_(
                    IndexInfo.asset_id == asset_id,
                    IndexInfo.snapshot_date == snapshot_date
                )
            ).first()
            
            if existing:
                # Update existing record
                for key, value in index_data.items():
                    if key not in ['asset_id', 'snapshot_date'] and hasattr(existing, key):
                        setattr(existing, key, value)
            else:
                # Create new record
                new_index = IndexInfo(**index_data)
                db.add(new_index)
            
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Index info upsert failed: {e}")
            db.rollback()
            return False


class CRUDCryptoData(CRUDBase[CryptoData]):
    """CRUD operations for Crypto Data."""
    
    def __init__(self):
        super().__init__(CryptoData)
    
    def get_crypto_data(self, db: Session, asset_id: int) -> Optional[CryptoData]:
        """Get crypto data for an asset."""
        return db.query(CryptoData).filter(CryptoData.asset_id == asset_id).first()
    
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
                new_crypto = CryptoData(**crypto_data)
                db.add(new_crypto)
            
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Crypto data upsert failed: {e}")
            db.rollback()
            return False


# Create instances
crud_asset = CRUDAsset()
crud_ohlcv = CRUDOHLCV()
crud_stock_financial = CRUDStockFinancial()
crud_stock_profile = CRUDStockProfile()
crud_stock_estimate = CRUDStockEstimate()
crud_index_info = CRUDIndexInfo()
crud_crypto_data = CRUDCryptoData()


# CRUDCryptoMetric removed - using CryptoData model instead
