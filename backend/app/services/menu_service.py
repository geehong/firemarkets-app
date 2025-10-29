"""
메뉴 권한 관리 서비스
"""
from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.asset import User
import logging

logger = logging.getLogger(__name__)


class MenuService:
    """메뉴 권한 관리 서비스 클래스"""
    
    def get_user_menus(self, db: Session, user: User) -> List[Dict[str, Any]]:
        """사용자 권한에 맞는 메뉴 목록 반환"""
        try:
            # 모든 활성 메뉴 조회
            result = db.execute(text('''
                SELECT id, name, path, icon, parent_id, "order", menu_metadata
                FROM menus 
                WHERE is_active = true 
                ORDER BY "order" ASC, id ASC
            '''))
            
            all_menus = result.fetchall()
            
            # 사용자 권한에 맞는 메뉴만 필터링
            accessible_menus = []
            for menu in all_menus:
                if self.has_menu_access(menu, user):
                    menu_dict = self.format_menu(menu)
                    accessible_menus.append(menu_dict)
            
            # 메뉴 트리 구조 생성
            return self.build_menu_tree(accessible_menus)
            
        except Exception as e:
            logger.error(f"Failed to get user menus: {e}")
            return []
    
    def has_menu_access(self, menu: tuple, user: User) -> bool:
        """메뉴 접근 권한 확인"""
        try:
            menu_metadata = menu[6]  # menu_metadata 컬럼
            
            if not menu_metadata:
                return True  # 메타데이터가 없으면 접근 허용
            
            permissions = menu_metadata.get('permissions', {})
            
            # 퍼블릭 메뉴는 모든 사용자 접근 가능
            if permissions.get('access_level') == 'public':
                return True
            
            # 권한 설정이 없으면 퍼블릭으로 간주
            if not permissions:
                return True
            
            # 제한된 메뉴는 역할 확인
            required_roles = permissions.get('roles', [])
            if not required_roles:
                return True  # 역할 제한이 없으면 접근 허용
            
            # 사용자 역할이 필요한 역할에 포함되는지 확인
            return user.role in required_roles
            
        except Exception as e:
            logger.error(f"Failed to check menu access: {e}")
            return False
    
    def format_menu(self, menu: tuple) -> Dict[str, Any]:
        """메뉴 데이터 포맷팅"""
        menu_metadata = menu[6] or {}
        
        return {
            "id": menu[0],
            "name": menu[1],
            "path": menu[2],
            "icon": menu[3],
            "parent_id": menu[4],
            "order": menu[5],
            "metadata": menu_metadata,
            "children": []  # 트리 구조를 위해 초기화
        }
    
    def build_menu_tree(self, menus: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """메뉴 트리 구조 생성"""
        # ID로 메뉴 매핑
        menu_map = {menu["id"]: menu for menu in menus}
        
        # 루트 메뉴와 자식 메뉴 분리
        root_menus = []
        
        for menu in menus:
            if menu["parent_id"] is None:
                # 루트 메뉴
                root_menus.append(menu)
            else:
                # 자식 메뉴 - 부모에 추가
                parent = menu_map.get(menu["parent_id"])
                if parent:
                    parent["children"].append(menu)
        
        # 자식 메뉴 정렬
        for menu in menus:
            if menu["children"]:
                menu["children"].sort(key=lambda x: (x["order"], x["id"]))
        
        # 루트 메뉴 정렬
        root_menus.sort(key=lambda x: (x["order"], x["id"]))
        
        return root_menus
    
    def get_menu_by_id(self, db: Session, menu_id: int) -> Optional[Dict[str, Any]]:
        """ID로 메뉴 조회"""
        try:
            result = db.execute(text('''
                SELECT id, name, path, icon, parent_id, "order", menu_metadata
                FROM menus 
                WHERE id = :menu_id AND is_active = true
            '''), {'menu_id': menu_id})
            
            menu = result.fetchone()
            if menu:
                return self.format_menu(menu)
            return None
            
        except Exception as e:
            logger.error(f"Failed to get menu by id {menu_id}: {e}")
            return None
    
    def check_menu_permission(self, db: Session, menu_id: int, user: User) -> bool:
        """특정 메뉴 접근 권한 확인"""
        try:
            result = db.execute(text('''
                SELECT id, name, path, icon, parent_id, "order", menu_metadata
                FROM menus 
                WHERE id = :menu_id AND is_active = true
            '''), {'menu_id': menu_id})
            
            menu = result.fetchone()
            if not menu:
                return False
            
            return self.has_menu_access(menu, user)
            
        except Exception as e:
            logger.error(f"Failed to check menu permission: {e}")
            return False


# 전역 인스턴스
menu_service = MenuService()




