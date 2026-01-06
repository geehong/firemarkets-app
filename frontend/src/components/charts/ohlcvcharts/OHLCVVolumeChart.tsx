"use client"

// @ts-nocheck

import React, { useEffect, useRef, useState } from 'react'
import { useOhlcvData as useOhlcv } from '@/hooks/assets/useAssets'
import { useIntradayOhlcv as useIntraday, useDelayedQuotes } from '@/hooks/data/useRealtime'

interface OHLCVData {
    timestamp_utc: string
    open_price: string | number
    high_price: string | number
    low_price: string | number
    close_price: string | number
    volume: string | number
}

interface OHLCVVolumeChartProps {
    assetIdentifier?: string
    dataInterval?: string
    dataUrl?: string
    height?: number
    title?: string
    externalOhlcvData?: OHLCVData[] | null
    useIntradayData?: boolean
}

const OHLCVVolumeChart: React.FC<OHLCVVolumeChartProps> = ({
    assetIdentifier,
    dataInterval = '1d',
    dataUrl,
    height = 600,
    title = 'Candlestick and Volume',
    externalOhlcvData = null,
    useIntradayData = false
}) => {
    const [HighchartsReact, setHighchartsReact] = useState<any>(null)
    const [Highcharts, setHighcharts] = useState<any>(null)
    const [isClient, setIsClient] = useState(false)
    const [chartOptions, setChartOptions] = useState<any>(null)
    const [chartData, setChartData] = useState<number[][] | null>(null)
    const [volumeData, setVolumeData] = useState<Array<{ x: number; y: number; color: string; labelColor: string }> | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [selectedInterval, setSelectedInterval] = useState<string>(dataInterval || '1d')
    const chartRef = useRef<any>(null)

    // Load Highcharts modules
    useEffect(() => {
        const loadHighcharts = async () => {
            try {
                if (typeof window === 'undefined') {
                    return
                }

                const [HighchartsReactModule, HighchartsCoreModule] = await Promise.all([
                    import('highcharts-react-official'),
                    import('highcharts/highstock')
                ])

                const HighchartsCore = HighchartsCoreModule.default

                // Load all required modules
                const modules = [
                    () => import('highcharts/modules/exporting'),
                    () => import('highcharts/modules/accessibility'),
                    () => import('highcharts/modules/drag-panes'),
                    () => import('highcharts/modules/full-screen'),
                    () => import('highcharts/modules/annotations-advanced'),
                    () => import('highcharts/modules/price-indicator'),
                    () => import('highcharts/modules/stock-tools'),
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

                // Load indicators module first (required for ichimoku)
                try {
                    const indicatorsModule = await import('highcharts/indicators/indicators')
                    if (typeof indicatorsModule.default === 'function') {
                        ; (indicatorsModule.default as any)(HighchartsCore)
                    }
                } catch (err) {
                    console.warn('Indicators module load warning:', err)
                }

                // Load ichimoku indicator
                try {
                    const ichimokuModule = await import('highcharts/indicators/ichimoku-kinko-hyo')
                    if (typeof ichimokuModule.default === 'function') {
                        ; (ichimokuModule.default as any)(HighchartsCore)
                    }
                } catch (err) {
                    console.warn('Ichimoku module load warning:', err)
                }

                setHighchartsReact(() => HighchartsReactModule.default)
                setHighcharts(HighchartsCore)
                setIsClient(true)
            } catch (error) {
                console.error('Failed to load Highcharts:', error)
            }
        }

        loadHighcharts()
    }, [])

    // dataInterval prop이 변경되면 selectedInterval도 업데이트
    useEffect(() => {
        if (dataInterval && dataInterval !== selectedInterval) {
            setSelectedInterval(dataInterval)
        }
    }, [dataInterval])

    // 시간대별 API 엔드포인트 매핑
    // 분봉/시봉: intraday API 사용, 일봉/주봉/월봉: daily API 사용
    const intradayIntervals = ['1m', '5m', '15m', '30m', '1h', '4h']
    const dailyIntervals = ['1d', '1w', '1M']

    const isIntradayInterval = intradayIntervals.includes(selectedInterval)
    const isDailyInterval = dailyIntervals.includes(selectedInterval)

    // 데이터 소스 선택: useIntradayData prop이 있으면 그것을 우선, 없으면 interval 기반으로 판단
    const isTimeData = useIntradayData !== undefined ? useIntradayData : isIntradayInterval
    const isDailyData = useIntradayData !== undefined ? !useIntradayData : isDailyInterval

    // limit 계산
    const getIntradayLimit = (interval: string): number => {
        switch (interval) {
            case '1m': return 1440 * 2   // 2880 (2일치)
            case '5m': return 288 * 7     // 2016 (7일치)
            case '15m': return 96 * 14    // 1344 (14일치)
            case '30m': return 48 * 30    // 1440 (30일치)
            case '1h': return 24 * 120   // 2880 (120일치)
            case '4h': return 6 * 360    // 2160 (360일치)
            default: return 1000
        }
    }

    const getDailyLimit = (interval: string): number => {
        switch (interval) {
            case '1d': return 365 * 10    // 10년치 일봉 (3650)
            case '1w': return 52 * 20     // 20년치 주봉 (1040)
            case '1M': return 12 * 30     // 30년치 월봉 (360)
            default: return 50000    // 백엔드 기본값
        }
    }

    const intradayLimit = getIntradayLimit(selectedInterval)
    const dailyLimit = getDailyLimit(selectedInterval)

    // intraday 데이터 (분봉, 시봉)
    const intradayOptions = { dataInterval: selectedInterval, days: 1, limit: intradayLimit }

    // 로그: 실제 전달되는 옵션 확인
    useEffect(() => {
        if (isIntradayInterval && assetIdentifier) {
            console.log('[OHLCVVolumeChart] Intraday API Request Options:', {
                assetIdentifier,
                ...intradayOptions,
                willRequest: true
            })
        }
    }, [isIntradayInterval, assetIdentifier, selectedInterval, intradayLimit])

    const { data: timeData, isLoading: timeLoading, error: timeError } = useIntraday(
        assetIdentifier || '',
        intradayOptions,
        {
            enabled: !!assetIdentifier && isIntradayInterval,
            staleTime: 60_000,
            retry: 3
        } as any
    )

    // Intraday API 호출 확인 로그 (OHLCVCustomGUIChart와 동일하게 수정)
    // 주의: timeLoading, timeData, timeError를 dependency에서 제거하여 무한 루프 방지
    useEffect(() => {
        if (isIntradayInterval && assetIdentifier) {
            console.log('[OHLCVVolumeChart] Intraday API 호출 상태:', {
                assetIdentifier,
                selectedInterval,
                isIntradayInterval,
                enabled: !!assetIdentifier && isIntradayInterval,
                intradayOptions: { dataInterval: selectedInterval, days: 1, limit: intradayLimit },
                isLoading: timeLoading,
                hasData: !!timeData,
                error: timeError
            })
        }
    }, [isIntradayInterval, assetIdentifier, selectedInterval, intradayLimit])

    // Fix: options is 2nd arg, queryOptions is 3rd arg
    const { data: delayedData, isLoading: delayedLoading, error: delayedError } = useDelayedQuotes(
        assetIdentifier ? [assetIdentifier] : [],
        {}, // options
        { enabled: !!assetIdentifier && isIntradayInterval && selectedInterval === '15m', staleTime: 60_000, retry: 3 } as any // queryOptions
    )

    // daily 데이터 (일봉, 주봉, 월봉)
    const { data: dailyData, isLoading: dailyLoading, error: dailyError } = useOhlcv(
        assetIdentifier || '',
        { dataInterval: selectedInterval, limit: dailyLimit },
        { enabled: !!assetIdentifier && isDailyInterval, staleTime: 60_000, retry: 3 } as any
    )

    const apiData = isIntradayInterval ? timeData : dailyData
    const apiLoading = isIntradayInterval ? timeLoading : dailyLoading
    const apiError = isIntradayInterval ? timeError : dailyError

    // 로그 출력
    useEffect(() => {
        console.log('[OHLCVVolumeChart] Interval & Limit Settings:', {
            selectedInterval,
            isIntradayInterval,
            isDailyInterval,
            intradayLimit: isIntradayInterval ? intradayLimit : 'N/A',
            dailyLimit: isDailyInterval ? dailyLimit : 'N/A',
            assetIdentifier
        })
    }, [selectedInterval, isIntradayInterval, isDailyInterval, intradayLimit, dailyLimit, assetIdentifier])

    // 데이터 변환 및 설정
    useEffect(() => {
        if (externalOhlcvData && externalOhlcvData.length > 0) {
            // 먼저 모든 데이터를 변환하고 정렬
            const processedData = externalOhlcvData
                .map((r) => ({
                    timestamp: new Date(r.timestamp_utc).getTime(),
                    open: parseFloat(String(r.open_price)) || 0,
                    high: parseFloat(String(r.high_price)) || 0,
                    low: parseFloat(String(r.low_price)) || 0,
                    close: parseFloat(String(r.close_price)) || 0,
                    volume: parseFloat(String(r.volume)) || 0
                }))
                .filter((p) => p.timestamp > 0 && Number.isFinite(p.timestamp))
                .sort((a, b) => a.timestamp - b.timestamp)

            // 정렬된 데이터에서 OHLC와 Volume 분리
            const ohlc = processedData.map(p => [p.timestamp, p.open, p.high, p.low, p.close])

            let previousCandleClose = 0
            const volume = processedData.map((p) => {
                const color = p.close > previousCandleClose ? '#466742' : '#a23f43'
                const labelColor = p.close > previousCandleClose ? '#51a958' : '#ea3d3d'
                previousCandleClose = p.close
                return {
                    x: p.timestamp,
                    y: p.volume,
                    color,
                    labelColor
                }
            }).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.y >= 0)

            console.log('[OHLCVVolumeChart] External data processed:', {
                ohlcCount: ohlc.length,
                volumeCount: volume.length,
                firstOHLC: ohlc[0],
                lastOHLC: ohlc[ohlc.length - 1]
            })

            setChartData(ohlc)
            setVolumeData(volume)
            setError(null)
            return
        }

        if (apiError) {
            const message = `차트 데이터를 불러오는데 실패했습니다: ${(apiError as Error)?.message || apiError}`
            setError(message)
            return
        }

        if (!assetIdentifier) {
            // assetIdentifier가 없으면 dataUrl 사용 (fallback)
            if (dataUrl) {
                fetch(dataUrl)
                    .then(response => response.json())
                    .then(data => {
                        // 원본 JSON 형식: [[timestamp, open, high, low, close, volume], ...]
                        const processedData = data
                            .map((item: number[]) => ({
                                timestamp: item[0],
                                open: item[1],
                                high: item[2],
                                low: item[3],
                                close: item[4],
                                volume: item[5]
                            }))
                            .filter((p: any) => p.timestamp > 0 && Number.isFinite(p.timestamp))
                            .sort((a: any, b: any) => a.timestamp - b.timestamp)

                        const ohlc = processedData.map((p: any) => [p.timestamp, p.open, p.high, p.low, p.close])

                        let previousCandleClose = 0
                        const volume = processedData.map((p: any) => {
                            const color = p.close > previousCandleClose ? '#466742' : '#a23f43'
                            const labelColor = p.close > previousCandleClose ? '#51a958' : '#ea3d3d'
                            previousCandleClose = p.close
                            return {
                                x: p.timestamp,
                                y: p.volume,
                                color,
                                labelColor
                            }
                        }).filter((p: any) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.y >= 0)

                        console.log('[OHLCVVolumeChart] DataUrl data processed:', {
                            ohlcCount: ohlc.length,
                            volumeCount: volume.length,
                            firstOHLC: ohlc[0],
                            lastOHLC: ohlc[ohlc.length - 1]
                        })

                        setChartData(ohlc)
                        setVolumeData(volume)
                        setError(null)
                    })
                    .catch(err => {
                        setError(`데이터 로드 실패: ${err.message}`)
                    })
            } else {
                setError('assetIdentifier 또는 dataUrl이 필요합니다.')
            }
            return
        }

        let rows: any[] = []
        if (isIntradayInterval && selectedInterval === '15m' && delayedData) {
            rows = (delayedData as any)?.quotes || []
        } else {
            rows = (apiData as any)?.data || apiData || []
        }

        console.log('[OHLCVVolumeChart] Data loading state:', {
            assetIdentifier,
            selectedInterval,
            isIntradayInterval,
            isDailyInterval,
            intradayLimit: isIntradayInterval ? intradayLimit : 'N/A',
            dailyLimit: isDailyInterval ? dailyLimit : 'N/A',
            apiLoading,
            apiError,
            apiDataExists: !!apiData,
            apiDataType: Array.isArray(apiData) ? 'array' : (apiData?.data ? 'object with data' : 'other'),
            rowsCount: rows?.length || 0,
            delayedDataExists: !!delayedData
        })

        if (rows && rows.length > 0) {
            // 먼저 모든 데이터를 변환하고 정렬
            const processedData = rows
                .map((item: any) => {
                    let timestamp: number
                    let open: number, high: number, low: number, close: number, volume: number

                    if (isIntradayInterval && selectedInterval === '15m') {
                        timestamp = new Date(String(item.timestamp_utc)).getTime()
                        const price = parseFloat(String(item.price)) || 0
                        open = high = low = close = price
                        volume = parseFloat(String(item.volume)) || 0
                    } else if (isIntradayInterval) {
                        timestamp = new Date(String(item.timestamp || item.timestamp_utc)).getTime()
                        open = parseFloat(String(item.open || item.open_price)) || 0
                        high = parseFloat(String(item.high || item.high_price)) || 0
                        low = parseFloat(String(item.low || item.low_price)) || 0
                        close = parseFloat(String(item.close || item.close_price)) || 0
                        volume = parseFloat(String(item.volume)) || 0
                    } else {
                        timestamp = new Date(String(item.timestamp_utc)).getTime()
                        open = parseFloat(String(item.open_price)) || 0
                        high = parseFloat(String(item.high_price)) || 0
                        low = parseFloat(String(item.low_price)) || 0
                        close = parseFloat(String(item.close_price)) || 0
                        volume = parseFloat(String(item.volume)) || 0
                    }

                    return {
                        timestamp,
                        open,
                        high,
                        low,
                        close,
                        volume
                    }
                })
                .filter((p) => p.timestamp > 0 && Number.isFinite(p.timestamp))
                .sort((a, b) => a.timestamp - b.timestamp)

            // 정렬된 데이터에서 OHLC와 Volume 분리
            const ohlc = processedData.map(p => [p.timestamp, p.open, p.high, p.low, p.close])

            let previousCandleClose = 0
            const vol = processedData.map((p) => {
                const color = p.close > previousCandleClose ? '#466742' : '#a23f43'
                const labelColor = p.close > previousCandleClose ? '#51a958' : '#ea3d3d'
                previousCandleClose = p.close
                return {
                    x: p.timestamp,
                    y: p.volume,
                    color,
                    labelColor
                }
            }).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.y >= 0)

            console.log('[OHLCVVolumeChart] API data processed:', {
                assetIdentifier,
                selectedInterval,
                ohlcCount: ohlc.length,
                volumeCount: vol.length,
                firstOHLC: ohlc[0],
                lastOHLC: ohlc[ohlc.length - 1],
                apiDataType: isIntradayInterval ? 'intraday' : 'daily',
                requestedLimit: isIntradayInterval ? intradayLimit : dailyLimit
            })

            setChartData(ohlc)
            setVolumeData(vol)
            setError(null)
        } else if (!apiLoading) {
            setError('차트 데이터가 없습니다.')
        }
    }, [assetIdentifier, selectedInterval, externalOhlcvData, apiData, apiLoading, apiError, isIntradayInterval, isDailyInterval, delayedData, useIntradayData, dataUrl])

    // Create chart options when data is ready
    useEffect(() => {
        if (!isClient || !Highcharts || !chartData || chartData.length === 0) return

        try {
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

            // Create chart options
            const options = {
                rangeSelector: {
                    enabled: true,
                    selected: 2,
                    buttons: [
                        {
                            type: 'month',
                            count: 1,
                            text: '1m'
                        },
                        {
                            type: 'month',
                            count: 3,
                            text: '3m'
                        },
                        {
                            type: 'month',
                            count: 6,
                            text: '6m'
                        },
                        {
                            type: 'ytd',
                            text: 'YTD'
                        },
                        {
                            type: 'year',
                            count: 1,
                            text: '1y'
                        },
                        {
                            type: 'all',
                            text: 'All'
                        }
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
                title: {
                    text: title
                },
                plotOptions: {
                    series: {
                        marker: {
                            enabled: false,
                            states: {
                                hover: {
                                    enabled: false
                                }
                            }
                        }
                    },
                    candlestick: {
                        color: '#ea3d3d',
                        upColor: '#51a958',
                        upLineColor: '#51a958',
                        lineColor: '#ea3d3d'
                    }
                },
                xAxis: {
                    gridLineWidth: 1,
                    crosshair: {
                        snap: false
                    }
                },
                yAxis: [
                    {
                        height: '70%',
                        crosshair: {
                            snap: false
                        },
                        accessibility: {
                            description: 'price'
                        }
                    },
                    {
                        top: '70%',
                        height: '30%',
                        accessibility: {
                            description: 'volume'
                        }
                    }
                ],
                tooltip: {
                    shared: true,
                    split: false,
                    fixed: true
                },
                series: [
                    {
                        type: 'candlestick',
                        id: 'aapl',
                        name: assetIdentifier ? `${assetIdentifier} Stock Price` : 'AAPL Stock Price',
                        data: chartData,
                        tooltip: {
                            valueDecimals: 2,
                            pointFormat:
                                '<b>O</b> <span style="color: {point.color}">' +
                                '{point.open} </span>' +
                                '<b>H</b> <span style="color: {point.color}">' +
                                '{point.high}</span><br/>' +
                                '<b>L</b> <span style="color: {point.color}">{point.low} ' +
                                '</span>' +
                                '<b>C</b> <span style="color: {point.color}">' +
                                '{point.close}</span><br/>'
                        }
                    },
                    {
                        type: 'column',
                        name: 'Volume',
                        data: volumeData || [],
                        yAxis: 1,
                        borderRadius: 0,
                        groupPadding: 0,
                        pointPadding: 0,
                        tooltip: {
                            pointFormat:
                                '<b>Volume</b> <span style="color: ' +
                                '{point.labelColor}">{point.y}</span><br/>'
                        }
                    },
                    {
                        type: 'ikh',
                        linkedTo: 'aapl',
                        tooltip: {
                            pointFormat: `<br/>
                    <span style="color: #666666;">IKH</span>
                    <br/>
                    Tenkan-sen: <span
                    style="color:{series.options.tenkanLine.styles.lineColor}">
                    {point.tenkanSen:.3f}</span><br/>
                    Kijun-sen: <span
                    style="color:{series.options.kijunLine.styles.lineColor}">
                    {point.kijunSen:.3f}</span><br/>
                    Chikou span: <span
                    style="color:{series.options.chikouLine.styles.lineColor}">
                    {point.chikouSpan:.3f}</span><br/>
                    Senkou span A: <span
                    style="color:{series.options.senkouSpanA.styles.lineColor}">
                    {point.senkouSpanA:.3f}</span><br/>
                    Senkou span B: <span
                    style="color:{series.options.senkouSpanB.styles.lineColor}">
                    {point.senkouSpanB:.3f}</span><br/>`
                        },
                        tenkanLine: {
                            styles: {
                                lineColor: '#12dbd1'
                            }
                        },
                        kijunLine: {
                            styles: {
                                lineColor: '#de70fa'
                            }
                        },
                        chikouLine: {
                            styles: {
                                lineColor: '#728efd'
                            }
                        },
                        senkouSpanA: {
                            styles: {
                                lineColor: '#2ad156'
                            }
                        },
                        senkouSpanB: {
                            styles: {
                                lineColor: '#fca18d'
                            }
                        },
                        senkouSpan: {
                            color: 'rgba(255, 255, 255, 0.3)',
                            negativeColor: 'rgba(237, 88, 71, 0.2)'
                        }
                    }
                ]
            }

            setChartOptions(options)
        } catch (error) {
            console.error('Failed to create chart options:', error)
        }
    }, [isClient, Highcharts, chartData, volumeData, title, assetIdentifier])

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

    if (!isClient || !HighchartsReact || !Highcharts) {
        return (
            <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
                <div style={{ color: '#666666' }}>Loading chart...</div>
            </div>
        )
    }

    if (apiLoading || (assetIdentifier && !chartData)) {
        return (
            <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
                <div style={{ color: '#666666' }}>Loading chart data...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
                <div style={{ color: '#ea3d3d' }}>{error}</div>
            </div>
        )
    }

    if (!chartData || chartData.length === 0 || !chartOptions) {
        return (
            <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
                <div style={{ color: '#666666' }}>Preparing chart...</div>
            </div>
        )
    }

    // Add height to chart options
    const finalOptions = {
        ...chartOptions,
        chart: {
            ...(chartOptions.chart || {}),
            height,
            backgroundColor: '#ffffff'
        }
    }

    // Interval labels
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

    const intervalOptions = [
        '1m', '5m', '15m', '30m',
        '1h', '4h', '1d', '1w', '1M'
    ]

    return (
        <div style={{ background: '#ffffff' }}>
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
                    fontSize: '1em',
                    marginRight: 'auto',
                    paddingLeft: '10px'
                }}>
                    {title}
                </h3>

                <div style={{
                    display: 'flex',
                    gap: '5px',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end'
                }}>
                    {intervalOptions.map((interval) => (
                        <button
                            key={interval}
                            onClick={() => setSelectedInterval(interval)}
                            style={{
                                padding: '5px 10px',
                                borderRadius: '4px',
                                border: '1px solid #e0e0e0',
                                background: selectedInterval === interval ? '#3b82f6' : '#ffffff',
                                color: selectedInterval === interval ? '#ffffff' : '#666666',
                                cursor: 'pointer',
                                fontSize: '0.85em',
                                transition: 'all 0.2s',
                                fontWeight: selectedInterval === interval ? 'bold' : 'normal'
                            }}
                        >
                            {getIntervalLabel(interval)}
                        </button>
                    ))}
                </div>
            </div>

            <HighchartsReact
                highcharts={Highcharts}
                constructorType={'stockChart'}
                options={finalOptions}
                ref={chartRef}
                containerProps={{ style: { height: '100%', width: '100%' } }}
            />
        </div>
    )
}

export default OHLCVVolumeChart
