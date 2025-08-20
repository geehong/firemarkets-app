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
  cilContrast,
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

const AppHeader = React.memo(() => {
  const headerRef = useRef()
  const location = useLocation()
  const navigate = useNavigate()
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)
  const hideTimerRef = useRef(null)
  
  // 헤더 상태 관리 - 주석처리
  const [headerState, setHeaderState] = useState('visible') // 'visible', 'transparent', 'hidden'
  const [breadcrumbVisible, setBreadcrumbVisible] = useState(true) // 브레드크럼 표시 상태
  const [breadcrumbAnimating, setBreadcrumbAnimating] = useState(false) // 브레드크럼 애니메이션 상태
  const headerTimerRef = useRef(null)
  const breadcrumbTimerRef = useRef(null)
  const lastScrollTop = useRef(0)
  const isUserScrolling = useRef(false)
  const scrollDirection = useRef('none') // 'up', 'down', 'none'
  const isMouseOver = useRef(false) // 마우스 오버 상태 추적

  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)

  // 브레드크럼 표시 함수 - 디바운싱 추가
  const showBreadcrumb = () => {
    // 이미 표시 중이거나 애니메이션 중이면 무시
    if (breadcrumbVisible || breadcrumbAnimating) {
      return
    }
    
    console.log('브레드크럼 표시 함수 호출') // 디버깅
    setBreadcrumbVisible(true)
    setBreadcrumbAnimating(false)
    if (breadcrumbTimerRef.current) {
      clearTimeout(breadcrumbTimerRef.current)
    }
  }

  // 데스크톱/모바일 구분
  const isMobile = window.innerWidth <= 768

  // 브레드크럼 자동 숨김 타이머 - 스크롤이 없을 때만 작동
  useEffect(() => {
    console.log('브레드크럼 상태 변경:', breadcrumbVisible, '모바일:', isMobile) // 디버깅
    
    // 마우스가 오버 중이거나 스크롤 중이면 타이머 설정하지 않음
    if (breadcrumbVisible && !isUserScrolling.current && scrollDirection.current === 'none' && !isMouseOver.current) {
      if (breadcrumbTimerRef.current) {
        clearTimeout(breadcrumbTimerRef.current)
      }
      
      breadcrumbTimerRef.current = setTimeout(() => {
        console.log('브레드크럼 자동 숨김 타이머 실행') // 디버깅
        // 마우스가 여전히 오버 중이면 숨기지 않음
        if (!isMouseOver.current) {
          setBreadcrumbAnimating(true)
          setTimeout(() => {
            setBreadcrumbVisible(false)
            setBreadcrumbAnimating(false)
          }, 2000) // 2초 애니메이션 후 숨김
        }
      }, 8000) // 8초 후 숨김
    }
    
    return () => {
      if (breadcrumbTimerRef.current) {
        clearTimeout(breadcrumbTimerRef.current)
      }
    }
  }, [breadcrumbVisible, isMobile])

  // 스크롤 이벤트 핸들러 - 주석처리
  useEffect(() => {
    const handleScroll = () => {
      if (!headerRef.current) return
      
      const currentScrollTop = document.documentElement.scrollTop
      const isScrollingDown = currentScrollTop > lastScrollTop.current && currentScrollTop > 10
      const isScrollingUp = currentScrollTop < lastScrollTop.current
      
      // 스크롤 방향 감지
      if (isScrollingDown) {
        isUserScrolling.current = true
        scrollDirection.current = 'down'
        setHeaderState('transparent')
        
        // 아래로 스크롤 시 브레드크럼 애니메이션으로 숨김
        if (breadcrumbVisible && !breadcrumbAnimating) {
          setBreadcrumbAnimating(true)
          setTimeout(() => {
            setBreadcrumbVisible(false)
            setBreadcrumbAnimating(false)
          }, 2000) // 2초 애니메이션
        }
        
        // 기존 타이머 정리
        if (headerTimerRef.current) {
          clearTimeout(headerTimerRef.current)
          headerTimerRef.current = null
        }
        if (breadcrumbTimerRef.current) {
          clearTimeout(breadcrumbTimerRef.current)
          breadcrumbTimerRef.current = null
        }
      } else if (isScrollingUp && currentScrollTop <= 10) {
        // 맨 위로 스크롤 시 모든 것 복원
        isUserScrolling.current = false
        scrollDirection.current = 'none'
        setHeaderState('visible')
        if (!breadcrumbVisible && !breadcrumbAnimating) {
          showBreadcrumb()
        }
      } else if (isScrollingUp) {
        // 위로 스크롤 시 브레드크럼 복원
        isUserScrolling.current = true
        scrollDirection.current = 'up'
        setHeaderState('transparent')
        if (!breadcrumbVisible && !breadcrumbAnimating) {
          showBreadcrumb()
        }
      }
      
      lastScrollTop.current = currentScrollTop
    }
    
    // 스크롤 멈춤 감지
    let scrollTimeout
    const handleScrollEnd = () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
      
      scrollTimeout = setTimeout(() => {
        isUserScrolling.current = false
        scrollDirection.current = 'none'
      }, 150) // 스크롤 멈춤 감지 시간
    }
    
    // 스크롤 이벤트 리스너
    let throttledScrollTimeout
    const throttledScroll = () => {
      if (throttledScrollTimeout) return
      
      throttledScrollTimeout = setTimeout(() => {
        handleScroll()
        handleScrollEnd()
        throttledScrollTimeout = null
      }, 16) // ~60fps
    }
    
    document.addEventListener('scroll', throttledScroll, { passive: true })
    
    return () => {
      document.removeEventListener('scroll', throttledScroll)
      if (headerTimerRef.current) {
        clearTimeout(headerTimerRef.current)
      }
      if (throttledScrollTimeout) {
        clearTimeout(throttledScrollTimeout)
      }
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
    }
  }, []) // 의존성 배열을 비워서 한 번만 실행되도록 수정

  // 헤더 마우스 이벤트 - 주석처리
  const onHeaderMouseEnter = () => {
    isUserScrolling.current = false
    scrollDirection.current = 'none'
    if (headerTimerRef.current) {
      clearTimeout(headerTimerRef.current)
      headerTimerRef.current = null
    }
    setHeaderState('visible')
    if (!breadcrumbVisible && !breadcrumbAnimating) {
      showBreadcrumb() // 마우스 오버 시 브레드크럼도 표시
    }
    isMouseOver.current = true
  }

  const onHeaderMouseLeave = () => {
    if (headerTimerRef.current) {
      clearTimeout(headerTimerRef.current)
    }
    headerTimerRef.current = setTimeout(() => {
      if (!isUserScrolling.current) {
        setHeaderState('transparent')
      }
    }, 5000) // 5초 후 투명화
    isMouseOver.current = false
  }

  // 헤더 클래스명 생성 - 주석처리
  const getHeaderClassName = () => {
    let className = 'mb-4 p-0'
    
    // 주석처리된 상태별 클래스 적용
    if (headerState === 'hidden') {
      className += ' header-hidden'
    } else if (headerState === 'transparent') {
      className += ' header-transparent'
    }
    
    return className
  }

  // 모바일 메뉴 토글
  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu)
    setHeaderState('visible')
    if (!breadcrumbVisible && !breadcrumbAnimating) {
      showBreadcrumb() // 모바일에서만 브레드크럼 자동 표시
    }
    
    if (headerTimerRef.current) {
      clearTimeout(headerTimerRef.current)
    }
    headerTimerRef.current = setTimeout(() => {
      setHeaderState('transparent')
    }, 4000)
  }

  // 드롭다운 마우스 이벤트
  const handleMouseEnter = (id) => {
    setOpenDropdown(id)
  }

  const handleMouseLeave = () => {
    // 드롭다운은 수동으로만 닫히도록 유지
  }

  return (
    <CHeader
      position="sticky"
      className={getHeaderClassName()}
      ref={headerRef}
      onMouseEnter={onHeaderMouseEnter}
      onMouseLeave={onHeaderMouseLeave}
    >
      <CContainer className="border-bottom px-4" fluid>
        <CHeaderToggler
          onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
          style={{ marginInlineStart: '-14px' }}
        >
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>
        
        {/* 데스크톱 메뉴 */}
        <CHeaderNav className="d-none d-md-flex" onMouseLeave={handleMouseLeave}>
          {/* MAP 메뉴 */}
          <CDropdown variant="nav-item" placement="bottom-start" visible={openDropdown === 'map'}>
            <CDropdownToggle caret={false} onMouseEnter={() => handleMouseEnter('map')}>
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

          {/* ONCHAIN 메뉴 */}
          <CDropdown variant="nav-item" placement="bottom-start" visible={openDropdown === 'onchain'}>
            <CDropdownToggle caret={false} onMouseEnter={() => handleMouseEnter('onchain')}>
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

          {/* ASSET 메뉴 */}
          <CDropdown variant="nav-item" placement="bottom-start" visible={openDropdown === 'asset'}>
            <CDropdownToggle caret={false} onMouseEnter={() => handleMouseEnter('asset')}>
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

          {/* ADMIN 메뉴 */}
          <CNavItem>
            <CNavLink to="/admin/manage" as={NavLink}>
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

        {/* 데스크톱 우측 메뉴 - 모바일에서는 숨김 */}
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
      
      <CContainer 
        className={`px-4 breadcrumb-container ${(!breadcrumbVisible && !breadcrumbAnimating) ? 'breadcrumb-hidden' : ''} ${breadcrumbAnimating ? 'breadcrumb-animating' : ''}`} 
        fluid
        onClick={() => {
          if (!breadcrumbVisible && !breadcrumbAnimating) {
            showBreadcrumb()
          }
        }} // 클릭 시 브레드크럼 표시 (조건부)
        onMouseEnter={() => {
          if (!breadcrumbVisible && !breadcrumbAnimating) {
            showBreadcrumb()
          }
        }} // 마우스 오버 시 브레드크럼 표시 (조건부)
      >
        <CustomBreadcrumb />
      </CContainer>
      
      {/* 브레드크럼이 숨겨진 상태에서 클릭할 수 있는 영역 */}
      {(!breadcrumbVisible && !breadcrumbAnimating) && (
        <div 
          className="breadcrumb-click-area"
          onClick={showBreadcrumb}
          onMouseEnter={showBreadcrumb}
        />
      )}

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
      
      {/* 헤더가 숨겨진 상태에서도 마우스 오버로 다시 표시하기 위한 얇은 상단 영역 - 주석처리 */}
      {/* <div className="header-reveal-strip" onMouseEnter={onHeaderMouseEnter} onClick={onHeaderMouseEnter} /> */}
    </CHeader>
  )
})

export default AppHeader

