import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
  CFormInput,
  CFormSelect,
  CFormSwitch,
  CAlert,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CSpinner,
  CBadge,
  CInputGroup,
  CInputGroupText,
  CPagination,
  CPaginationItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilPlus, cilTrash, cilReload, cilMediaPlay, cilMediaStop } from '@coreui/icons'
import { io } from 'socket.io-client'
import TickerCollectionSettings from '../../components/admin/ticker/TickerCollectionSettings'
import GenericCollectionSettings from '../../components/admin/ticker/GenericCollectionSettings'

const TickerManagement = () => {
  const [tickers, setTickers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedTicker, setSelectedTicker] = useState(null)
  const [assetTypes, setAssetTypes] = useState([])
  const [expandedCategories, setExpandedCategories] = useState({})
  const [currentPages, setCurrentPages] = useState({}) // 각 카테고리별 페이지 상태 (페이지네이션)
  const [itemsPerPage, setItemsPerPage] = useState(10) // 페이지당 아이템 수 (변경 가능)
  const [pendingChanges, setPendingChanges] = useState({}) // 임시 저장된 변경 사항
  const [validationResult, setValidationResult] = useState(null) // 티커 검증 결과
  const [logs, setLogs] = useState([]) // 실시간 로그 상태 추가
  const [collectionStatus, setCollectionStatus] = useState({}) // 수집 상태 관리
  const [useGenericSettings, setUseGenericSettings] = useState(true) // GenericCollectionSettings 사용 여부

  // 수집 사이트 옵션
  const dataSources = [
    { value: 'alpha_vantage', label: 'Alpha Vantage' },
    { value: 'fmp', label: 'FMP (Financial Modeling Prep)' },
    { value: 'yahoo_finance', label: 'Yahoo Finance' },
    { value: 'bgeometrics', label: 'BGeometrics (On-chain)' },
    { value: 'fred', label: 'FRED (Economic Data)' },
    { value: 'binance', label: 'Binance (Crypto)' },
    { value: 'coinbase', label: 'Coinbase (Crypto)' },
  ]

  // 자산 타입별 설정 - API에서 동적으로 생성
  const [assetTypeConfig, setAssetTypeConfig] = useState({})

  // 자산 타입별 설정 생성 함수
  const generateAssetTypeConfig = (assetTypes) => {
    const config = {}
    assetTypes.forEach((type) => {
      // 기본 설정 (모든 타입에서 가격과 기술지표 수집 가능)
      config[type.asset_type_id] = {
        name: type.type_name,
        canCollectAssetsInfo: false,
        canCollectOnchain: false,
      }

      // 특정 타입별 설정
      switch (type.type_name.toLowerCase()) {
        case 'stocks':
        case 'etfs':
        case 'bonds':
        case 'funds':
          config[type.asset_type_id].canCollectAssetsInfo = true
          break
        case 'crypto':
        case 'cryptocurrency':
          config[type.asset_type_id].canCollectOnchain = true
          break
        default:
          // Indices, Commodities, Currencies 등은 기본값 유지
          break
      }
    })
    return config
  }

  // 새 티커 추가 폼 상태
  const [newTicker, setNewTicker] = useState({
    ticker: '',
    name: '',
    asset_type_id: '',
    exchange: '',
    currency: '',
    description: '',
    data_source: 'fmp',
    collect_price: true,
            collect_assets_info: true,
    collect_onchain: false,
    collect_technical_indicators: false,
  })

  // 티커 목록 로드
  const loadTickers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/assets?has_ohlcv_data=false&limit=1000&offset=0')
      if (!response.ok) {
        throw new Error('Failed to load tickers')
      }
      const data = await response.json()
      setTickers(data.data) // API 응답이 { data: [...], ... } 형식이므로 data.data를 사용
    } catch (error) {
      console.error('Error loading tickers:', error)
      setAlert({
        color: 'danger',
        message: 'Failed to load ticker list: ' + error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  // 자산 타입 목록 로드
  const loadAssetTypes = async () => {
    try {
      const response = await fetch('/api/v1/asset-types?has_data=false')
      if (response.ok) {
        const data = await response.json()
        setAssetTypes(data)
        setAssetTypeConfig(generateAssetTypeConfig(data))
      }
    } catch (error) {
      console.error('Error loading asset types:', error)
    }
  }

  // 개별 티커 설정 업데이트 (즉시 적용)
  const applySingleTickerSettings = async (assetId, settings) => {
    try {
      const response = await fetch(`/api/v1/tickers/${assetId}/collection-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to update settings')
      }
      await loadTickers()
      setAlert({ color: 'success', message: 'Settings have been updated successfully.' })
      setTimeout(() => setAlert(null), 3000)
    } catch (error) {
      console.error('Error updating ticker settings:', error)
      setAlert({ color: 'danger', message: 'Failed to update settings: ' + error.message })
    }
  }

  // 티커 설정 변경을 임시 저장 (API 호출 대신 상태 업데이트)
  const handleSettingChange = (assetId, key, value) => {
    setPendingChanges((prev) => {
      const currentTicker = tickers.find((t) => t.asset_id === assetId)
      if (!currentTicker) return prev
      const newPending = {
        ...prev,
        [assetId]: {
          ...(prev[assetId] || {}),
          [key]: value,
        },
      }
      // 변경된 값이 원본과 같으면 pending에서 제거
      if (currentTicker[key] === value) {
        const { [key]: removedKey, ...rest } = newPending[assetId]
        if (Object.keys(rest).length === 0) {
          const { [assetId]: removedAsset, ...finalPending } = newPending
          return finalPending
        }
        return { ...newPending, [assetId]: rest }
      }
      return newPending
    })
  }

  // 임시 저장된 변경 사항 일괄 적용
  const handleBulkApply = async () => {
    if (Object.keys(pendingChanges).length === 0) {
      setAlert({ color: 'info', message: 'No changes to apply.' })
      return
    }
    setSaving(true)
    try {
      const updates = Object.entries(pendingChanges).map(([assetId, settings]) => ({
        asset_id: parseInt(assetId),
        ...settings,
      }))
      const response = await fetch('/api/v1/tickers/bulk-update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to apply bulk updates')
      }
      setPendingChanges({})
      await loadTickers()
      setAlert({
        color: 'success',
        message: `${updates.length} tickers' settings have been successfully updated.`,
      })
      setTimeout(() => setAlert(null), 3000)
    } catch (error) {
      console.error('Error applying bulk updates:', error)
      setAlert({ color: 'danger', message: 'Failed to apply bulk updates: ' + error.message })
    } finally {
      setSaving(false)
    }
  }

  // 티커 유효성 검증
  const handleValidateTicker = async () => {
    if (!newTicker.ticker || !newTicker.data_source) {
      setValidationResult({
        color: 'warning',
        message: 'Please enter both ticker and data source.',
      })
      return
    }
    setSaving(true)
    setValidationResult(null)
    try {
      const response = await fetch(
        `/api/v1/tickers/validate?ticker=${newTicker.ticker}&data_source=${newTicker.data_source}`,
      )
      const data = await response.json()
      setValidationResult({ color: data.is_valid ? 'success' : 'danger', message: data.message })
    } catch (error) {
      console.error('Error validating ticker:', error)
      setValidationResult({ color: 'danger', message: 'Error occurred while validating ticker.' })
    } finally {
      setSaving(false)
    }
  }

  // 티커 삭제
  const handleDeleteTicker = async () => {
    if (!selectedTicker) return
    setSaving(true)
    try {
      const response = await fetch(`/api/v1/tickers/${selectedTicker.asset_id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to delete ticker')
      }
      await loadTickers()
      setShowDeleteModal(false)
      setSelectedTicker(null)
      setAlert({ color: 'success', message: 'Ticker has been successfully deleted.' })
      setTimeout(() => setAlert(null), 3000)
    } catch (error) {
      console.error('Error deleting ticker:', error)
      setAlert({ color: 'danger', message: 'Failed to delete ticker: ' + error.message })
    } finally {
      setSaving(false)
    }
  }

  // 개별 티커 데이터 수집 실행
  const executeDataCollection = async (assetId) => {
    try {
      setSaving(true)

      // 1. 해당 티커의 변경사항이 있으면 먼저 적용
      const pendingChangesForAsset = pendingChanges[assetId]
      if (pendingChangesForAsset && Object.keys(pendingChangesForAsset).length > 0) {
        console.log(`Applying pending changes for asset ${assetId}:`, pendingChangesForAsset)

        const applyResponse = await fetch(`/api/v1/tickers/${assetId}/collection-settings`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pendingChangesForAsset),
        })

        if (!applyResponse.ok) {
          const errorData = await applyResponse.json()
          throw new Error(`Failed to apply settings: ${errorData.detail || 'Unknown error'}`)
        }

        // 적용 성공 후 pendingChanges에서 제거
        setPendingChanges((prev) => {
          const newPending = { ...prev }
          delete newPending[assetId]
          return newPending
        })

        // 티커 목록 새로고침
        await loadTickers()
      }

      // 2. 데이터 수집 실행
      const response = await fetch(`/api/v1/tickers/${assetId}/execute-collection`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to execute collection')
      }

      const result = await response.json()
      setAlert({
        color: 'success',
        message: `Data collection started for ${result.ticker}`,
      })
      setTimeout(() => setAlert(null), 3000)

      // 수집 상태 업데이트
      setCollectionStatus((prev) => ({
        ...prev,
        [assetId]: {
          running: true,
          status: 'starting',
          progress: 0,
          message: 'Starting collection...',
        },
      }))
    } catch (error) {
      console.error('Error executing collection:', error)
      setAlert({
        color: 'danger',
        message: 'Failed to execute collection: ' + error.message,
      })
    } finally {
      setSaving(false)
    }
  }

  // 수집 상태 확인
  const checkCollectionStatus = async (assetId) => {
    try {
      const response = await fetch(`/api/v1/tickers/${assetId}/collection-status`)
      if (response.ok) {
        const status = await response.json()
        setCollectionStatus((prev) => ({
          ...prev,
          [assetId]: status,
        }))
      }
    } catch (error) {
      console.error('Error checking collection status:', error)
    }
  }

  // 수집 중지
  const stopDataCollection = async (assetId) => {
    try {
      const response = await fetch(`/api/v1/tickers/${assetId}/stop-collection`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to stop collection')
      }

      setAlert({
        color: 'success',
        message: 'Collection stop requested',
      })
      setTimeout(() => setAlert(null), 3000)
    } catch (error) {
      console.error('Error stopping collection:', error)
      setAlert({
        color: 'danger',
        message: 'Failed to stop collection: ' + error.message,
      })
    }
  }

  // 티커 추가
  const addTicker = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/v1/tickers/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTicker),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to add ticker')
      }

      await loadTickers()
      setShowAddModal(false)
      setNewTicker({
        ticker: '',
        name: '',
        asset_type_id: '',
        exchange: '',
        currency: '',
        description: '',
        data_source: 'fmp',
        collect_price: true,
        collect_assets_info: true,
        collect_onchain: false,
        collect_technical_indicators: false,
      })

      setAlert({
        color: 'success',
        message: `${newTicker.ticker} ticker has been successfully added.`,
      })
      setTimeout(() => setAlert(null), 3000)
    } catch (error) {
      console.error('Error adding ticker:', error)
      setAlert({
        color: 'danger',
        message: 'Failed to add ticker: ' + error.message,
      })
    } finally {
      setSaving(false)
    }
  }

  // 카테고리별로 티커 그룹화
  const groupedTickers = tickers.reduce((acc, ticker) => {
    const category = assetTypeConfig[ticker.asset_type_id]?.name || 'Unknown'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(ticker)
    return acc
  }, {})

  // 필터링된 티커 목록
  const filteredTickers = Object.entries(groupedTickers).reduce(
    (acc, [category, categoryTickers]) => {
      const filtered = categoryTickers.filter(
        (ticker) =>
          ticker.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ticker.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      if (filtered.length > 0) {
        acc[category] = filtered
      }
      return acc
    },
    {},
  )

  // 페이지네이션 계산
  const getPaginatedTickers = (category, tickerList) => {
    const currentPage = currentPages[category] || 1
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return tickerList.slice(startIndex, endIndex)
  }

  // 카테고리 토글
  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }))
    // 카테고리가 펼쳐질 때 페이지를 1로 초기화
    if (expandedCategories[category] === false) {
      setCurrentPages((prev) => ({
        ...prev,
        [category]: 1,
      }))
    }
  }

  // 자산 타입 변경 시 설정 자동 조정
  const handleAssetTypeChange = (assetTypeId) => {
    const config = assetTypeConfig[assetTypeId]
    const assetType = assetTypes.find((t) => t.asset_type_id === assetTypeId)

    setNewTicker((prev) => ({
      ...prev,
      asset_type_id: assetTypeId,
              collect_assets_info: config?.canCollectAssetsInfo || false,
      collect_onchain: config?.canCollectOnchain || false,
      // 크립토 타입이면 기본 데이터 소스를 바이낸스로 설정
      data_source:
        assetType?.type_name.toLowerCase() === 'crypto' ||
        assetType?.type_name.toLowerCase() === 'cryptocurrency'
          ? 'binance'
          : 'fmp',
    }))
  }

  // 페이지네이션에 표시할 페이지 번호 목록을 생성하는 헬퍼 함수
  const getPageNumbersToShow = (currentPage, totalPages, pageRange = 2) => {
    const pages = []
    const startPage = Math.max(1, currentPage - pageRange)
    const endPage = Math.min(totalPages, currentPage + pageRange)

    // 첫 페이지 (1) 표시 및 생략 부호 처리
    if (startPage > 1) {
      pages.push(1)
      if (startPage > 2) {
        pages.push('...')
      }
    }

    // 현재 페이지 주변의 페이지 번호 표시
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    // 마지막 페이지 (totalPages) 표시 및 생략 부호 처리
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push('...')
      }
      pages.push(totalPages)
    }
    return pages
  }

  // 컬럼 헤더 클릭 시 해당 컬럼의 모든 스위치 토글
  const handleColumnToggle = (category, tickerList, settingKey) => {
    // 현재 페이지의 티커들만 가져오기
    const currentPageTickers = getPaginatedTickers(category, tickerList)

    // 현재 페이지의 모든 티커가 해당 설정이 활성화되어 있는지 확인
    const allEnabled = currentPageTickers.every((ticker) => {
      const currentValue = pendingChanges[ticker.asset_id]?.[settingKey] ?? ticker[settingKey]
      return currentValue === true
    })

    // 모든 티커에 대해 설정 변경
    currentPageTickers.forEach((ticker) => {
      const newValue = !allEnabled
      handleSettingChange(ticker.asset_id, settingKey, newValue)
    })

    setAlert({
      color: 'success',
      message: `${currentPageTickers.length} items: ${settingKey} ${!allEnabled ? 'enabled' : 'disabled'}`,
    })
    setTimeout(() => setAlert(null), 3000)
  }

  useEffect(() => {
    loadTickers()
    loadAssetTypes()

    // Socket.IO 연결 설정
            const socket = io('/', {
      transports: ['websocket'], // WebSocket을 우선적으로 사용
    })

    socket.on('connect', () => {
      console.log('TickerManagement: Connected to Socket.IO server')
    })

    socket.on('scheduler_log', (data) => {
      const newLog = {
        message: data.message,
        type: data.type || 'log', // log, info, error, warning
        timestamp: new Date(),
      }
      setLogs((prevLogs) => [newLog, ...prevLogs].slice(0, 50)) // 최신 50개 로그만 유지
    })

    socket.on('disconnect', () => {
      console.log('TickerManagement: Disconnected from Socket.IO server')
    })

    // 컴포넌트 언마운트 시 소켓 연결 해제
    return () => {
      socket.disconnect()
    }
  }, [])

  // 수집 상태 실시간 업데이트
  useEffect(() => {
    const statusInterval = setInterval(() => {
      // 수집 중인 티커들의 상태만 확인
      Object.keys(collectionStatus).forEach((assetId) => {
        const status = collectionStatus[assetId]
        if (status && status.running) {
          checkCollectionStatus(parseInt(assetId))
        }
      })
    }, 2000) // 2초마다 업데이트

    return () => clearInterval(statusInterval)
  }, [collectionStatus])

  // 티커나 수집 사이트가 변경되면 검증 결과 초기화
  useEffect(() => {
    setValidationResult(null)
  }, [newTicker.ticker, newTicker.data_source])

  if (loading) {
    return (
      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardBody className="text-center py-5">
              <CSpinner size="lg" />
              <p className="mt-3">티커 목록을 불러오는 중...</p>
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
              <h2>티커 관리</h2>
              <p className="text-muted">티커별 데이터 수집 설정을 관리합니다.</p>
            </div>
            <div className="d-flex gap-2 align-items-center">
              {/* 페이지네이션 옵션 */}
              <div className="d-flex align-items-center me-3">
                <span className="me-2">Items per page:</span>
                <CFormSelect
                  size="sm"
                  style={{ width: '80px' }}
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </CFormSelect>
              </div>

              {Object.keys(pendingChanges).length > 0 ? (
                <>
                  <CButton color="warning" size="sm" onClick={() => setPendingChanges({})}>
                    <CIcon icon={cilTrash} className="me-1" />
                    변경 취소 ({Object.keys(pendingChanges).length})
                  </CButton>
                  <CButton color="success" size="sm" onClick={handleBulkApply} disabled={saving}>
                    {saving ? <CSpinner size="sm" /> : '변경 사항 일괄 적용'}
                  </CButton>
                </>
              ) : (
                <CButton
                  color="outline-secondary"
                  size="sm"
                  disabled={true}
                  title="변경사항이 없습니다"
                >
                  변경 사항 일괄 적용
                </CButton>
              )}
              <CButton
                color="outline-secondary"
                size="sm"
                onClick={loadTickers}
                disabled={loading || Object.keys(pendingChanges).length > 0}
              >
                <CIcon icon={cilReload} className="me-1" />
                새로고침
              </CButton>
              <CButton
                color={useGenericSettings ? 'success' : 'outline-secondary'}
                size="sm"
                onClick={() => setUseGenericSettings(!useGenericSettings)}
              >
                {useGenericSettings ? '기본 설정' : '고급 설정'}
              </CButton>
              <CButton color="primary" size="sm" onClick={() => setShowAddModal(true)}>
                <CIcon icon={cilPlus} className="me-1" />
                티커 추가
              </CButton>
            </div>
          </div>
        </CCol>
      </CRow>

      {/* 검색 */}
      <CRow className="mb-4">
        <CCol xs={12}>
          <CCard>
            <CCardBody>
              <CInputGroup>
                <CInputGroupText>
                  <CIcon icon={cilSearch} />
                </CInputGroupText>
                <CFormInput
                  placeholder="티커명, 회사명으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </CInputGroup>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* 실시간 로그 */}
      {logs.length > 0 && (
        <CRow className="mb-4">
          <CCol xs={12}>
            <CCard>
              <CCardHeader>
                <h5 className="mb-0">
                  <i className="cil-monitor me-2"></i>
                  실시간 시스템 로그
                  <CBadge color="info" className="ms-2">
                    {logs.length}개
                  </CBadge>
                </h5>
              </CCardHeader>
              <CCardBody style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className={`d-flex justify-content-between align-items-start mb-2 p-2 rounded ${
                      log.type === 'error' || log.type === 'critical'
                        ? 'bg-danger bg-opacity-10'
                        : log.type === 'warning'
                          ? 'bg-warning bg-opacity-10'
                          : log.type === 'success'
                            ? 'bg-success bg-opacity-10'
                            : 'bg-light'
                    }`}
                  >
                    <div className="flex-grow-1">
                      <small className="text-muted">{log.timestamp.toLocaleTimeString()}</small>
                      <div className="mt-1">{log.message}</div>
                    </div>
                    {log.type && (
                      <CBadge
                        color={
                          log.type === 'error' || log.type === 'critical'
                            ? 'danger'
                            : log.type === 'warning'
                              ? 'warning'
                              : log.type === 'success'
                                ? 'success'
                                : 'info'
                        }
                        className="ms-2"
                      >
                        {log.type}
                      </CBadge>
                    )}
                  </div>
                ))}
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      )}

      {/* 티커 목록 - 카테고리별 카드 */}
      <CRow>
        {Object.entries(filteredTickers).map(([category, categoryTickers]) => {
          const totalPages = Math.ceil(categoryTickers.length / itemsPerPage)
          const paginatedTickers = getPaginatedTickers(category, categoryTickers)
          const isExpanded = expandedCategories[category] !== false // 기본값은 펼쳐진 상태

          return (
            <CCol xs={12} key={category} className="mb-4">
              <CCard>
                <CCardHeader
                  className="d-flex justify-content-between align-items-center cursor-pointer"
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleCategory(category)}
                >
                  <div className="d-flex align-items-center">
                    <h5 className="mb-0 me-2">{category}</h5>
                    <CBadge color="info" className="me-2">
                      {categoryTickers.length}개
                    </CBadge>
                    <i className={`cil-chevron-${isExpanded ? 'up' : 'down'} text-muted`}></i>
                  </div>
                </CCardHeader>
                {isExpanded && (
                  <CCardBody>
                    <CTable hover responsive striped>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Ticker</CTableHeaderCell>
                          <CTableHeaderCell>Name</CTableHeaderCell>
                          {!useGenericSettings && <CTableHeaderCell>C-Site</CTableHeaderCell>}
                          <CTableHeaderCell>Exchange</CTableHeaderCell>
                          {!useGenericSettings && (
                            <CTableHeaderCell
                              style={{
                                cursor: 'pointer',
                                textAlign: 'center',
                                fontWeight: 'bold',
                                transition: 'all 0.2s ease',
                                userSelect: 'none',
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#e9ecef'
                                e.target.style.transform = 'translateY(-1px)'
                                e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                                e.target.style.borderRadius = '4px'
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = ''
                                e.target.style.transform = 'translateY(0)'
                                e.target.style.boxShadow = 'none'
                                e.target.style.borderRadius = ''
                              }}
                              onClick={() =>
                                handleColumnToggle(category, categoryTickers, 'collect_price')
                              }
                            >
                              Price
                            </CTableHeaderCell>
                          )}
                          {!useGenericSettings && (
                            <CTableHeaderCell
                              style={{
                                cursor: 'pointer',
                                textAlign: 'center',
                                fontWeight: 'bold',
                                transition: 'all 0.2s ease',
                                userSelect: 'none',
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#e9ecef'
                                e.target.style.transform = 'translateY(-1px)'
                                e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                                e.target.style.borderRadius = '4px'
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = ''
                                e.target.style.transform = 'translateY(0)'
                                e.target.style.boxShadow = 'none'
                                e.target.style.borderRadius = ''
                              }}
                              onClick={() =>
                                handleColumnToggle(
                                  category,
                                  categoryTickers,
                                  'collect_assets_info',
                                )
                              }
                            >
                              Com-Info
                            </CTableHeaderCell>
                          )}
                          {!useGenericSettings && (
                            <CTableHeaderCell
                              style={{
                                cursor: 'pointer',
                                textAlign: 'center',
                                fontWeight: 'bold',
                                transition: 'all 0.2s ease',
                                userSelect: 'none',
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#e9ecef'
                                e.target.style.transform = 'translateY(-1px)'
                                e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                                e.target.style.borderRadius = '4px'
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = ''
                                e.target.style.transform = 'translateY(0)'
                                e.target.style.boxShadow = 'none'
                                e.target.style.borderRadius = ''
                              }}
                              onClick={() =>
                                handleColumnToggle(category, categoryTickers, 'collect_onchain')
                              }
                            >
                              Onchain
                            </CTableHeaderCell>
                          )}
                          {!useGenericSettings && (
                            <CTableHeaderCell
                              style={{
                                cursor: 'pointer',
                                textAlign: 'center',
                                fontWeight: 'bold',
                                transition: 'all 0.2s ease',
                                userSelect: 'none',
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#e9ecef'
                                e.target.style.transform = 'translateY(-1px)'
                                e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                                e.target.style.borderRadius = '4px'
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = ''
                                e.target.style.transform = 'translateY(0)'
                                e.target.style.boxShadow = 'none'
                                e.target.style.borderRadius = ''
                              }}
                              onClick={() =>
                                handleColumnToggle(
                                  category,
                                  categoryTickers,
                                  'collect_technical_indicators',
                                )
                              }
                            >
                              Tech-Indi
                            </CTableHeaderCell>
                          )}
                          <CTableHeaderCell>Status</CTableHeaderCell>
                          <CTableHeaderCell>Collection</CTableHeaderCell>
                          <CTableHeaderCell>Action</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {paginatedTickers.map((ticker) => (
                          <CTableRow
                            key={ticker.asset_id}
                            className={
                              Object.keys(pendingChanges[ticker.asset_id] || {}).length > 0
                                ? 'table-warning'
                                : ''
                            }
                          >
                            <CTableDataCell>
                              <strong>{ticker.ticker}</strong>
                              {Object.keys(pendingChanges[ticker.asset_id] || {}).length > 0 && (
                                <CBadge color="warning" className="ms-2">
                                  변경됨
                                </CBadge>
                              )}
                            </CTableDataCell>
                            <CTableDataCell>{ticker.name}</CTableDataCell>
                            {!useGenericSettings ? (
                              <TickerCollectionSettings
                                ticker={ticker}
                                assetTypeConfig={assetTypeConfig}
                                pendingChanges={pendingChanges}
                                dataSources={dataSources}
                                saving={saving}
                                onSettingChange={handleSettingChange}
                              />
                            ) : (
                              <CTableDataCell colSpan="5">
                                <GenericCollectionSettings
                                  assetType={
                                    assetTypes.find((t) => t.asset_type_id === ticker.asset_type_id)
                                      ?.type_name
                                  }
                                  settings={{
                                    price_data:
                                      pendingChanges[ticker.asset_id]?.collect_price ??
                                      ticker.collect_price,
                                    stock_profiles:
                                              pendingChanges[ticker.asset_id]?.collect_assets_info ??
        ticker.collect_assets_info,
                                    onchain_metrics:
                                      pendingChanges[ticker.asset_id]?.collect_onchain ??
                                      ticker.collect_onchain,
                                    technical_indicators:
                                      pendingChanges[ticker.asset_id]
                                        ?.collect_technical_indicators ??
                                      ticker.collect_technical_indicators,
                                  }}
                                  onSettingsChange={(newSettings) => {
                                    // GenericCollectionSettings의 키를 백엔드 API 키로 매핑
                                    const mapping = {
                                      price_data: 'collect_price',
                                      stock_profiles: 'collect_assets_info',
                                      onchain_metrics: 'collect_onchain',
                                      technical_indicators: 'collect_technical_indicators',
                                    }
                                    Object.entries(newSettings).forEach(([key, value]) => {
                                      const backendKey = mapping[key]
                                      if (backendKey) {
                                        handleSettingChange(ticker.asset_id, backendKey, value)
                                      }
                                    })
                                  }}
                                  disabled={saving}
                                />
                              </CTableDataCell>
                            )}
                            <CTableDataCell>{ticker.exchange || '-'}</CTableDataCell>
                            <CTableDataCell>
                              <CBadge color={ticker.is_active ? 'success' : 'danger'}>
                                {ticker.is_active ? '활성' : '비활성'}
                              </CBadge>
                            </CTableDataCell>
                            <CTableDataCell>
                              {(() => {
                                const status = collectionStatus[ticker.asset_id]
                                const hasPendingChanges =
                                  pendingChanges[ticker.asset_id] &&
                                  Object.keys(pendingChanges[ticker.asset_id]).length > 0

                                if (!status || !status.running) {
                                  return (
                                    <div className="d-flex flex-column align-items-center">
                                      <CButton
                                        color={hasPendingChanges ? 'warning' : 'success'}
                                        size="sm"
                                        onClick={() => executeDataCollection(ticker.asset_id)}
                                        disabled={saving}
                                        className="mb-1"
                                      >
                                        <CIcon icon={cilMediaPlay} className="me-1" />
                                        {hasPendingChanges ? 'Execute*' : 'Execute'}
                                      </CButton>
                                      {hasPendingChanges && (
                                        <div className="small text-warning">
                                          <i className="cil-warning me-1"></i>
                                          설정 변경됨
                                        </div>
                                      )}
                                    </div>
                                  )
                                } else {
                                  return (
                                    <div className="d-flex flex-column align-items-center">
                                      <CButton
                                        color="warning"
                                        size="sm"
                                        onClick={() => stopDataCollection(ticker.asset_id)}
                                        disabled={saving}
                                        className="mb-1"
                                      >
                                        <CIcon icon={cilMediaStop} className="me-1" />
                                        Stop
                                      </CButton>
                                      <div className="small text-muted">
                                        {status.progress}% - {status.message}
                                      </div>
                                    </div>
                                  )
                                }
                              })()}
                            </CTableDataCell>
                            <CTableDataCell>
                              <CButton
                                color="danger"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedTicker(ticker)
                                  setShowDeleteModal(true)
                                }}
                                disabled={saving}
                              >
                                <CIcon icon={cilTrash} />
                              </CButton>
                            </CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>

                    {/* 페이지네이션 */}
                    {totalPages > 1 && (
                      <div className="d-flex justify-content-center mt-3">
                        <CPagination>
                          <CPaginationItem
                            disabled={(currentPages[category] || 1) === 1}
                            onClick={() =>
                              setCurrentPages((prev) => ({
                                ...prev,
                                [category]: (prev[category] || 1) - 1,
                              }))
                            }
                          >
                            &laquo; Previous
                          </CPaginationItem>
                          {getPageNumbersToShow(currentPages[category] || 1, totalPages).map(
                            (page, index) => (
                              <CPaginationItem
                                key={`${category}-page-${page}-${index}`} // '...'를 위한 고유 키
                                active={page === (currentPages[category] || 1)}
                                disabled={page === '...'} // 생략 부호는 클릭 불가
                                onClick={() => {
                                  if (page !== '...') {
                                    // 생략 부호 클릭 방지
                                    setCurrentPages((prev) => ({
                                      ...prev,
                                      [category]: page,
                                    }))
                                  }
                                }}
                              >
                                {page}
                              </CPaginationItem>
                            ),
                          )}
                          <CPaginationItem
                            disabled={(currentPages[category] || 1) === totalPages}
                            onClick={() =>
                              setCurrentPages((prev) => ({
                                ...prev,
                                [category]: (prev[category] || 1) + 1,
                              }))
                            }
                          >
                            Next &raquo;
                          </CPaginationItem>
                        </CPagination>
                      </div>
                    )}
                  </CCardBody>
                )}
              </CCard>
            </CCol>
          )
        })}
      </CRow>

      {/* 티커 추가 모달 */}
      <CModal visible={showAddModal} onClose={() => setShowAddModal(false)} size="lg">
        <CModalHeader>
          <CModalTitle>새 티커 추가</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                {' '}
                {/* 티커 입력 필드 */}
                <label className="form-label">티커 *</label>
                <CFormInput
                  value={newTicker.ticker}
                  onChange={(e) =>
                    setNewTicker((prev) => ({ ...prev, ticker: e.target.value.toUpperCase() }))
                  }
                  placeholder="예: AAPL, BTCUSDT"
                />
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                {' '}
                {/* 자산 타입 선택 필드 */}
                <label className="form-label">자산 타입 *</label>
                <CFormSelect
                  value={newTicker.asset_type_id}
                  onChange={(e) => handleAssetTypeChange(parseInt(e.target.value))}
                >
                  <option value="">자산 타입을 선택하세요</option>
                  {assetTypes.map((type) => (
                    <option key={type.asset_type_id} value={type.asset_type_id}>
                      {type.type_name}
                    </option>
                  ))}
                </CFormSelect>
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={12}>
              <div className="mb-3">
                {' '}
                {/* 회사명/자산명 입력 필드 */}
                <label className="form-label">회사명/자산명 *</label>
                <CFormInput
                  value={newTicker.name}
                  onChange={(e) => setNewTicker((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="예: Apple Inc., Bitcoin"
                />
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                {' '}
                {/* 수집 사이트 선택 필드 */}
                <label className="form-label">수집 사이트</label>
                <CFormSelect
                  value={newTicker.data_source}
                  onChange={(e) =>
                    setNewTicker((prev) => ({ ...prev, data_source: e.target.value }))
                  }
                >
                  {dataSources.map((source) => (
                    <option key={source.value} value={source.value}>
                      {source.label}
                    </option>
                  ))}
                </CFormSelect>
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                {' '}
                {/* 거래소 입력 필드 */}
                <label className="form-label">거래소</label>
                <CFormInput
                  value={newTicker.exchange}
                  onChange={(e) => setNewTicker((prev) => ({ ...prev, exchange: e.target.value }))}
                  placeholder="예: NASDAQ, Binance"
                />
              </div>
            </CCol>
          </CRow>

          {/* 자산 타입별 안내 메시지 */}
          {newTicker.asset_type_id && (
            <div className="alert alert-info">
              <strong>등록 안내:</strong> {newTicker.ticker} 티커를{' '}
              {assetTypes.find((t) => t.asset_type_id === newTicker.asset_type_id)?.type_name}{' '}
              자산으로 등록하시겠습니까?
              <br />
              <small>
                • 가격 데이터: 모든 자산 타입에서 수집 가능
                {assetTypeConfig[newTicker.asset_type_id]?.canCollectCompanyInfo && (
                  <>
                    <br />• 기업 정보: 주식, ETF, 채권, 펀드에서만 수집 가능
                  </>
                )}
                {assetTypeConfig[newTicker.asset_type_id]?.canCollectOnchain && (
                  <>
                    <br />• 온체인 데이터: 암호화폐에서만 수집 가능
                  </>
                )}
                <br />• 기술 지표: 모든 자산 타입에서 수집 가능
              </small>
            </div>
          )}

          {/* 수집 설정 */}
          <CRow>
            <CCol md={12}>
              <div className="mb-3">
                <label className="form-label">수집 설정</label>
                <div className="d-flex flex-column gap-2">
                  <div className="form-check form-switch">
                    <CFormSwitch
                      id="collect_price"
                      checked={newTicker.collect_price}
                      onChange={(e) =>
                        setNewTicker((prev) => ({ ...prev, collect_price: e.target.checked }))
                      }
                    />
                    <label className="form-check-label" htmlFor="collect_price">
                      가격 데이터 수집
                    </label>
                  </div>
                  <div className="form-check form-switch">
                    <CFormSwitch
                      id="collect_assets_info"
                      checked={newTicker.collect_assets_info}
                      onChange={(e) =>
                        setNewTicker((prev) => ({
                          ...prev,
                          collect_assets_info: e.target.checked,
                        }))
                      }
                      disabled={!assetTypeConfig[newTicker.asset_type_id]?.canCollectAssetsInfo}
                    />
                    <label className="form-check-label" htmlFor="collect_assets_info">
                      자산 정보 수집{' '}
                      {!assetTypeConfig[newTicker.asset_type_id]?.canCollectAssetsInfo &&
                        '(사용 불가)'}
                    </label>
                  </div>
                  <div className="form-check form-switch">
                    <CFormSwitch
                      id="collect_onchain"
                      checked={newTicker.collect_onchain}
                      onChange={(e) =>
                        setNewTicker((prev) => ({ ...prev, collect_onchain: e.target.checked }))
                      }
                      disabled={!assetTypeConfig[newTicker.asset_type_id]?.canCollectOnchain}
                    />
                    <label className="form-check-label" htmlFor="collect_onchain">
                      온체인 데이터 수집{' '}
                      {!assetTypeConfig[newTicker.asset_type_id]?.canCollectOnchain &&
                        '(사용 불가)'}
                    </label>
                  </div>
                  <div className="form-check form-switch">
                    <CFormSwitch
                      id="collect_technical_indicators"
                      checked={newTicker.collect_technical_indicators}
                      onChange={(e) =>
                        setNewTicker((prev) => ({
                          ...prev,
                          collect_technical_indicators: e.target.checked,
                        }))
                      }
                    />
                    <label className="form-check-label" htmlFor="collect_technical_indicators">
                      기술 지표 수집
                    </label>
                  </div>
                </div>
              </div>
            </CCol>
          </CRow>

          <CCol md={6}>
            <div className="mb-3">
              <label className="form-label">티커 검증</label>
              <CButton color="info" onClick={handleValidateTicker} disabled={saving}>
                {saving ? <CSpinner size="sm" /> : '티커 검증'}
              </CButton>
              {validationResult && (
                <CAlert color={validationResult.color} className="mt-2 mb-0 py-2">
                  {validationResult.message}
                </CAlert>
              )}
            </div>
          </CCol>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowAddModal(false)}>
            취소
          </CButton>
          <CButton
            color="primary"
            onClick={addTicker}
            disabled={
              saving ||
              !newTicker.ticker ||
              !newTicker.name ||
              !newTicker.asset_type_id ||
              validationResult?.color !== 'success'
            }
          >
            {saving ? <CSpinner size="sm" /> : '추가'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* 티커 삭제 확인 모달 */}
      <CModal visible={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <CModalHeader>
          <CModalTitle>티커 삭제 확인</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <strong>{selectedTicker?.ticker}</strong> 티커를 정말로 삭제하시겠습니까?
          <br />
          <span className="text-danger">
            이 작업은 되돌릴 수 없으며, 관련된 모든 데이터(가격, 기업 정보 등)가 영구적으로
            삭제됩니다.
          </span>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowDeleteModal(false)} disabled={saving}>
            취소
          </CButton>
          <CButton color="danger" onClick={handleDeleteTicker} disabled={saving}>
            {saving ? <CSpinner size="sm" /> : '삭제'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default TickerManagement
