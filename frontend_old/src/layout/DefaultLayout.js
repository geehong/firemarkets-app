// frontend/src/layout/DefaultLayout.js
import React from 'react'
import { AppContent, AppSidebar, AppFooter, AppHeader } from '../components/index'
import { useNavigation } from '../hooks/useNavigation' // 동적 네비게이션 훅
import getNavigationItems from '../_nav' // <<--- _nav.js에서 함수 임포트

const DefaultLayout = () => {
  // 동적 네비게이션 메뉴 로드
  const { menuItems, loading, error } = useNavigation()

  // 로딩 중이거나 에러가 있을 때의 처리
  if (loading) {
    return (
      <div className="wrapper">
        <AppSidebar />
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

  // 동적 메뉴 아이템 생성
  const dynamicNavItems = getNavigationItems(menuItems)

  return (
    <div>
      {/* AppSidebar에 dynamicNavItems를 'items' 프롭으로 전달 */}
      <AppSidebar items={dynamicNavItems} />
      <div className="wrapper d-flex flex-column min-vh-100 bg-light">
        {' '}
        {/* bg-light 클래스 추가 (템플릿 기본 스타일) */}
        <AppHeader />
        <div className="body flex-grow-1 px-3 px-md-3 px-sm-2 px-1">
          {' '}
          {/* 반응형 패딩: 데스크톱 px-3, 태블릿 px-2, 모바일 px-1 */}
          <AppContent />
        </div>
        <AppFooter />
      </div>
    </div>
  )
}

export default DefaultLayout
