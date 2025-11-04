// frontend/src/components/test/SessionTest.tsx
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuthNew'
import { sessionService } from '@/services/sessionService'
import { tokenService } from '@/services/tokenService'

export default function SessionTest() {
  const { user, loading, error, isAuthenticated, login, logout, refreshToken } = useAuth()
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [testCredentials, setTestCredentials] = useState({
    username: 'testuser',
    password: 'test123'
  })

  // 세션 정보 업데이트
  const updateSessionInfo = () => {
    const tokenData = tokenService.getTokenData()
    const sessionState = sessionService.getState()
    
    setSessionInfo({
      tokenData,
      sessionState,
      isTokenExpired: tokenService.isTokenExpired(),
      isTokenExpiringSoon: tokenService.isTokenExpiringSoon(),
      hasValidTokens: tokenService.hasValidTokens()
    })
  }

  useEffect(() => {
    updateSessionInfo()
    const interval = setInterval(updateSessionInfo, 5000) // 5초마다 업데이트
    return () => clearInterval(interval)
  }, [])

  const handleLogin = async () => {
    const result = await login(testCredentials)
    console.log('Login result:', result)
    updateSessionInfo()
  }

  const handleLogout = async () => {
    await logout()
    updateSessionInfo()
  }

  const handleRefreshToken = async () => {
    const result = await refreshToken()
    console.log('Token refresh result:', result)
    updateSessionInfo()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Session Management Test</h1>
      
      {/* 인증 상태 */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Authentication Status</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>User:</strong> {user ? user.username : 'None'}
          </div>
          <div>
            <strong>Role:</strong> {user ? user.role : 'None'}
          </div>
          {error && (
            <div className="col-span-2 text-red-600">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>
      </div>

      {/* 로그인 폼 */}
      {!isAuthenticated && (
        <div className="mb-6 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Login Test</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Username:</label>
              <input
                type="text"
                value={testCredentials.username}
                onChange={(e) => setTestCredentials(prev => ({ ...prev, username: e.target.value }))}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password:</label>
              <input
                type="password"
                value={testCredentials.password}
                onChange={(e) => setTestCredentials(prev => ({ ...prev, password: e.target.value }))}
                className="w-full p-2 border rounded"
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </div>
      )}

      {/* 로그아웃 및 토큰 갱신 */}
      {isAuthenticated && (
        <div className="mb-6 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Session Actions</h2>
          <div className="space-x-3">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Logout
            </button>
            <button
              onClick={handleRefreshToken}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Refresh Token
            </button>
          </div>
        </div>
      )}

      {/* 세션 정보 */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Session Information</h2>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Has Valid Tokens:</strong> {sessionInfo?.hasValidTokens ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Token Expired:</strong> {sessionInfo?.isTokenExpired ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Token Expiring Soon:</strong> {sessionInfo?.isTokenExpiringSoon ? 'Yes' : 'No'}
          </div>
          {sessionInfo?.tokenData && (
            <div>
              <strong>Expires At:</strong> {new Date(sessionInfo.tokenData.expiresAt).toLocaleString()}
            </div>
          )}
          {sessionInfo?.tokenData && (
            <div>
              <strong>Time Until Expiry:</strong> {Math.max(0, Math.floor((sessionInfo.tokenData.expiresAt - Date.now()) / 1000 / 60))} minutes
            </div>
          )}
        </div>
      </div>

      {/* 디버그 정보 */}
      <div className="p-4 border rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold mb-3">Debug Information</h2>
        <pre className="text-xs overflow-auto max-h-96">
          {JSON.stringify(sessionInfo, null, 2)}
        </pre>
      </div>
    </div>
  )
}









