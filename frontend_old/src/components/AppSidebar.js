// frontend/src/components/AppSidebar.js
import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import axios from 'axios'

import {
  CSidebar,
  CSidebarBrand,
  CSidebarNav,
  CSidebarToggler,
  CSidebarHeader,
  CSidebarFooter,
  CSpinner,
} from '@coreui/react'

import { AppSidebarNav } from './AppSidebarNav'
import getNavigationItems from '../_nav'

// 로고 임포트 (기존 CoreUI 템플릿의 로고 사용)
import { logo } from 'src/assets/brand/logo'
import { sygnet } from 'src/assets/brand/sygnet'

const AppSidebar = () => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const [navItems, setNavItems] = useState([])
  const [loading, setLoading] = useState(true)

  // AppSidebarNav에서 가져온 데이터 fetching 로직
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setLoading(true)
        console.log('AppSidebar: 메뉴 데이터 가져오기 시작...')
        const response = await axios.get('/api/v1/navigation/menu')
        const formattedItems = getNavigationItems(response.data || [])
        setNavItems(formattedItems)
        console.log('AppSidebar: 메뉴 데이터 가져오기 및 포맷팅 완료.', formattedItems)
      } catch (error) {
        console.error('AppSidebar: 메뉴 아이템 가져오기 실패:', error)
        setNavItems([]) // 에러 발생 시 빈 배열로 설정
      } finally {
        setLoading(false)
      }
    }
    fetchMenuItems()
  }, [])

  // AppSidebar 컴포넌트가 렌더링될 때마다 items 프롭의 내용을 로그로 출력
  // console.log('AppSidebar: Received items prop:', items);

  return (
    <CSidebar
      className="border-end"
      colorScheme="dark"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible })
      }}
    >
      <CSidebarHeader className="border-bottom">
        <CSidebarBrand to="/">
          {/* logo와 sygnet은 이미지 경로이므로 CIcon 대신 <img> 태그 사용
             <img className="sidebar-brand-full" src={logo} alt="Logo" height={32} />
          <img className="sidebar-brand-narrow" src={sygnet} alt="Sygnet" height={32} />
          */}
                 <img className="sidebar-brand-full" src={logo} alt="Logo" height={32} />
                 <img className="sidebar-brand-narrow" src={sygnet} alt="Sygnet" height={32} />
        </CSidebarBrand>
      </CSidebarHeader>
      <CSidebarNav>
        <div style={{ height: '100%', overflowY: 'auto' }}>
          {loading ? (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '100%' }}>
              <CSpinner color="primary" />
            </div>
          ) : (
            // AppSidebarNav에 items prop 전달
            <AppSidebarNav items={navItems} />
          )}
        </div>
      </CSidebarNav>
      <CSidebarFooter className="border-top d-none d-lg-flex">
        <CSidebarToggler
          onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
        />
      </CSidebarFooter>
    </CSidebar>
  )
}

export default AppSidebar
