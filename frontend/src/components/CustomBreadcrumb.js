import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import routes from '../routes' // routes.js 파일 임포트
import { CBreadcrumb, CBreadcrumbItem, CFormSelect, CCol, CRow } from '@coreui/react'

const CustomBreadcrumb = () => {
  const location = useLocation()
  const navigate = useNavigate()
  // useParams 대신 URL에서 직접 assetId 추출
  const assetIdentifier =
    location.pathname.startsWith('/assetsdetail/') || location.pathname.startsWith('/overviews/')
      ? location.pathname.split('/')[2]
      : null
  const [assetTypes, setAssetTypes] = useState([]) // 자산 타입 목록

  // routes.js에서 경로 이름을 가져오는 헬퍼 함수
  const getRouteName = (pathname, routesConfig) => {
    const currentRoute = routesConfig.find((route) => route.path === pathname)
    return currentRoute ? currentRoute.name : false
  }

  // 현재 경로에 따라 브레드크럼 생성
  const getBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter((segment) => segment)
    // console.log('CustomBreadcrumb: Current pathname:', location.pathname)
    // console.log('CustomBreadcrumb: Path segments:', pathSegments)
    // console.log('CustomBreadcrumb: assetIdentifier:', assetIdentifier)
    const breadcrumbs = []

    // 항상 'Home'을 시작점으로 추가
    breadcrumbs.push({ name: 'Home', path: '/', clickable: true })

    // 자산 상세 페이지인 경우 특별 처리 (assetsdetail 또는 overviews)
    if (
      (pathSegments[0] === 'assetsdetail' || pathSegments[0] === 'overviews') &&
      assetIdentifier
    ) {
      // Ensure assetIdentifier is not null/undefined
      // console.log('CustomBreadcrumb: Processing assetsdetail path')
      // Assets List 추가
      breadcrumbs.push({ name: 'Assets List', path: '/assets', clickable: true })

      // 자산 타입 추가 (예: Stocks) - sessionStorage에서 가져오기
      const typeName = sessionStorage.getItem('lastAssetType') || 'Stocks'

      if (typeName) {
        // 수정: 자산 타입 클릭 시 오버뷰 페이지로 이동
        const assetTypePath = `/overviews?type_name=${typeName}`
        breadcrumbs.push({ name: typeName, path: assetTypePath, clickable: true })
      }

      // 자산 이름 추가 - assetIdentifier를 그대로 사용
      breadcrumbs.push({
        name: assetIdentifier,
        path: null,
        clickable: false,
      })
      // console.log('CustomBreadcrumb: Final breadcrumbs for assetsdetail:', breadcrumbs) // Add this log
      return breadcrumbs
    }

    // 자산 목록 페이지인 경우
    if (pathSegments[0] === 'assets') {
      // console.log('CustomBreadcrumb: Processing assets path')
      breadcrumbs.push({ name: 'Assets List', path: '/assets', clickable: true })

      // 쿼리 파라미터에서 type_name 확인
      const typeName = new URLSearchParams(location.search).get('type_name')
      if (typeName) {
        // sessionStorage에 저장
        sessionStorage.setItem('lastAssetType', typeName)
        breadcrumbs.push({ name: typeName, path: null, clickable: false })
      }
      // console.log('CustomBreadcrumb: Final breadcrumbs for assets list:', breadcrumbs) // Add this log
      return breadcrumbs
    }

    // OnChain 경로 처리
    if (pathSegments[0] === 'onchain') {
      // console.log('CustomBreadcrumb: Processing onchain path')
      breadcrumbs.push({ name: 'OnChain', path: '/onchain', clickable: true })

      if (pathSegments[1] === 'overviews') {
        breadcrumbs.push({ name: 'Market Metrics', path: '/onchain', clickable: true })
        breadcrumbs.push({ name: 'MVRV Z-Score', path: null, clickable: false })
      } else {
        // 다른 onchain 경로들 처리
        if (pathSegments[1]) {
          breadcrumbs.push({ name: pathSegments[1], path: null, clickable: false })
        }
      }
      return breadcrumbs
    }

    // TreeMap 경로 처리
    if (pathSegments[0] === 'overviews' && pathSegments[1] === 'treemap') {
      // console.log('CustomBreadcrumb: Processing treemap path')
      breadcrumbs.push({ name: 'Assets List', path: '/assets', clickable: true })
      breadcrumbs.push({ name: 'Performance Map', path: null, clickable: false })
      return breadcrumbs
    }

    // World Assets TreeMap 경로 처리
    if (pathSegments[0] === 'world-assets-treemap') {
      // console.log('CustomBreadcrumb: Processing world assets treemap path')
      breadcrumbs.push({ name: 'World Assets TreeMap', path: null, clickable: false })
      return breadcrumbs
    }

    // 일반적인 경로 처리
    // console.log('CustomBreadcrumb: Processing general path')
    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i]
      const isLast = i === pathSegments.length - 1

      // assets 관련 경로는 이미 처리했으므로 건너뛰기
      if (segment === 'assetsdetail' || segment === 'overviews') {
        // console.log('CustomBreadcrumb: Skipping general path processing for assets-related path')
        continue
      }

      // 경로 이름을 가져오기
      const routeName = getRouteName(`/${pathSegments.slice(0, i + 1).join('/')}`, routes)

      if (routeName) {
        breadcrumbs.push({
          name: routeName,
          path: isLast ? null : `/${pathSegments.slice(0, i + 1).join('/')}`,
          clickable: !isLast,
        })
      } else {
        // 경로 이름을 찾을 수 없는 경우 세그먼트를 그대로 사용
        breadcrumbs.push({
          name: segment.charAt(0).toUpperCase() + segment.slice(1),
          path: isLast ? null : `/${pathSegments.slice(0, i + 1).join('/')}`,
          clickable: !isLast,
        })
      }
    }

    // console.log('CustomBreadcrumb: Final breadcrumbs for general path:', breadcrumbs) // Add this log
    return breadcrumbs
  }

  // 자산 정보 가져오기 - 제거 (불필요한 API 호출)

  // 자산 타입 목록 가져오기 - 자산 목록 페이지에서만 필요할 때 호출
  useEffect(() => {
    const fetchAssetTypes = async () => {
      // 자산 목록 페이지에서만 자산 타입이 필요
      if (location.pathname === '/assets') {
        try {
          const response = await axios.get('/api/v1/asset-types?has_data=false&include_description=false')
          setAssetTypes(response.data.data)
        } catch (error) {
          console.error('CustomBreadcrumb: Error fetching asset types:', error)
        }
      }
    }
    fetchAssetTypes()
  }, [location.pathname, location.search])

  // 자산 목록 가져오기 - 자산 상세 페이지에서 드롭다운용
  const [allAssets, setAllAssets] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchAllAssets = async () => {
      // 자산 상세 페이지에서만 자산 목록이 필요
      if ((location.pathname.startsWith('/assetsdetail/') || location.pathname.startsWith('/overviews/')) && assetIdentifier) {
        setLoading(true)
        try {
          const typeName = sessionStorage.getItem('lastAssetType')
          let apiUrl = '/api/v1/assets?has_ohlcv_data=true&limit=100&offset=0'
          
          if (typeName) {
            apiUrl += `&type_name=${typeName}`
          }
          
          const response = await axios.get(apiUrl)
          setAllAssets(response.data.data)
        } catch (error) {
          console.error('CustomBreadcrumb: Error fetching all assets:', error)
        } finally {
          setLoading(false)
        }
      }
    }
    fetchAllAssets()
  }, [location.pathname, assetIdentifier])

  // 드롭다운 메뉴에 표시할 자산 목록 가져오기 - 제거 (불필요한 API 호출)

  // 자산 선택 핸들러
  const handleAssetChange = (selectedAssetId) => {
    if (selectedAssetId && selectedAssetId !== assetIdentifier) {
      console.log('CustomBreadcrumb: Navigating to new asset detail page:', selectedAssetId)
      // 현재 경로에 따라 적절한 경로로 이동
      if (location.pathname.startsWith('/overviews/')) {
        navigate(`/overviews/${selectedAssetId}`)
      } else {
        navigate(`/assetsdetail/${selectedAssetId}`)
      }
    }
  }



  // 자산 타입 선택 핸들러
  const handleAssetTypeChange = (selectedTypeName) => {
    if (selectedTypeName) {
      console.log('CustomBreadcrumb: Navigating to asset type overview:', selectedTypeName)
      navigate(`/overviews?type_name=${selectedTypeName}`)
    }
  }

  const breadcrumbs = getBreadcrumbs()

  // 자산 목록 페이지인지 확인
  const isAssetsListPage = location.pathname === '/assets'
  
  // 자산 상세 페이지인지 확인
  const isAssetDetailPage = 
    (location.pathname.startsWith('/assetsdetail/') || location.pathname.startsWith('/overviews/')) && assetIdentifier

  return (
    <div className="container-fluid px-4 pt-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="flex-grow-1">
          <CBreadcrumb className="text-wrap">
            {breadcrumbs.map((breadcrumb, index) => (
              <CBreadcrumbItem
                key={index}
                {...(breadcrumb.clickable && breadcrumb.path
                  ? {
                      href: breadcrumb.path,
                      onClick: (e) => {
                        e.preventDefault()
                        navigate(breadcrumb.path)
                      },
                    }
                  : { active: true })}
              >
                {breadcrumb.name}
              </CBreadcrumbItem>
            ))}
          </CBreadcrumb>
        </div>
        <div className="mb-1 flex-shrink-0">
          {isAssetsListPage && (
            <CFormSelect
              value={new URLSearchParams(location.search).get('type_name') || ''}
              onChange={(e) => handleAssetTypeChange(e.target.value)}
              className="w-auto d-inline-block"
              style={{
                minWidth: '200px',
                textAlign: 'center',
                textAlignLast: 'center',
              }}
            >
              <option value="" style={{ textAlign: 'center' }}>
                Select Asset Type
              </option>
              {assetTypes.map((assetType) => (
                <option
                  key={assetType.asset_type_id}
                  value={assetType.type_name}
                  style={{ textAlign: 'center' }}
                >
                  {assetType.type_name}
                </option>
              ))}
            </CFormSelect>
          )}
          {isAssetDetailPage && (
            <CFormSelect
              value={assetIdentifier || ''}
              onChange={(e) => handleAssetChange(e.target.value)}
              disabled={loading}
              className="w-auto d-inline-block"
              style={{
                minWidth: '200px',
                textAlign: 'center',
                textAlignLast: 'center',
              }}
            >
              <option value="" style={{ textAlign: 'center' }}>
                Select Asset
              </option>
              {allAssets.map((assetItem) => (
                <option
                  key={assetItem.asset_id}
                  value={assetItem.ticker}
                  style={{ textAlign: 'center' }}
                >
                  {assetItem.name} ({assetItem.ticker})
                </option>
              ))}
            </CFormSelect>
          )}
        </div>
      </div>
    </div>
  )
}

export default CustomBreadcrumb
