"use client"

import React, { useMemo, useState } from 'react'
import TableBase, { TableColumn } from './TableBase'
import { useOhlcvData } from '@/hooks/useAssets'

type OhlcvRow = {
  Date: string
  Price: number
  Change_Percent: number | null
  Open: number
  High: number
  Low: number
  Volume: number
}

interface HistoryTableProps {
  assetIdentifier?: string
  initialInterval?: '1d' | '1w' | '1m'
  showVolume?: boolean
  showChangePercent?: boolean
  height?: number
}

export default function HistoryTable({
  assetIdentifier = 'BTCUSDT',
  initialInterval = '1d',
  showVolume = true,
  showChangePercent = true,
  height = 600,
}: HistoryTableProps) {
  const [interval, setInterval] = useState<'1d' | '1w' | '1m'>(initialInterval)

  const { data, isLoading, error } = useOhlcvData(assetIdentifier, {
    dataInterval: interval,
    // limit 생략하여 백엔드 기본값 사용
  }) as any

  const rows: OhlcvRow[] = useMemo(() => {
    const src = Array.isArray(data) ? data : (data?.data || data?.rows || [])
    if (!src || src.length === 0) return []

    // 백엔드에서 제공하는 change_percent 우선 사용
    const processed = src.map((item: any) => {
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
    }).sort((a: OhlcvRow, b: OhlcvRow) => new Date(b.Date).getTime() - new Date(a.Date).getTime())

    return processed
  }, [data])

  const columns: TableColumn<OhlcvRow>[] = useMemo(() => {
    const base: TableColumn<OhlcvRow>[] = [
      {
        key: 'Date', header: 'Date', sortable: true,
        render: (r) => {
          if (!r.Date) return ''
          const d = new Date(r.Date)
          const y = d.getFullYear()
          const m = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          return `${y}.${m}.${day}`
        }
      },
      {
        key: 'Price', header: 'Price', align: 'right', sortable: true,
        render: (r) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(r.Price)
      },
    ]

    const extras: TableColumn<OhlcvRow>[] = []
    if (showChangePercent) {
      extras.push({
        key: 'Change_Percent', header: 'Change', align: 'right', sortable: true,
        render: (r) => {
          if (r.Change_Percent == null) return '-'
          const v = Number(r.Change_Percent)
          const color = v >= 0 ? '#007c32' : '#d91400'
          const sign = v >= 0 ? '+' : ''
          return <span style={{ color }}>{`${sign}${v.toFixed(2)}%`}</span>
        }
      })
    }

    const ohlc: TableColumn<OhlcvRow>[] = [
      { key: 'Open', header: 'Open', align: 'right', sortable: true, render: (r) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(r.Open) },
      { key: 'High', header: 'High', align: 'right', sortable: true, render: (r) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(r.High) },
      { key: 'Low', header: 'Low', align: 'right', sortable: true, render: (r) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(r.Low) },
    ]

    const vol: TableColumn<OhlcvRow>[] = showVolume ? [{
      key: 'Volume', header: 'Volume', align: 'right', sortable: true,
      render: (r) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(r.Volume)
    }] : []

    return [...base, ...extras, ...ohlc, ...vol]
  }, [showChangePercent, showVolume])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(['1d','1w','1m'] as const).map(iv => (
          <button
            key={iv}
            onClick={() => setInterval(iv)}
            className={`rounded border px-3 py-1 text-sm ${interval === iv ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}
          >{iv.toUpperCase()}</button>
        ))}
      </div>
      <TableBase
        columns={columns}
        rows={rows}
        loading={isLoading}
        error={error ? String((error as any).message || error) : null}
        emptyMessage="No history"
        dense
        stickyHeader
        className=""
      />
      <div style={{ height }} />
    </div>
  )
}


