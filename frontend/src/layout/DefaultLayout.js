import React from 'react'
import { AppContent, AppSidebar, AppFooter, AppHeader } from '../components/index'
import { useNavigation } from '../hooks/useNavigation' // 동적 네비게이션 훅
import getNavigationItems from '../_nav' // <<--- _nav.js에서 함수 임포트

const DefaultLayout = () => {
  // 동적 네비게이션 메뉴 로드
  const { menuItems, loading, error } = useNavigation()

  // 디버깅 로그 추가
  console.log('DefaultLayout - menuItems:', menuItems)
  console.log('DefaultLayout - loading:', loading)
  console.log('DefaultLayout - error:', error)

  // 로딩 중이거나 에러가 있을 때의 처리
  if (loading) {
    console.log('DefaultLayout - Loading state, showing spinner')
    return (
      <div className="wrapper">
        <AppSidebar items={[]} />
        <div className="body flex-grow-1 px-3">
          <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    console.error('Navigation error:', error)
    // 에러가 있어도 기본 레이아웃은 표시
  }

  // 동적 메뉴 아이템 생성 + 비어있을 경우 정적 테스트 메뉴 추가
  let dynamicNavItems = getNavigationItems(menuItems || [])
  if (!dynamicNavItems || dynamicNavItems.length === 0) {
    dynamicNavItems = [
      {
        component: 'CNavTitle',
        name: 'Fallback',
      },
      {
        component: 'CNavItem',
        name: 'Test Menu',
        to: '/dashboard',
      },
    ]
  }
  console.log('DefaultLayout - dynamicNavItems:', dynamicNavItems)

  return (
    <div>
      {/* AppSidebar에 dynamicNavItems를 'items' 프롭으로 전달 */}
      <AppSidebar items={dynamicNavItems || []} />
      <div className="wrapper d-flex flex-column min-vh-100 bg-light">
        <AppHeader />
        <div className="body flex-grow-1 px-3 px-md-3 px-sm-2 px-1">
          <AppContent />
        </div>
        <AppFooter />
      </div>
    </div>
  )
}

export default DefaultLayout
