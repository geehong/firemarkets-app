from sqlalchemy import Column, String, DateTime, Index
from sqlalchemy.sql import func
from app.core.database import Base

class KisOverseasMaster(Base):
    """
    KIS Overseas Stock Master Data.
    Stores master data for foreign markets (NYSE, NASDAQ, HK, etc.).
    """
    __tablename__ = "kis_overseas_masters"

    # Composite PK might be safer, but symbol+exchange is usually unique enough.
    # But KIS uses internal symbols too.
    # Let's use Symbol + Exchange Code as PK logic, or a surrogate ID?
    # Actually, let's trust KIS Symbol (col 5) is unique per exchange?
    # Or just use the content we have.
    
    # Columns based on inspection:
    # 0: US (National)
    # 2: NAS (Exchange)
    # 4: AACB (Symbol/Ticker)
    # 5: NASAACB (KIS Code?)
    # 6: Name Ko
    # 7: Name En
    
    national_code = Column(String(10), nullable=True, comment="국가코드 (US, HK, etc)")
    exchange_code = Column(String(10), nullable=True, comment="거래소코드 (NAS, NYS, etc)")
    symbol = Column(String(20), primary_key=True, index=True, comment="심볼 (예: AAPL)")
    # Note: Symbol might duplicate across markets? e.g. 0992 in HK vs others.
    # Making symbol PK might be risky if we mix all markets.
    # Let's add exchange to PK or make a composite.
    # Actually, KIS code (col 5) might be unique global ID? "NASAACB"
    kis_code = Column(String(50), nullable=True, index=True, comment="KIS 내부 코드")
    
    name_ko = Column(String(200), nullable=True, comment="한글 종목명")
    name_en = Column(String(200), nullable=True, comment="영문 종목명")
    
    # Metadata
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), default=func.now())
    
    # Add index on exchange
    __table_args__ = (
        Index('idx_kis_overseas_exchange_symbol', 'exchange_code', 'symbol'),
    )

    def __repr__(self):
        return f"<KisOverseasMaster(symbol={self.symbol}, name={self.name_en})>"
