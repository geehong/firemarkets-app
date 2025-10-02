// frontend/src/services/navigationService.js
import axios from 'axios';

// Vite 환경에서는 import.meta.env를 사용
// 기본값을 동일 오리진으로 변경하여 실기기/프로덕션에서 CORS 및 localhost 문제 방지
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

class NavigationService {
  /**
   * 메뉴 구조를 가져옵니다
   */
  async getMenuStructure() {
    try {
      console.log('navigationService - API_BASE_URL:', API_BASE_URL);
      console.log('navigationService - Making request to:', `${API_BASE_URL}/api/v1/navigation/menu`);
      const response = await axios.get(`${API_BASE_URL}/api/v1/navigation/menu`);
      console.log('navigationService - Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('navigationService - Failed to fetch menu structure:', error);
      throw new Error('메뉴 구조를 가져오는데 실패했습니다.');
    }
  }

  /**
   * 동적 메뉴를 새로고침합니다
   */
  async refreshDynamicMenus() {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/navigation/menu/refresh`);
      return response.data;
    } catch (error) {
      console.error('Failed to refresh dynamic menus:', error);
      throw new Error('동적 메뉴 새로고침에 실패했습니다.');
    }
  }

  /**
   * 메뉴 시스템 상태를 확인합니다
   */
  async getMenuStatus() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/navigation/menu/status`);
      return response.data;
    } catch (error) {
      console.error('Failed to get menu status:', error);
      throw new Error('메뉴 상태를 가져오는데 실패했습니다.');
    }
  }
}

export default new NavigationService();