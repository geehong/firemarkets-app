// frontend/src/services/tokenService.ts
'use client'

interface TokenData {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: {
    id: number
    username: string
    email?: string
    role: string
    avatar_url?: string
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
  saveTokens(tokenData: TokenData, remember: boolean = true): void {
    if (typeof window === 'undefined') return

    const storage = remember ? localStorage : sessionStorage

    // 다른 스토리지 클리어 (이중 저장 방지)
    if (remember) {
      sessionStorage.removeItem(this.ACCESS_TOKEN_KEY)
      sessionStorage.removeItem(this.REFRESH_TOKEN_KEY)
      sessionStorage.removeItem(this.USER_KEY)
      sessionStorage.removeItem(this.EXPIRES_AT_KEY)
      sessionStorage.removeItem(this.SESSION_ID_KEY)
    } else {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY)
      localStorage.removeItem(this.REFRESH_TOKEN_KEY)
      localStorage.removeItem(this.USER_KEY)
      localStorage.removeItem(this.EXPIRES_AT_KEY)
      localStorage.removeItem(this.SESSION_ID_KEY)
    }

    try {
      storage.setItem(this.ACCESS_TOKEN_KEY, tokenData.accessToken)
      storage.setItem(this.REFRESH_TOKEN_KEY, tokenData.refreshToken)
      storage.setItem(this.USER_KEY, JSON.stringify(tokenData.user))
      storage.setItem(this.EXPIRES_AT_KEY, tokenData.expiresAt.toString())
    } catch (error) {
      console.error('Failed to save tokens:', error)
    }
  }

  // Helper to get item from either storage
  private getItem(key: string): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(key) || sessionStorage.getItem(key)
  }

  // Access Token 조회
  getAccessToken(): string | null {
    return this.getItem(this.ACCESS_TOKEN_KEY)
  }

  // Refresh Token 조회
  getRefreshToken(): string | null {
    return this.getItem(this.REFRESH_TOKEN_KEY)
  }

  // 사용자 정보 조회
  getUser(): TokenData['user'] | null {
    try {
      const userStr = this.getItem(this.USER_KEY)
      return userStr ? JSON.parse(userStr) : null
    } catch (error) {
      console.error('Failed to get user:', error)
      return null
    }
  }

  // 토큰 만료 시간 조회
  getExpiresAt(): number | null {
    try {
      const expiresAt = this.getItem(this.EXPIRES_AT_KEY)
      return expiresAt ? parseInt(expiresAt, 10) : null
    } catch (error) {
      console.error('Failed to get expires at:', error)
      return null
    }
  }

  // 세션 ID 조회
  getSessionId(): string | null {
    return this.getItem(this.SESSION_ID_KEY)
  }

  // 세션 ID 저장 (현재 활성화된 스토리지에 저장)
  setSessionId(sessionId: string): void {
    if (typeof window === 'undefined') return

    // AccessToken이 있는 스토리지에 맞춤
    const storage = localStorage.getItem(this.ACCESS_TOKEN_KEY) ? localStorage : sessionStorage

    try {
      storage.setItem(this.SESSION_ID_KEY, sessionId)
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

  // 토큰 갱신 후 저장 (기존 스토리지 유지)
  updateTokens(refreshResponse: RefreshTokenResponse): void {
    if (typeof window === 'undefined') return

    // 현재 사용 중인 스토리지 확인
    const isLocalStorage = !!localStorage.getItem(this.ACCESS_TOKEN_KEY)
    const storage = isLocalStorage ? localStorage : sessionStorage

    try {
      const expiresAt = new Date(refreshResponse.expires_at).getTime()

      storage.setItem(this.ACCESS_TOKEN_KEY, refreshResponse.access_token)
      storage.setItem(this.EXPIRES_AT_KEY, expiresAt.toString())

      if (refreshResponse.session_id) {
        storage.setItem(this.SESSION_ID_KEY, refreshResponse.session_id)
      }
    } catch (error) {
      console.error('Failed to update tokens:', error)
    }
  }

  // 모든 토큰 삭제
  clearTokens(): void {
    if (typeof window === 'undefined') return

    try {
      // Clear BOTH
      localStorage.removeItem(this.ACCESS_TOKEN_KEY)
      localStorage.removeItem(this.REFRESH_TOKEN_KEY)
      localStorage.removeItem(this.USER_KEY)
      localStorage.removeItem(this.EXPIRES_AT_KEY)
      localStorage.removeItem(this.SESSION_ID_KEY)

      sessionStorage.removeItem(this.ACCESS_TOKEN_KEY)
      sessionStorage.removeItem(this.REFRESH_TOKEN_KEY)
      sessionStorage.removeItem(this.USER_KEY)
      sessionStorage.removeItem(this.EXPIRES_AT_KEY)
      sessionStorage.removeItem(this.SESSION_ID_KEY)
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
