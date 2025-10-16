// frontend/src/services/navigationService.ts
import axios from 'axios';

// API 기본 URL 설정 (클라이언트 사이드에서만)
const getAPIBaseURL = () => {
  // 서버 사이드에서는 빈 문자열 반환 (API 호출하지 않음)
  if (typeof window === 'undefined') {
    return '';
  }
  
  // 브라우저 환경에서 현재 호스트 기반으로 API URL 결정
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8001';
  } else if (hostname.includes('firemarkets.net')) {
    return 'https://backend.firemarkets.net';
  } else {
    // 기타 환경에서는 환경 변수 사용
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'https://backend.firemarkets.net';
  }
};

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
    // 서버 사이드에서는 빈 배열 반환
    if (typeof window === 'undefined') {
      console.log('navigationService - Server side, returning empty array');
      return [];
    }

    try {
      const currentAPIURL = getAPIBaseURL();
      
      // API URL이 없으면 빈 배열 반환
      if (!currentAPIURL) {
        console.log('navigationService - No API URL, returning empty array');
        return [];
      }
      
      console.log('navigationService - API_BASE_URL:', currentAPIURL);
      console.log('navigationService - Making request to:', `${currentAPIURL}/api/v1/navigation/menu`);
      console.log('navigationService - Current hostname:', window.location.hostname);
      
      // 인증 헤더 가져오기
      const token = this.getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      console.log('navigationService - Headers:', headers);
      
      const response = await axios.get(`${currentAPIURL}/api/v1/navigation/menu`, {
        headers,
        timeout: 15000, // 15초 타임아웃 (모바일 네트워크 고려)
        // withCredentials: true, // 리버스 프록시 CORS 문제로 임시 비활성화
        validateStatus: function (status) {
          return status >= 200 && status < 300; // 기본값
        }
      });
      
      console.log('navigationService - Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('navigationService - Failed to fetch menu structure:', error);
      console.error('navigationService - Error details:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        hostname: window.location.hostname
      });
      
      // 네트워크 에러 처리
      if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        throw new Error('서버에 연결할 수 없습니다. 네트워크를 확인해주세요.');
      } else if (error.code === 'TIMEOUT' || error.message.includes('timeout')) {
        throw new Error('요청 시간이 초과되었습니다. 다시 시도해주세요.');
      }
      
      // 권한 관련 에러 처리
      if (error.response?.status === 401) {
        throw new Error('인증이 필요합니다. 로그인해주세요.');
      } else if (error.response?.status === 403) {
        throw new Error('접근 권한이 없습니다.');
      } else if (error.response?.status === 404) {
        throw new Error('메뉴 API를 찾을 수 없습니다.');
      } else if (error.response?.status >= 500) {
        throw new Error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
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

