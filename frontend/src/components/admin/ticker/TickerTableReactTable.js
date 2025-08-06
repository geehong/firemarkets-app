import React, { useState, useMemo } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table'
import { CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell, CFormCheck, CFormSelect, CButton, CSpinner, CPagination, CPaginationItem, CCard, CCardBody, CBadge } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMediaPlay, cilTrash, cilSave, cilCheckCircle } from '@coreui/icons'
import { useGlobalTickerData } from '../../../hooks/useGlobalTickerData'
import useAssetTypes from '../../../hooks/useAssetTypes'
import { useTickerMutations } from '../../../hooks/useTickerMutations'

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

const TickerTableReactTable = ({
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
  onAssetTypeChange,
}) => {
  // 체크박스 상태를 관리하는 로컬 상태
  const [checkboxStates, setCheckboxStates] = useState({})
  // 데이터 소스 상태를 관리하는 로컬 상태
  const [dataSourceStates, setDataSourceStates] = useState({})
  // 저장 중 상태
  const [isSaving, setIsSaving] = useState(false)
  
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
      
      // DB 데이터 새로고침
      try {
        await refetchTickers()
        console.log('🔍 Data refetched after successful save')
      } catch (error) {
        console.error('🔍 Failed to refetch data:', error)
      }
    },
    onError: (error) => {
      setIsSaving(false)
      console.error('Failed to save settings:', error)
    }
  })

  // 자산 타입별로 필터링
  const filteredTickersByType = useMemo(() => {
    return tickers.filter(ticker => {
      const tickerType = ticker.type_name || 'Stocks'
      return tickerType === assetType
    })
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
        const columnKey = parts.slice(1).join('_')
        
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
    return Object.keys(changeSummary.settings).length > 0 || 
           Object.keys(changeSummary.dataSources).length > 0
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

  // React Table 컬럼 정의
  const columns = useMemo(() => {
    const baseColumns = [
      {
        accessorKey: 'asset_id',
        header: 'ID',
        size: 80,
      },
      {
        accessorKey: 'ticker',
        header: 'Ticker',
        size: 120,
        cell: ({ row }) => {
          const ticker = row.original
          const hasChanges = hasLocalChange(ticker, 'any') || hasDataSourceChange(ticker)
          
          return (
            <div className="d-flex align-items-center">
              <strong>{ticker.ticker}</strong>
              {hasChanges && (
                <CBadge color="warning" className="ms-2 small">
                  변경됨
                </CBadge>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'data_source',
        header: 'Data Source',
        size: 150,
        cell: ({ row }) => {
          const ticker = row.original
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
        },
      },
    ]

    // 자산 타입별 컬럼 추가
    assetColumns.forEach(column => {
      baseColumns.push({
        accessorKey: column.key,
        header: column.label,
        size: 100,
        cell: ({ row }) => {
          const ticker = row.original
          const checkboxKey = `${ticker.asset_id}_${column.key}`
          const initialValue = getSettingValue(ticker, column.key)
          const isChecked = checkboxStates[checkboxKey] !== undefined ? checkboxStates[checkboxKey] : initialValue
          const hasChange = hasLocalChange(ticker, column.key)
          
          return (
            <div className="d-flex justify-content-center align-items-center">
              <CFormCheck
                checked={isChecked}
                onChange={(e) => {
                  setCheckboxStates(prev => ({
                    ...prev,
                    [checkboxKey]: e.target.checked
                  }))
                }}
                disabled={isExecuting}
                className={hasChange ? 'border-warning' : ''}
              />
              {hasChange && (
                <CIcon icon={cilCheckCircle} className="text-warning ms-1" size="sm" />
              )}
            </div>
          )
        },
      })
    })

    // Execute 컬럼 추가
    baseColumns.push({
      accessorKey: 'actions',
      header: 'Execute',
      size: 120,
      cell: ({ row }) => {
        const ticker = row.original
        
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
      },
    })

    return baseColumns
  }, [assetColumns, pendingChanges, executingTickers, isExecuting, checkboxStates, dataSourceStates])

  // React Table 인스턴스 생성
  const table = useReactTable({
    data: filteredTickers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      pagination: {
        pageIndex: 0,
        pageSize: 50,
      },
    },
  })

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
            <>
              <CTable hover responsive align="middle">
                <CTableHead>
                  {table.getHeaderGroups().map(headerGroup => (
                    <CTableRow key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <CTableHeaderCell key={header.id} style={{ width: header.getSize() }}>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </CTableHeaderCell>
                      ))}
                    </CTableRow>
                  ))}
                </CTableHead>
                <CTableBody>
                  {table.getRowModel().rows.map(row => (
                    <CTableRow key={row.id}>
                      {row.getVisibleCells().map(cell => (
                        <CTableDataCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </CTableDataCell>
                      ))}
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>

              {/* 페이지네이션 */}
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div>
                  <span className="text-muted">
                    {table.getFilteredRowModel().rows.length}개 중{' '}
                    {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
                    {Math.min(
                      (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                      table.getFilteredRowModel().rows.length
                    )}개 표시
                  </span>
                </div>
                <CPagination>
                  <CPaginationItem
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    이전
                  </CPaginationItem>
                  {Array.from({ length: table.getPageCount() }, (_, i) => (
                    <CPaginationItem
                      key={i}
                      active={i === table.getState().pagination.pageIndex}
                      onClick={() => table.setPageIndex(i)}
                    >
                      {i + 1}
                    </CPaginationItem>
                  ))}
                  <CPaginationItem
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    다음
                  </CPaginationItem>
                </CPagination>
              </div>
            </>
          )
        )
      )}
    </div>
  )
}

export default TickerTableReactTable 