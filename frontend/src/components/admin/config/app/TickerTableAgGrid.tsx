'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community'
import { useRouter } from 'next/navigation'
import { useAssets, useBulkUpdateTickerSettings, useAssetTypes } from '@/hooks/admin/useAssets'
import AgGridBaseTable from '@/components/tables/AgGridBaseTable'

interface TickerData {
  asset_id: number
  ticker: string
  name: string
  type_name: string
  collection_settings?: any
  data_source?: string
  is_active?: boolean
  exchange?: string
  currency?: string
  description?: string
  created_at: string
  updated_at: string
  collect_price: boolean
  collect_assets_info: boolean
  collect_financials: boolean
  collect_estimates: boolean
  collect_onchain: boolean
  collect_technical_indicators: boolean
}

interface TickerTableAgGridProps {
  assetType?: string
  onSettingChange?: (assetId: number, setting: string, value: boolean) => void
  onExecute?: (assetId: number) => void
  onDelete?: (assetId: number) => void
  searchTerm?: string
  onSearchChange?: (term: string) => void
  isExecuting?: boolean
  executingTickers?: number[]
  onExecutePerAsset?: (assetId: number) => void
  onBulkSave?: () => void
  isBulkUpdatingSettings?: boolean
  height?: number
  onAssetTypeChange?: (type: string) => void
  isTabActive?: boolean
}

