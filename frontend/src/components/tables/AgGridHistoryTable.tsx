"use client"

import React, { useMemo, useRef, useState, useEffect } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community'
import { useOhlcvData } from '@/hooks/assets/useAssets'
import { DateRangePicker, DateRange } from '@/components/ui/date-range-picker'

ModuleRegistry.registerModules([AllCommunityModule])

interface Props {
  assetIdentifier?: string
  dataInterval?: '1d' | '1w' | '1m'
  height?: number
}

export default function AgGridHistoryTable({ assetIdentifier = 'BTCUSDT', dataInterval = '1d', height = 600 }: Props) {
  const gridRef = useRef<AgGridReact<any>>(null)
  const [interval, setInterval] = useState<'1d' | '1w' | '1m'>(dataInterval)
  
  // Use DateRange type for state
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  const ohlcvOptions = useMemo(() => {
    // Format dates to YYYY-MM-DD for backend if they exist
    const startDate = dateRange?.from ? dateRange.from.toISOString().slice(0, 10) : undefined
    const endDate = dateRange?.to ? dateRange.to.toISOString().slice(0, 10) : undefined

    // For initial load or when no range is selected, we might want defaults or just fetch recent
    // If user selects range, we filter by that.
    // Logic: 
    // If explicit range set -> use it.
    // If not -> fetch default (backend usually handles default limit)
    
    return {
      dataInterval: interval,
      startDate: startDate || (endDate ? '2010-01-01' : undefined), // If only end date, set far past start
      endDate: endDate,
      limit: 50000,
    }
  }, [interval, dateRange])

  const { data, isLoading, error } = useOhlcvData(assetIdentifier, ohlcvOptions) as any

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[AgGridHistoryTable] ohlcvOptions', ohlcvOptions)
  }, [ohlcvOptions])

  const baseRows = useMemo(() => {
    const src = Array.isArray(data) ? data : (data?.data || data?.rows || [])
    if (!src) return []
    return src.map((item: any) => {
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
    
    // Client-side filtering if necessary (though backend should handle filtering with params)
    // Double ensure filtering here if backend returns more data than requested range
    const startTs = dateRange?.from ? dateRange.from.getTime() : -Infinity
    // End date should include the full day
    const endTs = dateRange?.to ? new Date(dateRange.to.getTime() + 86399999).getTime() : Infinity

    if (!dateRange?.from && !dateRange?.to) return baseRows

    return baseRows.filter((r: any) => {
      const t = new Date(r.Date).getTime()
      return t >= startTs && t <= endTs
    })
  }, [baseRows, dateRange])

  const columnDefs = useMemo(() => ([
    { field: 'Date', headerName: 'Date', minWidth: 120, sort: 'desc', valueFormatter: (p: any) => p.value ? p.value.split('T')[0] : '' },
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
      <div className="flex flex-wrap items-center gap-4 px-2">
        <div className="flex gap-2">
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
        </div>

        <div className="flex flex-col items-center gap-y-4">
            <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                className="w-60"
            />
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


