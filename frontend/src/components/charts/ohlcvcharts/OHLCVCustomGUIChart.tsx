
'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useOhlcvData as useOhlcv } from '@/hooks/assets/useAssets'
import { useIntradayOhlcv as useIntraday } from '@/hooks/data/useRealtime'
import './OHLCVCustomGUIChart.css'

interface OHLCVData {
    timestamp_utc: string
    open_price: string | number
    high_price: string | number
    low_price: string | number
    close_price: string | number
    volume: string | number
}

interface OHLCVCustomGUIChartProps {
    assetIdentifier?: string
    dataInterval?: string
    dataUrl?: string
    seriesId?: string
    seriesName?: string
    height?: number
    externalOhlcvData?: OHLCVData[] | null
    useIntradayData?: boolean
    allowedIntervals?: string[]
}

const OHLCVCustomGUIChart: React.FC<OHLCVCustomGUIChartProps> = ({
    assetIdentifier,
    dataInterval = '1d',
    dataUrl,
    seriesId = 'aapl-ohlc',
    seriesName,
    height = 650,
    externalOhlcvData = null,
    useIntradayData = false,
    allowedIntervals = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M']
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<any>(null)
    const [isClient, setIsClient] = useState(false)
    const [Highcharts, setHighcharts] = useState<any>(null)
    const [chartData, setChartData] = useState<number[][] | null>(null)
    const [volumeData, setVolumeData] = useState<number[][] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [selectedInterval, setSelectedInterval] = useState<string>(dataInterval || '1d')
    const [useLogScale, setUseLogScale] = useState<boolean>(false)

    // Load Highcharts
    useEffect(() => {
        const loadHighcharts = async () => {
            if (typeof window === 'undefined') return

            try {
                // @ts-ignore
                const HighchartsCoreModule = await import('highcharts/highstock')
                const HighchartsCore = HighchartsCoreModule.default

                // Load only essential modules
                const modules = [
                    // @ts-ignore
                    () => import('highcharts/modules/exporting'),
                    // @ts-ignore
                    () => import('highcharts/modules/accessibility'),
                    // @ts-ignore
                    () => import('highcharts/modules/drag-panes'),
                    // @ts-ignore
                    () => import('highcharts/modules/full-screen'),
                    // @ts-ignore
                    () => import('highcharts/modules/annotations-advanced'),
                    // @ts-ignore
                    () => import('highcharts/modules/price-indicator'),
                    // @ts-ignore
                    () => import('highcharts/modules/stock-tools'), // Disabled but needed for modules
                    // @ts-ignore
                    () => import('highcharts/modules/heikinashi'),
                    // @ts-ignore
                    () => import('highcharts/modules/hollowcandlestick'),
                    // @ts-ignore
                    () => import('highcharts/themes/adaptive')
                ]

                await Promise.all(
                    modules.map(async loader => {
                        try {
                            const mod = await loader()
                            if (typeof mod.default === 'function') {
                                ; (mod.default as any)(HighchartsCore)
                            }
                        } catch (err) {
                            console.warn('Module load warning:', err)
                        }
                    })
                )

                setHighcharts(HighchartsCore)
                setIsClient(true)
            } catch (error) {
                console.error('Failed to load Highcharts:', error)
            }
        }

        loadHighcharts()
    }, [])

    // Update selectedInterval when dataInterval prop changes
    useEffect(() => {
        if (dataInterval && dataInterval !== selectedInterval) {
            setSelectedInterval(dataInterval)
        }
    }, [dataInterval])

    // Interval mapping
    const intradayIntervals = ['1m', '5m', '15m', '30m', '1h', '4h']
    const dailyIntervals = ['1d', '1w', '1M']

    const isIntradayInterval = intradayIntervals.includes(selectedInterval)
    const isDailyInterval = dailyIntervals.includes(selectedInterval)

    // Limit calculation
    const getIntradayLimit = (interval: string): number => {
        switch (interval) {
            case '1m': return 1440 * 2
            case '5m': return 288 * 7
            case '15m': return 96 * 14
            case '30m': return 48 * 30
            case '1h': return 24 * 120
            case '4h': return 6 * 360
            default: return 1000
        }
    }

    const getDailyLimit = (interval: string): number => {
        switch (interval) {
            case '1d': return 50000
            case '1w': return 52 * 30
            case '1M': return 12 * 40
            default: return 50000
        }
    }

    const intradayLimit = getIntradayLimit(selectedInterval)
    const dailyLimit = getDailyLimit(selectedInterval)

    // Intraday data
    const intradayOptions = { dataInterval: selectedInterval, days: 1, limit: intradayLimit }

    // Ensure we use the correct structure for useIntradayOhlcv 
    const { data: timeData, isLoading: timeLoading, error: timeError } = useIntraday(
        assetIdentifier || '',
        intradayOptions,
        // @ts-ignore
        { enabled: !!assetIdentifier && isIntradayInterval, staleTime: 60_000, retry: 3 }
    )

    // Daily data
    const { data: dailyData, isLoading: dailyLoading, error: dailyError } = useOhlcv(
        assetIdentifier || '',
        { dataInterval: selectedInterval, limit: dailyLimit },
        // @ts-ignore
        { enabled: !!assetIdentifier && isDailyInterval, staleTime: 60_000, retry: 3 }
    )

    const apiData = isIntradayInterval ? timeData : dailyData
    const apiLoading = isIntradayInterval ? timeLoading : dailyLoading
    const apiError = isIntradayInterval ? timeError : dailyError

    // Data processing
    useEffect(() => {
        if (externalOhlcvData && Array.isArray(externalOhlcvData) && externalOhlcvData.length > 0) {
            const ohlc = externalOhlcvData
                .map((r: OHLCVData) => [
                    new Date(r.timestamp_utc).getTime(),
                    parseFloat(String(r.open_price)) || 0,
                    parseFloat(String(r.high_price)) || 0,
                    parseFloat(String(r.low_price)) || 0,
                    parseFloat(String(r.close_price)) || 0
                ])
                .filter((p: number[]) => p[0] > 0)
                .sort((a: number[], b: number[]) => a[0] - b[0])

            const vol = externalOhlcvData
                .map((r: OHLCVData) => [new Date(r.timestamp_utc).getTime(), parseFloat(String(r.volume)) || 0])
                .filter((p: number[]) => p[0] > 0 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && p[1] >= 0)
                .sort((a: number[], b: number[]) => a[0] - b[0])

            setChartData(ohlc)
            setVolumeData(vol)
            setError(null)
            return
        }

        if (apiError) {
            const message = `차트 데이터를 불러오는데 실패했습니다: ${(apiError as Error)?.message || apiError}`
            setError(message)
            return
        }

        if (!assetIdentifier) {
            if (dataUrl) {
                fetch(dataUrl)
                    .then(response => response.json())
                    .then(data => {
                        const ohlc: number[][] = []
                        const volume: number[][] = []

                        for (let i = 0; i < data.length; i += 1) {
                            ohlc.push([
                                data[i][0],
                                data[i][1],
                                data[i][2],
                                data[i][3],
                                data[i][4]
                            ])
                            volume.push([
                                data[i][0],
                                data[i][5]
                            ])
                        }

                        setChartData(ohlc)
                        setVolumeData(volume)
                        setError(null)
                    })
                    .catch(err => {
                        setError(`데이터 로드 실패: ${err.message}`)
                    })
            }
            return
        }

        // @ts-ignore
        const rows: any[] = apiData?.data || apiData || []

        if (rows && rows.length > 0) {
            const ohlc = rows
                .map((item: any) => {
                    let timestamp: number
                    let open: number, high: number, low: number, close: number

                    if (isIntradayInterval) {
                        timestamp = new Date(String(item.timestamp || item.timestamp_utc)).getTime()
                        open = parseFloat(String(item.open || item.open_price)) || 0
                        high = parseFloat(String(item.high || item.high_price)) || 0
                        low = parseFloat(String(item.low || item.low_price)) || 0
                        close = parseFloat(String(item.close || item.close_price)) || 0
                    } else {
                        timestamp = new Date(String(item.timestamp_utc)).getTime()
                        open = parseFloat(String(item.open_price)) || 0
                        high = parseFloat(String(item.high_price)) || 0
                        low = parseFloat(String(item.low_price)) || 0
                        close = parseFloat(String(item.close_price)) || 0
                    }
                    return [timestamp, open, high, low, close]
                })
                .filter((p: number[]) => p[0] > 0)
                .sort((a: number[], b: number[]) => a[0] - b[0])

            const vol = rows
                .map((item: any) => {
                    let ts: number
                    if (isIntradayInterval) {
                        ts = new Date(String(item.timestamp || item.timestamp_utc)).getTime()
                    } else {
                        ts = new Date(String(item.timestamp_utc)).getTime()
                    }
                    const v = parseFloat(String(item.volume)) || 0
                    return [ts, v]
                })
                .filter((p: number[]) => p[0] > 0 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && p[1] >= 0)
                .sort((a: number[], b: number[]) => a[0] - b[0])

            setChartData(ohlc)
            setVolumeData(vol)
            setError(null)
        } else if (!apiLoading) {
            setError('차트 데이터가 없습니다.')
        }
    }, [assetIdentifier, selectedInterval, externalOhlcvData, apiData, apiLoading, apiError, isIntradayInterval, isDailyInterval, dataUrl])

    // Initialize chart
    useEffect(() => {
        if (!isClient || !Highcharts || !chartContainerRef.current) return
        if (!chartData || chartData.length === 0) return

        // Destroy existing chart
        if (chartRef.current) {
            chartRef.current.destroy()
            chartRef.current = null
        }

        try {
            const ohlc = chartData
            const volume = volumeData || []

            // Set Highcharts global options (light theme)
            Highcharts.setOptions({
                chart: {
                    backgroundColor: '#ffffff'
                },
                title: {
                    style: {
                        color: '#333333'
                    }
                },
                xAxis: {
                    gridLineColor: '#e0e0e0',
                    labels: {
                        style: {
                            color: '#666666'
                        }
                    }
                },
                yAxis: {
                    gridLineColor: '#e0e0e0',
                    labels: {
                        style: {
                            color: '#666666'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    style: {
                        color: '#333333'
                    }
                },
                scrollbar: {
                    barBackgroundColor: '#e0e0e0',
                    barBorderRadius: 0,
                    barBorderWidth: 0,
                    buttonBorderWidth: 0,
                    buttonArrowColor: '#666666',
                    rifleColor: '#666666',
                    trackBackgroundColor: '#f5f5f5',
                    trackBorderRadius: 0,
                    trackBorderWidth: 1,
                    trackBorderColor: '#e0e0e0'
                },
                exporting: {
                    buttons: {
                        contextButton: {
                            theme: {
                                fill: '#ffffff'
                            }
                        }
                    }
                }
            })

            const chart = Highcharts.stockChart(chartContainerRef.current, {
                chart: {
                    height: height,
                    width: null,
                    spacingTop: 10,
                    spacingBottom: 10,
                    spacingRight: 10,
                    spacingLeft: 10,
                    backgroundColor: '#ffffff'
                },
                rangeSelector: {
                    selected: 2,
                    buttons: [
                        { type: 'month', count: 1, text: '1m' },
                        { type: 'month', count: 3, text: '3m' },
                        { type: 'month', count: 6, text: '6m' },
                        { type: 'ytd', text: 'YTD' },
                        { type: 'year', count: 1, text: '1y' },
                        { type: 'all', text: 'All' }
                    ],
                    inputEnabled: false
                },
                navigator: {
                    enabled: true,
                    height: 50,
                    margin: 5,
                    handles: {
                        backgroundColor: '#3b82f6',
                        borderColor: '#1d4ed8',
                        width: 8,
                        height: 20
                    },
                    outlineColor: '#cccccc',
                    outlineWidth: 1,
                    maskFill: 'rgba(59, 130, 246, 0.1)',
                    maskInside: true
                },
                scrollbar: {
                    enabled: true,
                    barBackgroundColor: '#f3f4f6',
                    barBorderRadius: 7,
                    barBorderWidth: 0,
                    buttonBackgroundColor: '#f3f4f6',
                    buttonBorderWidth: 0,
                    buttonBorderRadius: 7,
                    rifleColor: '#6b7280',
                    trackBackgroundColor: '#ffffff',
                    trackBorderWidth: 1,
                    trackBorderRadius: 8,
                    trackBorderColor: '#d1d5db',
                    height: 14
                },
                stockTools: {
                    gui: {
                        enabled: true,
                        iconsURL: '/images/icons/stock-icons/'
                    }
                },
                yAxis: [
                    {
                        labels: { align: 'left' },
                        height: '70%',
                        type: useLogScale ? 'logarithmic' : 'linear',
                        resize: { enabled: true }
                    },
                    {
                        labels: { align: 'left' },
                        top: '70%',
                        height: '30%',
                        offset: 0
                    }
                ],
                plotOptions: {
                    candlestick: {
                        color: '#ea3d3d',
                        upColor: '#51a958',
                        upLineColor: '#51a958',
                        lineColor: '#ea3d3d'
                    },
                    column: {
                        borderRadius: 0,
                        groupPadding: 0,
                        pointPadding: 0
                    }
                },
                tooltip: {
                    shared: true,
                    split: false,
                    fixed: true,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    style: {
                        color: '#333333'
                    }
                },
                series: [
                    {
                        type: 'candlestick',
                        id: seriesId,
                        name: seriesName || `${assetIdentifier || 'Price'} Price`,
                        data: ohlc,
                        tooltip: {
                            valueDecimals: 2,
                            pointFormat:
                                '<b>O</b> <span style="color: {point.color}">{point.open}</span> ' +
                                '<b>H</b> <span style="color: {point.color}">{point.high}</span><br/>' +
                                '<b>L</b> <span style="color: {point.color}">{point.low}</span> ' +
                                '<b>C</b> <span style="color: {point.color}">{point.close}</span><br/>'
                        }
                    },
                    {
                        type: 'column',
                        id: `${seriesId}-volume`,
                        name: `${assetIdentifier || 'Volume'} Volume`,
                        data: volume.map((v: number[]) => {
                            const idx = ohlc.findIndex((o: number[]) => o[0] === v[0])
                            if (idx > 0) {
                                const prevClose = ohlc[idx - 1][4]
                                const currentClose = ohlc[idx][4]
                                return {
                                    x: v[0],
                                    y: v[1],
                                    color: currentClose >= prevClose ? '#51a958' : '#ea3d3d'
                                }
                            }
                            return { x: v[0], y: v[1], color: '#51a958' }
                        }),
                        yAxis: 1,
                        tooltip: {
                            pointFormat: '<b>Volume</b> <span style="color: {point.color}">{point.y}</span><br/>'
                        }
                    }
                ]
            })

            chartRef.current = chart
        } catch (error) {
            console.error('Failed to initialize chart:', error)
            setError(`차트 초기화 실패: ${(error as Error)?.message || error}`)
        }

        return () => {
            if (chartRef.current && chartRef.current.destroy) {
                chartRef.current.destroy()
                chartRef.current = null
            }
        }
    }, [isClient, Highcharts, chartData, volumeData, seriesId, seriesName, assetIdentifier, height, useLogScale])


    // Load CSS dynamically
    useEffect(() => {
        if (typeof window === 'undefined') return

        // Load Highcharts CSS files
        const loadCSS = (href: string) => {
            const link = document.createElement('link')
            link.rel = 'stylesheet'
            link.href = href
            document.head.appendChild(link)
            return link
        }

        const links = [
            loadCSS('https://code.highcharts.com/css/stocktools/gui.css'),
            loadCSS('https://code.highcharts.com/css/annotations/popup.css')
        ]

        // Add global styles (light theme)
        const style = document.createElement('style')
        style.textContent = `
      :root {
        --highcharts-neutral-color-3: rgba(0, 0, 0, 0);
      }
      .highcharts-description {
        margin: 0.3rem 10px;
      }
    `
        document.head.appendChild(style)

        return () => {
            links.forEach(link => link.remove())
            style.remove()
        }
    }, [])

    const intervalLabels: Record<string, string> = {
        '1m': '1분',
        '5m': '5분',
        '15m': '15분',
        '30m': '30분',
        '1h': '1시간',
        '4h': '4시간',
        '1d': '일봉',
        '1w': '주봉',
        '1M': '월봉'
    }

    const getIntervalLabel = (interval: string) => intervalLabels[interval] || interval

    const intervalOptions = allowedIntervals;

    if (!isClient) {
        return (
            <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <div className="text-sm text-gray-600">Loading chart library...</div>
                </div>
            </div>
        )
    }

    if (apiLoading || (assetIdentifier && !chartData)) {
        return (
            <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <div className="text-sm text-gray-600">Loading chart data...</div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-md p-4" style={{ minHeight: `${height}px` }}>
                <h5 className="text-red-800 font-medium">Chart Error</h5>
                <p className="text-red-600">{error}</p>
            </div>
        )
    }

    if (!chartData || chartData.length === 0) {
        return (
            <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
                <div className="text-center">
                    <div className="text-gray-500 mb-2">📊</div>
                    <div className="text-gray-700">데이터가 없습니다.</div>
                </div>
            </div>
        )
    }

    return (
        <div style={{
            width: '100%',
            minHeight: `${height + 70}px`,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            background: '#ffffff'
        }}>
            {/* Interval Selector */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px',
                background: '#ffffff',
                borderBottom: '1px solid #e0e0e0'
            }}>
                <h3 style={{
                    margin: 0,
                    color: '#333333',
                    fontSize: '18px',
                    fontWeight: '600'
                }}>
                    {seriesName || `${assetIdentifier || 'Price'} Chart`}
                </h3>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginLeft: 'auto'
                }}>
                    <label htmlFor={`${seriesId}-interval-select`} style={{
                        color: '#666666',
                        fontSize: '14px',
                        margin: 0
                    }}>
                        Interval:
                    </label>
                    <select
                        id={`${seriesId}-interval-select`}
                        value={selectedInterval}
                        onChange={e => setSelectedInterval(e.target.value)}
                        style={{
                            padding: '6px 12px',
                            background: '#ffffff',
                            color: '#333333',
                            border: '1px solid #d0d0d0',
                            borderRadius: '4px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#d0d0d0'}
                    >
                        {intervalOptions.map(option => (
                            <option key={option} value={option}>
                                {getIntervalLabel(option)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Chart Container */}
            <div
                ref={chartContainerRef}
                id={`chart-container-${seriesId}`}
                style={{
                    height: `${height}px`,
                    width: '100%',
                    flex: '1 1 auto',
                    minHeight: 0,
                    overflow: 'visible'
                }}
            ></div>
        </div>
    )
}

export default OHLCVCustomGUIChart
