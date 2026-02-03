from sqlalchemy import Column, String, DateTime, Index
from sqlalchemy.sql import func
from app.core.database import Base

class KisKwMaster(Base):
    """
    KIS Korea Stock Master Data.
    Stores master data for KOSPI, KOSDAQ, etc.
    """
    __tablename__ = "kis_kw_masters"

    short_code = Column(String(20), primary_key=True, index=True, comment="단축코드 (예: 005930)")
    standard_code = Column(String(20), nullable=True, index=True, comment="표준코드 (예: KR7005930003)")
    name_ko = Column(String(100), nullable=True, comment="한글 종목명")
    market_type = Column(String(20), nullable=True, comment="시장구분 (KOSPI, KOSDAQ 등)")
    
    # Metadata
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), default=func.now())

    def __repr__(self):
        return f"<KisKwMaster(code={self.short_code}, name={self.name_ko})>"
