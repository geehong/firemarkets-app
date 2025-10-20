// frontend/src/hooks/useNavigation.ts
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import navigationService from '../services/navigationService';

export interface MenuItem {
  id: number;
  name: string;
  path?: string;
  icon?: string;
  parent_id?: number;
  order: number;
  is_active: boolean;
  source_type: string;
  metadata?: any;
  children?: MenuItem[];
}

/**
 * 동적 네비게이션 메뉴를 관리하는 커스텀 훅
 */
export const useNavigation = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // 클라이언트 사이드 감지
    setIsClient(typeof window !== 'undefined');
  }, []);

  useEffect(() => {
    // 클라이언트 사이드에서만 메뉴 로드
    if (isClient) {
      loadMenuItems();
    } else {
      // 서버 사이드에서는 로딩 상태 해제
      setLoading(false);
    }
  }, [isClient]);

  const loadMenuItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await navigationService.getMenuStructure();
      setMenuItems(items);
    } catch (err: any) {
      console.error('useNavigation - Failed to load menu items:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshMenus = async () => {
    try {
      await navigationService.refreshDynamicMenus();
      await loadMenuItems(); // 새로고침 후 메뉴 다시 로드
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to refresh menus:', err);
    }
  };

  // 현재 경로에 해당하는 메뉴 아이템 찾기
  const findCurrentMenuItem = (): MenuItem | null => {
    if (!menuItems || menuItems.length === 0) return null;

    const findInMenu = (items: MenuItem[]): MenuItem | null => {
      for (const item of items) {
        // 정확한 경로 매치
        if (item.path === pathname) {
          return item;
        }
        
        // 하위 메뉴에서 재귀 검색
        if (item.children && item.children.length > 0) {
          const found = findInMenu(item.children);
          if (found) return found;
        }
      }
      return null;
    };

    return findInMenu(menuItems);
  };

  const currentMenuItem = findCurrentMenuItem();

  return {
    menuItems,
    currentMenuItem,
    loading,
    error,
    refreshMenus,
    reloadMenus: loadMenuItems
  };
};

