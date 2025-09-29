import React, { createContext, useContext, useState, useEffect } from 'react'

const AdminAuthContext = createContext()

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext)
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return context
}

export const AdminAuthProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [adminUser, setAdminUser] = useState(null)

  // 관리자 로그인 함수
  const login = async (username, password) => {
    try {
      setIsLoading(true)
      
      // 실제 구현에서는 API 호출
      const response = await fetch('/api/v1/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      if (response.ok) {
        const data = await response.json()
        setAdminUser(data.user)
        setIsAdmin(true)
        localStorage.setItem('adminToken', data.token)
        localStorage.setItem('adminUser', JSON.stringify(data.user))
        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, message: error.message || 'Login failed' }
      }
    } catch (error) {
      return { success: false, message: 'Network error' }
    } finally {
      setIsLoading(false)
    }
  }

  // 관리자 로그아웃 함수
  const logout = () => {
    setAdminUser(null)
    setIsAdmin(false)
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
  }

  // 토큰 검증 함수
  const verifyToken = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        setIsAdmin(false)
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/v1/admin/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAdminUser(data.user)
        setIsAdmin(true)
      } else {
        logout()
      }
    } catch (error) {
      logout()
    } finally {
      setIsLoading(false)
    }
  }

  // 컴포넌트 마운트 시 토큰 검증
  useEffect(() => {
    verifyToken()
  }, [])

  const value = {
    isAdmin,
    isLoading,
    adminUser,
    login,
    logout,
    verifyToken,
  }

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
} 