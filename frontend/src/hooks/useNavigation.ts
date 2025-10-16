// frontend/src/hooks/useNavigation.ts
import { useState, useEffect } from 'react';
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

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    try {
      console.log('useNavigation - Starting to load menu items');
      setLoading(true);
      setError(null);
      const items = await navigationService.getMenuStructure();
      console.log('useNavigation - Received items:', items);
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

  return {
    menuItems,
    loading,
    error,
    refreshMenus,
    reloadMenus: loadMenuItems
  };
};