const TickerTableAgGrid: React.FC<TickerTableAgGridProps> = ({
  assetType = 'All',
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
  const router = useRouter()
  // 로컬 상태 관리
  const [checkboxStates, setCheckboxStates] = useState<Record<string, boolean>>({})
  const [dataSourceStates, setDataSourceStates] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [gridApi, setGridApi] = useState<GridApi | null>(null)

  // 훅을 사용하여 데이터 로드
  const {
    data: tickers,
    loading: tickersLoading,
    error: tickersError,
    refetch: refetchTickers
  } = useAssets({
    type_name: assetType === 'All' ? undefined : assetType,
    has_ohlcv_data: false,
    limit: 1000,
    offset: 0,
    enabled: isTabActive
  })

  const { assetTypes, loading: assetTypesLoading } = useAssetTypes()
  const { bulkUpdate, updating: bulkUpdating } = useBulkUpdateTickerSettings()

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

  // 자산 타입별로 필터링
  const filteredTickersByType = useMemo(() => {
    if (!tickers) return []

    let filtered = tickers

    // All이 아닌 경우에만 타입별 필터링
    if (assetType !== 'All') {
      filtered = tickers.filter(ticker => {
        const tickerType = ticker.type_name || 'Stocks'
        return tickerType === assetType
      })
    }

    return filtered
  }, [tickers, assetType])

  // 검색어로 필터링 및 ID 낮은 순으로 정렬
  const filteredTickers = useMemo(() => {
    let filtered = filteredTickersByType

    // 검색어 필터링
    if (searchTerm) {
      filtered = filteredTickersByType.filter((ticker) => {
        return ticker.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticker.name.toLowerCase().includes(searchTerm.toLowerCase())
      })
    }

    // ID 낮은 순으로 정렬
    return filtered.sort((a, b) => a.asset_id - b.asset_id)
  }, [filteredTickersByType, searchTerm])

  // 설정 키 매핑
  const getSettingKey = (columnKey: string): string | null => {
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

  // 원래 DB 값 가져오기
  const getOriginalSettingValue = (ticker: TickerData, columnKey: string): boolean => {
    const settingKey = getSettingKey(columnKey)
    if (!settingKey) return true

    // JSON 필드에서 확인
    if (ticker.collection_settings) {
      let collectionSettings = ticker.collection_settings

      if (typeof collectionSettings === 'string') {
        try {
          collectionSettings = JSON.parse(collectionSettings)
        } catch (e) {
          console.error('Failed to parse collection_settings:', e)
          collectionSettings = {}
        }
      }

      if (collectionSettings && collectionSettings[settingKey] !== undefined) {
        const value = collectionSettings[settingKey]
        if (typeof value === 'boolean') return value
        if (typeof value === 'string') return value.toLowerCase() === 'true'
        if (typeof value === 'number') return value === 1
        return Boolean(value)
      }
    }

    // 기존 필드에서 확인 (하위 호환성)
    if ((ticker as any)[settingKey] !== undefined) {
      const value = (ticker as any)[settingKey]
      if (typeof value === 'boolean') return value
      if (typeof value === 'string') return value.toLowerCase() === 'true'
      if (typeof value === 'number') return value === 1
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

  // 현재 표시 값 가져오기 (로컬 상태 포함)
  const getSettingValue = (ticker: TickerData, columnKey: string): boolean => {
    const checkboxKey = `${ticker.asset_id}_${columnKey}`

    // 로컬 상태가 있으면 로컬 상태 사용
    if (checkboxStates[checkboxKey] !== undefined) {
      return checkboxStates[checkboxKey]
    }

    // 없으면 원래 DB 값 사용
    return getOriginalSettingValue(ticker, columnKey)
  }

  // 데이터 소스 값 가져오기
  const getDataSourceValue = (ticker: TickerData): string => {
    const dataSourceKey = `${ticker.asset_id}_data_source`
    const initialValue = ticker.data_source || 'fmp'
    return dataSourceStates[dataSourceKey] !== undefined ? dataSourceStates[dataSourceKey] : initialValue
  }

  // 변경사항이 있는지 확인
  const hasLocalChange = (ticker: TickerData, columnKey: string): boolean => {
    const checkboxKey = `${ticker.asset_id}_${columnKey}`
    return checkboxStates[checkboxKey] !== undefined
  }

  const hasDataSourceChange = (ticker: TickerData): boolean => {
    const dataSourceKey = `${ticker.asset_id}_data_source`
    return dataSourceStates[dataSourceKey] !== undefined
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
        return [
          { key: 'price', label: 'Price' },
        ]
      default:
        return [{ key: 'price', label: 'Price' }]
    }
  }

  const assetColumns = getAssetColumns()

  // 변경사항 요약 계산
  const changeSummary = useMemo(() => {
    const changes = {
      settings: {} as Record<string, Record<string, boolean>>,
      dataSources: {} as Record<string, string>
    }

    // 체크박스 변경사항
    Object.keys(checkboxStates).forEach(key => {
      const parts = key.split('_')

      if (parts.length >= 2) {
        const assetId = parts[0]
        const columnKey = parts.slice(1).join('_')

        const ticker = filteredTickers.find(t => t.asset_id.toString() === assetId)
        if (ticker) {
          const originalValue = getOriginalSettingValue(ticker, columnKey)
          const currentValue = checkboxStates[key]

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

    // 데이터 소스 변경사항
    Object.keys(dataSourceStates).forEach(key => {
      const assetId = key.replace('_data_source', '')

      const ticker = filteredTickers.find(t => t.asset_id.toString() === assetId)
      if (ticker) {
        const originalValue = ticker.data_source || 'fmp'
        const currentValue = dataSourceStates[key]

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

  // 현재 페이지 표시 중인 티커들 가져오기
  const getVisiblePageTickers = (): TickerData[] => {
    if (!gridApi || !gridApi.getRenderedNodes) {
      return []
    }

    const renderedNodes = gridApi.getRenderedNodes()
    if (!Array.isArray(renderedNodes)) {
      return []
    }

    const rows: TickerData[] = []
    for (const node of renderedNodes) {
      if (node && node.data) {
        rows.push(node.data)
      }
    }
    return rows
  }

  // 헤더 체크박스 상태 계산
  const getHeaderCheckboxState = (columnKey: string) => {
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

  // 헤더에서 전체 토글 처리
  const handleHeaderToggle = (columnKey: string, targetChecked: boolean) => {
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

  // 저장 함수
  const handleSaveAll = async () => {
    if (!hasChanges) return

    setIsSaving(true)

    try {
      const updates: Array<{ assetId: number; settings: Record<string, any> }> = []

      // 설정 변경사항 추가
      Object.keys(changeSummary.settings).forEach(assetId => {
        updates.push({
          assetId: parseInt(assetId),
          settings: changeSummary.settings[assetId]
        })
      })

      // 데이터 소스 변경사항 추가
      Object.keys(changeSummary.dataSources).forEach(assetId => {
        const existingUpdate = updates.find(u => u.assetId === parseInt(assetId))
        if (existingUpdate) {
          existingUpdate.settings.data_source = changeSummary.dataSources[assetId]
        } else {
          updates.push({
            assetId: parseInt(assetId),
            settings: { data_source: changeSummary.dataSources[assetId] }
          })
        }
      })

      await bulkUpdate(updates)

      // 로컬 상태 초기화
      setCheckboxStates({})
      setDataSourceStates({})

      // 데이터 새로고침
      refetchTickers()
      onBulkSave?.()
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // AG Grid 컬럼 정의
  const columnDefs = useMemo((): ColDef[] => {
    const baseColumns: ColDef[] = [
      {
        field: 'asset_id',
        headerName: 'ID',
        width: 80,
        sortable: true,
        filter: true,
        sort: 'asc', // 기본 정렬을 오름차순으로 설정
      },
      {
        field: 'ticker',
        headerName: 'Ticker',
        width: 120,
        sortable: true,
        filter: true,
        cellRenderer: (params: any) => {
          const ticker = params.data
          const hasChanges = hasLocalChange(ticker, 'any') || hasDataSourceChange(ticker)

          return (
            <div className="flex items-center">
              <strong>{params.value}</strong>
              {hasChanges && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  변경됨
                </span>
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
        cellRenderer: (params: any) => {
          const ticker = params.data
          const currentDataSource = getDataSourceValue(ticker)
          const hasChange = hasDataSourceChange(ticker)

          return (
            <div className="flex items-center">
              <select
                value={currentDataSource}
                onChange={(e) => {
                  const dataSourceKey = `${ticker.asset_id}_data_source`
                  setDataSourceStates(prev => ({
                    ...prev,
                    [dataSourceKey]: e.target.value
                  }))
                }}
                className={`text-sm border rounded px-2 py-1 ${hasChange ? 'border-yellow-400' : 'border-gray-300'}`}
              >
                {dataSources.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </select>
              {hasChange && (
                <span className="ml-1 text-yellow-500">✓</span>
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
        headerComponent: (params: any) => {
          const state = getHeaderCheckboxState(column.key)
          return (
            <div className="flex items-center justify-center gap-1">
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
                className="h-4 w-4"
              />
              <span>{column.label}</span>
            </div>
          )
        },
        cellRenderer: (params: any) => {
          const ticker = params.data
          const checkboxKey = `${ticker.asset_id}_${column.key}`
          const initialValue = getSettingValue(ticker, column.key)

          const isChecked = checkboxStates[checkboxKey] !== undefined ? checkboxStates[checkboxKey] : initialValue
          const hasChange = hasLocalChange(ticker, column.key)

          return (
            <div className="flex justify-center items-center">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => {
                  setCheckboxStates(prev => ({
                    ...prev,
                    [checkboxKey]: e.target.checked
                  }))
                }}
                disabled={isExecuting}
                className={`h-4 w-4 ${hasChange ? 'border-yellow-400' : ''}`}
                style={{ cursor: isExecuting ? 'not-allowed' : 'pointer' }}
              />
              {hasChange && (
                <span className="ml-1 text-yellow-500">✓</span>
              )}
            </div>
          )
        }
      })
    })

    // Execute 컬럼 추가
    baseColumns.push({
      field: 'actions',
      headerName: 'Actions',
      width: 160,
      sortable: false,
      filter: false,
      cellRenderer: (params: any) => {
        const ticker = params.data

        const handleEdit = () => {
          // Assets Editor로 이동하면서 asset ID를 전달
          const url = `/admin/appconfig/assets_editor?assetId=${ticker.asset_id}`
          console.log('🔗 Navigating to:', url)
          console.log('📊 Ticker data:', ticker)
          console.log('🔍 Asset ID:', ticker.asset_id)

          // 강제로 URL 이동
          window.location.href = url
        }

        return (
          <div className="flex gap-1">
            <button
              onClick={() => onExecute?.(ticker.asset_id)}
              disabled={isExecuting || executingTickers.includes(ticker.asset_id)}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
              title="실행"
            >
              ▶️
            </button>
            <button
              onClick={handleEdit}
              className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
              title="편집"
            >
              ✏️
            </button>
            <button
              onClick={() => onDelete?.(ticker.asset_id)}
              className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
              title="삭제"
            >
              🗑️
            </button>
          </div>
        )
      }
    })

    return baseColumns
  }, [assetColumns, executingTickers, isExecuting, checkboxStates, dataSourceStates, filteredTickers])

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
    animateRows: true,
    suppressRowClickSelection: true,
    suppressCellFocus: true,
    onGridReady: (params: GridReadyEvent) => {
      setGridApi(params.api)
    },
    onFirstDataRendered: (params: any) => {
      if (isTabActive) {
        setTimeout(() => {
          if (params.api && params.api.sizeColumnsToFit) {
            try {
              params.api.sizeColumnsToFit()
            } catch (error) { }
          }
        }, 100)
      }
    }
  }), [isTabActive])

  // 탭이 활성화될 때 데이터 새로고침
  useEffect(() => {
    if (isTabActive) {
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

      refreshData()

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

  return (
    <div>
      {/* 자산 타입 선택 및 검색 */}
      <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Asset Type:</label>
          <select
            value={assetType}
            onChange={(e) => {
              if (onAssetTypeChange) {
                onAssetTypeChange(e.target.value)
              }
            }}
            disabled={assetTypesLoading}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {!Array.isArray(assetTypes) || assetTypes.length === 0 ? (
              <option value="">Loading asset types...</option>
            ) : (
              <>
                <option value="All">All Assets</option>
                {assetTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Search Tickers:</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by ticker or name..."
              value={searchTerm}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchTerm && (
              <button
                onClick={() => onSearchChange?.('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 변경사항 요약 및 저장 버튼 */}
      {hasChanges && (
        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-yellow-600 mr-2">✓</span>
              <span className="font-bold text-yellow-800">
                {changeCount}개 항목이 변경되었습니다
              </span>
            </div>
            <button
              onClick={handleSaveAll}
              disabled={isSaving || bulkUpdating}
              className="px-4 py-2 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 disabled:opacity-50"
            >
              {isSaving || bulkUpdating ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                  저장 중...
                </>
              ) : (
                <>
                  💾 모든 변경사항 저장
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 수동 새로고침 버튼 */}
      <div className="mb-3 flex justify-between items-center">
        <div className="flex items-center">
          <button
            onClick={async () => {
              try {
                await refetchTickers()
              } catch (error) { }
            }}
            disabled={tickersLoading}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {tickersLoading ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                새로고침 중...
              </>
            ) : (
              <>
                ✓ 데이터 새로고침
              </>
            )}
          </button>
        </div>
        <div className="text-gray-500 text-sm">
          자동 새로고침: 10초마다
        </div>
      </div>

      {/* 로딩 상태 표시 */}
      {tickersLoading || assetTypesLoading ? (
        <div className="text-center p-5">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <div className="mt-2">데이터를 불러오는 중...</div>
        </div>
      ) : (
        /* 에러 상태 표시 */
        tickersError ? (
          <div className="text-center p-5 text-red-600">
            <div>데이터를 불러오는데 실패했습니다.</div>
            <div className="text-sm">{tickersError?.message}</div>
          </div>
        ) : (
          /* 빈 데이터 상태 표시 */
          filteredTickers.length === 0 ? (
            <div className="text-center p-5 text-gray-500">
              {searchTerm ? '검색 결과가 없습니다.' : '이 카테고리에 해당하는 티커가 없습니다.'}
            </div>
          ) : (
            /* AG Grid 테이블 표시 */
            <div
              className="ag-theme-quartz"
              style={{
                height: `${height}px`,
                width: '100%',
                '--ag-header-height': '40px',
                '--ag-row-height': '40px'
              } as React.CSSProperties}
            >
              <AgGridBaseTable
                rows={filteredTickers}
                columns={columnDefs}
                height={height}
                gridOptions={gridOptions}
                loading={tickersLoading}
                error={null}
              />
            </div>
          )
        )
      )}
    </div>
  )
}

export default TickerTableAgGrid