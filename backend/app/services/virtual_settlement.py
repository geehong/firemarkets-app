from decimal import Decimal
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.virtual_trading import VirtualWallet, VirtualPosition, VirtualOrder, VirtualTradeHistory
from app.api import deps
# Note: Realtime price access needed
import requests

class SettlementEngine:
    def __init__(self, db: Session):
        self.db = db

    def get_latest_price(self, symbol: str) -> Decimal:
        """심볼(e.g., BTCUSDT)의 최신 가격을 가져옵니다."""
        # TODO: 실제 시세 연동 (현재는 하드코딩 또는 간단한 조회)
        # 예시: 외부 API 또는 Redis 시세 조회
        # 여기서는 간단히 95000.0 (BTC), 3200.0 (ETH) 수준으로 처리
        if "BTC" in symbol: return Decimal("95420.50")
        if "ETH" in symbol: return Decimal("3240.75")
        if "SOL" in symbol: return Decimal("195.20")
        return Decimal("1.00")

    def process_market_order(self, order: VirtualOrder) -> VirtualOrder:
        """시장가 주문을 즉시 체결하고 포지션을 생성/수정합니다."""
        price = self.get_latest_price(order.symbol)
        order.status = "FILLED"
        order.price = price
        
        # 1. 지갑 잔액 차감 (증거금 개념)
        # Margin = (Price * Quantity) / Leverage
        margin_required = (price * order.quantity) / Decimal(str(order.leverage))
        
        wallet = self.db.query(VirtualWallet).filter(VirtualWallet.user_id == order.user_id).first()
        if not wallet or wallet.balance < margin_required:
            order.status = "CANCELLED"
            # Optional: Log reason
            return order
            
        wallet.balance -= margin_required
        
        # 2. 포지션 생성
        # 동일 심볼, 동일 사이드인 경우 기존 포지션과 합칠 수도 있으나 
        # 여기선 간단히 개별 포지션으로 생성
        position = VirtualPosition(
            user_id = order.user_id,
            symbol = order.symbol,
            side = order.side,
            entry_price = price,
            quantity = order.quantity,
            leverage = order.leverage,
            is_active = True
        )
        self.db.add(position)
        
        # 3. 거래 내역 기록
        history = VirtualTradeHistory(
            user_id = order.user_id,
            symbol = order.symbol,
            side = order.side,
            price = price,
            quantity = order.quantity,
            leverage = order.leverage,
            trade_type = "ENTRY"
        )
        self.db.add(history)
        
        self.db.commit()
        self.db.refresh(order)
        return order

    def update_pnl(self, position: VirtualPosition, current_price: Decimal):
        """실시간 미실현 손익 정산"""
        if position.side == "BUY":
            pnl = (current_price - position.entry_price) * position.quantity
        else:
            pnl = (position.entry_price - current_price) * position.quantity
        
        position.pnl = pnl
        self.db.commit()
        return pnl

    def close_position(self, position: VirtualPosition, exit_price: Decimal):
        """포지션 종료 및 증거금/손익 반환"""
        if not position.is_active:
            return
            
        position.is_active = False
        position.closed_at = datetime.utcnow()
        
        # 손익 계산
        if position.side == "BUY":
            pnl = (exit_price - position.entry_price) * position.quantity
        else:
            pnl = (position.entry_price - exit_price) * position.quantity
            
        position.pnl = pnl
        
        # 지갑 업데이트 (증거금 + 손익)
        margin_used = (position.entry_price * position.quantity) / Decimal(str(position.leverage))
        wallet = self.db.query(VirtualWallet).filter(VirtualWallet.user_id == position.user_id).first()
        if wallet:
            wallet.balance += (margin_used + pnl)
            
        # 히스토리 기록
        history = VirtualTradeHistory(
            user_id = position.user_id,
            symbol = position.symbol,
            side = position.side,
            price = exit_price,
            quantity = position.quantity,
            leverage = position.leverage,
            pnl = pnl,
            trade_type = "EXIT"
        )
        self.db.add(history)
        self.db.commit()
