import React, { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState(null)

  useEffect(() => { checkAuth() }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const savedUser = localStorage.getItem('user')
      if (token && savedUser) {
        try {
          const userData = await authService.verifyToken(token)
          setUser(userData)
          setAccessToken(token)
          localStorage.setItem('user', JSON.stringify(userData))
        } catch (e) {
          const ok = await refreshAccessToken()
          if (!ok) {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('user')
            setUser(null)
            setAccessToken(null)
          }
        }
      } else if (token) {
        try {
          const userData = await authService.verifyToken(token)
          setUser(userData)
          setAccessToken(token)
          localStorage.setItem('user', JSON.stringify(userData))
        } catch (e) {
          localStorage.removeItem('accessToken')
          setUser(null)
          setAccessToken(null)
        }
      }
    } catch (e) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('user')
      setUser(null)
      setAccessToken(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (username, password) => {
    try {
      const resp = await authService.adminLogin(username, password)
      if (resp.success) {
        setUser(resp.user)
        setAccessToken(resp.access_token)
        localStorage.setItem('accessToken', resp.access_token)
        localStorage.setItem('user', JSON.stringify(resp.user))
        return { success: true }
      }
      return { success: false, message: resp.message }
    } catch (e) {
      return { success: false, message: e.message }
    }
  }

  const logout = async () => {
    try { await authService.logout() } catch (_) {}
    setUser(null)
    setAccessToken(null)
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
  }

  const refreshAccessToken = async () => {
    try {
      const resp = await authService.refreshToken()
      if (resp.success) {
        setAccessToken(resp.access_token)
        localStorage.setItem('accessToken', resp.access_token)
        return true
      }
      return false
    } catch (e) {
      await logout()
      return false
    }
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const hasPermission = (permission) => user?.permissions?.[permission] || false

  return (
    <AuthContext.Provider value={{ user, loading, accessToken, isAdmin, hasPermission, login, logout, refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)


