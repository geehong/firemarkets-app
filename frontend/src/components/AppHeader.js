import React, { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  CContainer,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CHeader,
  CHeaderNav,
  CHeaderToggler,
  CNavLink,
  CNavItem,
  useColorModes,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilBell,
  cilContrast,
  cilEnvelopeOpen,
  cilList,
  cilMenu,
  cilMoon,
  cilSun,
  cilChartPie,
  cibMatrix,
  cibGoldenline,
  cilShieldAlt,
} from '@coreui/icons'

import { AppBreadcrumb } from './index'
import CustomBreadcrumb from './CustomBreadcrumb'
import { AppHeaderDropdown } from './header/index'

const AppHeader = () => {
  const headerRef = useRef()
  const location = useLocation()
  const navigate = useNavigate()
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showDropdowns, setShowDropdowns] = useState(false)
  const [hideTimeout, setHideTimeout] = useState(null)

  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)

  useEffect(() => {
    document.addEventListener('scroll', () => {
      headerRef.current &&
        headerRef.current.classList.toggle('shadow-sm', document.documentElement.scrollTop > 0)
    })
  }, [])

  // 자동 숨김 타이머 관리
  useEffect(() => {
    if (showDropdowns) {
      if (hideTimeout) {
        clearTimeout(hideTimeout)
      }
      const timeout = setTimeout(() => {
        setShowDropdowns(false)
      }, 4000) // 4초 후 자동 숨김
      setHideTimeout(timeout)
    }
    return () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout)
      }
    }
  }, [showDropdowns])

  // 모바일 메뉴 토글
  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu)
  }

  // 드롭다운 표시/숨김
  const toggleDropdowns = () => {
    setShowDropdowns(!showDropdowns)
  }

  // 마우스 오버 시 드롭다운 표시
  const handleMouseEnter = () => {
    setShowDropdowns(true)
  }

  // 마우스 아웃 시 드롭다운 숨김
  const handleMouseLeave = () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout)
    }
    const timeout = setTimeout(() => {
      setShowDropdowns(false)
    }, 1000) // 1초 후 숨김
    setHideTimeout(timeout)
  }

  // CustomBreadcrumb가 모든 브레드크럼 로직을 처리하도록 변경
  // const isAssetDetailPage = location.pathname.startsWith('/assetsdetail/')

  return (
    <CHeader position="sticky" className="mb-4 p-0" ref={headerRef}>
      <CContainer className="border-bottom px-4" fluid>
        <CHeaderToggler
          onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
          style={{ marginInlineStart: '-14px' }}
        >
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>
        
        {/* 데스크톱 메뉴 */}
        <CHeaderNav className="d-none d-md-flex" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          {/* MAP 메뉴 */}
          <CNavItem>
            <CDropdown variant="nav-item" placement="bottom-start">
              <CDropdownToggle caret={false}>
                <CIcon icon={cilChartPie} size="lg" />
                MAP
              </CDropdownToggle>
              <CDropdownMenu>
                <CDropdownItem to="/world-assets-treemap" as={NavLink}>
                  World Assets TreeMap
                </CDropdownItem>
                <CDropdownItem to="/overviews/treemap" as={NavLink}>
                  Performance Map
                </CDropdownItem>
              </CDropdownMenu>
            </CDropdown>
          </CNavItem>

          {/* ONCHAIN 메뉴 */}
          <CNavItem>
            <CDropdown variant="nav-item" placement="bottom-start">
              <CDropdownToggle caret={false}>
                <CIcon icon={cibMatrix} size="lg" />
                ONCHAIN
              </CDropdownToggle>
              <CDropdownMenu>
                <CDropdownItem to="/onchain/overviews" as={NavLink}>
                  Market Metrics
                </CDropdownItem>
                <CDropdownItem to="/onchain/overviews?halving=true" as={NavLink}>
                  Halving Analysis
                </CDropdownItem>
                <CDropdownItem to="/onchain/overviews?metric=mvrv_z_score" as={NavLink}>
                  MVRV Z-Score
                </CDropdownItem>
                <CDropdownItem to="/onchain/overviews?metric=sopr" as={NavLink}>
                  SOPR
                </CDropdownItem>
              </CDropdownMenu>
            </CDropdown>
          </CNavItem>

          {/* ASSET 메뉴 */}
          <CNavItem>
            <CDropdown variant="nav-item" placement="bottom-start">
              <CDropdownToggle caret={false}>
                <CIcon icon={cibGoldenline} size="lg" />
                ASSET
              </CDropdownToggle>
              <CDropdownMenu>
                <CDropdownItem to="/assets" as={NavLink}>
                  All Assets
                </CDropdownItem>
                <CDropdownItem to="/assets?type_name=Stocks" as={NavLink}>
                  Stocks
                </CDropdownItem>
                <CDropdownItem to="/assets?type_name=Crypto" as={NavLink}>
                  Crypto
                </CDropdownItem>
                <CDropdownItem to="/assets?type_name=ETFs" as={NavLink}>
                  ETFs
                </CDropdownItem>
              </CDropdownMenu>
            </CDropdown>
          </CNavItem>

          {/* ADMIN 메뉴 */}
          <CNavItem>
            <CNavLink to="/admin/manage" as={NavLink}>
              <CIcon icon={cilShieldAlt} size="lg" />
              ADMIN
            </CNavLink>
          </CNavItem>
        </CHeaderNav>
        {/* 모바일 메뉴 토글 버튼 */}
        <CHeaderNav className="d-md-none">
          <CNavItem>
            <CNavLink onClick={toggleMobileMenu}>
              <CIcon icon={cilList} size="lg" />
            </CNavLink>
          </CNavItem>
        </CHeaderNav>

        {/* 데스크톱 우측 메뉴 */}
        <CHeaderNav className="ms-auto d-none d-md-flex">
          <li className="nav-item py-1">
            <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
          </li>
          <CDropdown variant="nav-item" placement="bottom-end">
            <CDropdownToggle caret={false}>
              {colorMode === 'dark' ? (
                <CIcon icon={cilMoon} size="lg" />
              ) : colorMode === 'auto' ? (
                <CIcon icon={cilContrast} size="lg" />
              ) : (
                <CIcon icon={cilSun} size="lg" />
              )}
            </CDropdownToggle>
            <CDropdownMenu>
              <CDropdownItem
                active={colorMode === 'light'}
                className="d-flex align-items-center"
                as="button"
                type="button"
                onClick={() => setColorMode('light')}
              >
                <CIcon className="me-2" icon={cilSun} size="lg" /> Light
              </CDropdownItem>
              <CDropdownItem
                active={colorMode === 'dark'}
                className="d-flex align-items-center"
                as="button"
                type="button"
                onClick={() => setColorMode('dark')}
              >
                <CIcon className="me-2" icon={cilMoon} size="lg" /> Dark
              </CDropdownItem>
              <CDropdownItem
                active={colorMode === 'auto'}
                className="d-flex align-items-center"
                as="button"
                type="button"
                onClick={() => setColorMode('auto')}
              >
                <CIcon className="me-2" icon={cilContrast} size="lg" /> Auto
              </CDropdownItem>
            </CDropdownMenu>
          </CDropdown>
          <li className="nav-item py-1">
            <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
          </li>
          <AppHeaderDropdown />
        </CHeaderNav>
      </CContainer>
      <CContainer className="px-4" fluid>
        <CustomBreadcrumb /> {/* CustomBreadcrumb가 모든 브레드크럼을 처리 */}
      </CContainer>

      {/* 모바일 메뉴 */}
      {showMobileMenu && (
        <CContainer className="d-md-none border-top" fluid>
          <div className="py-2">
            <div className="row">
              <div className="col-6">
                <CNavLink to="/world-assets-treemap" as={NavLink} className="d-block py-2">
                  <CIcon icon={cilChartPie} className="me-2" />
                  World Assets TreeMap
                </CNavLink>
                <CNavLink to="/overviews/treemap" as={NavLink} className="d-block py-2">
                  <CIcon icon={cilChartPie} className="me-2" />
                  Performance Map
                </CNavLink>
              </div>
              <div className="col-6">
                <CNavLink to="/onchain/overviews" as={NavLink} className="d-block py-2">
                  <CIcon icon={cibMatrix} className="me-2" />
                  Market Metrics
                </CNavLink>
                <CNavLink to="/onchain/overviews?halving=true" as={NavLink} className="d-block py-2">
                  <CIcon icon={cibMatrix} className="me-2" />
                  Halving Analysis
                </CNavLink>
              </div>
            </div>
            <div className="row mt-2">
              <div className="col-6">
                <CNavLink to="/assets" as={NavLink} className="d-block py-2">
                  <CIcon icon={cibGoldenline} className="me-2" />
                  All Assets
                </CNavLink>
                <CNavLink to="/assets?type_name=Stocks" as={NavLink} className="d-block py-2">
                  <CIcon icon={cibGoldenline} className="me-2" />
                  Stocks
                </CNavLink>
              </div>
              <div className="col-6">
                <CNavLink to="/assets?type_name=Crypto" as={NavLink} className="d-block py-2">
                  <CIcon icon={cibGoldenline} className="me-2" />
                  Crypto
                </CNavLink>
                <CNavLink to="/admin/manage" as={NavLink} className="d-block py-2">
                  <CIcon icon={cilShieldAlt} className="me-2" />
                  ADMIN
                </CNavLink>
              </div>
            </div>
          </div>
        </CContainer>
      )}
    </CHeader>
  )
}

export default AppHeader
