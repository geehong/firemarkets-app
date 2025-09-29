import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilSpeedometer,
  cilList,
  cilGraph,
  cilChart,
  cilMenu,
} from '@coreui/icons'
import { CNavItem } from '@coreui/react'

export const dynamicNavItems = [
  {
    component: CNavItem,
    name: 'Bull Market',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: '자산 목록',
    to: '/assetslist',
    icon: <CIcon icon={cilList} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: '자산 상세',
    to: '/assetsdetail',
    icon: <CIcon icon={cilGraph} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: '차트 테스트',
    to: '/charttest',
    icon: <CIcon icon={cilChart} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Invest Analysis',
    to: '/investanalysis',
    icon: <CIcon icon={cilMenu} customClassName="nav-icon" />,
  },
] 