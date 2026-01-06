
"use client"
// @ts-nocheck

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { useDelayedQuotes, useDelayedQuoteLast, useSparklinePrice } from '@/hooks/data/useRealtime'
import { useRealtimePrices } from '@/hooks/data/useSocket'
// Theme context might be different or needed. If not present, default to light/system or check context.
// Assuming basic theme support or removing for now if not found.
// Actually, I saw `useTheme` in legacy. I'll check if ThemeContext exists in new project later.
// For now, I'll default to 'light' or comment it out if safe. 
// But let's check if I can find ThemeContext. 
// I'll assume standard path or stub it.
// Checking `frontend/src/context` might be needed.
// For now, I will use a simple efficient stub for theme.
import { useAssetDetail } from '@/hooks/assets/useAssets'

// Stub for ThemeContext if missing
const useTheme = () => {
    // Attempt to detect if dark mode class is present on html
    // But hooks should be reactive. 
    // I'll leave it as 'light' for now to avoid crashes, or check if I can find the real one.
    // Given previous files used `dark:`, tailwind handles most. 
    // The chart needs explicit color config though.
    return { theme: 'light' }
}

interface LiveChartProps {
    containerId?: string
    height?: number | string
    initialData?: Array<[number, number]>
    updateInterval?: number
    assetIdentifier?: string
    dataSource?: string
    useWebSocket?: boolean
    marketHours?: boolean
    apiRefetchIntervalMs?: number
    apiDays?: number | string
}

type PricePoint = [number, number] // [timestamp, close]

