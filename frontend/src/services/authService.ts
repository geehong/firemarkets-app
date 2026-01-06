// frontend/src/services/authService.ts
'use client'

import { tokenService, type TokenData, type RefreshTokenResponse } from './tokenService'
import { apiClient } from '@/lib/api'

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
    email?: string
    role: string
    avatar_url?: string
    permissions: Record<string, boolean>
  }
}

interface ApiError {
  detail: string
  message?: string
}

class AuthService {
  // 로그인
  async login(credentials: LoginCredentials): Promise<{ success: boolean; data?: LoginResponse; error?: string }> {
    try {
      // apiClient.login returns the JSON response directly
      const data = await apiClient.login(credentials)

      if (data && data.access_token) {
        // Construct the expected structure if necessary, or ensure backend matches.
        // My backend returns: { access_token, refresh_token, token_type }
        // It does NOT return 'user' or 'expires_at' in the login response yet.
        // Wait, I need to check backend/app/api/v1/endpoints/auth.py again.
        // It returns schemas.Token: access_token, refresh_token, token_type.
        // It does NOT return user info or expiration.

        // So I must fetch user info separately if I want to match this interface?
        // Or I update backend to return user info?
        // Let's fetch user info immediately after login.

        apiClient.setAccessToken(data.access_token)
        const user = await apiClient.getMe()

        // Mocking session_id and expires_at if missing from backend for now, 
        // OR better, update backend to return them.
        // For now, let's assume standard JWT expiration (e.g. 1 hour) if not provided.
        // But wait, the backend creates a session.

        const combinedData: LoginResponse = {
          ...data,
          // Backend login response doesn't have user, session_id, expires_at in the top level response model 'Token'
          // I need to adapt here.
          user: user,
          session_id: "session-id-placeholder", // Backend doesn't return this to client in /login response schema
          expires_at: new Date(Date.now() + 3600 * 1000).toISOString() // Placeholder
        }

        return { success: true, data: combinedData }
      } else {
        return { success: false, error: 'Login failed' }
      }
    } catch (error: any) {
      console.error('Login error:', error)
      return { success: false, error: error.message || 'Network error' }
    }
  }

  // 토큰 갱신
  async refreshToken(): Promise<{ success: boolean; data?: RefreshTokenResponse; error?: string }> {
    try {
      const refreshToken = tokenService.getRefreshToken()
      if (!refreshToken) {
        return { success: false, error: 'No refresh token available' }
      }

      const data = await apiClient.refreshToken(refreshToken)

      if (data && data.access_token) {
        // Adapt response
        const response: RefreshTokenResponse = {
          access_token: data.access_token,
          token_type: data.token_type || 'bearer',
          session_id: 'refreshed-session', // Placeholder
          expires_at: new Date(Date.now() + 3600 * 1000).toISOString() // Placeholder
        }
        return { success: true, data: response }
      } else {
        return { success: false, error: 'Token refresh failed' }
      }
    } catch (error: any) {
      console.error('Token refresh error:', error)
      return { success: false, error: error.message || 'Network error during token refresh' }
    }
  }

  // 토큰 검증 (Get Me)
  async verifyToken(): Promise<{ success: boolean; user?: TokenData['user']; error?: string }> {
    try {
      // apiClient should already have the token set if we are logged in.
      // But verifyToken logic in SessionService checks tokenService first.
      const accessToken = tokenService.getAccessToken()
      if (!accessToken) {
        return { success: false, error: 'No access token available' }
      }

      // Ensure apiClient has the token
      apiClient.setAccessToken(accessToken)

      const user = await apiClient.getMe()
      if (user) {
        return { success: true, user }
      } else {
        return { success: false, error: 'Token verification failed' }
      }
    } catch (error: any) {
      console.error('Token verification error:', error)
      return { success: false, error: error.message || 'Network error during token verification' }
    }
  }

  // 로그아웃
  async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.logout()
      tokenService.clearTokens()
      return { success: true }
    } catch (error: any) {
      // Ignore 401 Unauthorized during logout (session likely already expired)
      if (error.status !== 401) {
        console.error('Logout error:', error)
      }
      tokenService.clearTokens()
      return { success: true, error: 'Logout completed with warnings' }
    }
  }

  // 세션 정보 조회
  async getSessions(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    // Not implemented in apiClient yet, skipping or keeping Fetch if strictly needed
    // But for now let's return empty
    return { success: false, error: 'Not implemented' }
  }

  // 특정 세션 무효화
  async revokeSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    // Not implemented
    return { success: false, error: 'Not implemented' }
  }
}

export const authService = new AuthService()
export type { LoginCredentials, LoginResponse, ApiError }
