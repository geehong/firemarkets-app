// frontend/src/layout/DefaultLayout.js
import React, { useState, useEffect, useRef } from 'react' // useState, useEffect, useRef 임포트
import { AppContent, AppSidebar, AppFooter, AppHeader } from '../components/index'

// 필요한 CoreUI 컴포넌트들을 임포트합니다.
import { CNavGroup, CNavItem, CNavTitle } from '@coreui/react'
import CIcon from '@coreui/icons-react'
// 실제로 사용되는 아이콘만 임포트 (성능 최적화)
// import {
//   cilBell,
//   cilCalculator,
//   cilChartPie,
//   cilCursor,
//   cilDescription,
//   cilDrop,
//   cilExternalLink,
//   cilNotes,
//   cilPencil,
//   cilPuzzle,
//   cilSpeedometer,
//   cilStar,
//   cibBtc,
//   cibGoldenline,
//   cilGraph,
//   cilChart,
//   cilBank,
//   cilChartLine,
//   cilFactory,
//   cilDollar,
//   cilSwapHorizontal,
//   cilCalendarCheck,
//   cilLibrary,
//   cibBitcoin,
//   cilBarChart,
//   cilSettings,
//   cilShieldAlt,
//   cilClock,
//   cilList,
//   cilDataTransferDown,
//   cibMatrix,
// } from '@coreui/icons'

import axios from 'axios' // axios 임포트
import getNavigationItems from '../_nav' // <<--- _nav.js에서 함수 임포트

const DefaultLayout = () => {
  const [assetTypes, setAssetTypes] = useState([]) // 자산 유형 상태
  const hasFetchedAssetTypes = useRef(false) // 데이터 중복 Fetch 방지 Ref

  useEffect(() => {
    // asset_types 데이터를 한 번만 가져오도록
    if (hasFetchedAssetTypes.current) return

    const fetchAssetTypes = async () => {
      try {
        const response = await axios.get('/api/v1/asset-types?has_data=true&include_description=false') // 최적화된 자산 유형 (description 제외)
        setAssetTypes(response.data.data)
        hasFetchedAssetTypes.current = true // Fetch 완료 플래그 설정
      } catch (error) {
        console.error('자산 유형을 불러오는데 실패했습니다:', error)
      }
    }

    fetchAssetTypes()
  }, []) // 의존성 배열을 비워 컴포넌트 마운트 시 한 번만 실행

  // assetTypes가 변경될 때마다 내비게이션 아이템을 다시 생성
  // getNavigationItems 함수에 assetTypes를 인자로 전달하여 메뉴 아이템을 받습니다.
  const dynamicNavItems = getNavigationItems(assetTypes)

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
