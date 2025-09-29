// frontend/src/_nav.js
import React from 'react' // JSX를 사용하므로 React 임포트 유지
import CIcon from '@coreui/icons-react' // CIcon 컴포넌트 사용하므로 임포트 유지

// 실제로 사용되는 CoreUI 아이콘만 개별적으로 임포트 (성능 최적화)
import {
  cibBtc,
  cibGoldenline,
  cilChart,
  cilChartLine,
  cilFactory,
  cilDollar,
  cilSwapHorizontal,
  cilCalendarCheck,
  cilLibrary,
  cibBitcoin,
  cibMatrix,
  cilChartPie,
  cilPuzzle,
  cilDrop,
  cilPencil,
  cilCursor,
  cilNotes,
  cilStar,
  cilBell,
  cilShieldAlt,
} from '@coreui/icons'

// CoreUI 컴포넌트들을 여기서 임포트합니다.
import { CNavGroup, CNavItem, CNavTitle } from '@coreui/react'

// assetTypes를 인자로 받아 동적인 내비게이션 아이템을 생성하는 함수
const getNavigationItems = (assetTypes) => {
  // assetTypes가 아직 로드되지 않았을 경우 (초기 렌더링 시)를 대비하여 빈 배열로 초기화
  const safeAssetTypes = assetTypes || []

  // 자산 유형 이름에 따라 적절한 아이콘을 반환하는 헬퍼 함수
  const getAssetTypeIcon = (typeName) => {
    switch (typeName) {
      case 'Stocks':
        return cilChartLine
      case 'Commodities':
        return cilFactory
      case 'Currencies':
        return cilDollar
      case 'ETFs':
        return cilSwapHorizontal
      case 'Bonds':
        return cilCalendarCheck
      case 'Funds':
        return cilLibrary
      case 'Crypto':
        return cibBtc
      default:
        return cilChart // 기본 아이콘
    }
  }

  return [
    {
      component: CNavItem,
      name: 'Overview', // 기존 _nav.js의 항목
      to: '/dashboard',
      icon: <CIcon icon={cibBitcoin} customClassName="nav-icon" />,
      badge: {
        color: 'info',
        text: 'NEW',
      },
    },
    {
      component: CNavTitle,
      name: 'OnChain',
    },
    {
      component: CNavGroup,
      name: 'Halving',
      icon: <CIcon icon={cibMatrix} customClassName="nav-icon" />,
      items: [
        {
          component: CNavItem,
          name: 'Price Analysis',
          to: '/onchain/overviews',
          className: 'nav-submenu-item'
        },
        {
          component: CNavItem,
          name: 'Halving Analysis',
          to: '/onchain/overviews?halving=true',
          className: 'nav-submenu-item'
        },
        {
          component: CNavItem,
          name: 'Bull Market',
          to: '/onchain/overviews?metric=realized_price',
          className: 'nav-submenu-item'
        },
        {
          component: CNavItem,
          name: 'Spiral',
          to: '/onchain/overviews?metric=true_market_mean',
          className: 'nav-submenu-item'
        },
      ],
    },
    {
      component: CNavGroup,
      name: 'Market',
      icon: <CIcon icon={cibMatrix} customClassName="nav-icon" />,
      items: [
        {
          component: CNavItem,
          name: 'MVRV Z-Score',
          to: '/onchain/overviews?metric=mvrv_z_score',
          className: 'nav-submenu-item'
        },
        {
          component: CNavItem,
          name: 'SOPR',
          to: '/onchain/overviews?metric=sopr',
          className: 'nav-submenu-item'
        },
        {
          component: CNavItem,
          name: 'NUPL',
          to: '/onchain/overviews?metric=nupl',
          className: 'nav-submenu-item'
        },
        {
          component: CNavItem,
          name: 'Realized Cap',
          to: '/onchain/overviews?metric=realized_cap',
          className: 'nav-submenu-item'
        },
        {
          component: CNavItem,
          name: 'CDD 90DMA',
          to: '/onchain/overviews?metric=cdd_90dma',
          className: 'nav-submenu-item'
        },
        {
          component: CNavItem,
          name: 'NRPL BTC',
          to: '/onchain/overviews?metric=nrpl_btc',
          className: 'nav-submenu-item'
        },
        {
          component: CNavItem,
          name: 'AVIV',
          to: '/onchain/overviews?metric=aviv',
          className: 'nav-submenu-item'
        },
        {
          component: CNavItem,
          name: 'HODL Waves Supply',
          to: '/onchain/overviews?metric=hodl_waves_supply',
          className: 'nav-submenu-item'
        },
      ],
    },
    {
      component: CNavGroup,
      name: 'Price',
      icon: <CIcon icon={cibMatrix} customClassName="nav-icon" />,
      items: [
        {
          component: CNavItem,
          name: 'Realized Price',
          to: '/onchain/overviews?metric=realized_price',
          className: 'nav-submenu-item'
        },
        {
          component: CNavItem,
          name: 'True Market Mean',
          to: '/onchain/overviews?metric=true_market_mean',
          className: 'nav-submenu-item'
        },
      ],
    },
    {
      component: CNavGroup,
      name: 'Mining',
      icon: <CIcon icon={cibMatrix} customClassName="nav-icon" />,
      items: [
        {
          component: CNavItem,
          name: 'Hash Rate',
          to: '/onchain/overviews?metric=hashrate',
          className: 'nav-submenu-item'
        },
        {
          component: CNavItem,
          name: 'Difficulty',
          to: '/onchain/overviews?metric=difficulty',
          className: 'nav-submenu-item'
        },
        {
          component: CNavItem,
          name: 'Miner Reserves',
          to: '/onchain/overviews?metric=miner_reserves',
          className: 'nav-submenu-item'
        },
        {
          component: CNavItem,
          name: 'Thermo Cap',
          to: '/onchain/overviews?metric=thermo_cap',
          className: 'nav-submenu-item'
        },
      ],
    },
    {
      component: CNavGroup,
      name: 'Institutional',
      icon: <CIcon icon={cibMatrix} customClassName="nav-icon" />,
      items: [
        {
          component: CNavItem,
          name: 'ETF BTC Total',
          to: '/onchain/overviews?metric=etf_btc_total',
          className: 'nav-submenu-item'
        },
        {
          component: CNavItem,
          name: 'ETF BTC Flow',
          to: '/onchain/overviews?metric=etf_btc_flow',
          className: 'nav-submenu-item'
        },
      ],
    },
    {
      component: CNavGroup,
      name: 'Derivatives',
      icon: <CIcon icon={cibMatrix} customClassName="nav-icon" />,
      items: [
        {
          component: CNavItem,
          name: 'Open Interest Futures',
          to: '/onchain/open-interest',
          className: 'nav-submenu-item'
        },
      ],
    },
    {
      component: CNavTitle,
      name: 'Asset Analysis', // 기존 _nav.js의 항목
    },

    {
      component: CNavGroup,
      name: 'TreeMap',
      icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />, // 기존 아이콘 재사용
      items: [
        {
          component: CNavItem,
          name: 'World Assets TreeMap',
          to: '/world-assets-treemap',
        },
        {
          component: CNavItem,
          name: 'Performance Map',
          to: '/overviews/treemap',
        },
      ],
    },
    {
      component: CNavGroup,
      name: 'Assets', // "Assets List"를 "자산 목록"으로 변경 (요청사항 반영)
      icon: <CIcon icon={cibGoldenline} customClassName="nav-icon" />, // 기존 _nav.js 아이콘
      items: [
        {
          component: CNavItem,
          name: 'All Assets',
          to: '/assets', // 모든 자산 리스트 페이지 (쿼리 파라미터 없음)
        },
        // 백엔드에서 가져온 자산 유형별 서브 메뉴 동적 생성
        ...safeAssetTypes.map((type) => ({
          component: CNavItem,
          name: type.type_name,
          to: `/assets?type_name=${type.type_name}`, // 쿼리 파라미터를 사용
        })),
      ],
    },
    // Test 메뉴 추가
    {
      component: CNavGroup,
      name: 'Test',
      icon: <CIcon icon={cilPuzzle} customClassName="nav-icon" />,
      items: [
        { component: CNavItem, name: 'Test 1', to: '/test/test1' },
        { component: CNavItem, name: 'Test 2', to: '/test/test2' },
        { component: CNavItem, name: 'Test 3', to: '/test/test3' },
        { component: CNavItem, name: 'Test 4', to: '/test/test4' },
        { component: CNavItem, name: 'Test 5', to: '/test/test5' },
      ],
    },
    // 관리자 메뉴 추가
    {
      component: CNavTitle,
      name: 'Administration',
    },
    {
      component: CNavItem,
      name: 'System Admin',
      to: '/admin/manage',
      icon: <CIcon icon={cilShieldAlt} customClassName="nav-icon" />,
    },
    // 기존 _nav.js의 나머지 메뉴 항목들을 여기에 추가합니다.
    // 이전에 제공해주신 _nav.js의 모든 항목을 여기에 포함시킵니다.
    {
      component: CNavTitle,
      name: 'Theme',
    },
    {
      component: CNavItem,
      name: 'Colors',
      to: '/theme/colors',
      icon: <CIcon icon={cilDrop} customClassName="nav-icon" />,
    },
    {
      component: CNavItem,
      name: 'Typography',
      to: '/theme/typography',
      icon: <CIcon icon={cilPencil} customClassName="nav-icon" />,
    },
    {
      component: CNavTitle,
      name: 'Components',
    },
    {
      component: CNavGroup,
      name: 'Base',
      to: '/base',
      icon: <CIcon icon={cilPuzzle} customClassName="nav-icon" />,
      items: [
        { component: CNavItem, name: 'Accordion', to: '/base/accordion' },
        { component: CNavItem, name: 'Breadcrumb', to: '/base/breadcrumbs' },
        // Calendar, Smart Pagination, Smart Table, Virtual Scroller는 PRO 버전 기능이므로,
        // 필요시 CoreUI 공식 문서의 Free 버전에 있는 해당 컴포넌트의 대체재를 찾아야 합니다.
        // 여기서는 일단 Free 버전에 있는 기본 컴포넌트만 포함합니다.
        { component: CNavItem, name: 'Cards', to: '/base/cards' },
        { component: CNavItem, name: 'Carousel', to: '/base/carousels' },
        { component: CNavItem, name: 'Collapse', to: '/base/collapses' },
        { component: CNavItem, name: 'List group', to: '/base/list-groups' },
        { component: CNavItem, name: 'Navs & Tabs', to: '/base/navs' },
        { component: CNavItem, name: 'Pagination', to: '/base/paginations' },
        { component: CNavItem, name: 'Placeholders', to: '/base/placeholders' },
        { component: CNavItem, name: 'Popovers', to: '/base/popovers' },
        { component: CNavItem, name: 'Progress', to: '/base/progress' },
        { component: CNavItem, name: 'Spinners', to: '/base/spinners' },
        { component: CNavItem, name: 'Tables', to: '/base/tables' },
        { component: CNavItem, name: 'Tooltips', to: '/base/tooltips' },
      ],
    },
    {
      component: CNavGroup,
      name: 'Buttons',
      to: '/buttons',
      icon: <CIcon icon={cilCursor} customClassName="nav-icon" />,
      items: [
        { component: CNavItem, name: 'Buttons', to: '/buttons/buttons' },
        { component: CNavItem, name: 'Button groups', to: '/buttons/button-groups' },
        { component: CNavItem, name: 'Dropdowns', to: '/buttons/dropdowns' },
      ],
    },
    {
      component: CNavItem,
      name: 'Charts',
      to: '/charts',
      icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,
    },
    {
      component: CNavGroup,
      name: 'Forms',
      to: '/forms',
      icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
      items: [
        { component: CNavItem, name: 'Form Control', to: '/forms/form-control' },
        { component: CNavItem, name: 'Select', to: '/forms/select' },
        { component: CNavItem, name: 'Checks & Radios', to: '/forms/checks-radios' },
        { component: CNavItem, name: 'Range', to: '/forms/range' },
        { component: CNavItem, name: 'Input Group', to: '/forms/input-group' },
        { component: CNavItem, name: 'Floating Labels', to: '/forms/floating-labels' },
        { component: CNavItem, name: 'Layout', to: '/forms/layout' },
        { component: CNavItem, name: 'Validation', to: '/forms/validation' },
      ],
    },
    {
      component: CNavGroup,
      name: 'Icons',
      to: '/icons',
      icon: <CIcon icon={cilStar} customClassName="nav-icon" />,
      items: [
        { component: CNavItem, name: 'CoreUI Icons', to: '/icons/coreui-icons' },
        { component: CNavItem, name: 'Flags', to: '/icons/flags' },
        { component: CNavItem, name: 'Brands', to: '/icons/brands' },
      ],
    },
    {
      component: CNavGroup,
      name: 'Notifications',
      to: '/notifications',
      icon: <CIcon icon={cilBell} customClassName="nav-icon" />,
      items: [
        { component: CNavItem, name: 'Alerts', to: '/notifications/alerts' },
        { component: CNavItem, name: 'Badge', to: '/notifications/badges' },
        { component: CNavItem, name: 'Modals', to: '/notifications/modals' },
        { component: CNavItem, name: 'Toasts', to: '/notifications/toasts' },
      ],
    },
  ]
}

export default getNavigationItems
