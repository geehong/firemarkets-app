"use client"

import React, { useMemo, useState } from 'react'
import TableBase, { TableColumn } from './TableBase'
import { useOhlcvData, useAssetDetail } from '@/hooks/useAssets'
import { useDelayedQuoteLast, useSparklinePrice } from '@/hooks/useRealtime'

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

  // 오늘자(실시간/딜레이) 가격을 위해 자산 타입 조회
  const { data: assetDetail } = useAssetDetail(assetIdentifier)
  const isCrypto = assetDetail?.asset_type_id === 8
  const dataSource = isCrypto ? 'binance' : undefined
  const isStocksOrEtf =
    assetDetail?.asset_type_id === 2 || // Stocks
    assetDetail?.asset_type_id === 5 || // ETFs
    assetDetail?.type_name?.toLowerCase() === 'stocks' ||
    assetDetail?.type_name?.toLowerCase() === 'etfs'

  // RealtimeQuotesPriceWidget 과 동일한 로직으로 오늘자 quote 조회
  const delayedQuoteQuery = useDelayedQuoteLast(
    assetIdentifier,
    {
      dataInterval: '15m',
      dataSource
    },
    {
      refetchInterval: 15 * 60 * 1000,
      staleTime: 0,
      gcTime: 0,
      enabled: !!assetIdentifier && !isStocksOrEtf
    }
  )

  const sparklineQuery = useSparklinePrice(
    assetIdentifier,
    { dataInterval: '15m', days: 1, dataSource },
    {
      refetchInterval: 15 * 60 * 1000,
      staleTime: 0,
      gcTime: 0,
      enabled: !!assetIdentifier && isStocksOrEtf
    }
  )

  let quoteData: any = null
  if (isStocksOrEtf && sparklineQuery.data) {
    const quotes = sparklineQuery.data?.quotes || []
    if (quotes.length > 0) {
      quoteData = {
        quote: quotes[0],
        timestamp: quotes[0]?.timestamp_utc
      }
    }
  } else if (!isStocksOrEtf) {
    quoteData = delayedQuoteQuery.data
  }

  const quote = quoteData?.quote || quoteData

  const { data, isLoading, error } = useOhlcvData(assetIdentifier, {
    dataInterval: interval,
    // limit 생략하여 백엔드 기본값 사용
  }) as any

  // 오늘자 row (RealtimeQuotesPriceWidget 과 동일한 소스) 생성
  const todayRow: OhlcvRow | null = useMemo(() => {
    if (!quote) return null

    const price = Number(quote.price) || 0
    const changePercent =
      quote.change_percent !== null && quote.change_percent !== undefined
        ? Number(quote.change_percent)
        : null
    const volume = Number(quote.volume) || 0
    const timestamp: string =
      quote.timestamp_utc || quoteData?.timestamp || new Date().toISOString()

    return {
      Date: timestamp,
      Price: price,
      Change_Percent: changePercent,
      // intraday 이므로 OHLC 정보는 price로 동일하게 채움
      Open: price,
      High: price,
      Low: price,
      Volume: volume
    }
  }, [quote, quoteData])

  const baseRows: OhlcvRow[] = useMemo(() => {
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

  // 히스토리(API) + 오늘(todayRow)을 합친 최종 rows
  const rows: OhlcvRow[] = useMemo(() => {
    if (!todayRow) return baseRows

    const todayDate = todayRow.Date ? todayRow.Date.split('T')[0] : null
    if (!todayDate) return baseRows

    const filtered = baseRows.filter(r => {
      if (!r.Date) return true
      const d = r.Date.split('T')[0]
      return d !== todayDate
    })

    return [todayRow, ...filtered]
  }, [baseRows, todayRow])

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


