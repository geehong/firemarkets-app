# backend/app/api/v1/endpoints/navigation.py
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import asc, text
from typing import List, Dict, Any, Optional
from ....core.database import get_postgres_db
from ....models.navigation import Menu
from ....dependencies.auth_deps import get_current_user_optional
from ....models.asset import User

router = APIRouter()
logger = logging.getLogger(__name__)


def check_menu_permissions(menu_dict: Dict[str, Any], user_role: str) -> bool:
    """메뉴의 권한을 확인합니다."""
    # menu_metadata와 metadata 둘 다 확인
    menu_metadata = menu_dict.get('menu_metadata', {}) or menu_dict.get('metadata', {})
    if not menu_metadata:
        return True  # 권한 설정이 없으면 모든 사용자에게 허용
    
    # 새로운 권한 구조 확인
    permissions = menu_metadata.get('permissions', {})
    if not permissions:
        return True  # 권한 설정이 없으면 모든 사용자에게 허용
    
    # 퍼블릭 메뉴는 모든 사용자 접근 가능
    if permissions.get('access_level') == 'public':
        return True
    
    # guest 사용자는 퍼블릭 메뉴만 접근 가능
    if user_role == 'guest':
        return permissions.get('access_level') == 'public'
    
    # super_admin은 모든 권한 통과
    if user_role == 'super_admin':
        return True
    
    # 제한된 메뉴는 역할 확인
    required_roles = permissions.get('roles', [])
    if not required_roles:
        return True  # 역할 제한이 없으면 접근 허용
    
    # 사용자 role이 필요한 역할에 포함되는지 확인
    has_access = user_role in required_roles
    
    # 디버깅 로그
    logger.info(f"DEBUG: Menu {menu_dict.get('name', 'Unknown')} - User: {user_role}, Required: {required_roles}, Access: {has_access}")
    
    return has_access


def filter_menus_by_permissions(menus: List[Dict[str, Any]], user_role: str) -> List[Dict[str, Any]]:
    """사용자 권한에 따라 메뉴를 필터링합니다."""
    filtered_menus = []
    
    for menu in menus:
        # 현재 메뉴의 권한 확인
        if not check_menu_permissions(menu, user_role):
            continue
        
        # 하위 메뉴들도 재귀적으로 필터링
        if 'children' in menu and menu['children']:
            filtered_children = filter_menus_by_permissions(menu['children'], user_role)
            if filtered_children:  # 하위 메뉴가 하나라도 있으면 부모 메뉴도 유지
                menu['children'] = filtered_children
                filtered_menus.append(menu)
        else:
            filtered_menus.append(menu)
    
    return filtered_menus


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
def get_menu_structure(
    lang: str = Query("ko", description="언어 코드 (ko, en)"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_postgres_db)
):
    """
    미리 생성된 menus 테이블에서 사용자 권한에 맞는 메뉴 구조를 가져옵니다.
    """
    try:
        # is_active가 true인 모든 메뉴를 플랫하게 조회
        all_menus = db.query(Menu).filter(Menu.is_active == True).order_by(asc(Menu.order)).all()
        logger.info(f"DEBUG: Total menus from DB: {len(all_menus)}")
        
        # Admin과 Components 메뉴 찾기
        admin_menus = [m for m in all_menus if m.name in ['Admin', '관리자']]
        components_menus = [m for m in all_menus if m.name in ['Components', '컴포넌트']]
        logger.info(f"DEBUG: Admin menus found: {len(admin_menus)}")
        logger.info(f"DEBUG: Components menus found: {len(components_menus)}")
        
        # 계층 구조로 변환
        menu_tree = build_menu_tree(all_menus)
        logger.info(f"DEBUG: Menu tree built, root menus: {len(menu_tree)}")
        
        # 사용자 권한에 따라 메뉴 필터링
        if current_user:
            user_role = current_user.role
            logger.info(f"DEBUG: User role: {user_role}, User: {current_user.username}")
            filtered_menu_tree = filter_menus_by_permissions(menu_tree, user_role)
        else:
            # 로그인하지 않은 사용자는 퍼블릭 메뉴만
            logger.info("DEBUG: No user, using guest role")
            filtered_menu_tree = filter_menus_by_permissions(menu_tree, 'guest')
        
        logger.info(f"DEBUG: Filtered menu tree count: {len(filtered_menu_tree)}")
        
        # 언어별 메뉴 이름 적용
        localized_menu_tree = apply_language_to_menus(filtered_menu_tree, lang)
        
        return localized_menu_tree
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get menu structure: {str(e)}")


