"use client"

import React, { useMemo, useState, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule, themeQuartz, ColDef } from 'ag-grid-community'
import { useOhlcvData, useAssetDetail } from '@/hooks/assets/useAssets'
import { useDelayedQuoteLast, useSparklinePrice } from '@/hooks/data/useRealtime'

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule])

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
    const gridRef = useRef<AgGridReact>(null)
    const [interval, setInterval] = useState<'1d' | '1w' | '1m'>(initialInterval)
    const [range, setRange] = useState<number>(7) // Default 7 days (1W)

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
    const delayedQuoteOptions = useMemo(() => ({
        dataInterval: '15m',
        dataSource
    }), [dataSource])

    const delayedQuoteQuery = useDelayedQuoteLast(
        assetIdentifier,
        delayedQuoteOptions,
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

    // 1d 간격일 때만 range(limit) 적용 -> 해제: API는 전체(혹은 기본)데이터 가져오고 페이지네이션으로 표시 개수 조절
    // const limit = interval === '1d' ? range : undefined 
    const limit = undefined

    const { data, isLoading, error } = useOhlcvData(assetIdentifier, {
        dataInterval: interval,
        limit: limit,
    }) as { data: any, isLoading: boolean, error: any }

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
            Open: price,  // Intraday snapshot, mapped to OHLC
            High: price,
            Low: price,
            Volume: volume
        }
    }, [quote, quoteData])

    const baseRows: OhlcvRow[] = useMemo(() => {
        const src = Array.isArray(data) ? data : (data?.data || data?.rows || [])
        if (!src || src.length === 0) return []

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
            // AG Grid takes care of sorting, but sorting here ensures consistency before merge
        }).sort((a: OhlcvRow, b: OhlcvRow) => new Date(b.Date).getTime() - new Date(a.Date).getTime())
    }, [data])

    // 히스토리(API) + 오늘(todayRow)을 합친 최종 rows
    const rowData: OhlcvRow[] = useMemo(() => {
        // 1. 오늘 데이터가 없으면 기존 데이터 반환
        if (!todayRow) return baseRows
        if (baseRows.length === 0) return [todayRow]

        const todayDateStr = todayRow.Date
        if (!todayDateStr) return baseRows
        const todayDate = new Date(todayDateStr)

        // 2. 일봉(1d)인 경우
        if (interval === '1d') {
            const latestRowDate = baseRows[0].Date.split('T')[0]
            const tDate = todayDateStr.split('T')[0]

            if (latestRowDate === tDate) {
                // Update latest row with real-time data
                return [todayRow, ...baseRows.slice(1)]
            } else {
                // Append today's data
                return [todayRow, ...baseRows]
            }
        }

        // 3. 주봉(1w) / 월봉(1m)인 경우: Merge 로직
        const latestRow = baseRows[0]
        const latestDate = new Date(latestRow.Date)
        let isCurrentPeriod = false

        if (interval === '1w') {
            const diffTime = Math.abs(todayDate.getTime() - latestDate.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            if (diffDays < 7) {
                isCurrentPeriod = true
            }
        } else if (interval === '1m') {
            if (
                todayDate.getFullYear() === latestDate.getFullYear() &&
                todayDate.getMonth() === latestDate.getMonth()
            ) {
                isCurrentPeriod = true
            }
        }

        if (isCurrentPeriod) {
            const mergedRow: OhlcvRow = {
                ...latestRow,
                Price: todayRow.Price,
                Change_Percent: todayRow.Change_Percent,
                High: Math.max(latestRow.High, todayRow.High, todayRow.Price),
                Low: Math.min(latestRow.Low, todayRow.Low, todayRow.Price),
                Volume: latestRow.Volume + todayRow.Volume
            }
            return [mergedRow, ...baseRows.slice(1)]
        } else {
            return [todayRow, ...baseRows]
        }
    }, [baseRows, todayRow, interval])

    // Column Definitions
    const columnDefs: ColDef[] = useMemo(() => {
        const cols: ColDef[] = [
            {
                field: 'Date',
                headerName: 'Date',
                minWidth: 120,
                sort: 'desc', // Default sort
                comparator: (valueA, valueB) => {
                    return new Date(valueA).getTime() - new Date(valueB).getTime();
                },
                valueFormatter: (p: any) => p.value ? new Date(p.value).toISOString().split('T')[0].replace(/-/g, '.') : ''
            },
            {
                field: 'Price',
                headerName: 'Price',
                type: 'numericColumn',
                valueFormatter: (p: any) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p.value)
            }
        ]

        if (showChangePercent) {
            cols.push({
                field: 'Change_Percent',
                headerName: 'Change',
                type: 'numericColumn',
                cellStyle: (p: any) => ({
                    color: p.value >= 0 ? '#16a34a' : '#dc2626', // green-600 : red-600
                    fontWeight: 700
                }),
                valueFormatter: (p: any) => p.value == null ? '-' : `${p.value >= 0 ? '+' : ''}${Number(p.value).toFixed(2)}%`
            })
        }

        cols.push(
            { field: 'Open', headerName: 'Open', type: 'numericColumn', valueFormatter: (p: any) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p.value) },
            { field: 'High', headerName: 'High', type: 'numericColumn', valueFormatter: (p: any) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p.value) },
            { field: 'Low', headerName: 'Low', type: 'numericColumn', valueFormatter: (p: any) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p.value) }
        )

        if (showVolume) {
            cols.push({
                field: 'Volume',
                headerName: 'Volume',
                type: 'numericColumn',
                valueFormatter: (p: any) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(p.value)
            })
        }

        return cols
    }, [showChangePercent, showVolume])

    const gridTheme = useMemo(() => {
        // Theme customization to match application look
        return themeQuartz.withParams({
            rowHoverColor: 'rgba(0,0,0,0.04)',
            selectedRowBackgroundColor: 'rgba(0, 123, 255, 0.08)',
            headerHeight: '40px',
            rowHeight: '40px'
        })
    }, [])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center text-red-500 py-10">
                Error loading data: {String((error as { message: string }).message || error)}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Interval:</span>
                    <select
                        value={interval}
                        onChange={(e) => setInterval(e.target.value as '1d' | '1w' | '1m')}
                        className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 focus:border-blue-500 focus:outline-none"
                    >
                        <option value="1d">Daily</option>
                        <option value="1w">Weekly</option>
                        <option value="1m">Monthly</option>
                    </select>
                </div>

                {interval === '1d' && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Page Size:</span>
                        <select
                            value={range}
                            onChange={(e) => setRange(Number(e.target.value))}
                            className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 focus:border-blue-500 focus:outline-none"
                        >
                            {[
                                { label: '1W (7)', value: 7 },
                                { label: '1M (28)', value: 28 },
                                { label: '3M (90)', value: 90 },
                                { label: '6M (180)', value: 180 },
                                { label: '1Y (365)', value: 365 },
                                { label: '2Y (730)', value: 730 },
                                { label: '5Y (1825)', value: 1825 },
                            ].map(opt => (
                                <option key={opt.label} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div style={{ width: '100%', height: `${height}px` }} className="ag-theme-quartz-auto-dark">
                {/* ag-theme-quartz-auto-dark handles light/dark mode automatically if configured, or we can use explicit classes */}
                <AgGridReact
                    ref={gridRef}
                    rowData={rowData}
                    columnDefs={columnDefs}
                    theme={gridTheme}
                    pagination={true}
                    paginationPageSize={range}
                    paginationPageSizeSelector={false}
                    defaultColDef={{
                        sortable: true,
                        filter: true,
                        flex: 1,
                        minWidth: 100,
                        resizable: true
                    }}
                    enableCellTextSelection={true}
                />
            </div>
        </div>
    )
}
