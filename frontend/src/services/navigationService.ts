// frontend/src/services/navigationService.ts
import axios from 'axios';

// API 기본 URL 설정
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001';

class NavigationService {
  /**
   * 인증 토큰을 가져옵니다
   */
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  /**
   * API 요청 헤더를 생성합니다
   */
  private getAuthHeaders() {
    const token = this.getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * 메뉴 구조를 가져옵니다
   */
  async getMenuStructure() {
    try {
      console.log('navigationService - API_BASE_URL:', API_BASE_URL);
      console.log('navigationService - Making request to:', `${API_BASE_URL}/api/v1/navigation/menu`);
      
      const headers = this.getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/api/v1/navigation/menu`, {
        headers
      });
      
      console.log('navigationService - Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('navigationService - Failed to fetch menu structure:', error);
      
      // 권한 관련 에러 처리
      if (error.response?.status === 401) {
        throw new Error('인증이 필요합니다. 로그인해주세요.');
      } else if (error.response?.status === 403) {
        throw new Error('접근 권한이 없습니다.');
      }
      
      throw new Error('메뉴 구조를 가져오는데 실패했습니다.');
    }
  }

  /**
   * 동적 메뉴를 새로고침합니다
   */
  async refreshDynamicMenus() {
    try {
      const headers = this.getAuthHeaders();
      const response = await axios.post(`${API_BASE_URL}/api/v1/navigation/menu/refresh`, {}, {
        headers
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to refresh dynamic menus:', error);
      
      if (error.response?.status === 401) {
        throw new Error('인증이 필요합니다. 로그인해주세요.');
      } else if (error.response?.status === 403) {
        throw new Error('관리자 권한이 필요합니다.');
      }
      
      throw new Error('동적 메뉴 새로고침에 실패했습니다.');
    }
  }

  /**
   * 메뉴 시스템 상태를 확인합니다
   */
  async getMenuStatus() {
    try {
      const headers = this.getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/api/v1/navigation/menu/status`, {
        headers
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to get menu status:', error);
      
      if (error.response?.status === 401) {
        throw new Error('인증이 필요합니다. 로그인해주세요.');
      } else if (error.response?.status === 403) {
        throw new Error('관리자 권한이 필요합니다.');
      }
      
      throw new Error('메뉴 상태를 가져오는데 실패했습니다.');
    }
  }
}

export default new NavigationService();

