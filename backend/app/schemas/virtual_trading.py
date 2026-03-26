from typing import Optional, List
from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime

class VirtualWalletBase(BaseModel):
    user_id: int
    balance: Decimal

class VirtualWallet(VirtualWalletBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class VirtualPositionBase(BaseModel):
    symbol: str
    side: str
    entry_price: Decimal
    quantity: Decimal
    leverage: int
    margin_mode: str = "Isolated"
    is_active: bool = True
    pnl: Optional[Decimal] = Decimal(0.0)
    liquidation_price: Optional[Decimal] = None

class VirtualPosition(VirtualPositionBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class VirtualOrderBase(BaseModel):
    symbol: str
    side: str
    order_type: str
    price: Optional[Decimal] = None
    quantity: Decimal
    leverage: int = 1

class VirtualOrderCreate(VirtualOrderBase):
    pass

class VirtualOrderUpdate(BaseModel):
    status: str

class VirtualOrder(VirtualOrderBase):
    id: int
    user_id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class VirtualTradeHistory(BaseModel):
    id: int
    user_id: int
    symbol: str
    side: str
    price: Decimal
    quantity: Decimal
    leverage: int
    pnl: Optional[Decimal] = None
    trade_type: str
    timestamp: datetime

    class Config:
        from_attributes = True
