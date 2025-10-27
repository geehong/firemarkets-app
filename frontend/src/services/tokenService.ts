// frontend/src/services/tokenService.ts
'use client'

interface TokenData {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: {
    id: number
    username: string
    role: string
    permissions: Record<string, boolean>
  }
}

interface RefreshTokenResponse {
  access_token: string
  token_type: string
  session_id: string
  expires_at: string
}

class TokenService {
  private readonly ACCESS_TOKEN_KEY = 'access_token'
  private readonly REFRESH_TOKEN_KEY = 'refresh_token'
  private readonly USER_KEY = 'user'
  private readonly EXPIRES_AT_KEY = 'expires_at'
  private readonly SESSION_ID_KEY = 'session_id'

  // 토큰 저장
  saveTokens(tokenData: TokenData): void {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, tokenData.accessToken)
      localStorage.setItem(this.REFRESH_TOKEN_KEY, tokenData.refreshToken)
      localStorage.setItem(this.USER_KEY, JSON.stringify(tokenData.user))
      localStorage.setItem(this.EXPIRES_AT_KEY, tokenData.expiresAt.toString())
    } catch (error) {
      console.error('Failed to save tokens:', error)
    }
  }

  // Access Token 조회
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    
    try {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY)
    } catch (error) {
      console.error('Failed to get access token:', error)
      return null
    }
  }

  // Refresh Token 조회
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    
    try {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY)
    } catch (error) {
      console.error('Failed to get refresh token:', error)
      return null
    }
  }

  // 사용자 정보 조회
  getUser(): TokenData['user'] | null {
    if (typeof window === 'undefined') return null
    
    try {
      const userStr = localStorage.getItem(this.USER_KEY)
      return userStr ? JSON.parse(userStr) : null
    } catch (error) {
      console.error('Failed to get user:', error)
      return null
    }
  }

  // 토큰 만료 시간 조회
  getExpiresAt(): number | null {
    if (typeof window === 'undefined') return null
    
    try {
      const expiresAt = localStorage.getItem(this.EXPIRES_AT_KEY)
      return expiresAt ? parseInt(expiresAt, 10) : null
    } catch (error) {
      console.error('Failed to get expires at:', error)
      return null
    }
  }

  // 세션 ID 조회
  getSessionId(): string | null {
    if (typeof window === 'undefined') return null
    
    try {
      return localStorage.getItem(this.SESSION_ID_KEY)
    } catch (error) {
      console.error('Failed to get session id:', error)
      return null
    }
  }

  // 세션 ID 저장
  setSessionId(sessionId: string): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(this.SESSION_ID_KEY, sessionId)
    } catch (error) {
      console.error('Failed to save session id:', error)
    }
  }

  // 토큰 만료 여부 확인 (30분 전에 갱신)
  isTokenExpiringSoon(): boolean {
    const expiresAt = this.getExpiresAt()
    if (!expiresAt) return true

    const now = Date.now()
    const thirtyMinutes = 30 * 60 * 1000 // 30분
    return (expiresAt - now) < thirtyMinutes
  }

  // 토큰이 완전히 만료되었는지 확인
  isTokenExpired(): boolean {
    const expiresAt = this.getExpiresAt()
    if (!expiresAt) return true

    const now = Date.now()
    return now >= expiresAt
  }

  // 모든 토큰 정보 조회
  getTokenData(): TokenData | null {
    const accessToken = this.getAccessToken()
    const refreshToken = this.getRefreshToken()
    const user = this.getUser()
    const expiresAt = this.getExpiresAt()

    if (!accessToken || !refreshToken || !user || !expiresAt) {
      return null
    }

    return {
      accessToken,
      refreshToken,
      expiresAt,
      user
    }
  }

  // 토큰 갱신 후 저장
  updateTokens(refreshResponse: RefreshTokenResponse): void {
    if (typeof window === 'undefined') return
    
    try {
      const expiresAt = new Date(refreshResponse.expires_at).getTime()
      
      localStorage.setItem(this.ACCESS_TOKEN_KEY, refreshResponse.access_token)
      localStorage.setItem(this.EXPIRES_AT_KEY, expiresAt.toString())
      
      if (refreshResponse.session_id) {
        this.setSessionId(refreshResponse.session_id)
      }
    } catch (error) {
      console.error('Failed to update tokens:', error)
    }
  }

  // 모든 토큰 삭제
  clearTokens(): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY)
      localStorage.removeItem(this.REFRESH_TOKEN_KEY)
      localStorage.removeItem(this.USER_KEY)
      localStorage.removeItem(this.EXPIRES_AT_KEY)
      localStorage.removeItem(this.SESSION_ID_KEY)
    } catch (error) {
      console.error('Failed to clear tokens:', error)
    }
  }

  // 토큰 존재 여부 확인
  hasValidTokens(): boolean {
    const tokenData = this.getTokenData()
    return tokenData !== null && !this.isTokenExpired()
  }
}

export const tokenService = new TokenService()
export type { TokenData, RefreshTokenResponse }
