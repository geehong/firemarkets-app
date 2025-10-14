import React from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'

import routes from '../routes'
import { useNavigation } from '../hooks/useNavigation'

import { CBreadcrumb, CBreadcrumbItem } from '@coreui/react'

const AppBreadcrumb = () => {
  const currentLocation = useLocation().pathname
  const [searchParams] = useSearchParams()
  const { menuItems } = useNavigation()

  const getRouteName = (pathname, routes) => {
    const currentRoute = routes.find((route) => route.path === pathname)
    return currentRoute ? currentRoute.name : false
  }

  // 동적 메뉴에서 경로 이름 찾기
  const getDynamicRouteName = (pathname, menuItems) => {
    if (!menuItems || !Array.isArray(menuItems)) return null
    
    const findMenuName = (items, targetPath) => {
      for (const item of items) {
        if (item.path === targetPath) {
          return item.name
        }
        if (item.children && item.children.length > 0) {
          const found = findMenuName(item.children, targetPath)
          if (found) return found
        }
      }
      return null
    }
    
    return findMenuName(menuItems, pathname)
  }

  const getBreadcrumbs = (location) => {
    const breadcrumbs = []
    const pathSegments = location.split('/').filter(segment => segment !== '')
    
    // /onchain/overviews 경로: metric 쿼리로 제목 표시
    if (location.startsWith('/onchain/overviews')) {
      const metric = searchParams.get('metric')
      if (metric) {
        // 기본 변환: snake_case → Title Case
        const toTitle = (id) => id
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
        let name = toTitle(metric)
        // 특수 표기 보정
        if (name.toLowerCase() === 'mvrv z score') name = 'MVRV Z-Score'
        breadcrumbs.push({ pathname: location, name, active: true })
        return breadcrumbs
      }
    }

    // /assets 경로 처리
    if (location.startsWith('/assets')) {
      breadcrumbs.push({
        pathname: '/assets',
        name: 'Assets',
        active: false,
      })
      
      // type_name 쿼리 파라미터가 있으면 서브메뉴 추가
      const typeName = searchParams.get('type_name')
      if (typeName) {
        breadcrumbs.push({
          pathname: location,
          name: typeName,
          active: true,
        })
      } else {
        breadcrumbs[0].active = true
      }
      
      return breadcrumbs
    }
    
    // 일반 경로 처리
    if (pathSegments.length > 0) {
      pathSegments.reduce((prev, curr, index, array) => {
        const currentPathname = `${prev}/${curr}`
        let routeName = getRouteName(currentPathname, routes)
        
        // 정적 라우트에서 찾지 못했으면 동적 메뉴에서 찾기
        if (!routeName) {
          routeName = getDynamicRouteName(currentPathname, menuItems)
        }
        
        if (routeName) {
          breadcrumbs.push({
            pathname: currentPathname,
            name: routeName,
            active: index + 1 === array.length ? true : false,
          })
        }
        return currentPathname
      }, '') // 초기값 '' 추가
    }
    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs(currentLocation)

  return (
    <CBreadcrumb className="my-0">
      <CBreadcrumbItem href="/">Home</CBreadcrumbItem>
      {breadcrumbs.map((breadcrumb, index) => {
        return (
          <CBreadcrumbItem
            {...(breadcrumb.active ? { active: true } : { href: breadcrumb.pathname })}
            key={index}
          >
            {breadcrumb.name}
          </CBreadcrumbItem>
        )
      })}
    </CBreadcrumb>
  )
}

export default React.memo(AppBreadcrumb)
