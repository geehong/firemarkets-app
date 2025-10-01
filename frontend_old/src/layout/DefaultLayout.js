// frontend/src/layout/DefaultLayout.js
import React from 'react'
import { AppContent, AppSidebar, AppFooter, AppHeader } from '../components/index'

const DefaultLayout = () => {
  return (
    <div>
      {/* AppSidebar는 이제 items prop이 필요 없습니다. */}
      <AppSidebar />
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
