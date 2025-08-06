import React, { useState, useEffect } from 'react'
import {
  CForm,
  CFormLabel,
  CFormCheck,
  CFormInput,
  CFormSelect,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CBadge,
  CButton,
  CSpinner,
  CProgress,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMediaPlay, cilInfo, cilReload } from '@coreui/icons'

const OnChainMetrics = () => {
  const [metrics, setMetrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [runningMetrics, setRunningMetrics] = useState(new Set())
  const [expandedDescriptions, setExpandedDescriptions] = useState(new Set())

  // 설명 토글 함수
  const toggleDescription = (metricId) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(metricId)) {
        newSet.delete(metricId)
      } else {
        newSet.add(metricId)
      }
      return newSet
    })
  }

  // API에서 메트릭 데이터 로드
  const loadMetrics = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/v1/onchain/metrics')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      } else {
        setError(`Failed to load metrics: ${response.status}`)
      }
    } catch (error) {
      setError(`Error loading metrics: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadMetrics()
  }, [])

  // 메트릭 토글 함수
  const handleToggle = async (metricId) => {
    try {
      const response = await fetch(`/api/v1/onchain/metrics/${metricId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        // 토글 성공 시 메트릭 목록 새로고침
        await loadMetrics()
      } else {
        console.error(`Failed to toggle metric ${metricId}`)
      }
    } catch (error) {
      console.error(`Error toggling metric ${metricId}:`, error)
    }
  }

  // 메트릭 실행 함수
  const handleRunMetric = async (metricId, collectionType = 'recent') => {
    try {
      setRunningMetrics(prev => new Set(prev).add(metricId))
      
      const response = await fetch(`/api/v1/onchain/metrics/${metricId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collection_type: collectionType,
          force_update: false
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log(`Metric ${metricId} executed successfully:`, result)
        // 실행 완료 후 메트릭 목록 새로고침
        await loadMetrics()
      } else {
        console.error(`Failed to run metric ${metricId}`)
      }
    } catch (error) {
      console.error(`Error running metric ${metricId}:`, error)
    } finally {
      setRunningMetrics(prev => {
        const newSet = new Set(prev)
        newSet.delete(metricId)
        return newSet
      })
    }
  }

  // 카테고리별 메트릭 그룹화
  const groupedMetrics = metrics.reduce((acc, metric) => {
    if (!metric || !metric.category) return acc
    const category = metric.category || 'general'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(metric)
    return acc
  }, {})

  // 카테고리 이름 매핑
  const categoryNames = {
    market_metrics: 'Market Metrics',
    price_metrics: 'Price Metrics',
    mining_metrics: 'Mining Metrics',
    institutional_metrics: 'Institutional Metrics',
    derivatives_metrics: 'Derivatives Metrics',
    general: 'General Metrics',
  }

  // 필터링된 메트릭
  const filteredMetrics = Object.entries(groupedMetrics)
    .filter(([category]) => selectedCategory === 'all' || category === selectedCategory)
    .reduce((acc, [category, categoryMetrics]) => {
      const filtered = categoryMetrics.filter((metric) => {
        if (!metric || !metric.name || !metric.description) return false
        return (
          metric.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          metric.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })
      if (filtered.length > 0) {
        acc[category] = filtered
      }
      return acc
    }, {})

  // 마지막 업데이트 시간 포맷팅
  const formatLastUpdate = (lastUpdate) => {
    if (!lastUpdate) return 'Never updated'
    
    const date = new Date(lastUpdate)
    const now = new Date()
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return `${Math.floor((now - date) / (1000 * 60))} minutes ago`
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`
    } else {
      return date.toLocaleString()
    }
  }

  // 메트릭 카드 렌더링
  const renderMetricCard = (metric) => {
    if (!metric || !metric.id || !metric.name) return null

    const isRunning = runningMetrics.has(metric.id)
    const hasData = metric.data_count > 0
    const isDescriptionExpanded = expandedDescriptions.has(metric.id)

    return (
      <CCol xs={12} md={6} lg={4} key={metric.id}>
        <CCard className="mb-3 h-100">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">{metric.name}</h6>
            <CFormCheck
              checked={metric.is_enabled || false}
              onChange={() => handleToggle(metric.id)}
              size="sm"
            />
          </CCardHeader>
          <CCardBody>
            {/* 설명 */}
            <p className="text-muted small mb-3">
              <span onClick={() => toggleDescription(metric.id)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                {isDescriptionExpanded ? 'Hide Description' : 'Show Description'}
              </span>
            </p>
            {isDescriptionExpanded && (
              <p className="text-muted small">
                {metric.description || 'No description available'}
              </p>
            )}

            {/* 상태 배지들 */}
            <div className="d-flex flex-wrap gap-2 mb-3">
              <CBadge color={metric.is_enabled ? 'success' : 'secondary'}>
                {metric.is_enabled ? 'Active' : 'Inactive'}
              </CBadge>
              <CBadge color="info">
                {metric.collect_interval || 'N/A'}
              </CBadge>
              {hasData && (
                <CBadge color="primary">
                  {metric.data_count} records
                </CBadge>
              )}
              <CBadge color="warning">
                {metric.status || 'Unknown'}
              </CBadge>
            </div>

            {/* 카테고리 */}
            <div className="mb-3">
              <small className="text-muted">
                <strong>Category:</strong> {categoryNames[metric.category] || metric.category}
              </small>
            </div>

            {/* 데이터 범위 */}
            {metric.current_range && (
              <div className="mb-3">
                <small className="text-muted">
                  <strong>Data Range:</strong> {metric.current_range}
                </small>
              </div>
            )}

            {/* 마지막 업데이트 */}
            <div className="mb-3">
              <small className="text-muted">
                <strong>Last Update:</strong> {formatLastUpdate(metric.last_update)}
              </small>
            </div>

            {/* 진행률 표시 */}
            {isRunning && (
              <div className="mb-3">
                <CProgress animated value={100} className="mb-2" />
                <small className="text-info">Collecting data...</small>
              </div>
            )}

            {/* 액션 버튼들 */}
            <div className="d-flex gap-2 flex-wrap">
              <CButton
                color="primary"
                size="sm"
                onClick={() => handleRunMetric(metric.id, 'recent')}
                disabled={isRunning || !metric.is_enabled}
              >
                {isRunning ? (
                  <>
                    <CSpinner size="sm" className="me-1" />
                    Running...
                  </>
                ) : (
                  <>
                    <CIcon icon={cilMediaPlay} className="me-1" />
                    Run Recent
                  </>
                )}
              </CButton>
              <CButton
                color="info"
                size="sm"
                onClick={() => handleRunMetric(metric.id, 'all')}
                disabled={isRunning || !metric.is_enabled}
              >
                <CIcon icon={cilReload} className="me-1" />
                Run All
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      </CCol>
    )
  }

  // 카테고리별 섹션 렌더링
  const renderCategorySection = (category, categoryMetrics) => {
    const categoryName = categoryNames[category] || category

    return (
      <div key={category} className="mb-4">
        <h5 className="mb-3">
          <CIcon icon={cilInfo} className="me-2" />
          {categoryName}
          <CBadge color="info" className="ms-2">
            {categoryMetrics.length}
          </CBadge>
        </h5>
        <CRow>{categoryMetrics.map(renderMetricCard)}</CRow>
      </div>
    )
  }

  // 로딩 상태
  if (loading) {
    return (
      <div className="text-center py-4">
        <CSpinner size="sm" />
        <p className="mt-3">Loading onchain metrics...</p>
      </div>
    )
  }

  // 에러 상태
  if (error) {
    return (
      <CAlert color="danger" className="mb-4">
        <h4>Error Loading Metrics</h4>
        <p>{error}</p>
        <CButton color="primary" onClick={loadMetrics}>
          <CIcon icon={cilReload} className="me-1" />
          Retry
        </CButton>
      </CAlert>
    )
  }

  // 메트릭이 없는 경우
  if (!metrics || metrics.length === 0) {
    return (
      <div className="text-center py-4">
        <CIcon icon={cilInfo} size="xl" className="text-muted mb-3" />
        <h5>No metrics found</h5>
        <p className="text-muted">No onchain metrics are currently available.</p>
        <CButton color="primary" onClick={loadMetrics}>
          <CIcon icon={cilReload} className="me-1" />
          Refresh
        </CButton>
      </div>
    )
  }

  return (
    <div>
      {/* 헤더 및 새로고침 버튼 */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>Onchain Metrics Management</h4>
        <CButton color="primary" onClick={loadMetrics}>
          <CIcon icon={cilReload} className="me-1" />
          Refresh
        </CButton>
      </div>

      {/* 필터 및 검색 */}
      <CCard className="mb-4">
        <CCardBody>
          <div className="d-flex gap-3 align-items-center">
            <div className="flex-grow-1">
              <CFormInput
                placeholder="Search metrics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <CFormSelect
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ minWidth: '150px' }}
              >
                <option value="all">All Categories</option>
                {Object.entries(categoryNames).map(([key, name]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </CFormSelect>
            </div>
          </div>
        </CCardBody>
      </CCard>

      {/* 메트릭 카테고리별 표시 */}
      {Object.keys(filteredMetrics).length === 0 ? (
        <CCard>
          <CCardBody className="text-center py-5">
            <CIcon icon={cilInfo} size="xl" className="text-muted mb-3" />
            <h5>No metrics found</h5>
            <p className="text-muted">
              {searchTerm
                ? 'Try adjusting your search terms.'
                : 'No metrics available for the selected category.'}
            </p>
          </CCardBody>
        </CCard>
      ) : (
        Object.entries(filteredMetrics).map(([category, categoryMetrics]) =>
          renderCategorySection(category, categoryMetrics),
        )
      )}
    </div>
  )
}

export default OnChainMetrics
