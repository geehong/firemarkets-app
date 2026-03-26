from sqlalchemy import (
    Column, Integer, String, DECIMAL, TIMESTAMP, Boolean, ForeignKey, func, Text
)
from sqlalchemy.orm import relationship
from ..core.database import Base

class VirtualWallet(Base):
    __tablename__ = "virtual_wallets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    balance = Column(DECIMAL(20, 8), default=100000.0, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    user = relationship("User", backref="virtual_wallet")

class VirtualPosition(Base):
    __tablename__ = "virtual_positions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    symbol = Column(String(50), nullable=False, index=True)
    side = Column(String(10), nullable=False)  # BUY (LONG) or SELL (SHORT)
    entry_price = Column(DECIMAL(20, 8), nullable=False)
    quantity = Column(DECIMAL(20, 8), nullable=False)
    leverage = Column(Integer, default=1, nullable=False)
    margin_mode = Column(String(20), default="Isolated", nullable=False)
    is_active = Column(Boolean, default=True, index=True)
    pnl = Column(DECIMAL(20, 8), default=0.0)
    liquidation_price = Column(DECIMAL(20, 8), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    closed_at = Column(TIMESTAMP, nullable=True)
    
    user = relationship("User", backref="virtual_positions")

class VirtualOrder(Base):
    __tablename__ = "virtual_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    symbol = Column(String(50), nullable=False, index=True)
    side = Column(String(10), nullable=False)  # BUY or SELL
    order_type = Column(String(20), nullable=False)  # MARKET, LIMIT
    price = Column(DECIMAL(20, 8), nullable=True)
    quantity = Column(DECIMAL(20, 8), nullable=False)
    leverage = Column(Integer, default=1, nullable=False)
    status = Column(String(20), default="PENDING", index=True)  # PENDING, FILLED, CANCELLED
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    user = relationship("User", backref="virtual_orders")

class VirtualTradeHistory(Base):
    __tablename__ = "virtual_trade_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    symbol = Column(String(50), nullable=False)
    side = Column(String(10), nullable=False)
    price = Column(DECIMAL(20, 8), nullable=False)
    quantity = Column(DECIMAL(20, 8), nullable=False)
    leverage = Column(Integer, nullable=False)
    pnl = Column(DECIMAL(20, 8), nullable=True)
    trade_type = Column(String(20), nullable=False)  # ENTRY, EXIT, LIQUIDATION
    timestamp = Column(TIMESTAMP, server_default=func.now())
    
    user = relationship("User", backref="virtual_trade_history")
