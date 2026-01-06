"use client"

import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community'
import { useOhlcvData } from '@/hooks/assets/useAssets'
import DateRangePicker from '@/components/inputs/DateRangePicker'

ModuleRegistry.registerModules([AllCommunityModule])

interface Props {
  assetIdentifier?: string
  dataInterval?: '1d' | '1w' | '1m'
  height?: number
}

export default function AgGridHistoryTable({ assetIdentifier = 'BTCUSDT', dataInterval = '1d', height = 600 }: Props) {
  const gridRef = useRef<AgGridReact<any>>(null)
  const [interval, setInterval] = useState<'1d' | '1w' | '1m'>(dataInterval)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [pendingStart, setPendingStart] = useState<string>('')
  const [pendingEnd, setPendingEnd] = useState<string>('')
  const ohlcvOptions = useMemo(() => {
    // 백엔드가 start_date/end_date 둘 다 있을 때 범위 필터가 확실할 경우를 대비해 보정
    const todayYmd = new Date().toISOString().slice(0, 10)
    const s = startDate || undefined
    const e = endDate || (s ? todayYmd : undefined)
    const fixedStart = s || (endDate ? '2010-01-01' : undefined)
    return {
      dataInterval: interval,
      startDate: fixedStart,
      endDate: e,
      limit: 50000,
    }
  }, [interval, startDate, endDate])
  const { data, isLoading, error } = useOhlcvData(assetIdentifier, ohlcvOptions) as any

  useEffect(() => {
    // 옵션 변경 시 디버그 로그
    // eslint-disable-next-line no-console
    console.log('[AgGridHistoryTable] ohlcvOptions', ohlcvOptions)
  }, [ohlcvOptions])

  const baseRows = useMemo(() => {
    const src = Array.isArray(data) ? data : (data?.data || data?.rows || [])
    if (!src) return []
    // 백엔드에서 제공하는 change_percent 우선 사용
    return src.map((item: any) => {
      // 백엔드에서 계산된 change_percent 사용 (없으면 null)
      const changePercent = item.change_percent !== null && item.change_percent !== undefined
        ? Number(item.change_percent)
        : null

      return {
        Date: item.timestamp_utc,
        Price: Number(item.close_price) || 0,
        Change_Percent: changePercent,
        Open: Number(item.open_price) || 0,
        High: Number(item.high_price) || 0,
        Low: Number(item.low_price) || 0,
        Volume: Number(item.volume) || 0,
      }
    })
  }, [data])

  const rowData = useMemo(() => {
    if (!baseRows.length) return baseRows
    // 날짜 범위 필터링 (YYYY-MM-DD 비교)
    const hasStart = !!startDate
    const hasEnd = !!endDate
    if (!hasStart && !hasEnd) return baseRows
    const startTs = hasStart ? new Date(startDate + 'T00:00:00Z').getTime() : -Infinity
    const endTs = hasEnd ? new Date(endDate + 'T23:59:59Z').getTime() : Infinity
    return baseRows.filter((r: any) => {
      const t = new Date(r.Date).getTime()
      return t >= startTs && t <= endTs
    })
  }, [baseRows, startDate, endDate])

  const columnDefs = useMemo(() => ([
    { field: 'Date', headerName: 'Date', minWidth: 120, sort: 'desc', valueFormatter: (p: any) => p.value ? new Date(p.value).toISOString().split('T')[0] : '' },
    { field: 'Price', headerName: 'Price', minWidth: 120, valueFormatter: (p: any) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p.value) },
    { field: 'Change_Percent', headerName: 'Change', minWidth: 120, valueFormatter: (p: any) => p.value == null ? '' : `${p.value >= 0 ? '+' : ''}${Number(p.value).toFixed(2)}%`, cellStyle: (p: any) => ({ color: p.value >= 0 ? '#007c32' : '#d91400', fontWeight: 700 }) },
    { field: 'Open', headerName: 'Open', minWidth: 120, valueFormatter: (p: any) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p.value) },
    { field: 'High', headerName: 'High', minWidth: 120, valueFormatter: (p: any) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p.value) },
    { field: 'Low', headerName: 'Low', minWidth: 120, valueFormatter: (p: any) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p.value) },
    { field: 'Volume', headerName: 'Volume', minWidth: 120, valueFormatter: (p: any) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(p.value) },
  ]), [])

  const gridTheme = useMemo(() => {
    return themeQuartz.withParams({
      rowHoverColor: 'rgba(0,0,0,0.04)',
      selectedRowBackgroundColor: 'rgba(0, 123, 255, 0.08)'
    })
  }, [])

  if (isLoading) return <div className="p-4">Loading...</div>
  if (error) return <div className="p-4 text-red-600">{String(error)}</div>

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 px-2">
        {(['1d', '1w', '1m'] as const).map(iv => (
          <button
            key={iv}
            onClick={() => {
              // eslint-disable-next-line no-console
              console.log('[AgGridHistoryTable] interval click', iv)
              setInterval(iv)
            }}
            className={`rounded border px-3 py-1 text-sm ${interval === iv ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}
          >{iv.toUpperCase()}</button>
        ))}
        <div className="ml-2 text-sm flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <DateRangePicker
              numberOfMonths={1}
              variant="start"
              onStartDate={(s) => {
                const v = s || ''
                console.log('[AgGridHistoryTable] start single change', v)
                setPendingStart(v)
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <DateRangePicker
              numberOfMonths={1}
              variant="end"
              onEndDate={(e) => {
                const v = e || ''
                console.log('[AgGridHistoryTable] end single change', v)
                setPendingEnd(v)
              }}
            />
          </div>
          <button
            onClick={() => {
              console.log('[AgGridHistoryTable] Execute with', pendingStart, pendingEnd)
              setStartDate(pendingStart || '')
              setEndDate(pendingEnd || '')
            }}
            className="rounded border px-3 py-1 text-sm bg-blue-600 text-white border-blue-600"
          >
            Execute
          </button>
        </div>
      </div>
      <div style={{ width: '100%', height: `${height}px` }}>
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs as any}
          theme={gridTheme}
          pagination
          paginationPageSize={25}
          paginationPageSizeSelector={[25, 50, 100, 200, 500, 1000]}
          defaultColDef={{ resizable: true, sortable: true, filter: true, flex: 1 }}
        />
      </div>
    </div>
  )
}


