"use client"

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import AgGridBaseTable from './AgGridBaseTable'
import { ColDef } from 'ag-grid-community'
import { useTreemapLive } from '@/hooks/useAssets'

type AssetRow = {
  ticker: string
  name: string
  asset_type: string
  market_cap: number | null
  current_price: number | null
  price_change_percentage_24h: number | null
  logo_url?: string | null
}

interface AssetsListTableProps {
  typeName?: string | null
}

export default function AssetsListTable({ typeName }: AssetsListTableProps) {
  // Always use treemap live, optionally filtered by type_name
  const { data, isLoading, error } = useTreemapLive(
    typeName ? { type_name: typeName } : undefined
  )
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const sourceItems = ((data as any)?.data) ?? []
    const items = Array.isArray(sourceItems) ? sourceItems : []
    const mapped = items.map((it: any) => ({
      asset_id: it.asset_id,
      ticker: it.ticker,
      name: it.name,
      type_name: it.type_name || it.asset_type,
      market_cap: it.market_cap ?? null,
      current_price: it.current_price ?? null,
      daily_change_percent: it.price_change_percentage_24h ?? it.daily_change_percent ?? null,
      logo_url: it.logo_url ?? null,
      category: it.category,
    }))
    if (!query) return mapped
    const q = query.toLowerCase()
    return mapped.filter((r: any) =>
      (r.ticker || '').toLowerCase().includes(q) ||
      (r.name || '').toLowerCase().includes(q) ||
      (r.type_name || '').toLowerCase().includes(q)
    )
  }, [data, typeName, query])

  const columns = useMemo<ColDef<any>[]>(() => [
    { field: 'asset_id', headerName: 'ID', minWidth: 80 },
    {
      field: 'logo_url', headerName: 'Symbol', minWidth: 90, cellRenderer: (params: any) => {
        const url = params.value
        const ticker = params.data.ticker
        const fallback = '🔹'
        return (
          <Link href={`/assets/${ticker}`} className="inline-block">
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={url} 
                alt="logo" 
                style={{ width: 20, height: 20, borderRadius: 2 }} 
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />
            ) : (
              <span className="hover:opacity-80 transition-opacity cursor-pointer">{fallback}</span>
            )}
          </Link>
        )
      }
    },
    { 
      field: 'ticker', 
      headerName: 'Ticker', 
      minWidth: 110,
      cellRenderer: (params: any) => {
        const ticker = params.value
        return (
          <Link 
            href={`/assets/${ticker}`}
            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
          >
            {ticker}
          </Link>
        )
      }
    },
    { 
      field: 'name', 
      headerName: 'Name', 
      minWidth: 220,
      cellRenderer: (params: any) => {
        const name = params.value
        const ticker = params.data.ticker
        return (
          <Link 
            href={`/assets/${ticker}`}
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            {name}
          </Link>
        )
      }
    },
    { field: 'current_price', headerName: 'Price', minWidth: 120, valueFormatter: (p: any) => p.value != null ? `$${Number(p.value).toFixed(2)}` : '', cellStyle: (p: any) => {
        const v = p.data?.daily_change_percent ?? 0
        return { color: v >= 0 ? '#007c32' : '#d91400', fontWeight: 700, fontSize: '.875rem' }
      }
    },
    { field: 'daily_change_percent', headerName: 'Change(%)', minWidth: 120, valueFormatter: (p: any) => {
        const v = p.value ?? 0
        return `${v >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`
      }, cellStyle: (p: any) => {
        const v = p.value ?? 0
        const base = { fontWeight: 700, fontSize: '.875rem' } as const
        if (v > 0) return { ...base, color: '#007c32' }
        if (v < 0) return { ...base, color: '#d91400' }
        return { ...base, color: '#a0a0a0' }
      }
    },
    { field: 'market_cap', headerName: 'Market Cap(BIN)', minWidth: 160, valueFormatter: (p: any) => p.value != null ? `${(Number(p.value)/1e9).toFixed(1)} BIN` : '' },
    { field: 'type_name', headerName: 'Type', minWidth: 100 },
  ], [])

  const loading = isLoading
  const err = error ? String((error as any).message || error) : null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by ticker, name, type"
          className="border rounded px-3 py-1 text-sm"
        />
        {query && (
          <button className="text-sm px-2 py-1 border rounded" onClick={() => setQuery('')}>Clear</button>
        )}
      </div>
      <AgGridBaseTable
        rows={rows}
        columns={columns}
        loading={loading}
        error={err}
        height={600}
        gridOptions={{
          domLayout: 'autoHeight',
          rowHeight: 35,
          headerHeight: 40,
        }}
      />
    </div>
  )
}


