from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class KisForeignIndexMaster(Base):
    """
    KIS Foreign Index/Sector Master Data (from frgn_code.mst).
    Stores global market indices and sector codes.
    """
    __tablename__ = "kis_foreign_index_masters"

    # Field 1 seems to be the symbol/code. e.g. WAUD#XAO
    symbol = Column(String(20), primary_key=True, index=True, comment="심볼/코드 (예: WAUD#XAO)")
    
    name_en = Column(String(100), nullable=True, comment="영문명")
    name_ko = Column(String(100), nullable=True, comment="한글명")
    market_code = Column(String(20), nullable=True, comment="시장/기타 코드 (예: AUSE106)")
    
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), default=func.now())

    def __repr__(self):
        return f"<KisForeignIndexMaster(symbol={self.symbol}, name={self.name_en})>"
