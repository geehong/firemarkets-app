'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import AgGridBaseTable from '@/components/tables/AgGridBaseTable'
import { ColDef, ICellRendererParams, ValueFormatterParams, CellStyle } from 'ag-grid-community'

interface AssetsListTableProps {
    rows: any[]
    loading: boolean
    error: string | null
}

export default function AssetsListTable({ rows, loading, error }: AssetsListTableProps) {
    const columns = useMemo<ColDef<any>[]>(() => [
        { field: 'asset_id', headerName: 'ID', width: 70, minWidth: 60 },
        {
            field: 'logo_url', headerName: 'Symbol', width: 80, minWidth: 70, cellRenderer: (params: ICellRendererParams) => {
                const url = params.value
                const ticker = params.data.ticker
                const assetId = params.data.asset_id
                const fallback = '🔹'
                return (
                    <Link href={`/assets/${ticker || assetId}`} className="inline-block">
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
            width: 100,
            minWidth: 90,
            cellRenderer: (params: ICellRendererParams) => {
                const ticker = params.value
                const assetId = params.data.asset_id
                return (
                    <Link
                        href={`/assets/${ticker || assetId}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium dark:text-blue-400 dark:hover:text-blue-300"
                    >
                        {ticker}
                    </Link>
                )
            }
        },
        {
            field: 'name',
            headerName: 'Name',
            flex: 1,
            minWidth: 200,
            cellRenderer: (params: ICellRendererParams) => {
                const name = params.value
                const ticker = params.data.ticker
                const assetId = params.data.asset_id
                return (
                    <Link
                        href={`/assets/${ticker || assetId}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                    >
                        {name}
                    </Link>
                )
            }
        },
        {
            field: 'current_price',
            headerName: 'Price',
            width: 120,
            minWidth: 110,
            valueFormatter: (p: ValueFormatterParams) => p.value != null ? `$${Number(p.value).toFixed(2)}` : '',
            cellStyle: (p: any): CellStyle | undefined => {
                const v = p.data?.daily_change_percent ?? 0
                return { color: v >= 0 ? '#007c32' : '#d91400', fontWeight: 700, fontSize: '.875rem' }
            }
        },
        {
            field: 'daily_change_percent',
            headerName: 'Change(%)',
            width: 110,
            minWidth: 100,
            valueFormatter: (p: ValueFormatterParams) => {
                const v = p.value ?? 0
                return `${v >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`
            },
            cellStyle: (p: any): CellStyle | undefined => {
                const v = p.value ?? 0
                const base = { fontWeight: 700, fontSize: '.875rem' } as const
                if (v > 0) return { ...base, color: '#007c32' }
                if (v < 0) return { ...base, color: '#d91400' }
                return { ...base, color: '#a0a0a0' }
            }
        },
        {
            field: 'market_cap',
            headerName: 'Market Cap(BIN)',
            width: 150,
            minWidth: 120,
            valueFormatter: (p: ValueFormatterParams) => p.value != null ? `${(Number(p.value) / 1e9).toFixed(1)} B` : ''
        },
        {
            field: 'type_name',
            headerName: 'Type',
            width: 90,
            minWidth: 80
        },
    ], [])

    return (
        <div className="space-y-4">
            <AgGridBaseTable
                rows={rows}
                columns={columns}
                loading={loading}
                error={error}
                height={600}
                gridOptions={{
                    domLayout: 'autoHeight',
                    rowHeight: 45, // Slightly taller for better touch targets
                    headerHeight: 40,
                }}
            />
        </div>
    )
}
