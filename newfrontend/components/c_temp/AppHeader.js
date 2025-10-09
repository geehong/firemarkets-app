import React, { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
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
} from '@coreui/icons'

import { AppBreadcrumb } from './index'
import { AppHeaderDropdown } from './header/index'
import './AppBreadcrumb.css'

const AppHeader = () => {
  const headerRef = useRef()
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')

  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)

  useEffect(() => {
    document.addEventListener('scroll', () => {
      headerRef.current &&
        headerRef.current.classList.toggle('shadow-sm', document.documentElement.scrollTop > 0)
    })
  }, [])

  return (
    <CHeader position="sticky" className="mb-4 p-0" ref={headerRef}>
      <CContainer className="border-bottom px-4" fluid>
        <CHeaderToggler
          onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
          style={{ marginInlineStart: '-14px', padding: '12px', touchAction: 'manipulation', zIndex: 2100 }}
          aria-label="Toggle navigation"
        >
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>
        <CHeaderNav className="d-none d-md-flex">
          <CNavItem>
            <CNavLink to="/dashboard" as={NavLink}>
              Dashboard
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink href="#">Users</CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink href="#">Settings</CNavLink>
          </CNavItem>
        </CHeaderNav>
        <CHeaderNav className="ms-auto">
          <CNavItem>
            <CNavLink href="#">
              <CIcon icon={cilBell} size="lg" />
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink href="#">
              <CIcon icon={cilList} size="lg" />
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink href="#">
              <CIcon icon={cilEnvelopeOpen} size="lg" />
            </CNavLink>
          </CNavItem>
        </CHeaderNav>
        <CHeaderNav>
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
      <BreadcrumbHideOnScroll>
        <CContainer className="px-4" fluid>
          <AppBreadcrumb />
        </CContainer>
      </BreadcrumbHideOnScroll>
    </CHeader>
  )
}

export default AppHeader

// Lightweight scroll-hide wrapper using IntersectionObserver + CSS
const BreadcrumbHideOnScroll = ({ children }) => {
  const containerRef = useRef(null)
  const [hidden, setHidden] = React.useState(false)
  const idleTimerRef = useRef(null)
  const sentinelRef = useRef(null)

  useEffect(() => {
    // create or reuse sentinel right below header
    let sentinel = sentinelRef.current
    if (!sentinel) {
      sentinel = document.createElement('div')
      sentinelRef.current = sentinel
      sentinel.setAttribute('data-breadcrumb-sentinel', 'true')
      sentinel.style.position = 'absolute'
      sentinel.style.top = '0px'
      sentinel.style.left = '0px'
      sentinel.style.width = '1px'
      sentinel.style.height = '1px'
      sentinel.style.pointerEvents = 'none'
      document.body.appendChild(sentinel)
    }

    const placeSentinel = () => {
      const headerEl = document.querySelector('header.c-header') || document.querySelector('header')
      if (headerEl) {
        const rect = headerEl.getBoundingClientRect()
        const docY = window.scrollY || 0
        sentinel.style.top = `${rect.height + docY}px`
      }
    }
    placeSentinel()

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        // when sentinel leaves viewport (scroll down), hide; when enters (scroll up), show
        setHidden(!entry.isIntersecting)
        // reset idle timer: hide after 12s idle
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
        idleTimerRef.current = setTimeout(() => setHidden(true), 12000)
      },
      { root: null, threshold: 0, rootMargin: '0px 0px 0px 0px' }
    )
    io.observe(sentinel)

    const onResize = () => placeSentinel()
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      try { io.disconnect() } catch {}
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      // keep sentinel for reuse
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`breadcrumb-hide-container ${hidden ? 'unpinned' : 'pinned'}`}
      style={{ zIndex: 2 }}
    >
      {children}
    </div>
  )
}
