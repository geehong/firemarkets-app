'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'

interface MultipleComparisonChartProps {
    assets?: string[]
    interval?: string
    height?: number
    title?: string
    // Restored/New Props
    externalSeries?: { name: string, data: number[][], yAxis?: number }[]
    independentAxes?: boolean
    compareMode?: 'value' | 'percent'
    normalizeData?: boolean
    startDate?: string
    endDate?: string
}

const MultipleComparisonChart: React.FC<MultipleComparisonChartProps> = ({
    assets = ['MSFT', 'AAPL', 'GOOG'],
    interval = '1d',
    height = 500,
    title = 'Chart',
    externalSeries,
    independentAxes = false,
    compareMode = 'value',
    normalizeData = false,
    startDate,
    endDate
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<any>(null)
    const [isClient, setIsClient] = useState(false)
    const [Highcharts, setHighcharts] = useState<any>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Load Highcharts
    useEffect(() => {
        const loadHighcharts = async () => {
             // ... existing loading logic ... 
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
                    () => import('highcharts/modules/accessibility')
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

    // Interval Helper ...
    const getLimit = (intv: string) => {
        switch (intv) {
            case '1d': return 50000;
            case '1w': return 50000;
            case '1M': return 50000;
            default: return 50000;
        }
    }
    
    // ... Data Fetching ...
    const assetQueries = useQueries({
        queries: (externalSeries ? [] : assets).map(asset => ({
            queryKey: ['ohlcv', asset, interval],
            queryFn: async () => {
                return apiClient.v2GetOhlcv(asset, {
                    data_interval: interval,
                    limit: getLimit(interval)
                })
            },
            staleTime: 5 * 60 * 1000,
            retry: 1
        }))
    })

    const isLoading = !externalSeries && assetQueries.some(q => q.isLoading)
    
    // ... Prepare Series Data ...
    const seriesData = externalSeries || assetQueries.map((query, index) => {
        const assetName = assets[index]
        if (!query.data) return null
        const rows = (query.data.data || query.data) as any[]
        if (!Array.isArray(rows)) return null
        return {
            name: assetName,
            data: rows.map((item: any) => {
                const tsStr = item.timestamp_utc || item.timestamp
                const closeStr = item.close_price || item.close || item.price
                if (!tsStr || closeStr === undefined) return null
                const timestamp = new Date(tsStr).getTime()
                const close = parseFloat(String(closeStr))
                if (isNaN(timestamp) || isNaN(close)) return null
                return [timestamp, close]
            }).filter((p): p is number[] => p !== null).sort((a,b)=>a[0]-b[0])
        }
    }).filter(Boolean)

    // Render Chart
    useEffect(() => {
        if (!isClient || !Highcharts || !chartContainerRef.current) return
        if (isLoading) return
        if (seriesData.length === 0) return

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

            const chartOptions: any = {
                chart: {
                    height: height,
                    backgroundColor: '#ffffff'
                },
                rangeSelector: {
                    selected: (startDate || endDate) ? undefined : 4
                },
                xAxis: {
                    min: startDate ? new Date(startDate).getTime() : undefined,
                    max: endDate ? new Date(endDate).getTime() : undefined
                },
                series: seriesData
            }

            // --- Configure logic based on compareMode or props ---
            
            if (compareMode === 'percent' || normalizeData) {
                // PERCENTAGE COMPARISON MODE (Lite)
                chartOptions.yAxis = {
                    labels: {
                        formatter: function (this: any) {
                            return (this.value > 0 ? ' + ' : '') + this.value + '%';
                        }
                    },
                    plotLines: [{
                        value: 0,
                        width: 2,
                        color: 'silver'
                    }]
                };
                chartOptions.plotOptions = {
                    series: {
                        compare: 'percent',
                        showInNavigator: true
                    }
                };
                chartOptions.tooltip = {
                    pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b> ({point.change}%)<br/>',
                    valueDecimals: 2,
                    split: true
                };
            } else {
                // VALUE MODE (Standard / Fundamental Analysis)
                
                // Axis Configuration
                if (independentAxes) {
                    chartOptions.yAxis = seriesData.map((s: any, i: number) => ({
                        labels: { enabled: false }, // Hide labels to avoid clutter or enable if needed
                        title: { text: null },
                        height: '100%',
                        top: '0%',
                        offset: 0,
                        className: `highcharts-color-${i}`,
                        opposite: i % 2 !== 0
                    }));
                    // Map series to axes
                    chartOptions.series = seriesData.map((s: any, i: number) => ({
                        ...s,
                        yAxis: s.yAxis ?? i // Use provided yAxis index or default to series index
                    }));
                } else {
                    // Default Single/Dual Axis
                   chartOptions.yAxis = [{
                        labels: { align: 'right', x: -3 },
                        title: { text: 'Value' },
                        height: '100%',
                        lineWidth: 2,
                        resize: { enabled: true }
                    }, {
                        labels: { align: 'left', x: 3 },
                        title: { text: 'Secondary' },
                        top: '0%',
                        height: '100%',
                        offset: 0,
                        lineWidth: 2,
                        opposite: true,
                        visible: false // Hidden unless used
                    }];
                    
                    chartOptions.series = seriesData.map((s: any) => ({
                        ...s,
                        yAxis: s.yAxis ?? 0
                    }));
                }

                chartOptions.tooltip = {
                    pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y:,.2f}</b><br/>',
                    valueDecimals: 2,
                    split: true
                };
            }

            chartRef.current = Highcharts.stockChart(chartContainerRef.current, chartOptions)

        } catch (err) {
            console.error('Error creating chart:', err)
        }

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy()
                chartRef.current = null
            }
        }
    }, [isClient, Highcharts, isLoading, assets.join(','), interval, externalSeries, independentAxes, compareMode, normalizeData])

    if (!isClient) return <div className="h-full flex items-center justify-center">Loading Library...</div>
    if (isLoading) return <div className="h-full flex items-center justify-center">Loading Data...</div>

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
            <div id="container" ref={chartContainerRef} style={{ height: `${height}px` }} />
        </div>
    )
}

export default MultipleComparisonChart
