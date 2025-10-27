'use client'

import { useAuth } from '@/hooks/useAuthNew'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminPage() {
  const { user, isAuthenticated, isAdmin, loading } = useAuth()
  const router = useRouter()

  // 인증되지 않은 경우 로그인 페이지로 리다이렉션
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/admin/signin')
    }
  }, [isAuthenticated, loading, router])

  // 로딩 중이거나 인증되지 않은 경우
  if (loading) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'inline-block',
          width: '2rem',
          height: '2rem',
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '1rem', color: '#6b7280' }}>로딩 중...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // 리다이렉션 중
  }

  const handleNavigateToManage = () => {
    if (isAdmin) {
      router.push('/admin/appconfig')
    } else {
      router.push('/blog/manage')
    }
  }

  return (
    <div style={{
      padding: '2rem',
      textAlign: 'center',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        🔒 관리자 페이지
      </h1>
      
      {/* 로그인 완료 메시지 */}
      <div style={{
        backgroundColor: '#dbeafe',
        padding: '1rem',
        borderRadius: '0.5rem',
        marginBottom: '2rem'
      }}>
        <p style={{ color: '#1e40af', fontSize: '1rem', fontWeight: '500' }}>
          ✅ 로그인이 완료되었습니다!
        </p>
        <p style={{ color: '#1e40af', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          안녕하세요, <strong>{user?.username}</strong>님! ({user?.role.replace('_', ' ').toUpperCase()})
        </p>
      </div>

      {/* 역할별 버튼 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        alignItems: 'center'
      }}>
        {isAdmin ? (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>
              관리자 메뉴
            </h2>
            <button
              onClick={handleNavigateToManage}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#b91c1c'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#dc2626'}
            >
              🛠️ 관리자 설정
            </button>
            <p style={{ 
              fontSize: '0.875rem', 
              color: '#6b7280', 
              marginTop: '0.5rem' 
            }}>
              시스템 설정 및 관리 기능에 접근합니다
            </p>
          </div>
        ) : (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>
              사용자 메뉴
            </h2>
            <button
              onClick={handleNavigateToManage}
              style={{
                backgroundColor: '#2563eb',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
            >
              📝 글관리
            </button>
            <p style={{ 
              fontSize: '0.875rem', 
              color: '#6b7280', 
              marginTop: '0.5rem' 
            }}>
              내가 작성한 글을 관리합니다
            </p>
          </div>
        )}
      </div>

      {/* 추가 정보 */}
      <div style={{
        backgroundColor: '#f9fafb',
        padding: '1rem',
        borderRadius: '0.5rem',
        marginTop: '2rem'
      }}>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          💡 페이지가 정상적으로 로드되었습니다!
        </p>
      </div>
    </div>
  )
}
