// frontend/src/views/assetslist/AssetsList.js
import React, { useEffect, useState, useMemo } from 'react'
import { useAPI } from '../../hooks/useAPI'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community'

// AG Grid 모듈 등록
ModuleRegistry.registerModules([AllCommunityModule])

// Removed CoreUI card/layout wrappers for standalone rendering
import CIcon from '@coreui/icons-react'
import { cilAlarm } from '@coreui/icons'

const AssetsList = () => {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const typeNameFromQuery = searchParams.get('type_name')

  const [totalCount, setTotalCount] = useState(0)

  console.log('AssetsList Component Rendered. typeNameFromQuery:', typeNameFromQuery)

  // Treemap live 훅 사용하여 목록 데이터 구성 (페이지네이션은 클라이언트 사이드로 간단히 처리)
  const { data: treemapData, loading: liveLoading, error: liveError, refreshData } = useAPI.realtime.performanceTreeMapFromTreeMap()

  useEffect(() => {
    setLoading(liveLoading)
    if (liveError) {
      setError(liveError)
      setAssets([])
      setTotalCount(0)
      return
    }
    if (!treemapData) {
      setAssets([])
      setTotalCount(0)
      return
    }
    // type_name 필터 적용 (쿼리 파라미터가 없으면 전체 자산 표시)
    const filtered = typeNameFromQuery
      ? treemapData.filter((a) => (a.type_name || a.category) === typeNameFromQuery)
      : treemapData
    setTotalCount(filtered.length)
    // AG Grid 사용: 전체 데이터 전달 (그리드 자체 페이지네이션 활용 가능)
    setAssets(filtered)
  }, [treemapData, liveLoading, liveError, typeNameFromQuery])


  // AG Grid 컬럼 정의 (HistoryTable와 호환)
  const columnDefs = useMemo(
    () => [
      { field: 'asset_id', headerName: 'ID', minWidth: 80 },
      {
        field: 'logo_url', headerName: 'Symbol', minWidth: 90, cellRenderer: (params) => {
          const url = params.value
          const fallback = '🔹'
          return url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="logo" style={{ width: 20, height: 20, borderRadius: 2 }} />
          ) : (
            <span>{fallback}</span>
          )
        }
      },
      { field: 'ticker', headerName: 'Ticker', minWidth: 110 },
      {
        field: 'name', headerName: 'Name', minWidth: 220, cellRenderer: (params) => {
          const t = params.data?.ticker
          const text = params.value ?? ''
          const handleClick = (e) => {
            e?.stopPropagation?.()
            if (t) {
              navigate(`/overviews/${t}`)
            }
          }
          return (
            <span
              style={{ color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}
              data-ticker={t || ''}
              onClick={handleClick}
            >
              {text}
            </span>
          )
        },
      },
      { field: 'current_price', headerName: 'Price', minWidth: 120, valueFormatter: (p) => p.value != null ? `$${Number(p.value).toFixed(2)}` : '', cellStyle: (p) => {
          const v = p.data?.daily_change_percent ?? 0
          return { color: v >= 0 ? '#007c32' : '#d91400', fontWeight: 700, fontSize: '.875rem' }
        }
      },
      { field: 'daily_change_percent', headerName: 'Change(%)', minWidth: 120, valueFormatter: (p) => {
          const v = p.value ?? 0
          return `${v >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`
        }, cellStyle: (p) => {
          const v = p.value ?? 0
          const base = { fontWeight: 700, fontSize: '.875rem' }
          if (v > 0) return { ...base, color: '#007c32' }
          if (v < 0) return { ...base, color: '#d91400' }
          return { ...base, color: '#a0a0a0' }
        }
      },
      { field: 'market_cap', headerName: 'Market Cap(BIN)', minWidth: 160, valueFormatter: (p) => p.value != null ? `${(Number(p.value)/1e9).toFixed(1)} BIN` : '' },
      { field: 'market_status', headerName: 'Status', minWidth: 100, cellRenderer: (p) => {
          // For Stock/ETF/Fund, use NY market hours. Others are always considered open.
          const typeRaw = p.data?.type_name || p.data?.category || ''
          const type = String(typeRaw).toLowerCase()
          const marketSensitive = ['stock', 'stocks', 'etf', 'fund', 'funds'].includes(type)

          let isOpen = true
          if (marketSensitive) {
            const now = new Date()
            const nyHourStr = now.toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false, hour: '2-digit' })
            const nyMinuteStr = now.toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false, minute: '2-digit' })
            const nyWeekday = now.toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short' }) // Mon, Tue, ...
            const nyHour = parseInt(nyHourStr, 10)
            const nyMinute = parseInt(nyMinuteStr, 10)
            const minutesSinceMidnight = nyHour * 60 + nyMinute
            const isWeekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(nyWeekday)
            const marketOpenMin = 9 * 60 + 30 // 09:30
            const marketCloseMin = 16 * 60 // 16:00
            isOpen = isWeekday && minutesSinceMidnight >= marketOpenMin && minutesSinceMidnight < marketCloseMin
          }

          const color = isOpen ? '#007bff' : '#f73539' // blue open, red closed
          const label = isOpen ? '개장' : '폐장'

          return (
            <span title={label} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', color }}>
              <CIcon icon={cilAlarm} style={{ color }} size="sm" />
            </span>
          )
        }
      },
    ],
    [navigate],
  )

  // Name 컬럼 클릭 시 개요 페이지로 이동
  const gridOptions = useMemo(() => ({
    onCellClicked: (event) => {
      if (event.colDef.field === 'name' && event.data?.ticker) {
        navigate(`/overviews/${event.data.ticker}`)
      }
    },
    pagination: true,
    paginationPageSize: 10,
    paginationPageSizeSelector: [10, 25, 50, 100, 200],
    defaultColDef: {
      resizable: true,
      sortable: true,
      filter: true,
      flex: 1,
    },
    domLayout: 'autoHeight',
    rowHeight: 35,
    headerHeight: 40,
    onGridReady: (params) => {
      params.api.sizeColumnsToFit()
    },
    onFirstDataRendered: (params) => {
      params.api.sizeColumnsToFit()
    }
  }), [navigate])

  if (loading) return <p>자산 목록을 불러오는 중...</p>
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>
  if (assets.length === 0 && !loading)
    return <p>등록된 자산이 없거나 해당 유형의 자산이 없습니다.</p>

  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
        {typeNameFromQuery ? `${typeNameFromQuery} Assets` : 'All Assets'}
      </div>
      <div style={{ 
        width: '100%', 
        minHeight: '600px',
        '--ag-border-color': 'transparent',
        '--ag-row-border-color': 'transparent',
        '--ag-borders': 'none',
        '--ag-row-border-style': 'none',
      }}>
        <AgGridReact
          columnDefs={columnDefs}
          rowData={assets}
          gridOptions={gridOptions}
          theme={themeQuartz}
        />
      </div>
      <div className="mt-2">Total {totalCount}</div>
    </div>
  )
}

export default AssetsList
