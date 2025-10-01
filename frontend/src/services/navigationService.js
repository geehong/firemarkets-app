// frontend/src/services/navigationService.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class NavigationService {
  /**
   * API에서 메뉴 구조를 가져옵니다
   */
  async getMenuStructure() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/navigation/menu`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch menu structure:', error);
      throw error;
    }
  }

  /**
   * 동적 메뉴를 새로고침합니다 (관리자용)
   */
  async refreshDynamicMenus() {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/navigation/menu/refresh`);
      return response.data;
    } catch (error) {
      console.error('Failed to refresh dynamic menus:', error);
      throw error;
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
      throw error;
    }
  }
}

export default new NavigationService();
