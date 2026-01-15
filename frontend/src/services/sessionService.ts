// frontend/src/services/sessionService.ts
'use client'

import { tokenService, type TokenData } from './tokenService'
import { authService } from './authService'

interface SessionState {
  isAuthenticated: boolean
  user: TokenData['user'] | null
  isLoading: boolean
  error: string | null
  lastActivity: number
}

interface SessionEvent {
  type: 'login' | 'logout' | 'token_refresh' | 'session_expired' | 'error'

  data?: any
  timestamp: number
}

type SessionEventListener = (event: SessionEvent) => void

class SessionService {
  private state: SessionState = {
    isAuthenticated: false,
    user: null,
    isLoading: true,
    error: null,
    lastActivity: Date.now()
  }

  private listeners: Set<SessionEventListener> = new Set()
  private refreshTimer: NodeJS.Timeout | null = null
  private activityTimer: NodeJS.Timeout | null = null
  private readonly REFRESH_INTERVAL = 5 * 60 * 1000 // 5분마다 체크
  private readonly INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30분 비활성 시 로그아웃

  constructor() {
    // 클라이언트 사이드에서만 초기화
    if (typeof window !== 'undefined') {
      this.initializeSession()
      this.setupActivityTracking()
      this.setupStorageListener()
    }
  }

  // 세션 초기화
  private async initializeSession(): Promise<void> {
    try {
      this.setState({ isLoading: true, error: null })

      // 토큰 데이터가 있는지 확인 (만료 여부와 관계없이)
      const tokenData = tokenService.getTokenData()
      const refreshToken = tokenService.getRefreshToken()

      // 1. 토큰 데이터가 아예 없으면 로그아웃 상태
      if (!tokenData && !refreshToken) {
        this.setState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null
        })
        return
      }

      // 2. 토큰이 만료되었는지 확인
      if (tokenService.isTokenExpired()) {
        console.log('Access token expired, attempting refresh...')
        // 3. 만료되었지만 Refresh Token이 있으면 갱신 시도
        if (refreshToken) {
          const refreshSuccess = await this.refreshToken()
          if (refreshSuccess) {
            // 갱신 성공 시 상태 업데이트는 refreshToken() 내부에서 처리됨
            // verifyToken을 통해 사용자 정보 최신화
            const verifyResult = await authService.verifyToken()
            if (verifyResult.success && verifyResult.user) {
              this.setState({
                user: verifyResult.user,
                isAuthenticated: true
              })
            }
            return
          }
        }

        // 갱신 실패하거나 Refresh Token이 없으면 만료 처리
        await this.handleTokenExpired()
        return
      }

