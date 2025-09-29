import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import axios from 'axios'

import {
  CCloseButton,
  CSidebar,
  CSidebarNav,
  CNavItem,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilChart } from '@coreui/icons'
import SimpleBar from 'simplebar-react'

import { AppSidebarNav } from './AppSidebarNav'

import { logo } from 'src/assets/brand/logo'
import { sygnet } from 'src/assets/brand/sygnet'

// sidebar nav config
import navigation from '../_nav'

const AppSidebar = () => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const [navItems, setNavItems] = useState(navigation)

  useEffect(() => {
    const fetchAssetTypes = async () => {
      try {
        const response = await axios.get('/api/v1/asset-types')
        const assetTypes = response.data
        console.log('Fetched asset types:', assetTypes) // 응답 데이터 확인

        // _nav 배열을 복사하고 Assets List의 items를 업데이트
        const updatedNav = navigation.map((item) => {
          if (item.name === 'Assets List') {
            console.log('Found Assets List item:', item) // Assets List 아이템 확인
            const newItems = assetTypes.map((type) => ({
              component: CNavItem,
              name: type.type_name,
              to: `/assets/${type.type_name}`,
              icon: <CIcon icon={cilChart} customClassName="nav-icon" />,
            }))
            console.log('New items to be added:', newItems) // 새로 생성될 아이템들 확인
            return {
              ...item,
              items: newItems,
            }
          }
          return item
        })

        console.log('Updated navigation:', updatedNav) // 최종 업데이트된 네비게이션 확인
        setNavItems(updatedNav)
      } catch (error) {
        console.error('자산 타입을 불러오는데 실패했습니다:', error)
      }
    }

    fetchAssetTypes()
  }, [])

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
          <CIcon customClassName="sidebar-brand-full" icon={logo} height={32} />
          <CIcon customClassName="sidebar-brand-narrow" icon={sygnet} height={32} />
        </CSidebarBrand>
        <CCloseButton
          className="d-lg-none"
          dark
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>
      <CSidebarNav>
        <SimpleBar>
          <AppSidebarNav items={navItems} />
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

export default React.memo(AppSidebar)
