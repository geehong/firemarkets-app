'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: number
  username: string
  role: string
  permissions: Record<string, boolean>
}

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export function useAuthGuard() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  })
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/verify')
      const data = await response.json()

      if (data.success) {
        setAuthState({
          user: data.user,
          loading: false,
          error: null,
        })
      } else {
        setAuthState({
          user: null,
          loading: false,
          error: data.message,
        })
        router.push('/signin')
      }
    } catch (error) {
      setAuthState({
        user: null,
        loading: false,
        error: 'Failed to verify authentication',
      })
      router.push('/signin')
    }
  }

  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })

      if (response.ok) {
        setAuthState({
          user: null,
          loading: false,
          error: null,
        })
        router.push('/signin')
        router.refresh()
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const isAdmin = authState.user?.role === 'admin' || authState.user?.role === 'super_admin'

  const hasPermission = (permission: string): boolean => {
    return authState.user?.permissions?.[permission] || false
  }

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    isAdmin,
    hasPermission,
    logout,
    checkAuth,
  }
}