def apply_language_to_menus(menus: List[Dict[str, Any]], lang: str) -> List[Dict[str, Any]]:
    """메뉴에 언어별 이름을 적용합니다."""
    def get_localized_menu_name(menu_dict: Dict[str, Any], language: str) -> str:
        """메뉴 이름을 언어별로 반환합니다."""
        # menu_metadata와 metadata 둘 다 확인
        menu_metadata = menu_dict.get('menu_metadata', {}) or menu_dict.get('metadata', {})
        if not menu_metadata:
            return menu_dict.get('name', 'Menu')
        
        # 언어별 메뉴 이름 반환
        if language == 'ko' and menu_metadata.get('ko_menu_name'):
            return menu_metadata['ko_menu_name']
        elif language == 'en' and menu_metadata.get('en_menu_name'):
            return menu_metadata['en_menu_name']
        
        # 폴백: 기본값 또는 첫 번째 값
        return menu_metadata.get('en_menu_name') or menu_metadata.get('ko_menu_name') or menu_dict.get('name', 'Menu')
    
    def process_menu(menu: Dict[str, Any]) -> Dict[str, Any]:
        """개별 메뉴를 처리합니다."""
        processed_menu = menu.copy()
        processed_menu['name'] = get_localized_menu_name(menu, lang)
        
        # 하위 메뉴가 있으면 재귀 처리
        if 'children' in menu and menu['children']:
            processed_menu['children'] = [process_menu(child) for child in menu['children']]
        
        return processed_menu
    
    return [process_menu(menu) for menu in menus]


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

from pydantic import BaseModel

class MenuCreate(BaseModel):
    name: str
    path: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[int] = None
    order: Optional[int] = 0
    is_active: Optional[bool] = True
    source_type: Optional[str] = 'static'
    menu_metadata: Optional[Dict[str, Any]] = {}

class MenuUpdate(BaseModel):
    name: Optional[str] = None
    path: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[int] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None
    source_type: Optional[str] = None
    menu_metadata: Optional[Dict[str, Any]] = None

@router.get("/menus", response_model=List[Dict[str, Any]])
def get_all_menus(
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user_optional) # Admin check should be enforced
):
    """
    모든 메뉴를 플랫한 리스트로 조회합니다. (관리자용)
    """
    # TODO: Admin check
    menus = db.query(Menu).order_by(asc(Menu.order)).all()
    return [menu.to_dict() for menu in menus]

@router.post("/menus", response_model=Dict[str, Any])
def create_menu(
    menu_in: MenuCreate,
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user_optional) # Admin check
):
    """
    새로운 메뉴를 생성합니다.
    """
    menu = Menu(
        name=menu_in.name,
        path=menu_in.path,
        icon=menu_in.icon,
        parent_id=menu_in.parent_id,
        order=menu_in.order,
        is_active=menu_in.is_active,
        source_type=menu_in.source_type,
        menu_metadata=menu_in.menu_metadata
    )
    db.add(menu)
    db.commit()
    db.refresh(menu)
    return menu.to_dict()

@router.put("/menus/{menu_id}", response_model=Dict[str, Any])
def update_menu(
    menu_id: int,
    menu_in: MenuUpdate,
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user_optional) # Admin check
):
    """
    메뉴 정보를 수정합니다.
    """
    menu = db.query(Menu).filter(Menu.id == menu_id).first()
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    
    update_data = menu_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(menu, field, value)
    
    db.commit()
    db.refresh(menu)
    return menu.to_dict()

@router.delete("/menus/{menu_id}")
def delete_menu(
    menu_id: int,
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user_optional) # Admin check
):
    """
    메뉴를 삭제합니다.
    """
    menu = db.query(Menu).filter(Menu.id == menu_id).first()
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    
    db.delete(menu)
    db.commit()
    return {"message": "Menu deleted successfully"}
