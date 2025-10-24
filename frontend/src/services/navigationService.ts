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
  
  // 모든 환경에서 프로덕션 API 사용
  return 'https://backend.firemarkets.net';
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
  async getMenuStructure(language: string = 'ko') {
    // 서버 사이드에서는 빈 배열 반환
    if (typeof window === 'undefined') {
      console.log('navigationService - Server side, returning empty array');
      return [];
    }

    // 로컬 개발 환경에서는 정적 메뉴 반환
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('navigationService - Local development, returning static menu');
      return this.getStaticMenu();
    }

    try {
      const currentAPIURL = getAPIBaseURL();
      
      // API URL이 없으면 정적 메뉴 반환
      if (!currentAPIURL) {
        return this.getStaticMenu();
      }
      
      // 인증 헤더 가져오기
      const token = this.getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'https://backend.firemarkets.net/api/v1'
      const response = await axios.get(`${BACKEND_BASE}/navigation/menu?lang=${language}`, {
        headers,
        timeout: 15000, // 15초 타임아웃 (모바일 네트워크 고려)
        // withCredentials: true, // 리버스 프록시 CORS 문제로 임시 비활성화
        validateStatus: function (status) {
          return status >= 200 && status < 300; // 기본값
        }
      });
      
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
        console.log('navigationService - 401 error, returning static menu');
        return this.getStaticMenu();
      } else if (error.response?.status === 403) {
        console.log('navigationService - 403 error, returning static menu');
        return this.getStaticMenu();
      } else if (error.response?.status === 404) {
        console.log('navigationService - 404 error, returning static menu');
        return this.getStaticMenu();
      } else if (error.response?.status >= 500) {
        console.log('navigationService - 5xx error, returning static menu');
        return this.getStaticMenu();
      }
      
      // 기타 에러의 경우에도 정적 메뉴 반환
      console.log('navigationService - Other error, returning static menu');
      return this.getStaticMenu();
    }
  }

  /**
   * 동적 메뉴를 새로고침합니다
   */
  async refreshDynamicMenus() {
    try {
      const headers = this.getAuthHeaders();
      const currentAPIURL = getAPIBaseURL();
      const response = await axios.post('/api/v1/navigation/menu/refresh', {}, {
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
      const currentAPIURL = getAPIBaseURL();
      const response = await axios.get('/api/v1/navigation/menu/status', {
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

  /**
   * 로컬 개발 환경용 정적 메뉴를 반환합니다
   */
  private getStaticMenu() {
    return [
      {
        id: 1,
        name: "Dashboard",
        path: "/",
        icon: "cilSpeedometer",
        order: 1,
        is_active: true,
        source_type: "static",
        children: []
      },
      {
        id: 2,
        name: "Assets",
        path: "/assets",
        icon: "cilChartPie",
        order: 2,
        is_active: true,
        source_type: "static",
        children: []
      },
      {
        id: 3,
        name: "Onchain",
        path: "/onchain",
        icon: "cilPuzzle",
        order: 3,
        is_active: true,
        source_type: "static",
        children: []
      },
      {
        id: 4,
        name: "Blog",
        path: "/blog",
        icon: "cilDescription",
        order: 4,
        is_active: true,
        source_type: "static",
        children: []
      },
      {
        id: 5,
        name: "Calendar",
        path: "/calendar",
        icon: "cilCalendar",
        order: 5,
        is_active: true,
        source_type: "static",
        children: []
      },
      {
        id: 6,
        name: "User Profile",
        path: "/profile",
        icon: "cilShieldAlt",
        order: 6,
        is_active: true,
        source_type: "static",
        children: []
      },
      {
        id: 7,
        name: "에디터",
        path: "/edit",
        icon: "cilPencil",
        order: 7,
        is_active: true,
        source_type: "static",
        children: [
          {
            id: 71,
            name: "CKEditor",
            path: "/edit/ckeditor",
            icon: "cilPencil",
            order: 1,
            is_active: true,
            source_type: "static",
            children: []
          },
          {
            id: 72,
            name: "Quill Editor",
            path: "/edit/quill",
            icon: "cilPencil",
            order: 2,
            is_active: true,
            source_type: "static",
            children: []
          },
          {
            id: 73,
            name: "Editor.js",
            path: "/edit/editorjs",
            icon: "cilPencil",
            order: 3,
            is_active: true,
            source_type: "static",
            children: []
          },
          {
            id: 74,
            name: "Editor.js Light",
            path: "/edit/editorjs-light",
            icon: "cilPencil",
            order: 4,
            is_active: true,
            source_type: "static",
            children: []
          }
        ]
      },
      {
        id: 8,
        name: "Admin Management",
        path: "/admin",
        icon: "cilSettings",
        order: 8,
        is_active: true,
        source_type: "static",
        children: [
          {
            id: 81,
            name: "App Config",
            path: "/admin/appconfig",
            icon: "cilCog",
            order: 1,
            is_active: true,
            source_type: "static",
            children: []
          }
        ]
      }
    ];
  }
}

export default new NavigationService();

