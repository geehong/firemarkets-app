import React, { useMemo, useState, useRef, useEffect } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import { CButton, CSpinner, CBadge, CFormSelect, CCard, CCardBody, CCardHeader, CCardTitle } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMediaPlay, cilTrash, cilSave, cilCheckCircle, cilXCircle } from '@coreui/icons'
import useAPI from '../../../hooks/useAPI'

// AG Grid 모듈 등록
ModuleRegistry.registerModules([AllCommunityModule])

// 데이터 소스 옵션
const dataSources = [
  { value: 'alpha_vantage', label: 'Alpha Vantage' },
  { value: 'fmp', label: 'FMP' },
  { value: 'yahoo_finance', label: 'Yahoo Finance' },
  { value: 'bgeometrics', label: 'BGeometrics' },
  { value: 'fred', label: 'FRED' },
  { value: 'binance', label: 'Binance' },
  { value: 'coinbase', label: 'Coinbase' },
  { value: 'coinmarketcap', label: 'CoinMarketCap' },
  { value: 'twelvedata', label: 'TwelveData' },
  { value: 'tiingo', label: 'Tiingo' },
]

const TickerTableAgGrid = ({
  assetType = 'All',
  pendingChanges = {},
  onSettingChange,
  onExecute,
  onDelete,
  searchTerm = '',
  onSearchChange,
  isExecuting = false,
  executingTickers = [],
  onExecutePerAsset,
  onBulkSave,
  isBulkUpdatingSettings = false,
  height = 600,
  onAssetTypeChange,
  isTabActive = false,
}) => {
  // 체크박스 상태를 관리하는 로컬 상태
  const [checkboxStates, setCheckboxStates] = useState({})
  // 데이터 소스 상태를 관리하는 로컬 상태
  const [dataSourceStates, setDataSourceStates] = useState({})
  // 저장 중 상태
  const [isSaving, setIsSaving] = useState(false)
  const gridRef = useRef()
  const [gridApi, setGridApi] = useState(null)
  
  // 자산(티커) 데이터 - 통합 훅 사용
  const assetFilters = useMemo(() => ({
    type_name: assetType === 'All' ? undefined : assetType,
    has_ohlcv_data: false,
  }), [assetType])
  const {
    data: assetsData,
    loading: tickersLoading,
    error: tickersError,
    refetch: refetchTickers,
  } = useAPI.assets.list(1, 1000, assetFilters)

  // 자산 타입은 로컬에서 유도
  const assetTypes = useMemo(() => {
    const arr = Array.isArray(assetsData?.data) ? assetsData.data : (assetsData || [])
    const names = Array.from(new Set(arr.map((t) => t.type_name).filter(Boolean)))
    return names.map((name, idx) => ({ asset_type_id: idx + 1, type_name: name }))
  }, [assetsData])
  const assetTypesLoading = tickersLoading
  const assetTypesError = null

  // 저장은 API 확정 전까지 보류
  const bulkUpdateSettings = async () => {}

  // 데이터 디버깅 함수 제거
  const debugTickerData = () => {}

  // 자산 타입별로 필터링
  const filteredTickersByType = useMemo(() => {
    const tickers = Array.isArray(assetsData?.data) ? assetsData.data : (assetsData || [])
    
    
    let filtered = tickers
    
    // All이 아닌 경우에만 타입별 필터링
    if (assetType !== 'All') {
      filtered = tickers.filter(ticker => {
        const tickerType = ticker.type_name || 'Stocks'
        const matches = tickerType === assetType
        
        return matches
      })
    } else {
      console.log('🔍 Showing all asset types')
    }
    
    
    
    return filtered
  }, [assetsData, assetType])

  // 설정 키 매핑 (먼저 정의)
  const getSettingKey = (columnKey) => {
    switch (columnKey) {
      case 'price':
        return 'collect_price'
      case 'stock_info':
      case 'etf_info':
      case 'fund_info':
        return 'collect_assets_info'
      case 'stock_financials':
        return 'collect_financials'
      case 'stock_estimates':
        return 'collect_estimates'
      case 'crypto_data':
        return 'collect_crypto_data'
      case 'technical_indicators':
        return 'collect_technical_indicators'
      default:
        return null
    }
  }

  // 원래 DB 값 가져오기 (로컬 상태 무시) - 먼저 정의
  const getOriginalSettingValue = (ticker, columnKey) => {
    const settingKey = getSettingKey(columnKey)
    if (!settingKey) return true

    // pendingChanges에서 확인
    if (
      pendingChanges[ticker.asset_id] &&
      pendingChanges[ticker.asset_id][settingKey] !== undefined
    ) {
      return pendingChanges[ticker.asset_id][settingKey]
    }

    // JSON 필드에서 확인 (문자열로 저장된 경우도 처리)
    if (ticker.collection_settings) {
      let collectionSettings = ticker.collection_settings
      
      // 문자열인 경우 파싱
      if (typeof collectionSettings === 'string') {
        try {
          collectionSettings = JSON.parse(collectionSettings)
        } catch (e) {
          console.error('Failed to parse collection_settings:', e)
          collectionSettings = {}
        }
      }
      
      if (collectionSettings && collectionSettings[settingKey] !== undefined) {
        // boolean 값으로 변환
        const value = collectionSettings[settingKey]
        if (typeof value === 'boolean') {
          return value
        } else if (typeof value === 'string') {
          return value.toLowerCase() === 'true'
        } else if (typeof value === 'number') {
          return value === 1
        }
        return Boolean(value)
      }
    }

    // 기존 필드에서 확인 (하위 호환성)
    if (ticker[settingKey] !== undefined) {
      const value = ticker[settingKey]
      if (typeof value === 'boolean') {
        return value
      } else if (typeof value === 'string') {
        return value.toLowerCase() === 'true'
      } else if (typeof value === 'number') {
        return value === 1
      }
      return Boolean(value)
    }

    // 기본값 반환
    switch (settingKey) {
      case 'collect_price':
      case 'collect_assets_info':
      case 'collect_financials':
      case 'collect_estimates':
      case 'collect_crypto_data':
        return true
      case 'collect_technical_indicators':
        return false
      default:
        return true
    }
  }

  // 검색어로 필터링 + collect_assets_info=true 필터링
  const filteredTickers = useMemo(() => {
    
    const filtered = filteredTickersByType.filter((ticker) => {
      // 검색어 필터링
      const matchesSearch = 
        ticker.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticker.name.toLowerCase().includes(searchTerm.toLowerCase())
      
      if (!matchesSearch) return false
      
      // collect_assets_info=true 필터링 (선택적)
      // 사용자가 명시적으로 collect_assets_info=true만 보기를 원할 때만 적용
      // 현재는 모든 자산을 보여주도록 주석 처리
      /*
      const hasAssetsInfo = getOriginalSettingValue(ticker, 'stock_info') || 
                           getOriginalSettingValue(ticker, 'etf_info') || 
                           getOriginalSettingValue(ticker, 'fund_info')
      
      return hasAssetsInfo
      */
      
      // 모든 자산 표시
      return true
    })
    
    
    return filtered
  }, [filteredTickersByType, searchTerm])

  // 변경사항 요약 계산
  const changeSummary = useMemo(() => {
    const changes = {
      settings: {},
      dataSources: {}
    }
    
    
    
    // 체크박스 변경사항 - 실제 DB 값과 비교
    Object.keys(checkboxStates).forEach(key => {
      const parts = key.split('_')
      
      if (parts.length >= 2) {
        const assetId = parts[0]
        const columnKey = parts.slice(1).join('_') // 나머지 부분을 모두 합침
        
        // 해당 티커 찾기
        const ticker = filteredTickers.find(t => t.asset_id.toString() === assetId)
        if (ticker) {
          const originalValue = getOriginalSettingValue(ticker, columnKey)
          const currentValue = checkboxStates[key]
          
          
          // 실제로 값이 변경된 경우만 추가
          if (originalValue !== currentValue) {
            const settingKey = getSettingKey(columnKey)
            
            if (settingKey) {
              if (!changes.settings[assetId]) changes.settings[assetId] = {}
              changes.settings[assetId][settingKey] = currentValue
              
            }
          }
        }
      }
    })
    
    // 데이터 소스 변경사항 - 실제 DB 값과 비교
    Object.keys(dataSourceStates).forEach(key => {
      const assetId = key.replace('_data_source', '')
      
      // 해당 티커 찾기
      const ticker = filteredTickers.find(t => t.asset_id.toString() === assetId)
      if (ticker) {
        const originalValue = ticker.data_source || 'fmp'
        const currentValue = dataSourceStates[key]
        
        
        // 실제로 값이 변경된 경우만 추가
        if (originalValue !== currentValue) {
          changes.dataSources[assetId] = currentValue
        }
      }
    })
    
    return changes
  }, [checkboxStates, dataSourceStates, filteredTickers])

  // 변경사항이 있는지 확인
  const hasChanges = useMemo(() => {
    const hasSettingsChanges = Object.keys(changeSummary.settings).length > 0
    const hasDataSourceChanges = Object.keys(changeSummary.dataSources).length > 0
    return hasSettingsChanges || hasDataSourceChanges
  }, [changeSummary])

  // 변경사항 개수 계산
  const changeCount = useMemo(() => {
    let count = 0
    Object.values(changeSummary.settings).forEach(settings => {
      count += Object.keys(settings).length
    })
    count += Object.keys(changeSummary.dataSources).length
    return count
  }, [changeSummary])

  // 현재 표시 값 가져오기 (로컬 상태 포함)
  const getSettingValue = (ticker, columnKey) => {
    const checkboxKey = `${ticker.asset_id}_${columnKey}`
    
    // 로컬 상태가 있으면 로컬 상태 사용
    if (checkboxStates[checkboxKey] !== undefined) {
      return checkboxStates[checkboxKey]
    }
    
    // 없으면 원래 DB 값 사용
    return getOriginalSettingValue(ticker, columnKey)
  }

  // 데이터 소스 값 가져오기 - 로컬 상태 사용
  const getDataSourceValue = (ticker) => {
    const dataSourceKey = `${ticker.asset_id}_data_source`
    const initialValue = ticker.data_source || 'fmp'
    return dataSourceStates[dataSourceKey] !== undefined ? dataSourceStates[dataSourceKey] : initialValue
  }

  // 변경사항이 있는지 확인 (시각적 표시용)
  const hasLocalChange = (ticker, columnKey) => {
    const checkboxKey = `${ticker.asset_id}_${columnKey}`
    return checkboxStates[checkboxKey] !== undefined
  }

  const hasDataSourceChange = (ticker) => {
    const dataSourceKey = `${ticker.asset_id}_data_source`
    return dataSourceStates[dataSourceKey] !== undefined
  }

  // 저장 함수
  const handleSaveAll = async () => {
    if (!hasChanges) return
    
    setIsSaving(true)
    
    try {
      const updates = []
      
      // 설정 변경사항 추가
      Object.keys(changeSummary.settings).forEach(assetId => {
        const update = {
          asset_id: parseInt(assetId),
          ...changeSummary.settings[assetId]
        }
        updates.push(update)
      })
      
      // 데이터 소스 변경사항 추가
      Object.keys(changeSummary.dataSources).forEach(assetId => {
        const existingUpdate = updates.find(u => u.asset_id === parseInt(assetId))
        if (existingUpdate) {
          existingUpdate.data_source = changeSummary.dataSources[assetId]
        } else {
          updates.push({
            asset_id: parseInt(assetId),
            data_source: changeSummary.dataSources[assetId]
          })
        }
      })
      
      await bulkUpdateSettings(updates)
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  // 자산 타입별 컬럼 정의
  const getAssetColumns = () => {
    switch (assetType) {
      case 'Stocks':
        return [
          { key: 'price', label: 'Price' },
          { key: 'stock_info', label: 'S-Info' },
          { key: 'stock_financials', label: 'S-Financials' },
          { key: 'stock_estimates', label: 'S-Estimates' },
        ]
      case 'ETFs':
        return [
          { key: 'price', label: 'Price' },
          { key: 'etf_info', label: 'ETF-Info' },
        ]
      case 'Funds':
        return [
          { key: 'price', label: 'Price' },
          { key: 'fund_info', label: 'Fund-Info' },
        ]
      case 'Crypto':
        return [
          { key: 'price', label: 'Price' },
          { key: 'crypto_data', label: 'C-Data' },
          { key: 'technical_indicators', label: 'Tech-Indi' },
        ]
      case 'All':
        // All인 경우 Price만 표시 (ID, Ticker, Data Source는 기본 컬럼에 포함됨)
        return [
          { key: 'price', label: 'Price' },
        ]
      default:
        return [{ key: 'price', label: 'Price' }]
    }
  }

  const assetColumns = getAssetColumns()

  // AG Grid 컬럼 정의
  const columnDefs = useMemo(() => {
    const baseColumns = [
      {
        field: 'asset_id',
        headerName: 'ID',
        width: 80,
        sortable: true,
        filter: true,
      },
      {
        field: 'ticker',
        headerName: 'Ticker',
        width: 120,
        sortable: true,
        filter: true,
        cellRenderer: (params) => {
          const ticker = params.data
          const hasChanges = hasLocalChange(ticker, 'any') || hasDataSourceChange(ticker)
          
          return (
            <div className="d-flex align-items-center">
              <strong>{params.value}</strong>
              {hasChanges && (
                <CBadge color="warning" className="ms-2 small">
                  변경됨
                </CBadge>
              )}
            </div>
          )
        }
      },
      {
        field: 'data_source',
        headerName: 'Data Source',
        width: 150,
        sortable: true,
        filter: true,
        cellRenderer: (params) => {
          const ticker = params.data
          const currentDataSource = getDataSourceValue(ticker)
          const hasChange = hasDataSourceChange(ticker)
          
          return (
            <div className="d-flex align-items-center">
              <CFormSelect
                value={currentDataSource}
                onChange={(e) => {
                  const dataSourceKey = `${ticker.asset_id}_data_source`
                  setDataSourceStates(prev => ({
                    ...prev,
                    [dataSourceKey]: e.target.value
                  }))
                }}
                size="sm"
                className={hasChange ? 'border-warning' : ''}
              >
                {dataSources.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </CFormSelect>
              {hasChange && (
                <CIcon icon={cilCheckCircle} className="text-warning ms-1" size="sm" />
              )}
            </div>
          )
        }
      },
    ]

    // 자산 타입별 컬럼 추가
    assetColumns.forEach(column => {
      baseColumns.push({
        field: column.key,
        headerName: column.label,
        width: 100,
        sortable: false,
        filter: false,
        headerComponent: (params) => {
          const state = getHeaderCheckboxState(column.key)
          // React can't directly set indeterminate via attribute; use ref callback
          return (
            <div className="d-flex align-items-center justify-content-center gap-1">
              <input
                type="checkbox"
                ref={(el) => {
                  if (el) {
                    el.indeterminate = state.indeterminate
                    el.checked = state.checked
                    el.disabled = state.disabled || isExecuting
                  }
                }}
                onChange={(e) => handleHeaderToggle(column.key, e.target.checked)}
                style={{ cursor: isExecuting ? 'not-allowed' : 'pointer' }}
              />
              <span>{column.label}</span>
            </div>
          )
        },
        cellRenderer: (params) => {
          const ticker = params.data
          const checkboxKey = `${ticker.asset_id}_${column.key}`
          const initialValue = getSettingValue(ticker, column.key)
          
          // 로컬 상태가 있으면 로컬 상태 사용, 없으면 초기값 사용
          const isChecked = checkboxStates[checkboxKey] !== undefined ? checkboxStates[checkboxKey] : initialValue
          const hasChange = hasLocalChange(ticker, column.key)
          
          
          return (
            <div className="d-flex justify-content-center align-items-center">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => {
                  setCheckboxStates(prev => {
                    const newState = {
                      ...prev,
                      [checkboxKey]: e.target.checked
                    }
                    return newState
                  })
                }}
                disabled={isExecuting}
                className={`form-check-input ${hasChange ? 'border-warning' : ''}`}
                style={{ cursor: isExecuting ? 'not-allowed' : 'pointer' }}
              />
              {hasChange && (
                <CIcon icon={cilCheckCircle} className="text-warning ms-1" size="sm" />
              )}
            </div>
          )
        }
      })
    })

    // Execute 컬럼 추가
    baseColumns.push({
      field: 'actions',
      headerName: 'Execute',
      width: 120,
      sortable: false,
      filter: false,
      cellRenderer: (params) => {
        const ticker = params.data
        
        return (
          <div className="d-flex gap-1">
            <CButton
              color="primary"
              size="sm"
              onClick={() => {}}
              title="실행"
            >
              <CIcon icon={cilMediaPlay} size="sm" />
            </CButton>
            <CButton
              color="danger"
              size="sm"
              onClick={() => {}}
              title="삭제"
            >
              <CIcon icon={cilTrash} size="sm" />
            </CButton>
          </div>
        )
      }
    })

    return baseColumns
  }, [assetColumns, pendingChanges, executingTickers, isExecuting, checkboxStates, dataSourceStates])

  // 그리드 옵션
  const gridOptions = useMemo(() => ({
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 100
    },
    pagination: true,
    paginationPageSize: 50,
    rowSelection: {
      mode: 'none'
    },
    animateRows: true,
    suppressRowClickSelection: true,
    suppressCellFocus: true,
    onGridReady: (params) => {
      setGridApi(params.api)
    },
    onFirstDataRendered: (params) => {
      // 첫 번째 데이터가 렌더링된 후 컬럼 크기 조정 (탭이 활성화된 경우에만)
      if (isTabActive) {
        setTimeout(() => {
          if (params.api && params.api.sizeColumnsToFit) {
            try {
              params.api.sizeColumnsToFit()
            } catch (error) {}
          }
        }, 100)
      }
    }
  }), [isTabActive])

  // 그리드 API 설정
  const onGridReady = (params) => {
    setGridApi(params.api)
  }

  // 탭이 활성화될 때 컬럼 크기 조정
  useEffect(() => {
    if (gridApi && gridApi.sizeColumnsToFit && isTabActive) {
      // 탭이 활성화된 후 약간의 지연을 두고 컬럼 크기 조정
      const timer = setTimeout(() => {
        try {
          gridApi.sizeColumnsToFit()
        } catch (error) {}
      }, 300)
      
      return () => clearTimeout(timer)
    }
  }, [gridApi, assetType, isTabActive]) // 탭 활성화 상태도 감지

  // 탭이 활성화될 때 데이터 새로고침
  useEffect(() => {
    if (isTabActive) {
      // 탭이 활성화되면 즉시 데이터 새로고침
      const refreshData = async () => {
        try {
          await refetchTickers()
          console.log('🔍 Data refreshed when tab became active')
          
          // 로컬 상태 초기화
          setCheckboxStates({})
          setDataSourceStates({})
          console.log('🔍 Local states reset on tab activation')
        } catch (error) {
          console.error('🔍 Failed to refresh data on tab activation:', error)
        }
      }
      
      // 즉시 실행
      refreshData()
      
      // 추가로 2초 후에도 한 번 더 실행
      const timer = setTimeout(refreshData, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [isTabActive, refetchTickers])

  // 컴포넌트 마운트 시 데이터 새로고침
  useEffect(() => {
    let cancelled = false
    const refreshData = async () => {
      try {
        await refetchTickers()
        if (cancelled) return
        console.log('🔍 Data refreshed on component mount')
        setCheckboxStates({})
        setDataSourceStates({})
      } catch (error) {
        if (!cancelled) console.error('🔍 Failed to refresh data on mount:', error)
      }
    }
    refreshData()
    return () => { cancelled = true }
  }, [refetchTickers])

  // 주기적으로 데이터 새로고침 (10초마다)
  // 주기적 새로고침은 과도한 리소스 사용을 방지하기 위해 일단 비활성화
  // 필요 시 탭 활성화 시점 또는 수동 새로고침으로만 수행

  // 현재 페이지 표시 중인 티커들 가져오기
  const getVisiblePageTickers = () => {
    if (!gridApi || !gridApi.getRenderedNodes) {
      return []
    }
    // getRenderedNodes()를 사용하여 현재 렌더링된 노드들만 가져옴
    const renderedNodes = gridApi.getRenderedNodes()
    
    // renderedNodes가 배열이 아닌 경우 빈 배열 반환
    if (!Array.isArray(renderedNodes)) {
      return []
    }
    
    const rows = []
    for (const node of renderedNodes) {
      if (node && node.data) {
        rows.push(node.data)
      }
    }
    return rows
  }

  // 헤더 체크박스 상태 계산 (checked/indeterminate)
  const getHeaderCheckboxState = (columnKey) => {
    const rows = getVisiblePageTickers()
    const total = rows.length
    if (total === 0) {
      return { checked: false, indeterminate: false, disabled: true }
    }
    let checkedCount = 0
    for (const ticker of rows) {
      if (getSettingValue(ticker, columnKey)) {
        checkedCount += 1
      }
    }
    return {
      checked: checkedCount === total,
      indeterminate: checkedCount > 0 && checkedCount < total,
      disabled: false,
    }
  }

  // 헤더에서 전체 토글 처리 (현재 페이지 한정)
  const handleHeaderToggle = (columnKey, targetChecked) => {
    const rows = getVisiblePageTickers()
    setCheckboxStates((prev) => {
      const next = { ...prev }
      for (const ticker of rows) {
        const key = `${ticker.asset_id}_${columnKey}`
        next[key] = targetChecked
      }
      return next
    })

    if (gridApi && gridApi.refreshCells) {
      try {
        gridApi.refreshCells({ columns: [columnKey], force: true })
      } catch (e) {
        gridApi.refreshCells({ force: true })
      }
    }
  }

  return (
    <div>
      {/* 자산 타입 선택 - 항상 표시 */}
      <div className="mb-3">
        <label className="form-label">Asset Type:</label>
        <CFormSelect
          value={assetType}
          onChange={(e) => {
            if (onAssetTypeChange) {
              onAssetTypeChange(e.target.value)
            }
          }}
          disabled={assetTypesLoading}
        >
          {!Array.isArray(assetTypes) || assetTypes.length === 0 ? (
            <option value="">Loading asset types...</option>
          ) : (
            <>
              <option value="All">All Assets</option>
              {assetTypes.map((type) => (
                <option key={type.asset_type_id} value={type.type_name}>
                  {type.type_name}
                </option>
              ))}
            </>
          )}
        </CFormSelect>
      </div>

      {/* 변경사항 요약 및 저장 버튼 */}
      {hasChanges && (
        <CCard className="mb-3 border-warning">
          <CCardBody className="py-2">
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <CIcon icon={cilCheckCircle} className="text-warning me-2" />
                <span className="fw-bold text-warning">
                  {changeCount}개 항목이 변경되었습니다
                </span>
              </div>
              <CButton
                color="warning"
                size="sm"
                onClick={handleSaveAll}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <CIcon icon={cilSave} size="sm" className="me-1" />
                    모든 변경사항 저장
                  </>
                )}
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      )}

      {/* 수동 새로고침 버튼 */}
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <CButton
            color="info"
            size="sm"
            onClick={async () => {
              try {
                await refetchTickers()
              } catch (error) {}
            }}
            disabled={tickersLoading}
          >
            {tickersLoading ? (
              <>
                <CSpinner size="sm" className="me-2" />
                새로고침 중...
              </>
            ) : (
              <>
                <CIcon icon={cilCheckCircle} size="sm" className="me-1" />
                데이터 새로고침
              </>
            )}
          </CButton>
        </div>
        <div className="text-muted small">
          자동 새로고침: 10초마다
        </div>
      </div>

      {/* 로딩 상태 표시 */}
      {tickersLoading || assetTypesLoading ? (
        <div className="text-center p-5">
          <CSpinner size="sm" />
          <div className="mt-2">데이터를 불러오는 중...</div>
        </div>
      ) : (
        /* 에러 상태 표시 */
        tickersError || assetTypesError ? (
          <div className="text-center p-5 text-danger">
            <div>데이터를 불러오는데 실패했습니다.</div>
            <div className="small">{tickersError?.message || assetTypesError?.message}</div>
          </div>
        ) : (
          /* 빈 데이터 상태 표시 */
          filteredTickers.length === 0 ? (
            <div className="text-center p-5 text-body-secondary">
              {searchTerm ? '검색 결과가 없습니다.' : '이 카테고리에 해당하는 티커가 없습니다.'}
            </div>
          ) : (
            /* 테이블 표시 */
            <div 
              className="ag-theme-quartz"
              style={{ 
                height: `${height}px`, 
                width: '100%',
                '--ag-header-height': '40px',
                '--ag-row-height': '40px'
              }}
            >
              <AgGridReact
                ref={gridRef}
                rowData={filteredTickers}
                columnDefs={columnDefs}
                gridOptions={gridOptions}
                onGridReady={onGridReady}
              />
            </div>
          )
        )
      )}
    </div>
  )
}

export default TickerTableAgGrid
