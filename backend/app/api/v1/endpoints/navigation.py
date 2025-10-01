# backend/app/api/v1/endpoints/navigation.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import asc, text
from typing import List, Dict, Any
from ....core.database import get_postgres_db
from ....models.navigation import Menu

router = APIRouter()


def build_menu_tree(menus: List[Menu]) -> List[Dict[str, Any]]:
    """DB에서 플랫하게 조회한 메뉴 목록을 계층 구조로 변환합니다."""
    menu_map = {menu.id: menu.to_dict() for menu in menus}
    root_menus = []

    # children 초기화
    for menu_id, menu_dict in menu_map.items():
        menu_dict['children'] = []

    # 계층 구조 구성
    for menu_id, menu_dict in menu_map.items():
        if menu_dict.get("parent_id"):
            parent = menu_map.get(menu_dict["parent_id"])
            if parent:
                parent['children'].append(menu_dict)
        else:
            root_menus.append(menu_dict)

    # 각 레벨에서 order에 따라 정렬
    def sort_children(node):
        node['children'].sort(key=lambda x: x.get('order', 0))
        for child in node['children']:
            sort_children(child)

    # root부터 재귀적으로 정렬
    root_menus.sort(key=lambda x: x.get('order', 0))
    for root_menu in root_menus:
        sort_children(root_menu)

    return root_menus


@router.get("/menu", response_model=List[Dict[str, Any]])
def get_menu_structure(db: Session = Depends(get_postgres_db)):
    """
    미리 생성된 menus 테이블에서 전체 메뉴 구조를 가져옵니다.
    """
    try:
        # is_active가 true인 모든 메뉴를 플랫하게 조회
        all_menus = db.query(Menu).filter(Menu.is_active == True).order_by(asc(Menu.order)).all()
        
        # 계층 구조로 변환하여 반환
        menu_tree = build_menu_tree(all_menus)
        return menu_tree
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get menu structure: {str(e)}")


@router.post("/menu/refresh")
def refresh_dynamic_menus(db: Session = Depends(get_postgres_db)):
    """
    동적 메뉴를 새로고침합니다. (관리자용)
    """
    try:
        # 저장 프로시저 실행
        db.execute(text("SELECT refresh_dynamic_menus()"))
        db.commit()
        
        return {"message": "Dynamic menus refreshed successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to refresh dynamic menus: {str(e)}")


@router.get("/menu/status")
def get_menu_status(db: Session = Depends(get_postgres_db)):
    """
    메뉴 시스템 상태를 확인합니다.
    """
    try:
        # 메뉴 개수 통계
        total_menus = db.query(Menu).count()
        static_menus = db.query(Menu).filter(Menu.source_type == 'static').count()
        dynamic_menus = db.query(Menu).filter(Menu.source_type == 'dynamic').count()
        active_menus = db.query(Menu).filter(Menu.is_active == True).count()
        
        return {
            "total_menus": total_menus,
            "static_menus": static_menus,
            "dynamic_menus": dynamic_menus,
            "active_menus": active_menus,
            "status": "healthy"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get menu status: {str(e)}")
