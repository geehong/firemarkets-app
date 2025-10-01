import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import PropTypes from 'prop-types'

import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'

import { CBadge, CNavLink, CSidebarNav } from '@coreui/react'

export const AppSidebarNav = ({ items }) => {
  const location = useLocation()

  const navLink = (name, icon, badge, indent = false) => {
    return (
      <>
        {icon
          ? icon
          : indent && (
              <span className="nav-icon">
                <span className="nav-icon-bullet"></span>
              </span>
            )}
        {name && name}
        {badge && (
          <CBadge color={badge.color} className="ms-auto" size="sm">
            {badge.text}
          </CBadge>
        )}
      </>
    )
  }

  const navItem = (item, index, indent = false) => {
    const { component, name, badge, icon, ...rest } = item
    const Component = component

    // NavLink의 active 상태를 직접 확인하기 위해 to prop을 사용합니다.
    const isActive = rest.to && location.pathname.startsWith(rest.to)

    return (
      // CoreUI의 CNavItem을 사용하면서 active 상태를 동적으로 전달합니다.
      <Component as="div" key={index}>
        {rest.to || rest.href ? (
          <CNavLink
            {...(rest.to && { as: NavLink })}
            {...(rest.href && { target: '_blank', rel: 'noopener noreferrer' })}
            {...rest}
          >
            {navLink(name, icon, badge, indent)}
          </CNavLink>
        ) : (
          navLink(name, icon, badge, indent)
        )}
      </Component>
    )
  }

  const navGroup = (item, index) => {
    const { component, name, icon, items, to, ...rest } = item
    const Component = component

    // 하위 메뉴 중 하나라도 활성화 상태이면 부모 그룹도 활성화된 것처럼 보이게 합니다.
    const isGroupActive = items?.some((child) => child.to && location.pathname.startsWith(child.to))

    return (
      <Component
        as="div"
        key={index}
        toggler={navLink(name, icon)}
        visible={isGroupActive} // 현재 경로에 따라 그룹을 자동으로 열어줍니다.
        {...rest}
      >
        {items?.map((item, index) =>
          item.items ? navGroup(item, index) : navItem(item, index, true),
        )}
      </Component>
    )
  }

  return (
    <CSidebarNav as={SimpleBar}>
      {items &&
        items.map((item, index) => (item.items ? navGroup(item, index) : navItem(item, index)))}
    </CSidebarNav>
  )
}

AppSidebarNav.propTypes = {
  // items prop이 배열이며 필수임을 명시합니다.
  items: PropTypes.arrayOf(PropTypes.any).isRequired,
}
