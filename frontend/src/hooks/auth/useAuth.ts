'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

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

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

const API_BASE_URL = 'https://backend.firemarkets.net/api'

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  })
  const router = useRouter()

  // 인증 상태 확인
  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const savedUser = localStorage.getItem('user')

      if (token && savedUser) {
        // 토큰 검증을 위해 백엔드 API 호출
        const response = await fetch(`${API_BASE_URL}/auth/verify`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const userData = await response.json()
          setAuthState({
            user: userData,
            loading: false,
            error: null,
          })
        } else {
          // 토큰이 유효하지 않으면 localStorage 정리
          localStorage.removeItem('accessToken')
          localStorage.removeItem('user')
          setAuthState({
            user: null,
            loading: false,
            error: 'Session expired',
          })
        }
      } else {
        setAuthState({
          user: null,
          loading: false,
          error: null,
        })
      }
    } catch (error) {
      setAuthState({
        user: null,
        loading: false,
        error: 'Failed to verify authentication',
      })
    }
  }, [])

  // 로그인
  const login = useCallback(async (credentials: LoginCredentials) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch(`${API_BASE_URL}/auth/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      if (response.ok && data.access_token && data.user) {
        // 로그인 성공 시 세션 정보를 localStorage에 저장
        localStorage.setItem('accessToken', data.access_token)
        localStorage.setItem('user', JSON.stringify(data.user))

        setAuthState({
          user: data.user,
          loading: false,
          error: null,
        })

        return { success: true, user: data.user }
      } else {
        const errorMessage = data.detail || data.message || 'Login failed'
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }))
        return { success: false, error: errorMessage }
      }
    } catch (error) {
      const errorMessage = 'Network error. Please try again.'
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }))
      return { success: false, error: errorMessage }
    }
  }, [])

  // 로그아웃
  const logout = useCallback(async () => {
    try {
      // localStorage에서 토큰과 사용자 정보 제거
      localStorage.removeItem('accessToken')
      localStorage.removeItem('user')

      // 백엔드 로그아웃 API 호출 (선택적)
      try {
        await fetch(`${API_BASE_URL}/auth/admin/logout`, {
          method: 'POST',
        })
      } catch (error) {
        console.error('Backend logout error:', error)
      }

      setAuthState({
        user: null,
        loading: false,
        error: null,
      })

      router.push('/signin')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }, [router])

  // 권한 확인
  const hasPermission = useCallback((permission: string): boolean => {
    return authState.user?.permissions?.[permission] || false
  }, [authState.user])

  // 관리자 여부 확인
  const isAdmin = authState.user?.role === 'admin' || authState.user?.role === 'super_admin'

  // 초기 인증 상태 확인 (비활성화 - useAuthNew 사용)
  useEffect(() => {
    // checkAuth() // useAuthNew로 대체됨
  }, [checkAuth])

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    isAdmin,
    hasPermission,
    login,
    logout,
    checkAuth,
  }
}
