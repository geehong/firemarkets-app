// frontend/src/services/authService.ts
'use client'

import { tokenService, type TokenData, type RefreshTokenResponse } from './tokenService'

interface LoginCredentials {
  username: string
  password: string
}

interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  session_id: string
  expires_at: string
  user: {
    id: number
    username: string
    role: string
    permissions: Record<string, boolean>
  }
}

interface ApiError {
  detail: string
  message?: string
}

class AuthService {
  private readonly API_BASE_URL = 'https://backend.firemarkets.net/api/v1'

  // 로그인
  async login(credentials: LoginCredentials): Promise<{ success: boolean; data?: LoginResponse; error?: string }> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      if (response.ok && data.access_token && data.user) {
        return { success: true, data }
      } else {
        const errorMessage = (data as ApiError).detail || (data as ApiError).message || 'Login failed'
        return { success: false, error: errorMessage }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Network error. Please try again.' }
    }
  }

  // 토큰 갱신
  async refreshToken(): Promise<{ success: boolean; data?: RefreshTokenResponse; error?: string }> {
    try {
      const refreshToken = tokenService.getRefreshToken()
      if (!refreshToken) {
        return { success: false, error: 'No refresh token available' }
      }

      const response = await fetch(`${this.API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      const data = await response.json()

      if (response.ok && data.access_token) {
        return { success: true, data }
      } else {
        const errorMessage = (data as ApiError).detail || (data as ApiError).message || 'Token refresh failed'
        return { success: false, error: errorMessage }
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      return { success: false, error: 'Network error during token refresh' }
    }
  }

  // 토큰 검증
  async verifyToken(): Promise<{ success: boolean; user?: TokenData['user']; error?: string }> {
    try {
      const accessToken = tokenService.getAccessToken()
      if (!accessToken) {
        return { success: false, error: 'No access token available' }
      }

      const response = await fetch(`${this.API_BASE_URL}/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const userData = await response.json()
        return { success: true, user: userData }
      } else {
        return { success: false, error: 'Token verification failed' }
      }
    } catch (error) {
      console.error('Token verification error:', error)
      return { success: false, error: 'Network error during token verification' }
    }
  }

  // 로그아웃
  async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      const accessToken = tokenService.getAccessToken()
      const sessionId = tokenService.getSessionId()

      // 백엔드 로그아웃 API 호출 (선택적)
      if (accessToken) {
        try {
          await fetch(`${this.API_BASE_URL}/auth/admin/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ session_id: sessionId }),
          })
        } catch (error) {
          console.warn('Backend logout failed, but continuing with local logout:', error)
        }
      }

      // 로컬 토큰 정리
      tokenService.clearTokens()

      return { success: true }
    } catch (error) {
      console.error('Logout error:', error)
      // 로그아웃은 실패해도 로컬 토큰은 정리
      tokenService.clearTokens()
      return { success: true, error: 'Logout completed with warnings' }
    }
  }

  // 세션 정보 조회
  async getSessions(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const accessToken = tokenService.getAccessToken()
      if (!accessToken) {
        return { success: false, error: 'No access token available' }
      }

      const response = await fetch(`${this.API_BASE_URL}/auth/sessions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        return { success: true, data }
      } else {
        return { success: false, error: 'Failed to fetch sessions' }
      }
    } catch (error) {
      console.error('Get sessions error:', error)
      return { success: false, error: 'Network error while fetching sessions' }
    }
  }

  // 특정 세션 무효화
  async revokeSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const accessToken = tokenService.getAccessToken()
      if (!accessToken) {
        return { success: false, error: 'No access token available' }
      }

      const response = await fetch(`${this.API_BASE_URL}/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        return { success: true }
      } else {
        return { success: false, error: 'Failed to revoke session' }
      }
    } catch (error) {
      console.error('Revoke session error:', error)
      return { success: false, error: 'Network error while revoking session' }
    }
  }
}

export const authService = new AuthService()
export type { LoginCredentials, LoginResponse, ApiError }
