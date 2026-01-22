'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'

interface MultipleComparisonChartProps {
    assets?: string[]
    interval?: string
    height?: number
}

const MultipleComparisonChart: React.FC<MultipleComparisonChartProps> = ({
    assets = ['BTCUSDT', 'SPY', 'GSUSD'],
    interval = '1d',
    height = 650
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<any>(null)
    const [isClient, setIsClient] = useState(false)
    const [Highcharts, setHighcharts] = useState<any>(null)
    const [selectedInterval, setSelectedInterval] = useState<string>(interval)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Load Highcharts
    useEffect(() => {
        const loadHighcharts = async () => {
            if (typeof window === 'undefined') return

            try {
                // @ts-ignore
                const HighchartsCoreModule = await import('highcharts/highstock')
                const HighchartsCore = HighchartsCoreModule.default

                // Load modules
                const modules = [
                    // @ts-ignore
                    () => import('highcharts/modules/exporting'),
                    // @ts-ignore
                    () => import('highcharts/modules/accessibility'),
                    // @ts-ignore
                    () => import('highcharts/themes/adaptive')
                ]

                await Promise.all(
                    modules.map(async loader => {
                        const mod = await loader()
                        if (typeof mod.default === 'function') {
                            (mod.default as any)(HighchartsCore)
                        }
                    })
                )

                setHighcharts(HighchartsCore)
                setIsClient(true)
            } catch (error) {
                console.error('Failed to load Highcharts:', error)
                setErrorMessage('Failed to load chart library')
            }
        }
        loadHighcharts()
    }, [])

    // Interval Helper
    const intradayIntervals = ['1m', '5m', '15m', '30m', '1h', '4h']
    const isIntraday = intradayIntervals.includes(selectedInterval)

    const getDailyLimit = (intv: string) => {
        switch (intv) {
            case '1d': return 1000 // approx 3 years
            case '1w': return 260  // approx 5 years
            case '1M': return 60   // approx 5 years
            default: return 1000
        }
    }

    const getIntradayLimit = (intv: string) => {
        // Fetch roughly recent data for comparison
        switch (intv) {
            case '1m': return 1440
            case '5m': return 288 * 5
            case '15m': return 96 * 5
            case '30m': return 48 * 10
            case '1h': return 24 * 30
            case '4h': return 6 * 60
            default: return 1000
        }
    }


    // Data Fetching with useQueries
    const assetQueries = useQueries({
        queries: assets.map(asset => ({
            queryKey: ['ohlcv', asset, selectedInterval],
            queryFn: async () => {
                const limit = isIntraday 
                    ? getIntradayLimit(selectedInterval) 
                    : getDailyLimit(selectedInterval);
                    
                // Use v2 API for both intraday and daily
                return apiClient.v2GetOhlcv(asset, {
                    data_interval: selectedInterval,
                    limit: limit
                })
            },
            staleTime: 60 * 1000,
            retry: 1
        }))
    })

    const isLoading = assetQueries.some(q => q.isLoading)
    const hasError = assetQueries.some(q => q.isError)

    // Prepare Series Data
    const seriesData = assetQueries.map((query, index) => {
        const assetName = assets[index]
        if (!query.data) return null

        // Unified data access (handle potentially different response structures if any)
        // Adjust based on your API response structure seen in other files
        const rows = (query.data.data || query.data) as any[]

        if (!Array.isArray(rows)) return null

        const data = rows
            .map((item: any) => {
                // Handle different field names for timestamp and close price
                const tsStr = item.timestamp_utc || item.timestamp
                const closeStr = item.close_price || item.close || item.price

                if (!tsStr || closeStr === undefined) return null

                const timestamp = new Date(tsStr).getTime()
                const close = parseFloat(String(closeStr))

                if (isNaN(timestamp) || isNaN(close)) return null
                return [timestamp, close]
            })
            .filter((p): p is number[] => p !== null && p[0] > 0)
            .sort((a, b) => a[0] - b[0])

        return {
            name: assetName,
            data
        }
    })


    // Render Chart
    useEffect(() => {
        if (!isClient || !Highcharts || !chartContainerRef.current) return
        if (isLoading) return

        const validSeries = seriesData.filter(s => s && s.data.length > 0)

        if (validSeries.length === 0 && !isLoading && !hasError) {
            // No data available yet or empty
            // Maybe wait or show empty status handled by return block
            return
        }


        // Destroy existing chart if needed (react-hooks safety)
        if (chartRef.current) {
            chartRef.current.destroy()
            chartRef.current = null
        }

        try {
            Highcharts.setOptions({
                chart: { backgroundColor: '#ffffff' },
                title: { style: { color: '#333333' } },
                tooltip: { backgroundColor: 'rgba(255, 255, 255, 0.95)', style: { color: '#333333' } }
            })

            const options = {
                chart: { height },
                rangeSelector: {
                    selected: 4
                },
                yAxis: {
                    labels: {
                        format: '{#if (gt value 0)}+{/if}{value}%'
                    },
                    plotLines: [{
                        value: 0,
                        width: 2,
                        color: 'silver'
                    }]
                },
                plotOptions: {
                    series: {
                        compare: 'percent',
                        showInNavigator: true
                    }
                },
                tooltip: {
                    pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b> ({point.change}%)<br/>',
                    valueDecimals: 2,
                    split: true
                },
                series: validSeries
            }

            chartRef.current = Highcharts.stockChart(chartContainerRef.current, options)

        } catch (err) {
            console.error('Error creating chart:', err)
            setErrorMessage('Error creating chart')
        }

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy()
                chartRef.current = null
            }
        }

    }, [isClient, Highcharts, isLoading, hasError, selectedInterval]) // Re-run if data/assets change? seriesData is derived, maybe add JSON.stringify(seriesData)? 
    // Ideally we should use a deep compare or checking loading state. 
    // But re-creating chart on every render is expensive. 
    // Let's stick to dependencies that signal a data update.
    // Actually `seriesData` is a new array every render.
    // Let's rely on JSON.stringify of length for now or better yet, just when queries finish.
    // The simplified approach above might thrash. Let's optimize slightly by separate effect or check.
    // For this implementation, I will just let it re-render when `isLoading` changes from true to false.


    // Effect to update chart data without destroying if possible? 
    // Allow full re-creation for simplicity now as requested "reference existing chart".
    // Existing charts often destroy/recreate.


    if (!isClient) return <div className="h-full flex items-center justify-center">Loading Library...</div>
    if (isLoading) return <div className="h-full flex items-center justify-center">Loading Data...</div>
    if (errorMessage) return <div className="h-full flex items-center justify-center text-red-500">{errorMessage}</div>

    const intervalOptions = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M']

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800">Multiple Comparison</h3>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Interval:</span>
                    <select
                        value={selectedInterval}
                        onChange={(e) => setSelectedInterval(e.target.value)}
                        className="text-sm border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                    >
                        {intervalOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div id="container" ref={chartContainerRef} style={{ height: `${height}px` }} />
        </div>
    )
}

export default MultipleComparisonChart
