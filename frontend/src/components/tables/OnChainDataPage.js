import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CAlert,
  CSpinner,
  CBadge,
  CFormSwitch,
  CFormCheck,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CProgress,
  CInputGroup,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CInputGroupText,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilReload,
  cilWarning,
  cilMediaPlay,
  cilCloudDownload,
  cilInfo,
  cilCheckCircle,
  cilXCircle,
  cilFilter,
  cilSearch,
} from '@coreui/icons'
import { io } from 'socket.io-client'

const OnChainDataPage = () => {
  const [metrics, setMetrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [runningMetrics, setRunningMetrics] = useState(new Set())
  const [alert, setAlert] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState(null)
  const [logs, setLogs] = useState([])
  const [collectionTypes, setCollectionTypes] = useState({}) // 메트릭별 수집 타입 저장

  // 카테고리별 메트릭 그룹화
  const groupedMetrics = metrics.reduce((acc, metric) => {
    const category = metric.category
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
  }

  // 메트릭별 수집 타입 설정
  const setMetricCollectionType = (metricId, type) => {
    setCollectionTypes((prev) => ({
      ...prev,
      [metricId]: type,
    }))
  }

  // 메트릭 로드
  const loadMetrics = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/onchain/metrics')
      if (!response.ok) {
        throw new Error('Failed to load metrics')
      }
      const data = await response.json()
      setMetrics(data)
    } catch (error) {
      console.error('Error loading metrics:', error)
      setAlert({
        color: 'danger',
        message: '메트릭을 불러오는데 실패했습니다: ' + error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  // 개별 메트릭 실행
  const runMetric = async (metricId) => {
    try {
      setRunningMetrics((prev) => new Set(prev).add(metricId))

      const response = await fetch(`/api/v1/onchain/metrics/${metricId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metric_id: metricId,
          force_update: false,
          collection_type: collectionTypes[metricId] || 'recent',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to run metric')
      }

      const result = await response.json()
      setAlert({
        color: 'success',
        message: `${result.message} (${result.data_points_added} data points added)`,
      })

      // 메트릭 목록 새로고침
      setTimeout(() => {
        loadMetrics()
      }, 2000)
    } catch (error) {
      console.error('Error running metric:', error)
      setAlert({
        color: 'danger',
        message: '메트릭 실행에 실패했습니다: ' + error.message,
      })
    } finally {
      setRunningMetrics((prev) => {
        const newSet = new Set(prev)
        newSet.delete(metricId)
        return newSet
      })
    }
  }

  // 메트릭 상태 토글
  const toggleMetric = async (metricId) => {
    try {
      const response = await fetch(`/api/v1/onchain/metrics/${metricId}/toggle`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to toggle metric')
      }

      const result = await response.json()
      setAlert({
        color: 'success',
        message: result.message,
      })

      // 메트릭 목록 새로고침
      loadMetrics()
    } catch (error) {
      console.error('Error toggling metric:', error)
      setAlert({
        color: 'danger',
        message: '메트릭 상태 변경에 실패했습니다: ' + error.message,
      })
    }
  }

  // 메트릭 상세 정보 조회
  const showMetricDetails = async (metric) => {
    try {
      const response = await fetch(`/api/v1/onchain/metrics/${metric.id}/data-range`)
      if (!response.ok) {
        throw new Error('Failed to get metric details')
      }
      const dataRange = await response.json()
      setSelectedMetric({ ...metric, dataRange })
      setShowDetailsModal(true)
    } catch (error) {
      console.error('Error getting metric details:', error)
      setAlert({
        color: 'danger',
        message: '메트릭 상세 정보 조회에 실패했습니다: ' + error.message,
      })
    }
  }

  // 필터링된 메트릭
  const filteredMetrics = Object.entries(groupedMetrics)
    .filter(([category]) => selectedCategory === 'all' || category === selectedCategory)
    .reduce((acc, [category, categoryMetrics]) => {
      const filtered = categoryMetrics.filter(
        (metric) =>
          metric.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          metric.description.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      if (filtered.length > 0) {
        acc[category] = filtered
      }
      return acc
    }, {})

  // 메트릭 카드 렌더링
  const renderMetricCard = (metric) => {
    const isRunning = runningMetrics.has(metric.id)
    const hasData = metric.data_count > 0

    return (
      <CCol xs={12} md={6} lg={4} key={metric.id}>
        <CCard className="mb-3 h-100">
          <CCardBody>
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div className="flex-grow-1">
                <h6 className="mb-1">{metric.name}</h6>
                <p className="text-muted small mb-2">{metric.description}</p>
                <div className="d-flex align-items-center mb-2">
                  <CBadge color={metric.is_enabled ? 'success' : 'secondary'} className="me-2">
                    {metric.is_enabled ? 'Active' : 'Inactive'}
                  </CBadge>
                  <CBadge color="info" className="me-2">
                    {metric.collect_interval}
                  </CBadge>
                  {hasData && <CBadge color="primary">{metric.data_count} records</CBadge>}
                </div>
              </div>
              <CFormSwitch
                checked={metric.is_enabled}
                onChange={() => toggleMetric(metric.id)}
                size="sm"
              />
            </div>

            {/* 데이터 범위 표시 */}
            {metric.current_range && (
              <div className="mb-3">
                <small className="text-muted">
                  <strong>Data Range:</strong> {metric.current_range}
                </small>
                {metric.last_update && (
                  <div>
                    <small className="text-muted">
                      <strong>Last Update:</strong> {new Date(metric.last_update).toLocaleString()}
                    </small>
                  </div>
                )}
              </div>
            )}

            {/* 진행률 표시 */}
            {isRunning && (
              <div className="mb-3">
                <CProgress animated value={100} className="mb-2" />
                <small className="text-info">Collecting data...</small>
              </div>
            )}

            {/* 데이터 수집 타입 선택 */}
            <div className="mb-3">
              <small className="text-muted d-block mb-2">
                <strong>Collection Type:</strong>
              </small>
              <div className="d-flex gap-3">
                <CFormCheck
                  type="radio"
                  name={`collection-${metric.id}`}
                  id={`recent-${metric.id}`}
                  label="Recent (1 Month)"
                  checked={collectionTypes[metric.id] === 'recent' || !collectionTypes[metric.id]}
                  onChange={() => setMetricCollectionType(metric.id, 'recent')}
                  inline
                />
                <CFormCheck
                  type="radio"
                  name={`collection-${metric.id}`}
                  id={`all-${metric.id}`}
                  label="All Data"
                  checked={collectionTypes[metric.id] === 'all'}
                  onChange={() => setMetricCollectionType(metric.id, 'all')}
                  inline
                />
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div className="d-flex gap-2 flex-wrap">
              <CButton
                color="primary"
                size="sm"
                onClick={() => runMetric(metric.id)}
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
                    Run Now
                  </>
                )}
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
          <CIcon icon={cilFilter} className="me-2" />
          {categoryName}
          <CBadge color="info" className="ms-2">
            {categoryMetrics.length}
          </CBadge>
        </h5>
        <CRow>{categoryMetrics.map(renderMetricCard)}</CRow>
      </div>
    )
  }

  // 오늘의 로그 로드
  const loadTodayLogs = async () => {
    try {
      const response = await fetch('/api/logs/today?limit=20')
      if (!response.ok) {
        throw new Error('Failed to load today logs')
      }
      const data = await response.json()

      const dbLogs = data.map((log) => ({
        message: log.message,
        type: log.status === 'failed' ? 'error' : log.status === 'completed' ? 'info' : 'log',
        timestamp: new Date(log.timestamp),
        logType: log.log_type,
        details: log.details,
      }))

      setLogs(dbLogs)
    } catch (error) {
      console.error('Error loading today logs:', error)
    }
  }

  // 초기 로드 및 Socket.IO 설정
  useEffect(() => {
    loadMetrics()
    loadTodayLogs()

    // Socket.IO 연결 설정
    const socket = io('/', {
      transports: ['websocket'],
    })

    socket.on('connect', () => {
      console.log('Connected to Socket.IO server')
    })

    socket.on('scheduler_log', (data) => {
      const newLog = {
        message: data.message,
        type: data.type || 'log',
        timestamp: new Date(),
      }
      setLogs((prevLogs) => [newLog, ...prevLogs].slice(0, 50))
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server')
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  if (loading) {
    return (
      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardBody className="text-center py-5">
              <CSpinner size="lg" />
              <p className="mt-3">Loading onchain metrics...</p>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    )
  }

  return (
    <>
      {/* 알림 */}
      {alert && (
        <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>
          {alert.message}
        </CAlert>
      )}

      {/* 헤더 */}
      <CRow className="mb-4">
        <CCol xs={12}>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>On-Chain Data Management</h2>
              <p className="text-muted">Manage and monitor Bitcoin on-chain metrics collection.</p>
            </div>
            <div className="d-flex gap-2">
              <CButton color="outline-secondary" size="sm" onClick={loadMetrics} disabled={loading}>
                <CIcon icon={cilReload} className="me-1" />
                Refresh
              </CButton>
            </div>
          </div>
        </CCol>
      </CRow>

      {/* 필터 및 검색 */}
      <CRow className="mb-4">
        <CCol xs={12}>
          <CCard>
            <CCardBody>
              <div className="d-flex gap-3 align-items-center">
                <div className="flex-grow-1">
                  <CInputGroup>
                    <CInputGroupText>
                      <CIcon icon={cilSearch} />
                    </CInputGroupText>
                    <CFormInput
                      placeholder="Search metrics..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </CInputGroup>
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
        </CCol>
      </CRow>

      {/* 실시간 로그 */}
      <CRow className="mb-4">
        <CCol xs={12}>
          <CCard>
            <CCardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <strong>Real-time Collection Logs</strong>
                <CButton color="outline-secondary" size="sm" onClick={loadTodayLogs}>
                  <CIcon icon={cilReload} className="me-1" />
                  Refresh Logs
                </CButton>
              </div>
            </CCardHeader>
            <CCardBody style={{ height: '200px', overflowY: 'auto', backgroundColor: '#2B2B2B' }}>
              {logs.length === 0 ? (
                <div className="text-muted text-center py-4">
                  <CIcon icon={cilInfo} className="me-2" />
                  No logs available.
                </div>
              ) : (
                logs.map((log, index) => (
                  <div
                    key={index}
                    className={`font-monospace small mb-1 ${log.type === 'error' ? 'text-danger' : log.type === 'info' ? 'text-info' : 'text-light'}`}
                  >
                    <span className="text-muted me-2">
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>
                    <span>{log.message}</span>
                  </div>
                ))
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* 메트릭 카테고리별 표시 */}
      <CRow>
        <CCol xs={12}>
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
        </CCol>
      </CRow>

      {/* 메트릭 상세 정보 모달 */}
      <CModal visible={showDetailsModal} onClose={() => setShowDetailsModal(false)} size="lg">
        <CModalHeader>
          <CModalTitle>{selectedMetric?.name} - Details</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedMetric && (
            <div>
              <div className="mb-3">
                <h6>Description</h6>
                <p className="text-muted">{selectedMetric.description}</p>
              </div>

              <div className="mb-3">
                <h6>Data Information</h6>
                <div className="row">
                  <div className="col-md-6">
                    <strong>Total Records:</strong> {selectedMetric.dataRange?.data_count || 0}
                  </div>
                  <div className="col-md-6">
                    <strong>Status:</strong>
                    <CBadge
                      color={selectedMetric.is_enabled ? 'success' : 'secondary'}
                      className="ms-2"
                    >
                      {selectedMetric.is_enabled ? 'Active' : 'Inactive'}
                    </CBadge>
                  </div>
                </div>
                {selectedMetric.dataRange?.start_date && (
                  <div className="mt-2">
                    <strong>Data Range:</strong> {selectedMetric.dataRange.start_date} to{' '}
                    {selectedMetric.dataRange.end_date}
                  </div>
                )}
              </div>

              <div className="mb-3">
                <h6>Collection Settings</h6>
                <div className="row">
                  <div className="col-md-6">
                    <strong>Interval:</strong> {selectedMetric.collect_interval}
                  </div>
                  <div className="col-md-6">
                    <strong>Category:</strong>{' '}
                    {categoryNames[selectedMetric.category] || selectedMetric.category}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </CButton>
          {selectedMetric && (
            <CButton
              color="primary"
              onClick={() => {
                setShowDetailsModal(false)
                runMetric(selectedMetric.id)
              }}
              disabled={runningMetrics.has(selectedMetric.id)}
            >
              {runningMetrics.has(selectedMetric.id) ? (
                <>
                  <CSpinner size="sm" className="me-1" />
                  Running...
                </>
              ) : (
                <>
                  <CIcon icon={cilMediaPlay} className="me-1" />
                  Run Now
                </>
              )}
            </CButton>
          )}
        </CModalFooter>
      </CModal>
    </>
  )
}

export default OnChainDataPage