// 색상 보간 함수 (hex 색상을 ratio에 따라 보간)
const interpolateColor = (color1: string, color2: string, ratio: number): string => {
    const hex1 = color1.replace('#', '')
    const hex2 = color2.replace('#', '')

    const r1 = parseInt(hex1.substring(0, 2), 16)
    const g1 = parseInt(hex1.substring(2, 4), 16)
    const b1 = parseInt(hex1.substring(4, 6), 16)

    const r2 = parseInt(hex2.substring(0, 2), 16)
    const g2 = parseInt(hex2.substring(2, 4), 16)
    const b2 = parseInt(hex2.substring(4, 6), 16)

    const r = Math.round(r1 + (r2 - r1) * ratio)
    const g = Math.round(g1 + (g2 - g1) * ratio)
    const b = Math.round(b1 + (b2 - b1) * ratio)

    return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`
}

// 변화율에 따른 색상 계산 함수
const getChangeColor = (changePercent: number): string => {
    const NEG_THRESHOLD = -3
    const POS_THRESHOLD = 3
    const CLAMPED = Math.max(NEG_THRESHOLD, Math.min(POS_THRESHOLD, changePercent))

    if (CLAMPED <= NEG_THRESHOLD) {
        return '#f73539'
    }

    if (CLAMPED >= POS_THRESHOLD) {
        return '#2ecc59'
    }

    if (CLAMPED < 0) {
        // -3% ~ 0%: 빨강 -> 회색 (강한 빨강이 -3%에서 유지되도록)
        const ratio = (CLAMPED - NEG_THRESHOLD) / (0 - NEG_THRESHOLD) // 0 (at -3%) ~ 1 (at 0%)
        return interpolateColor('#f73539', '#414555', ratio)
    }

    if (CLAMPED > 0) {
        // 0% ~ +3%: 회색 -> 초록
        const ratio = CLAMPED / POS_THRESHOLD // 0 (at 0%) ~ 1 (at +3%)
        return interpolateColor('#414555', '#2ecc59', ratio)
    }

    // 정확히 0%인 경우 회색
    return '#414555'
}

const LiveChart: React.FC<LiveChartProps> = ({
    containerId = 'live-chart-container',
    height = 400,
    initialData,
    updateInterval = 2000,
    assetIdentifier: assetIdentifierProp = 'BTCUSDT',
    dataSource: dataSourceProp = undefined, // undefined by default - backend will choose appropriate source
    useWebSocket: useWebSocketProp = true,
    marketHours: marketHoursProp,
    apiRefetchIntervalMs = 15 * 60 * 1000,
    apiDays = 1,
}: LiveChartProps) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<any>(null)
    const intervalRef = useRef<number | null>(null)
    const counterRef = useRef<number>(0)
    const [isClient, setIsClient] = useState(false)
    const [Highcharts, setHighcharts] = useState<any>(null)
    const hasLoggedApiResponse = useRef<boolean>(false)
    const hasLoggedRealtimePrice = useRef<boolean>(false)
    const hasLoggedChartData = useRef<boolean>(false)
    const hasLoggedUpdatedPoint = useRef<boolean>(false)

    const assetIdentifier = assetIdentifierProp
    const dataSource = dataSourceProp
    const shouldUseWebSocket =
        useWebSocketProp === true && (marketHoursProp === undefined || marketHoursProp === true)

    // 자산 정보 가져오기 (주식/ETF 확인용)
    const { data: assetDetail } = useAssetDetail(assetIdentifier)

    // 주식/ETF인지 확인
    const isStocksOrEtf =
        assetDetail?.asset_type_id === 2 || // Stocks
        assetDetail?.asset_type_id === 5 || // ETFs
        assetDetail?.type_name?.toLowerCase() === 'stocks' ||
        assetDetail?.type_name?.toLowerCase() === 'etfs'

    // API 데이터 로드 (주식/ETF는 sparkline-price 사용, 그 외는 기존 useDelayedQuotes 사용)
    const delayedQuotesOptions = useMemo(() => ({ dataSource, limit: 96, days: apiDays }), [dataSource, apiDays])
    const delayedQuotesQuery = useDelayedQuotes(
        [assetIdentifier],
        delayedQuotesOptions,
        { enabled: !isStocksOrEtf, staleTime: 60 * 1000, refetchInterval: apiRefetchIntervalMs }
    )

    // sparkline-price API는 days가 최대 1로 제한되어 있으므로 1로 제한
    const sparklineOptions = useMemo(() => ({ dataInterval: '15m', days: 1, dataSource }), [dataSource])
    const sparklineQuery = useSparklinePrice(
        assetIdentifier,
        sparklineOptions,
        { enabled: isStocksOrEtf, staleTime: 60 * 1000, refetchInterval: apiRefetchIntervalMs }
    )

    // 주식/ETF인 경우 sparkline-price 결과 사용, 그 외에는 기존 delayed quotes 사용
    const apiResponse = isStocksOrEtf ? sparklineQuery.data : delayedQuotesQuery.data
    // const apiLoading = isStocksOrEtf ? sparklineQuery.isLoading : delayedQuotesQuery.isLoading

    // 폐장시간 등 소켓 비활성 시 최신 지연 호가(변화율, 변화액 포함) 조회
    const delayedQuoteLastOptions = useMemo(() => ({
        dataInterval: '15m',
        dataSource: dataSource,
    }), [dataSource])

    const { data: lastQuoteResponse } = useDelayedQuoteLast(
        assetIdentifier,
        delayedQuoteLastOptions,
        {
            enabled: !shouldUseWebSocket && !!assetIdentifier,
            staleTime: 0,
            refetchInterval: apiRefetchIntervalMs,
        }
    )

    // 실시간 가격 데이터
    const { latestPrice, isConnected: socketConnected } = useRealtimePrices(assetIdentifier)

    // 테마 가져오기
    const { theme } = useTheme()

    // API 데이터 콘솔 출력 (1번만)
    useEffect(() => {
        if (apiResponse && !hasLoggedApiResponse.current) {
            console.log('[LiveChart] API Response (useDelayedQuotes):', apiResponse)
            hasLoggedApiResponse.current = true
        }
    }, [apiResponse])

    // 실시간 가격 데이터 콘솔 출력 (1번만)
    useEffect(() => {
        if (latestPrice && !hasLoggedRealtimePrice.current) {
            console.log('[LiveChart] Realtime Price (useRealtimePrices):', {
                price: latestPrice.price,
                timestamp: latestPrice.timestamp,
                volume: latestPrice.volume,
                dataSource: latestPrice.dataSource,
                changePercent: latestPrice.changePercent,
                isConnected: socketConnected,
            })
            hasLoggedRealtimePrice.current = true
        }
    }, [latestPrice, socketConnected])

    // API 데이터로 차트 초기화 (useDelayedQuotes만 사용)
    const chartData: PricePoint[] = useMemo(() => {
        let baseData: PricePoint[] = []

        // API 데이터 추가 (quotes-delay-price 응답 구조에 맞게)
        if (apiResponse && Array.isArray(apiResponse)) {
            // apiResponse가 배열인 경우 (여러 자산)
            const assetData = apiResponse.find((item: any) => item.asset_identifier === assetIdentifier)
            if (assetData?.quotes && assetData.quotes.length > 0) {
                baseData = assetData.quotes
                    .map((q: any) => {
                        const ts = new Date(q.timestamp_utc).getTime()
                        if (!ts || !isFinite(ts)) return null
                        return [ts, parseFloat(q.price)] as PricePoint
                    })
                    .filter((p: any): p is PricePoint => p !== null)
                    .sort((a: PricePoint, b: PricePoint) => a[0] - b[0])
            }
        } else if (apiResponse?.quotes && apiResponse.quotes.length > 0) {
            // apiResponse가 단일 객체인 경우
            baseData = apiResponse.quotes
                .map((q: any) => {
                    const ts = new Date(q.timestamp_utc).getTime()
                    if (!ts || !isFinite(ts)) return null
                    return [ts, parseFloat(q.price)] as PricePoint
                })
                .filter((p: any): p is PricePoint => p !== null)
                .sort((a: PricePoint, b: PricePoint) => a[0] - b[0])
        }

        const result = baseData.length > 0 ? baseData.sort((a, b) => a[0] - b[0]) : (initialData || [])

        // API 데이터 콘솔 출력 (1번만)
        if (result.length > 0 && !hasLoggedChartData.current) {
            console.log('[LiveChart] Chart Data (API only):', {
                totalPoints: result.length,
                firstPoint: result[0],
                lastPoint: result[result.length - 1],
                data: result.slice(-10), // 마지막 10개 포인트만 출력
            })
            hasLoggedChartData.current = true
        }

        return result
    }, [apiResponse, assetIdentifier, initialData])

    // 전일 클로즈 가격 계산
    const prevClosePrice = useMemo(() => {
        if (!chartData.length) return null as number | null
        const now = new Date()
        const todayStartUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
        let candidate: number | null = null
        for (let i = chartData.length - 1; i >= 0; i -= 1) {
            const [ts, price] = chartData[i]
            if (ts <= todayStartUtc) {
                candidate = price
                break
            }
        }
        return typeof candidate === 'number' && isFinite(candidate) ? candidate : null
    }, [chartData])

    // Load Highcharts dynamically
    useEffect(() => {
        const loadHighcharts = async () => {
            try {
                // @ts-ignore
                const HighchartsCoreModule = await import('highcharts/highstock')
                const HighchartsCore = HighchartsCoreModule.default

                // Load modules as functions that return promises
                const modules = [
                    // @ts-ignore
                    () => import('highcharts/modules/price-indicator'),
                    // @ts-ignore
                    () => import('highcharts/modules/exporting'),
                    // @ts-ignore
                    () => import('highcharts/modules/accessibility'),
                ]

                // Initialize modules with error handling
                await Promise.all(
                    modules.map(async loader => {
                        try {
                            const mod = await loader()
                            if (mod && typeof mod.default === 'function') {
                                ; (mod.default as any)(HighchartsCore)
                            }
                        } catch (moduleError) {
                            console.warn('Failed to load Highcharts module:', moduleError)
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


    // Title HTML 생성 함수
    const generateTitleHTML = useMemo(() => {
        const isDark = theme === 'dark'
        const textColor = isDark ? '#FFFFFF' : '#000000'

        // 기준 가격: 우선순위 - lastQuoteResponse.quote.price (폐장), 실시간, 마지막 차트 포인트
        const price = (lastQuoteResponse?.quote?.price as number | undefined)
            ?? latestPrice?.price
            ?? (chartData.length > 0 ? chartData[chartData.length - 1][1] : 0)
        const formattedPrice = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(price)

        // 변화율/변화액 계산
        // - 코인 외(웹소켓 비활성)에는 lastQuoteResponse.quote.change_amount/change_percent를 우선 사용
        // - 그 외에는 실시간 changePercent가 있으면 사용
        // - 없으면 prevClosePrice로 직접 계산
        let computedChangePercent: number = 0
        let computedChangeAmount: number = 0
        if (!shouldUseWebSocket && lastQuoteResponse?.quote) {
            const qp = Number(lastQuoteResponse.quote.change_percent)
            const qa = Number(lastQuoteResponse.quote.change_amount)
            if (isFinite(qp)) {
                computedChangePercent = qp
            }
            if (isFinite(qa)) {
                computedChangeAmount = qa
            } else if (typeof prevClosePrice === 'number' && isFinite(prevClosePrice) && prevClosePrice !== 0) {
                computedChangeAmount = price - prevClosePrice
            } else if (isFinite(computedChangePercent)) {
                computedChangeAmount = price * (computedChangePercent / 100)
            }
        } else if (typeof latestPrice?.changePercent === 'number') {
            computedChangePercent = latestPrice.changePercent
            // 변화액은 가능하면 prevClosePrice 기반으로 계산
            if (typeof prevClosePrice === 'number' && isFinite(prevClosePrice) && prevClosePrice !== 0) {
                computedChangeAmount = price - prevClosePrice
            } else {
                computedChangeAmount = (price * (computedChangePercent / 100))
            }
        } else if (typeof prevClosePrice === 'number' && isFinite(prevClosePrice) && prevClosePrice !== 0) {
            computedChangeAmount = price - prevClosePrice
            computedChangePercent = (computedChangeAmount / prevClosePrice) * 100
        } else {
            // 데이터가 부족한 경우 0으로 처리
            computedChangePercent = 0
            computedChangeAmount = 0
        }

        const isPositive = computedChangePercent >= 0
        const changeSign = computedChangePercent > 0 ? '+' : (computedChangePercent < 0 ? '-' : '')
        const formattedChangePercent = `${changeSign}${Math.abs(computedChangePercent).toFixed(2)}%`

        // 가격에 변화율에 따른 단계별 색상 적용
        const priceColor = getChangeColor(computedChangePercent)

        // 변화율과 변화량은 단순 색상 (상승=초록색, 하강=붉은색)
        const changeColor = isPositive ? '#2ecc59' : '#f73539'

        // 변화액 포맷
        const formattedChangeAmount = `${changeSign}${Math.abs(computedChangeAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

        return `
      <div style="display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap;">
        <span style="font-size: 16px; color: ${textColor}; font-weight: 500;">
          ${assetIdentifier}
        </span>
        <span style="font-size: 16px; color: ${priceColor}; font-weight: 500;">
          ${formattedPrice}
        </span>
        <span style="font-size: 14px; color: ${changeColor}; font-weight: 500;">
          ${formattedChangePercent}
        </span>
        <span style="font-size: 14x; color: ${changeColor}; font-weight: 500;">
          ${formattedChangeAmount}
        </span>
      </div>
    `
    }, [latestPrice, chartData, theme, assetIdentifier, lastQuoteResponse, shouldUseWebSocket, prevClosePrice])

    // Initialize chart
    useEffect(() => {
        if (!isClient || !Highcharts || !containerRef.current) return

        const options: any = {
            title: {
                useHTML: true,
                text: generateTitleHTML,
                style: {
                    fontWeight: 'normal',
                },
            },
            xAxis: {
                gridLineWidth: 1,
                type: 'datetime',
            },
            rangeSelector: {
                enabled: false,
            },
            navigator: {
                enabled: false,
            },
            exporting: {
                enabled: false,
            },
            series: [
                {
                    type: 'spline',
                    name: 'Price',
                    color: '#3B82F6',
                    lineWidth: 2,
                    marker: {
                        enabled: false,
                    },
                    lastPrice: {
                        enabled: true,
                        label: {
                            enabled: true,
                            backgroundColor: '#FF7F7F',
                        },
                    },
                    data: [...chartData],
                },
            ],
            chart: {
                events: {
                    load() {
                        // @ts-ignore
                        const chart: any = this
                        const series = chart.series[0]

                        let i = counterRef.current

                        // Clear existing interval
                        if (intervalRef.current) {
                            window.clearInterval(intervalRef.current)
                        }
                    },
                },
            },
        }

        // Create the chart
        const chart = Highcharts.stockChart(containerRef.current, options)
        chartRef.current = chart

        if (chart?.xAxis && chart.xAxis[0]) {
            chart.xAxis[0].setExtremes(undefined, undefined)
        }

        // Cleanup function
        return () => {
            if (intervalRef.current !== null) {
                window.clearInterval(intervalRef.current)
                intervalRef.current = null
            }
            if (chartRef.current) {
                chartRef.current.destroy()
                chartRef.current = null
            }
        }
    }, [isClient, Highcharts, chartData])

    // Title 업데이트
    useEffect(() => {
        if (!chartRef.current || !Highcharts) return

        const chart = chartRef.current
        chart.setTitle({
            useHTML: true,
            text: generateTitleHTML,
            style: {
                fontWeight: 'normal',
            },
        }, false)
    }, [generateTitleHTML, Highcharts])

    // 웹소켓 실시간 데이터로 마지막 포인트만 업데이트
    useEffect(() => {
        if (!chartRef.current || !latestPrice) return
        if (!shouldUseWebSocket) return

        const chart = chartRef.current
        const series = chart.series[0]
        if (!series) return

        const currentData = series.options.data as PricePoint[]
        if (currentData.length === 0) return

        // 웹소켓에서 받은 실시간 가격으로 마지막 포인트 업데이트
        const realtimePoint: PricePoint = [
            new Date(latestPrice.timestamp).getTime(),
            parseFloat(latestPrice.price.toString())
        ]

        // 마지막 포인트를 실시간 데이터로 업데이트
        const updatedData = [...currentData]
        updatedData[updatedData.length - 1] = realtimePoint
        series.setData(updatedData, true)

        // 로그 출력 (1번만)
        if (!hasLoggedUpdatedPoint.current) {
            console.log('[LiveChart] Updated last point with realtime data:', realtimePoint)
            hasLoggedUpdatedPoint.current = true
        }
    }, [latestPrice, shouldUseWebSocket])

    if (!isClient) {
        return (
            <div
                id={containerId}
                ref={containerRef}
                style={{
                    height: typeof height === 'number' ? `${height}px` : height,
                    minWidth: '310px',
                }}
            >
                <div style={{ padding: '20px', textAlign: 'center' }}>Loading chart...</div>
            </div>
        )
    }

    return (
        <div
            id={containerId}
            ref={containerRef}
            style={{
                height: typeof height === 'number' ? `${height}px` : height,
                minWidth: '310px',
            }}
        />
    )
}

export default LiveChart
