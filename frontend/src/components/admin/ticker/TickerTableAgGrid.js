import React, { useMemo, useState, useRef, useEffect } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import { CButton, CSpinner, CBadge, CFormSelect, CCard, CCardBody, CCardHeader, CCardTitle } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMediaPlay, cilTrash, cilSave, cilCheckCircle, cilXCircle } from '@coreui/icons'
import { useGlobalTickerData } from '../../../hooks/useGlobalTickerData'
import useAssetTypes from '../../../hooks/useAssetTypes'
import { useTickerMutations } from '../../../hooks/useTickerMutations'

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
]

const TickerTableAgGrid = ({
  assetType = 'Stocks',
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
  
  // 티커 데이터 가져오기
  const { tickers, loading: tickersLoading, error: tickersError, refetchTickers } = useGlobalTickerData()
  
  // 자산 타입 데이터 가져오기
  const { assetTypes, loading: assetTypesLoading, error: assetTypesError } = useAssetTypes()
  
  // Mutation 훅 사용
  const { bulkUpdateSettings } = useTickerMutations({
    onSuccess: async () => {
      setIsSaving(false)
      
      // 로컬 상태 완전 초기화
      setCheckboxStates({})
      setDataSourceStates({})
      console.log('🔍 Local states reset after successful save')
      
      // DB 데이터 새로고침 - 더 확실하게 처리
      const refreshData = async () => {
        try {
          await refetchTickers()
          console.log('🔍 Data refetched after successful save')
        } catch (error) {
          console.error('🔍 Failed to refetch data:', error)
        }
      }
      
      // 즉시 실행
      await refreshData()
      
      // 추가로 여러 번 시도 (네트워크 지연 고려)
      setTimeout(refreshData, 500)
      setTimeout(refreshData, 1000)
      setTimeout(refreshData, 2000)
      setTimeout(refreshData, 5000)
    },
    onError: (error) => {
      setIsSaving(false)
      console.error('Failed to save settings:', error)
    }
  })

  // 자산 타입별로 필터링
  const filteredTickersByType = useMemo(() => {
    const filtered = tickers.filter(ticker => {
      const tickerType = ticker.type_name || 'Stocks'
      return tickerType === assetType
    })
    
    // 디버깅을 위한 로그
    console.log('🔍 Filtered tickers by type:', assetType, 'Count:', filtered.length)
    if (filtered.length > 0) {
      console.log('🔍 Sample ticker data:', filtered[0])
    }
    
    return filtered
  }, [tickers, assetType])

  // 검색어로 필터링
  const filteredTickers = useMemo(() => {
    return filteredTickersByType.filter(
      (ticker) =>
        ticker.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticker.name.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [filteredTickersByType, searchTerm])

  // 설정 키 매핑 (changeSummary보다 먼저 정의)
  const getSettingKey = (columnKey) => {
    switch (columnKey) {
      case 'price':
        return 'collect_price'
      case 'stock_info':
      case 'etf_info':
      case 'fund_info':
        return 'collect_company_info'
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

  // 원래 DB 값 가져오기 (로컬 상태 무시) - changeSummary보다 먼저 정의
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

    // JSON 필드에서 확인
    if (ticker.collection_settings && ticker.collection_settings[settingKey] !== undefined) {
      return ticker.collection_settings[settingKey]
    }

    // 기존 필드에서 확인 (하위 호환성)
    if (ticker[settingKey] !== undefined) {
      return ticker[settingKey]
    }

    // 기본값 반환
    switch (settingKey) {
      case 'collect_price':
      case 'collect_company_info':
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

  // 변경사항 요약 계산
  const changeSummary = useMemo(() => {
    const changes = {
      settings: {},
      dataSources: {}
    }
    
    console.log('🔍 checkboxStates:', checkboxStates)
    console.log('🔍 dataSourceStates:', dataSourceStates)
    
    // 체크박스 변경사항 - 실제 DB 값과 비교
    Object.keys(checkboxStates).forEach(key => {
      console.log('🔍 Processing checkbox key:', key)
      const parts = key.split('_')
      console.log('🔍 Split parts:', parts)
      
      if (parts.length >= 2) {
        const assetId = parts[0]
        const columnKey = parts.slice(1).join('_') // 나머지 부분을 모두 합침
        console.log('🔍 Extracted assetId:', assetId, 'columnKey:', columnKey)
        
        // 해당 티커 찾기
        const ticker = filteredTickers.find(t => t.asset_id.toString() === assetId)
        if (ticker) {
          const originalValue = getOriginalSettingValue(ticker, columnKey)
          const currentValue = checkboxStates[key]
          
          console.log('🔍 Original value:', originalValue, 'Current value:', currentValue)
          
          // 실제로 값이 변경된 경우만 추가
          if (originalValue !== currentValue) {
            const settingKey = getSettingKey(columnKey)
            console.log('🔍 Setting key:', settingKey)
            
            if (settingKey) {
              if (!changes.settings[assetId]) changes.settings[assetId] = {}
              changes.settings[assetId][settingKey] = currentValue
              console.log('🔍 Added setting:', assetId, settingKey, currentValue)
            }
          } else {
            console.log('🔍 No change detected, skipping')
          }
        }
      }
    })
    
    // 데이터 소스 변경사항 - 실제 DB 값과 비교
    Object.keys(dataSourceStates).forEach(key => {
      console.log('🔍 Processing data source key:', key)
      const assetId = key.replace('_data_source', '')
      
      // 해당 티커 찾기
      const ticker = filteredTickers.find(t => t.asset_id.toString() === assetId)
      if (ticker) {
        const originalValue = ticker.data_source || 'fmp'
        const currentValue = dataSourceStates[key]
        
        console.log('🔍 Original data source:', originalValue, 'Current data source:', currentValue)
        
        // 실제로 값이 변경된 경우만 추가
        if (originalValue !== currentValue) {
          changes.dataSources[assetId] = currentValue
          console.log('🔍 Added data source:', assetId, currentValue)
        } else {
          console.log('🔍 No data source change detected, skipping')
        }
      }
    })
    
    console.log('🔍 Final changes:', changes)
    return changes
  }, [checkboxStates, dataSourceStates, filteredTickers])

  // 변경사항이 있는지 확인
  const hasChanges = useMemo(() => {
    const hasSettingsChanges = Object.keys(changeSummary.settings).length > 0
    const hasDataSourceChanges = Object.keys(changeSummary.dataSources).length > 0
    console.log('🔍 hasSettingsChanges:', hasSettingsChanges, 'hasDataSourceChanges:', hasDataSourceChanges)
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
          return (
            <div className="d-flex align-items-center justify-content-center">
              <span>{column.label}</span>
            </div>
          )
        },
        cellRenderer: (params) => {
          const ticker = params.data
          const checkboxKey = `${ticker.asset_id}_${column.key}`
          const initialValue = getSettingValue(ticker, column.key)
          const isChecked = checkboxStates[checkboxKey] !== undefined ? checkboxStates[checkboxKey] : initialValue
          const hasChange = hasLocalChange(ticker, column.key)
          
          return (
            <div className="d-flex justify-content-center align-items-center">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => {
                  console.log('🔍 Checkbox clicked:', column.key, e.target.checked)
                  console.log('🔍 Ticker asset_id:', ticker.asset_id)
                  console.log('🔍 Generated checkboxKey:', checkboxKey)
                  setCheckboxStates(prev => {
                    const newState = {
                      ...prev,
                      [checkboxKey]: e.target.checked
                    }
                    console.log('🔍 New checkboxStates:', newState)
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
              onClick={() => console.log('Execute clicked for:', ticker.ticker)}
              title="실행"
            >
              <CIcon icon={cilMediaPlay} size="sm" />
            </CButton>
            <CButton
              color="danger"
              size="sm"
              onClick={() => console.log('Delete clicked for:', ticker.ticker)}
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
            } catch (error) {
              console.log('Grid not ready for sizeColumnsToFit yet')
            }
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
        } catch (error) {
          console.log('Grid not ready for sizeColumnsToFit yet')
        }
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
    const refreshData = async () => {
      try {
        await refetchTickers()
        console.log('🔍 Data refreshed on component mount')
      } catch (error) {
        console.error('🔍 Failed to refresh data on mount:', error)
      }
    }
    
    // 즉시 실행
    refreshData()
    
    // 추가로 1초 후에도 한 번 더 실행
    const timer = setTimeout(refreshData, 1000)
    
    return () => clearTimeout(timer)
  }, [refetchTickers])

  // 주기적으로 데이터 새로고침 (10초마다)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await refetchTickers()
        console.log('🔍 Periodic data refresh completed')
      } catch (error) {
        console.error('🔍 Periodic refresh failed:', error)
      }
    }, 10000) // 10초마다
    
    return () => clearInterval(interval)
  }, [refetchTickers])

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
            assetTypes.map((type) => (
              <option key={type.asset_type_id} value={type.type_name}>
                {type.type_name}
              </option>
            ))
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
                console.log('🔍 Manual refresh completed')
              } catch (error) {
                console.error('🔍 Manual refresh failed:', error)
              }
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
