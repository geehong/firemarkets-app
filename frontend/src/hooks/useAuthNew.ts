// frontend/src/hooks/useAuthNew.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { sessionService, type SessionState, type SessionEvent } from '@/services/sessionService'

interface User {
  id: number
  username: string
  role: string
  permissions: Record<string, boolean>
}

interface LoginCredentials {
  username: string
  password: string
}

export function useAuth() {
  const [authState, setAuthState] = useState<SessionState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
    error: null,
    lastActivity: Date.now()
  })

  const router = useRouter()

  // 세션 상태 동기화
  const syncSessionState = useCallback(() => {
    const sessionState = sessionService.getState()
    setAuthState(sessionState)
  }, [])

  // 세션 이벤트 처리
  const handleSessionEvent = useCallback((event: SessionEvent) => {
    console.log('Session event:', event)
    
    switch (event.type) {
      case 'login':
        console.log('🔄 Login event received, checking user role for redirect')
        syncSessionState()
        
        // 로그인 확인 후 리다이렉션
        // setTimeout(() => {
        //   const userRole = event.data?.role
        //   if (userRole === 'super_admin') {
        //     console.log('✅ Redirecting to /admin (super_admin)')
        //     window.location.href = '/admin'
        //   } else if (userRole === 'admin') {
        //     console.log('✅ Redirecting to /admin (admin)')
        //     window.location.href = '/admin'
        //   } else {
        //     console.log('✅ Redirecting to /blog (regular user)')
        //     window.location.href = '/blog'
        //   }
        // }, 100) // 100ms 지연으로 상태 업데이트 완료 대기
        break
      case 'logout':
        console.log('🔄 Logout event received, redirecting to main page')
        syncSessionState()
        // 로그아웃 확인 후 리다이렉션
        // setTimeout(() => {
        //   console.log('✅ Redirecting to / (logout)')
        //   window.location.href = '/'
        // }, 100)
        break
      case 'session_expired':
        console.log('🔄 Session expired, redirecting to main page')
        syncSessionState()
        // 세션 만료 시에도 메인 페이지로 리다이렉션
        // setTimeout(() => {
        //   console.log('✅ Redirecting to / (session expired)')
        //   window.location.href = '/'
        // }, 100)
        break
      case 'token_refresh':
        console.log('Token refreshed successfully')
        break
      case 'error':
        console.error('Session error:', event.data)
        break
    }
  }, [syncSessionState, router])

  // 인증 상태 확인 (기존 호환성 유지)
  const checkAuth = useCallback(async () => {
    syncSessionState()
  }, [syncSessionState])

  // 로그인
  const login = useCallback(async (credentials: LoginCredentials) => {
    const result = await sessionService.login(credentials)
    syncSessionState()
    return result
  }, [syncSessionState])

  // 로그아웃
  const logout = useCallback(async () => {
    await sessionService.logout()
    syncSessionState()
  }, [syncSessionState])

  // 권한 확인
  const hasPermission = useCallback((permission: string): boolean => {
    return authState.user?.permissions?.[permission] || false
  }, [authState.user])

  // 관리자 여부 확인
  const isAdmin = authState.user?.role === 'admin' || authState.user?.role === 'super_admin'

  // 수동 토큰 갱신
  const refreshToken = useCallback(async () => {
    return await sessionService.forceRefreshToken()
  }, [])

  // 초기화 및 이벤트 리스너 설정
  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') return

    // 초기 상태 동기화
    syncSessionState()

    // 세션 이벤트 리스너 등록
    const unsubscribe = sessionService.addEventListener(handleSessionEvent)

    // 컴포넌트 언마운트 시 정리
    return () => {
      unsubscribe()
    }
  }, [syncSessionState, handleSessionEvent])

  return {
    user: authState.user,
    loading: authState.isLoading,
    error: authState.error,
    isAuthenticated: authState.isAuthenticated,
    isAdmin,
    hasPermission,
    login,
    logout,
    checkAuth,
    refreshToken,
  }
}
