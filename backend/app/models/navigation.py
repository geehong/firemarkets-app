# backend/app/models/navigation.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func, JSON
from sqlalchemy.orm import relationship
from ..core.database import Base


class Menu(Base):
    __tablename__ = "menus"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    path = Column(String(255), nullable=True)
    icon = Column(String(100), nullable=True)
    parent_id = Column(Integer, ForeignKey("menus.id"), nullable=True)
    order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    source_type = Column(String(20), default='static', nullable=False)
    menu_metadata = Column(JSON, default={})  # JSON 컬럼: 메뉴의 추가 정보
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Self-referential relationship
    children = relationship("Menu", backref="parent", remote_side=[id])
    
    def to_dict(self):
        """메뉴 정보를 딕셔너리로 변환"""
        return {
            "id": self.id,
            "name": self.name,
            "path": self.path,
            "icon": self.icon,
            "parent_id": self.parent_id,
            "order": self.order,
            "is_active": self.is_active,
            "source_type": self.source_type,
            "metadata": self.menu_metadata or {},  # JSON 데이터 포함
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
