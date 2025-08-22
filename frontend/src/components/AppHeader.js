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
  const isAnimating = useRef(false) // 애니메이션 중인지 확인하는 플래그
  const lastActionTime = useRef(0) // 마지막 액션 시간 추적

  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)

  // 브레드크럼 표시 함수 - 디바운싱 추가
  const showBreadcrumb = () => {
    // 이미 표시 중이거나 애니메이션 중이면 무시
    if (breadcrumbVisible || breadcrumbAnimating) {
      console.log('showBreadcrumb: 이미 표시 중이거나 애니메이션 중 - 무시')
      return
    }
    
    console.log('브레드크럼 표시 함수 호출') // 디버깅
    setBreadcrumbVisible(true)
    setBreadcrumbAnimating(false)
    isAnimating.current = false // 애니메이션 플래그도 리셋
    isMouseOver.current = true // 마우스 오버 상태 설정
    
    if (breadcrumbTimerRef.current) {
      clearTimeout(breadcrumbTimerRef.current)
      console.log('showBreadcrumb: 기존 타이머 정리')
    }
  }

  // 데스크톱/모바일 구분
  const isMobile = window.innerWidth <= 768

  // 브레드크럼 상태 변경 추적
  useEffect(() => {
    console.log('브레드크럼 상태 변경 감지:', {
      breadcrumbVisible,
      breadcrumbAnimating,
      timestamp: new Date().toISOString()
    })
  }, [breadcrumbVisible, breadcrumbAnimating])

  // 브레드크럼 자동 숨김 타이머 - 스크롤이 없을 때만 작동
  useEffect(() => {
    console.log('브레드크럼 상태 변경:', breadcrumbVisible, '모바일:', isMobile) // 디버깅
    console.log('브레드크럼 useEffect 조건:', {
      breadcrumbVisible,
      isUserScrolling: isUserScrolling.current,
      scrollDirection: scrollDirection.current,
      isMouseOver: isMouseOver.current
    })
    
    // 마우스가 오버 중이거나 스크롤 중이면 타이머 설정하지 않음
    if (breadcrumbVisible && !isUserScrolling.current && scrollDirection.current === 'none' && !isMouseOver.current) {
      if (breadcrumbTimerRef.current) {
        clearTimeout(breadcrumbTimerRef.current)
        console.log('브레드크럼 useEffect: 기존 타이머 정리')
      }
      
      console.log('브레드크럼 useEffect: 8초 타이머 설정')
      breadcrumbTimerRef.current = setTimeout(() => {
        console.log('브레드크럼 자동 숨김 타이머 실행') // 디버깅
        console.log('브레드크럼 타이머 실행 시 상태:', {
          isMouseOver: isMouseOver.current,
          isUserScrolling: isUserScrolling.current
        })
        // 마우스가 여전히 오버 중이면 숨기지 않음
        if (!isMouseOver.current) {
          console.log('브레드크럼: 애니메이션 시작')
          setBreadcrumbAnimating(true)
          setTimeout(() => {
            console.log('브레드크럼: 숨김 완료')
            setBreadcrumbVisible(false)
            setBreadcrumbAnimating(false)
          }, 2000) // 2초 애니메이션 후 숨김
        } else {
          console.log('브레드크럼: 마우스 오버 중이므로 숨기지 않음')
        }
      }, 8000) // 8초 후 숨김
    } else {
      console.log('브레드크럼 useEffect: 타이머 설정 조건 불만족')
    }
    
    return () => {
      if (breadcrumbTimerRef.current) {
        clearTimeout(breadcrumbTimerRef.current)
        console.log('브레드크럼 useEffect cleanup: 타이머 정리')
      }
    }
  }, [breadcrumbVisible, isMobile])

  // 스크롤 이벤트 핸들러 - 주석처리
  useEffect(() => {
    const handleScroll = () => {
      if (!headerRef.current) return
      
      const currentScrollTop = document.documentElement.scrollTop
      const scrollDifference = Math.abs(currentScrollTop - lastScrollTop.current)
      const currentTime = Date.now()
      
      // 최소 스크롤 거리 체크 (무한 루프 방지)
      if (scrollDifference < 30) {
        console.log('스크롤 거리 부족:', scrollDifference, 'px - 무시')
        return
      }
      
      // 액션 간격 체크 (디바운싱)
      if (currentTime - lastActionTime.current < 500) {
        console.log('액션 간격 부족:', currentTime - lastActionTime.current, 'ms - 무시')
        return
      }
      
      const isScrollingDown = currentScrollTop > lastScrollTop.current && currentScrollTop > 10
      const isScrollingUp = currentScrollTop < lastScrollTop.current
      
      console.log('스크롤 이벤트:', {
        currentScrollTop,
        lastScrollTop: lastScrollTop.current,
        scrollDifference,
        isScrollingDown,
        isScrollingUp,
        breadcrumbVisible,
        breadcrumbAnimating,
        isAnimating: isAnimating.current
      })
      
      // 스크롤 방향 감지
      if (isScrollingDown) {
        console.log('스크롤 다운 감지')
        isUserScrolling.current = true
        scrollDirection.current = 'down'
        setHeaderState('transparent')
        
        // 아래로 스크롤 시 브레드크럼 애니메이션으로 숨김 (마우스 오버 중이면 제외)
        if (breadcrumbVisible && !breadcrumbAnimating && !isAnimating.current && !isMouseOver.current) {
          console.log('스크롤 다운: 브레드크럼 애니메이션 시작')
          isAnimating.current = true
          lastActionTime.current = currentTime
          setBreadcrumbAnimating(true)
          // 즉시 visible을 false로 설정하여 중복 호출 방지
          setBreadcrumbVisible(false)
          setTimeout(() => {
            console.log('스크롤 다운: 브레드크럼 숨김 완료')
            setBreadcrumbAnimating(false)
            isAnimating.current = false
          }, 2000) // 2초 애니메이션
        } else if (isMouseOver.current) {
          console.log('스크롤 다운: 마우스 오버 중이므로 브레드크럼 유지')
        }
        
        // 기존 타이머 정리
        if (headerTimerRef.current) {
          clearTimeout(headerTimerRef.current)
          headerTimerRef.current = null
          console.log('스크롤 다운: 헤더 타이머 정리')
        }
        if (breadcrumbTimerRef.current) {
          clearTimeout(breadcrumbTimerRef.current)
          breadcrumbTimerRef.current = null
          console.log('스크롤 다운: 브레드크럼 타이머 정리')
        }
      } else if (isScrollingUp && currentScrollTop <= 10) {
        // 맨 위로 스크롤 시 모든 것 복원
        console.log('스크롤 맨 위: 모든 상태 복원')
        isUserScrolling.current = false
        scrollDirection.current = 'none'
        setHeaderState('visible')
        if (!breadcrumbVisible && !breadcrumbAnimating && !isAnimating.current) {
          lastActionTime.current = currentTime
          showBreadcrumb()
        }
      } else if (isScrollingUp) {
        // 위로 스크롤 시 브레드크럼 복원
        console.log('스크롤 업: 브레드크럼 복원')
        isUserScrolling.current = true
        scrollDirection.current = 'up'
        setHeaderState('transparent')
        if (!breadcrumbVisible && !breadcrumbAnimating && !isAnimating.current) {
          lastActionTime.current = currentTime
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
        console.log('스크롤 멈춤 감지')
        isUserScrolling.current = false
        scrollDirection.current = 'none'
      }, 300) // 스크롤 멈춤 감지 시간 증가
    }
    
    // 스크롤 이벤트 리스너
    let throttledScrollTimeout
    const throttledScroll = () => {
      if (throttledScrollTimeout) return
      
      throttledScrollTimeout = setTimeout(() => {
        // 애니메이션 중이면 스크롤 이벤트 무시
        if (isAnimating.current) {
          console.log('스크롤 이벤트: 애니메이션 중이므로 무시')
          throttledScrollTimeout = null
          return
        }
        
        handleScroll()
        handleScrollEnd()
        throttledScrollTimeout = null
      }, 100) // 100ms로 증가하여 스크롤 이벤트 빈도 더욱 감소
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
  }, [breadcrumbVisible, breadcrumbAnimating]) // 의존성 배열에 상태 추가

  // 헤더 마우스 이벤트 - 주석처리
  const onHeaderMouseEnter = () => {
    console.log('헤더 마우스 엔터')
    isUserScrolling.current = false
    scrollDirection.current = 'none'
    if (headerTimerRef.current) {
      clearTimeout(headerTimerRef.current)
      headerTimerRef.current = null
      console.log('헤더 마우스 엔터: 헤더 타이머 정리')
    }
    setHeaderState('visible')
    if (!breadcrumbVisible && !breadcrumbAnimating && !isAnimating.current) {
      console.log('헤더 마우스 엔터: 브레드크럼 표시 시도')
      showBreadcrumb() // 마우스 오버 시 브레드크럼도 표시
    }
    isMouseOver.current = true
  }

  const onHeaderMouseLeave = () => {
    console.log('헤더 마우스 리브')
    if (headerTimerRef.current) {
      clearTimeout(headerTimerRef.current)
    }
    headerTimerRef.current = setTimeout(() => {
      console.log('헤더 마우스 리브: 5초 후 투명화')
      if (!isUserScrolling.current) {
        setHeaderState('transparent')
      }
    }, 5000) // 5초 후 투명화
    isMouseOver.current = false
  }

  // 헤더 클래스명 생성
  const getHeaderClassName = () => {
    let className = 'header-sticky mb-1'
    
    // 상태별 클래스 적용
    if (headerState === 'hidden') {
      className += ' header-hidden'
    } else if (headerState === 'transparent') {
      className += ' header-transparent'
    }
    
    return className
  }

  // 브레드크럼 클래스명 생성
  const getBreadcrumbClassName = () => {
    let className = 'component-sub-nav-wrapper bg-body position-sticky z-3 sticky shadow-sm'
    
    if (!breadcrumbVisible && !breadcrumbAnimating) {
      className += ' breadcrumb-hidden'
    } else if (breadcrumbAnimating) {
      className += ' breadcrumb-animating'
    }
    
    return className
  }

  // 모바일 메뉴 토글
  const toggleMobileMenu = () => {
    console.log('모바일 메뉴 토글')
    setShowMobileMenu(!showMobileMenu)
    setHeaderState('visible')
    if (!breadcrumbVisible && !breadcrumbAnimating) {
      showBreadcrumb() // 모바일에서만 브레드크럼 자동 표시
    }
    
    if (headerTimerRef.current) {
      clearTimeout(headerTimerRef.current)
    }
    headerTimerRef.current = setTimeout(() => {
      console.log('모바일 메뉴: 4초 후 투명화')
      setHeaderState('transparent')
    }, 4000)
  }

  // 드롭다운 마우스 이벤트
  const handleMouseEnter = (id) => {
    console.log('드롭다운 마우스 엔터:', id)
    setOpenDropdown(id)
  }

  const handleMouseLeave = () => {
    console.log('드롭다운 마우스 리브')
    // 드롭다운은 수동으로만 닫히도록 유지
  }

  return (
    <>
      <CHeader
        className={getHeaderClassName()}
        ref={headerRef}
        onMouseEnter={onHeaderMouseEnter}
        onMouseLeave={onHeaderMouseLeave}
      >
        <CHeaderToggler
          onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
          className="ms-md-3"
        >
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>
        
        {/* 왼쪽 메뉴 */}
        <CHeaderNav className="me-auto">
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

        {/* 오른쪽 메뉴 */}
        <CHeaderNav className="ms-2">
          <CNavItem className="py-2 py-lg-1">
            <div className="vr d-none d-lg-flex h-100 mx-lg-2 text-body text-opacity-75"></div>
            <hr className="d-lg-none my-2 text-white-50" />
          </CNavItem>
          
          {/* 테마 토글 */}
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
          
          <CNavItem className="py-2 py-lg-1">
            <div className="vr d-none d-lg-flex h-100 mx-lg-2 text-body text-opacity-75"></div>
            <hr className="d-lg-none my-2 text-white-50" />
          </CNavItem>
          
          {/* 사용자 프로필 */}
          <AppHeaderDropdown />
        </CHeaderNav>

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
      
      {/* 브레드크럼 - 헤더와 동일한 계층 */}
      <div 
        className={getBreadcrumbClassName()}
        style={{ top: '61px' }}
        onClick={() => {
          console.log('브레드크럼 컨테이너 클릭:', { breadcrumbVisible, breadcrumbAnimating, isAnimating: isAnimating.current })
          if (!breadcrumbVisible && !breadcrumbAnimating && !isAnimating.current) {
            console.log('브레드크럼 컨테이너 클릭: 브레드크럼 표시 시도')
            showBreadcrumb()
          }
        }} // 클릭 시 브레드크럼 표시 (조건부)
        onMouseEnter={() => {
          console.log('브레드크럼 컨테이너 마우스 엔터:', { breadcrumbVisible, breadcrumbAnimating, isAnimating: isAnimating.current })
          isMouseOver.current = true
          if (!breadcrumbVisible && !breadcrumbAnimating && !isAnimating.current) {
            console.log('브레드크럼 컨테이너 마우스 엔터: 브레드크럼 표시 시도')
            showBreadcrumb()
          }
        }} // 마우스 오버 시 브레드크럼 표시 (조건부)
        onMouseLeave={() => {
          console.log('브레드크럼 컨테이너 마우스 리브')
          isMouseOver.current = false
          
          // 마우스 리브 후 8초 타이머 시작
          if (breadcrumbVisible && !breadcrumbAnimating) {
            console.log('브레드크럼 컨테이너 마우스 리브: 8초 타이머 시작')
            if (breadcrumbTimerRef.current) {
              clearTimeout(breadcrumbTimerRef.current)
            }
            
            breadcrumbTimerRef.current = setTimeout(() => {
              console.log('브레드크럼 마우스 리브 타이머 실행')
              if (!isMouseOver.current && !isUserScrolling.current) {
                console.log('브레드크럼: 마우스 리브 후 애니메이션 시작')
                setBreadcrumbAnimating(true)
                setTimeout(() => {
                  console.log('브레드크럼: 마우스 리브 후 숨김 완료')
                  setBreadcrumbVisible(false)
                  setBreadcrumbAnimating(false)
                }, 2000)
              }
            }, 8000)
          }
        }} // 마우스 리브 시 오버 상태 해제 및 타이머 시작
      >
        <div className="container-lg px-3 px-sm-4">
          <CustomBreadcrumb />
        </div>
      </div>
      
      {/* 브레드크럼이 숨겨진 상태에서 클릭할 수 있는 영역 */}
      {(!breadcrumbVisible && !breadcrumbAnimating) && (
        <div 
          className="breadcrumb-click-area"
          onClick={() => {
            console.log('브레드크럼 클릭 영역 클릭:', { isAnimating: isAnimating.current })
            if (!isAnimating.current) {
              console.log('브레드크럼 클릭 영역 클릭: 브레드크럼 표시 시도')
              showBreadcrumb()
            }
          }}
          onMouseEnter={() => {
            console.log('브레드크럼 클릭 영역 마우스 엔터:', { isAnimating: isAnimating.current })
            isMouseOver.current = true
            if (!isAnimating.current) {
              console.log('브레드크럼 클릭 영역 마우스 엔터: 브레드크럼 표시 시도')
              showBreadcrumb()
            }
          }}
          onMouseLeave={() => {
             console.log('브레드크럼 클릭 영역 마우스 리브')
             isMouseOver.current = false
             
             // 클릭 영역에서 마우스 리브 후에는 브레드크럼이 이미 표시되어 있지 않으므로 타이머 불필요
           }}
        />
      )}
    </>
  )
})

export default AppHeader