      // 4. 토큰이 유효하면 검증
      const verifyResult = await authService.verifyToken()
      if (verifyResult.success && verifyResult.user) {
        this.setState({
          isAuthenticated: true,
          user: verifyResult.user,
          isLoading: false,
          error: null,
          lastActivity: Date.now()
        })
        this.startTokenRefreshTimer()
        this.emitEvent({ type: 'login', data: verifyResult.user, timestamp: Date.now() })
      } else {
        await this.handleTokenExpired()
      }
    } catch (error) {
      console.error('Session initialization error:', error)
      this.setState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: 'Failed to initialize session'
      })
    }
  }

  // 상태 업데이트
  private setState(updates: Partial<SessionState>): void {
    this.state = { ...this.state, ...updates }
    this.notifyListeners()
  }

  // 리스너에게 알림
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener({
          type: this.state.isAuthenticated ? 'login' : 'logout',
          data: this.state.user,
          timestamp: Date.now()
        })
      } catch (error) {
        console.error('Error notifying session listener:', error)
      }
    })
  }

  // 이벤트 발생
  private emitEvent(event: SessionEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Error emitting session event:', error)
      }
    })
  }

  // 토큰 갱신 타이머 시작
  private startTokenRefreshTimer(): void {
    this.clearRefreshTimer()
    this.refreshTimer = setInterval(async () => {
      await this.checkAndRefreshToken()
    }, this.REFRESH_INTERVAL)
  }

  // 토큰 갱신 타이머 정리
  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  // 토큰 확인 및 갱신
  private async checkAndRefreshToken(): Promise<void> {
    try {
      // 토큰이 만료되었거나 곧 만료될 예정인지 확인
      if (tokenService.isTokenExpired()) {
        await this.handleTokenExpired()
        return
      }

      if (tokenService.isTokenExpiringSoon()) {
        await this.refreshToken()
      }
    } catch (error) {
      console.error('Token refresh check error:', error)
      this.emitEvent({ type: 'error', data: error, timestamp: Date.now() })
    }
  }

  // 토큰 갱신
  private async refreshToken(): Promise<boolean> {
    try {
      const refreshResult = await authService.refreshToken()

      if (refreshResult.success && refreshResult.data) {
        tokenService.updateTokens(refreshResult.data)
        this.emitEvent({ type: 'token_refresh', data: refreshResult.data, timestamp: Date.now() })
        return true
      } else {
        console.warn('Token refresh failed:', refreshResult.error)
        await this.handleTokenExpired()
        return false
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      await this.handleTokenExpired()
      return false
    }
  }

  // 토큰 만료 처리
  private async handleTokenExpired(): Promise<void> {
    console.log('Token expired, logging out...')
    await this.logout()
    this.emitEvent({ type: 'session_expired', timestamp: Date.now() })
  }

  // 활동 추적 설정
  private setupActivityTracking(): void {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') return

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']

    const updateActivity = () => {
      this.state.lastActivity = Date.now()
      this.clearActivityTimer()
      this.startActivityTimer()
    }

    events.forEach(event => {
      document.addEventListener(event, updateActivity, true)
    })

    this.startActivityTimer()
  }

  // 활동 타이머 시작
  private startActivityTimer(): void {
    this.clearActivityTimer()
    this.activityTimer = setTimeout(() => {
      this.handleInactivity()
    }, this.INACTIVITY_TIMEOUT)
  }

  // 활동 타이머 정리
  private clearActivityTimer(): void {
    if (this.activityTimer) {
      clearTimeout(this.activityTimer)
      this.activityTimer = null
    }
  }

  // 비활성 상태 처리
  private handleInactivity(): void {
    console.log('User inactive, logging out...')
    this.logout()
  }

  // 스토리지 변경 감지 (다중 탭 동기화)
  private setupStorageListener(): void {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') return

    window.addEventListener('storage', (event) => {
      if (event.key === 'accessToken' || event.key === 'user') {
        // 다른 탭에서 로그인/로그아웃이 발생한 경우
        this.initializeSession()
      }
    })
  }

  // 로그인
  async login(credentials: { username: string; password: string; remember?: boolean }): Promise<{ success: boolean; error?: string }> {
    try {
      this.setState({ isLoading: true, error: null })

      const loginResult = await authService.login(credentials)

      if (loginResult.success && loginResult.data) {
        const tokenData: TokenData = {
          accessToken: loginResult.data.access_token,
          refreshToken: loginResult.data.refresh_token,
          expiresAt: new Date(loginResult.data.expires_at).getTime(),
          user: loginResult.data.user
        }

        tokenService.saveTokens(tokenData, credentials.remember)
        tokenService.setSessionId(loginResult.data.session_id)

        this.setState({
          isAuthenticated: true,
          user: loginResult.data.user,
          isLoading: false,
          error: null,
          lastActivity: Date.now()
        })

        this.startTokenRefreshTimer()
        this.emitEvent({ type: 'login', data: loginResult.data.user, timestamp: Date.now() })

        return { success: true }
      } else {
        this.setState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: loginResult.error || 'Login failed'
        })
        return { success: false, error: loginResult.error }
      }
    } catch (error) {
      console.error('Login error:', error)
      this.setState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: 'Network error during login'
      })
      return { success: false, error: 'Network error during login' }
    }
  }

  // 로그아웃
  async logout(): Promise<void> {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      this.clearRefreshTimer()
      this.clearActivityTimer()

      this.setState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
        lastActivity: Date.now()
      })

      this.emitEvent({ type: 'logout', timestamp: Date.now() })
    }
  }

  // 현재 상태 조회
  getState(): SessionState {
    return { ...this.state }
  }

  // 인증 상태 확인
  isAuthenticated(): boolean {
    return this.state.isAuthenticated
  }

  // 사용자 정보 조회
  getUser(): TokenData['user'] | null {
    return this.state.user
  }

  // 로딩 상태 확인
  isLoading(): boolean {
    return this.state.isLoading
  }

  // 에러 정보 조회
  getError(): string | null {
    return this.state.error
  }

  // 이벤트 리스너 등록
  addEventListener(listener: SessionEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // 수동 토큰 갱신
  async forceRefreshToken(): Promise<boolean> {
    return await this.refreshToken()
  }

  // 세션 정리
  destroy(): void {
    this.clearRefreshTimer()
    this.clearActivityTimer()
    this.listeners.clear()
  }
}

// 싱글톤 인스턴스
export const sessionService = new SessionService()
export type { SessionState, SessionEvent, SessionEventListener }
