"""
RealtimeQuote 스키마 정의
"""

from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal
from typing import Optional

class RealtimeQuoteBase(BaseModel):
    """RealtimeQuote 기본 스키마"""
    asset_id: int = Field(..., description="자산 ID")
    timestamp_utc: datetime = Field(..., description="타임스탬프 (UTC)")
    price: Decimal = Field(..., description="가격")
    volume: Optional[Decimal] = Field(None, description="거래량")
    change_amount: Optional[Decimal] = Field(None, description="변화액")
    change_percent: Optional[Decimal] = Field(None, description="변화율 (%)")
    data_source: str = Field(..., description="데이터 소스")

class RealtimeQuoteCreate(RealtimeQuoteBase):
    """RealtimeQuote 생성 스키마"""
    pass

class RealtimeQuoteUpdate(BaseModel):
    """RealtimeQuote 업데이트 스키마"""
    timestamp_utc: Optional[datetime] = Field(None, description="타임스탬프 (UTC)")
    price: Optional[Decimal] = Field(None, description="가격")
    volume: Optional[Decimal] = Field(None, description="거래량")
    change_amount: Optional[Decimal] = Field(None, description="변화액")
    change_percent: Optional[Decimal] = Field(None, description="변화율 (%)")
    data_source: Optional[str] = Field(None, description="데이터 소스")

class RealtimeQuoteResponse(RealtimeQuoteBase):
    """RealtimeQuote 응답 스키마"""
    id: int = Field(..., description="레코드 ID")
    updated_at: datetime = Field(..., description="업데이트 시간")
    
    class Config:
        from_attributes = True

class RealtimeQuoteListResponse(BaseModel):
    """RealtimeQuote 목록 응답 스키마"""
    success: bool = Field(..., description="성공 여부")
    message: str = Field(..., description="응답 메시지")
    data: list[RealtimeQuoteResponse] = Field(..., description="데이터 목록")
    count: int = Field(..., description="총 개수")
