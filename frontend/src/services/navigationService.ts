// frontend/src/services/navigationService.ts
// NOTE: Do NOT use axios here - it causes SSR "location is not defined" error
// axios evaluates browser-only code at import time

// API 기본 URL 설정 (클라이언트 사이드에서만)
const getAPIBaseURL = () => {
  // 서버 사이드에서는 빈 문자열 반환 (API 호출하지 않음)
  if (typeof window === 'undefined') {
    return '';
  }

  // 로컬 개발 환경 우선
  return 'http://localhost:8001';
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
  private getAuthHeaders(): Record<string, string> {
    const token = this.getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Native fetch wrapper with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit & { timeout?: number } = {}
  ): Promise<Response> {
    const { timeout = 15000, ...fetchOptions } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 메뉴 구조를 가져옵니다
   */
  /**
   * 메뉴 구조를 가져옵니다
   */
  async getMenuStructure(language: string = 'ko') {
    // 로컬 정적 메뉴 사용
    return this.getStaticMenu();
  }

  /**
   * 동적 메뉴를 새로고침합니다
   */
  async refreshDynamicMenus() {
    if (typeof window === 'undefined') {
      throw new Error('Server-side execution not supported');
    }

    try {
      const headers = this.getAuthHeaders();
      const response = await this.fetchWithTimeout('/api/v1/navigation/menu/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('인증이 필요합니다. 로그인해주세요.');
        } else if (response.status === 403) {
          throw new Error('관리자 권한이 필요합니다.');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Failed to refresh dynamic menus:', err);
      throw new Error(err.message || '동적 메뉴 새로고침에 실패했습니다.');
    }
  }

  /**
   * 메뉴 시스템 상태를 확인합니다
   */
  async getMenuStatus() {
    if (typeof window === 'undefined') {
      throw new Error('Server-side execution not supported');
    }

    try {
      const headers = this.getAuthHeaders();
      const response = await this.fetchWithTimeout('/api/v1/navigation/menu/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('인증이 필요합니다. 로그인해주세요.');
        } else if (response.status === 403) {
          throw new Error('관리자 권한이 필요합니다.');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Failed to get menu status:', err);
      throw new Error(err.message || '메뉴 상태를 가져오는데 실패했습니다.');
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
      },
      {
        id: 9,
        name: "Charts",
        path: "/admin/chart",
        icon: "cilChartLine",
        order: 9,
        is_active: true,
        source_type: "static",
        children: []
      },
      {
        id: 10,
        name: "Tables",
        path: "/admin/tables",
        icon: "cilList",
        order: 10,
        is_active: true,
        source_type: "static",
        children: []
      }
    ];
  }
}

export default new NavigationService();

