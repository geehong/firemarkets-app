'use client'

import SignInForm from '@/components/auth/SignInForm'
import { useAuth } from '@/contexts/SessionContext'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminSignInPage() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()
  
  console.log('🚀 [AdminSignInPage] 컴포넌트 렌더링됨')
  console.log('🚀 [AdminSignInPage] 현재 상태:', { 
    isAuthenticated, 
    isLoading, 
    user: user?.username,
    userRole: user?.role,
    timestamp: new Date().toISOString()
  })
  
  useEffect(() => {
    console.log('🚀 [AdminSignInPage] useEffect 실행됨')
    console.log('🚀 [AdminSignInPage] 인증 상태:', { 
      isAuthenticated, 
      isLoading, 
      user: user?.username,
      userRole: user?.role,
      timestamp: new Date().toISOString()
    })
    
    // 이미 로그인된 경우 홈으로 리다이렉트 (로딩 상태 무시)
    if (isAuthenticated && user) {
      console.log('🚀 [AdminSignInPage] 이미 로그인됨, 홈으로 리다이렉트')
      router.push('/')
    }
  }, [isAuthenticated, user, router])

  // 상태 변화를 실시간으로 추적
  useEffect(() => {
    console.log('🚀 [AdminSignInPage] 상태 변화 감지:', {
      isAuthenticated,
      isLoading,
      hasUser: !!user,
      userRole: user?.role,
      timestamp: new Date().toISOString()
    })
  }, [isAuthenticated, isLoading, user])

  console.log('🚀 [AdminSignInPage] SignInForm 렌더링 시작')
  console.log('🚀 [AdminSignInPage] 로딩 상태 무시하고 폼 표시')
  
  // 로그인 페이지는 항상 로그인 폼을 표시 (로딩 상태 완전 무시)
  return (
    <html lang="ko">
      <head>
        <title>로그인 - FireMarkets</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded text-sm z-50">
            🔐 로그인 페이지 활성화됨
          </div>
          <SignInForm />
        </div>
      </body>
    </html>
  )
}