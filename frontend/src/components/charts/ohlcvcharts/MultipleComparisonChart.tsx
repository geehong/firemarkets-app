'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import ChartControls from '@/components/common/ChartControls'
import { getColorMode } from '@/constants/colorModes'

interface MultipleComparisonChartProps {
    assets?: string[]
    interval?: string
    height?: number
    title?: string
    independentAxes?: boolean
    externalSeries?: { name: string, data: number[][], yAxis?: number }[]
    normalizeData?: boolean
}

const MultipleComparisonChart: React.FC<MultipleComparisonChartProps> = ({
    assets = ['BTCUSDT', 'SPY', 'GSUSD'],
    interval = '1d',
    height = 650,
    title = 'Price Comparison',
    independentAxes = false,
    externalSeries,
    normalizeData = true
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<any>(null)
    const [isClient, setIsClient] = useState(false)
    const [Highcharts, setHighcharts] = useState<any>(null)
    const [selectedInterval, setSelectedInterval] = useState<string>(interval)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Chart Control functionality
    const [chartType, setChartType] = useState<'line' | 'spline' | 'area' | 'areaspline'>('line')
    const [useLogScale, setUseLogScale] = useState(false)
    const [isAreaMode, setIsAreaMode] = useState(false)
    const [colorMode, setColorMode] = useState<'dark' | 'vivid' | 'high-contrast' | 'simple'>('vivid')
    const [showFlags, setShowFlags] = useState(false)

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
            case '1d': return 7500 // roughly 20+ years
            case '1w': return 1000  // approx 20 years
            case '1M': return 240   // approx 20 years
            default: return 7500
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
        queries: (externalSeries ? [] : assets).map(asset => ({
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

    const isLoading = !externalSeries && assetQueries.some(q => q.isLoading)
    const hasError = !externalSeries && assetQueries.some(q => q.isError)

    // Prepare Series Data
    const seriesData = externalSeries || assetQueries.map((query, index) => {
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

        if (data.length === 0) return null
        
        // Normalize to 100 (Only if normalizeData is true)
        let finalData = data;
        if (normalizeData) {
             const startPrice = data[0][1]
             finalData = data.map(p => [p[0], (p[1] / startPrice) * 100])
        }

        return {
            name: assetName,
            data: finalData,
            yAxis: 0
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

            // Dynamic Y-Axis generation if independentAxes is enabled
            let chartYAxes: any[] = [];
            let chartSeries: any[] = [];
            
            if (independentAxes) {
                 // Create a separate Y-axis for each series
                 chartYAxes = validSeries.map((s, i) => ({
                    labels: { enabled: false }, // Hide labels to avoid clutter
                    title: { text: null },
                    height: '100%',
                    top: '0%',
                    offset: 0,
                    className: `highcharts-color-${i}`, // Match series color
                    opposite: i % 2 !== 0 // Alternate sides if we were showing labels, but useful for structure
                }));
                
                chartSeries = validSeries.map((s: any, i: number) => ({
                    ...s,
                    yAxis: i
                }));
            } else {
                // Default Dual-Axis or Single Axis logic
                 chartYAxes = [{
                    // Primary Y-Axis (Left)
                    labels: { align: 'right', x: -3 },
                    title: { text: 'Primary' },
                    height: '100%',
                    lineWidth: 2,
                    resize: { enabled: true }
                }, {
                    // Secondary Y-Axis (Right)
                    labels: { align: 'left', x: 3 },
                    title: { text: 'Secondary' },
                    top: '0%',
                    height: '100%',
                    offset: 0,
                    lineWidth: 2,
                    opposite: true
                }];
                
                chartSeries = validSeries.map((s: any) => ({
                    ...s,
                    yAxis: s.yAxis ?? 0
                }));
            }

            const options = {
                chart: { height },
                rangeSelector: {
                    selected: 8, // 'All' index (0-based: 1m, 3m, 6m, YTD, 1y, 5y, 10y, 20y, All)
                    buttons: [
                        { type: 'month', count: 1, text: '1m' },
                        { type: 'month', count: 3, text: '3m' },
                        { type: 'month', count: 6, text: '6m' },
                        { type: 'ytd', text: 'YTD' },
                        { type: 'year', count: 1, text: '1y' },
                        { type: 'year', count: 5, text: '5y' },
                        { type: 'year', count: 10, text: '10y' },
                        { type: 'year', count: 20, text: '20y' },
                        { type: 'all', text: 'All' }
                    ]
                },
                yAxis: chartYAxes,
                tooltip: {
                    pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y:,.2f}</b><br/>',
                    valueDecimals: 2,
                    split: true
                },
                series: chartSeries
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



    const handleChartTypeChange = (type: 'line' | 'spline' | 'area' | 'areaspline') => {
        setChartType(type)
        if (chartRef.current) {
            chartRef.current.update({
                chart: { type: type },
                plotOptions: { series: { type: type } }
            })
        }
    }

    const handleLogScaleToggle = (checked: boolean) => {
        setUseLogScale(checked)
        if (chartRef.current) {
            chartRef.current.yAxis[0].update({
                type: checked ? 'logarithmic' : 'linear'
            })
        }
    }

    // Effect to update chart options when state changes
    useEffect(() => {
        if (!chartRef.current) return
        
        // Update Chart Type
        const currentSeries = chartRef.current.series
        if (currentSeries && currentSeries.length > 0) {
           currentSeries.forEach((s: any) => {
               // Only update main series, not navigator
               if (s.options.showInNavigator) {
                   s.update({ type: chartType }, false)
               }
           })
           chartRef.current.redraw()
        }

        // Update Log Scale
        chartRef.current.yAxis[0].update({
            type: useLogScale ? 'logarithmic' : 'linear'
        })
        
    }, [chartType, useLogScale])

    if (!isClient) return <div className="h-full flex items-center justify-center">Loading Library...</div>
    if (isLoading) return <div className="h-full flex items-center justify-center">Loading Data...</div>
    if (errorMessage) return <div className="h-full flex items-center justify-center text-red-500">{errorMessage}</div>

    const intervalOptions = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M']



    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                
                <div className="flex items-center gap-4">
                     <ChartControls
                        chartType={chartType}
                        onChartTypeChange={setChartType}
                        isAreaMode={isAreaMode}
                        onAreaModeToggle={() => {
                            const newMode = !isAreaMode
                            setIsAreaMode(newMode)
                            setChartType(newMode ? 'area' : 'line')
                        }}
                        useLogScale={useLogScale}
                        onLogScaleToggle={setUseLogScale}
                        colorMode={colorMode}
                        onColorModeChange={setColorMode}
                        showFlags={showFlags}
                        onFlagsToggle={() => setShowFlags(!showFlags)}
                        showFlagsButton={false}
                    />

                    <div className="flex items-center gap-2 border-l pl-4">
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
            </div>
            <div id="container" ref={chartContainerRef} style={{ height: `${height}px` }} />
        </div>
    )
}

export default MultipleComparisonChart
