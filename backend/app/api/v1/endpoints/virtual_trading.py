from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_postgres_db
from app.dependencies.auth_deps import get_current_user
from app.models.virtual_trading import VirtualWallet, VirtualPosition, VirtualOrder, VirtualTradeHistory
from app.schemas.virtual_trading import (
    VirtualWallet as WalletSchema,
    VirtualPosition as PositionSchema,
    VirtualOrderCreate,
    VirtualOrder as OrderSchema,
    VirtualOrderUpdate
)
from app.services.virtual_settlement import SettlementEngine

router = APIRouter()

@router.get("/wallet", response_model=WalletSchema)
def get_wallet(
    db: Session = Depends(get_postgres_db),
    current_user = Depends(get_current_user),
) -> Any:
    """나의 가상 지갑 잔액 조회"""
    wallet = db.query(VirtualWallet).filter(VirtualWallet.user_id == current_user.id).first()
    if not wallet:
        # 지갑이 없으면 자동 생성 (기본 100,000 USDT)
        wallet = VirtualWallet(user_id=current_user.id, balance=100000.0)
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
    return wallet

@router.get("/positions", response_model=List[PositionSchema])
def get_positions(
    db: Session = Depends(get_postgres_db),
    current_user = Depends(get_current_user),
) -> Any:
    """나의 현재 활성 포지션 목록 조회"""
    positions = db.query(VirtualPosition).filter(
        VirtualPosition.user_id == current_user.id,
        VirtualPosition.is_active == True
    ).all()
    return positions

@router.post("/orders", response_model=OrderSchema)
def create_order(
    *,
    db: Session = Depends(get_postgres_db),
    order_in: VirtualOrderCreate,
    current_user = Depends(get_current_user),
) -> Any:
    """새로운 가상 주문 생성"""
    # 1. 지갑 잔액 확인 (단순화된 마진 체크)
    wallet = db.query(VirtualWallet).filter(VirtualWallet.user_id == current_user.id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    # 주문 생성
    order = VirtualOrder(
        user_id=current_user.id,
        symbol=order_in.symbol,
        side=order_in.side,
        order_type=order_in.order_type,
        price=order_in.price,
        quantity=order_in.quantity,
        leverage=order_in.leverage,
        status="PENDING"
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    
    # 2. 시장가 주문인 경우 즉시 체결 엔진 호출
    print(f"[VirtualTrading] Checking order type: '{order.order_type}' for order ID: {order.id}")
    if order.order_type.upper() == "MARKET":
        print(f"[VirtualTrading] Executing SettlementEngine for MARKET order: {order.id}")
        engine = SettlementEngine(db)
        filled_order = engine.process_market_order(order)
        print(f"[VirtualTrading] Order {order.id} status after settlement: {filled_order.status}, Price: {filled_order.price}")
        return filled_order
        
    return order

@router.get("/history", response_model=List[Any])
def get_trade_history(
    db: Session = Depends(get_postgres_db),
    current_user = Depends(get_current_user),
) -> Any:
    """거래 내역 조회"""
    history = db.query(VirtualTradeHistory).filter(
        VirtualTradeHistory.user_id == current_user.id
    ).order_by(VirtualTradeHistory.timestamp.desc()).all()
    return history
