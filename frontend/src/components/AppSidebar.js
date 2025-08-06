// frontend/src/components/AppSidebar.js
import React from 'react'
import { useSelector, useDispatch } from 'react-redux'

import {
  CSidebar, CSidebarBrand, CSidebarNav, CSidebarToggler,
  CSidebarHeader,
  CSidebarFooter,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilGraph } from '@coreui/icons' // cilGraph 아이콘만 임포트 (CSidebarBrand용)
import SimpleBar from 'simplebar-react'

import { AppSidebarNav } from './AppSidebarNav'

// 로고 임포트 (기존 CoreUI 템플릿의 로고 사용)
import { logo } from 'src/assets/brand/logo'
import { sygnet } from 'src/assets/brand/sygnet'


const AppSidebar = ({ items }) => { // items 프롭을 받음
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)

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
        <SimpleBar>
          <AppSidebarNav items={items} />
        </SimpleBar>
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
