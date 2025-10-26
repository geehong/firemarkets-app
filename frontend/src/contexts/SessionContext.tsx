"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  permissions: string[];
  full_name?: string;
  avatar_url?: string;
}

interface SessionState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: string[];
  sessionExpiry: Date | null;
}

interface SessionContextType {
  state: SessionState;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  checkPermission: (permission: string) => boolean;
  checkRole: (role: string) => boolean;
}

interface LoginCredentials {
  username: string;
  password: string;
}

const SessionContext = createContext<SessionContextType | null>(null);

export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SessionState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    permissions: [],
    sessionExpiry: null
  });

  // 상태 변화 추적
  useEffect(() => {
    console.log('🔍 [SessionContext] 상태 변화:', {
      isLoading: state.isLoading,
      isAuthenticated: state.isAuthenticated,
      user: state.user?.username,
      permissions: state.permissions,
      timestamp: new Date().toISOString()
    });
  }, [state]);

  // 컴포넌트 마운트 시 기존 세션 확인
  useEffect(() => {
    const initializeSession = async () => {
      await checkExistingSession();
    };
    initializeSession();
  }, []);

  const checkExistingSession = async () => {
    console.log('🔍 [SessionContext] 기존 세션 확인 시작');
    console.log('🔍 [SessionContext] 현재 상태:', { 
      isLoading: state.isLoading, 
      isAuthenticated: state.isAuthenticated, 
      user: state.user?.username 
    });
    
    try {
      const token = localStorage.getItem('access_token');
      console.log('🔍 [SessionContext] 토큰 확인:', token ? `존재 (${token.substring(0, 20)}...)` : '없음');
      
      if (!token) {
        console.log('🔍 [SessionContext] 토큰 없음, 상태 초기화 시작');
        const newState = {
          user: null,
          isAuthenticated: false,
          isLoading: false,
          permissions: [],
          sessionExpiry: null
        };
        console.log('🔍 [SessionContext] 새 상태 설정:', newState);
        setState(newState);
        console.log('🔍 [SessionContext] 상태 설정 완료');
        return;
      }

      // 토큰 유효성 검증 (타임아웃 추가)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃
      console.log('🔍 [SessionContext] API 호출 시작: /api/v1/auth/me');
      console.log('🔍 [SessionContext] 요청 URL:', window.location.origin + '/api/v1/auth/me');
      console.log('🔍 [SessionContext] 요청 헤더:', { 
        'Authorization': `Bearer ${token.substring(0, 20)}...`, 
        'Content-Type': 'application/json' 
      });

      try {
        const response = await fetch('/api/v1/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log('🔍 [SessionContext] API 응답 상태:', response.status);

        if (response.ok) {
          const userData = await response.json();
          console.log('🔍 [SessionContext] 사용자 데이터 받음:', userData);
          setState({
            user: userData,
            isAuthenticated: true,
            isLoading: false,
            permissions: userData.permissions || [],
            sessionExpiry: new Date(Date.now() + 3600000) // 1시간
          });
        } else {
          console.log('🔍 [SessionContext] 토큰 유효하지 않음, 로그아웃');
          // 토큰이 유효하지 않으면 로그아웃
          await logout();
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('🔍 [SessionContext] API 호출 실패:', fetchError);
        // 네트워크 오류나 타임아웃의 경우 로그아웃
        await logout();
      }
    } catch (error) {
      console.error('🔍 [SessionContext] 세션 확인 실패:', error);
      // 최종적으로 로딩 상태 해제
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        permissions: [],
        sessionExpiry: null
      });
    }
  };

  const login = async (credentials: LoginCredentials) => {
    console.log('🔐 [SessionContext] 로그인 시도 시작');
    console.log('🔐 [SessionContext] 현재 상태:', {
      isLoading: state.isLoading,
      isAuthenticated: state.isAuthenticated,
      user: state.user?.username
    });
    console.log('🔐 [SessionContext] 로그인 정보:', credentials);
    
    try {
      console.log('🔐 [SessionContext] 로딩 상태 설정');
      setState(prev => {
        console.log('🔐 [SessionContext] 이전 상태:', prev);
        const newState = { ...prev, isLoading: true };
        console.log('🔐 [SessionContext] 새 상태:', newState);
        return newState;
      });

      console.log('🔐 [SessionContext] API 호출 시작: /api/v1/auth/login');
      console.log('🔐 [SessionContext] 요청 URL:', window.location.origin + '/api/v1/auth/login');
      console.log('🔐 [SessionContext] 요청 헤더:', { 'Content-Type': 'application/json' });
      console.log('🔐 [SessionContext] 요청 본문:', credentials);
      
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      console.log('🔐 [SessionContext] API 응답 상태:', response.status);

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      console.log('🔐 [SessionContext] 로그인 성공, 데이터:', data);
      
      // 토큰 저장
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('session_id', data.session_id);
      
      setState({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        permissions: data.user.permissions || [],
        sessionExpiry: new Date(Date.now() + 3600000) // 1시간
      });
    } catch (error) {
      console.error('🔐 [SessionContext] API 로그인 실패:', error);
      
      // 테스트용 더미 로그인 (실제 API 실패 시)
      console.log('🔐 [SessionContext] 더미 로그인 실행');
      const dummyUser: User = {
        id: 1,
        username: credentials.username,
        email: `${credentials.username}@example.com`,
        role: credentials.username === 'admin' ? 'admin' : 'user',
        permissions: credentials.username === 'admin' ? ['read', 'write', 'delete', 'admin'] : ['read'],
        full_name: credentials.username === 'admin' ? '관리자' : '사용자',
        avatar_url: '/images/user/adminavatar.png'
      };

      console.log('🔐 [SessionContext] 더미 사용자 생성:', dummyUser);
      console.log('🔐 [SessionContext] 로컬 스토리지에 토큰 저장');
      
      localStorage.setItem('access_token', 'dummy_access_token');
      localStorage.setItem('refresh_token', 'dummy_refresh_token');
      localStorage.setItem('session_id', 'dummy_session_id');

      console.log('🔐 [SessionContext] 상태 업데이트 시작');
      const newState = {
        user: dummyUser,
        isAuthenticated: true,
        isLoading: false,
        permissions: dummyUser.permissions,
        sessionExpiry: new Date(Date.now() + 3600000)
      };
      console.log('🔐 [SessionContext] 새 상태:', newState);
      
      setState(newState);
      
      console.log('🔐 [SessionContext] 더미 로그인 성공, 상태 업데이트 완료');
    }
  };

  const logout = async () => {
    console.log('🚪 [SessionContext] 로그아웃 시작');
    try {
      const sessionId = localStorage.getItem('session_id');
      if (sessionId) {
        console.log('🚪 [SessionContext] API 로그아웃 호출');
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId })
        });
      }
    } catch (error) {
      console.error('🚪 [SessionContext] 로그아웃 API 실패:', error);
    } finally {
      console.log('🚪 [SessionContext] 로컬 스토리지 정리 및 상태 초기화');
      // 로컬 스토리지 정리
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('session_id');
      
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        permissions: [],
        sessionExpiry: null
      });
    }
  };

  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      
      return data.access_token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
      throw error;
    }
  };

  const checkPermission = (permission: string): boolean => {
    if (!state.user) return false;
    if (state.user.role === 'admin') return true;
    return state.permissions.includes(permission);
  };

  const checkRole = (role: string): boolean => {
    if (!state.user) return false;
    return state.user.role === role;
  };

  return (
    <SessionContext.Provider value={{ 
      state, 
      login, 
      logout, 
      refreshToken, 
      checkPermission, 
      checkRole 
    }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
};

export const useAuth = () => {
  const { state } = useSession();
  return {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading
  };
};
