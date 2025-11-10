"use client"

// @ts-nocheck

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { useDelayedQuotes } from '@/hooks/useRealtime'
import { useRealtimePrices } from '@/hooks/useSocket'

interface LiveChartProps {
  containerId?: string
  height?: number | string
  initialData?: Array<[number, number]>
  updateInterval?: number
}

type PricePoint = [number, number] // [timestamp, close]

const LiveChart: React.FC<LiveChartProps> = ({
  containerId = 'live-chart-container',
  height = 400,
  initialData,
  updateInterval = 100,
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

  // 테스트용: BTCUSDT 하드코딩
  const assetIdentifier = 'BTCUSDT'
  const dataSource = 'binance' // 암호화폐이므로 binance 사용

  // Default initial data - convert to [timestamp, close] forma

  // API 데이터 로드 (지연 데이터) - 24*4 = 96개 포인트 (마지막 1일치, 15분 간격)
  const { data: apiResponse, isLoading: apiLoading } = useDelayedQuotes(
    [assetIdentifier],
    { dataSource, limit: 96 },
    { enabled: true, staleTime: 60 * 1000 }
  )

  // 실시간 가격 데이터
  const { latestPrice, isConnected: socketConnected } = useRealtimePrices(assetIdentifier)

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

  // 전일 클로즈 가격 계산 (MiniPriceChart.tsx 참조)
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
        const [
          { default: HighchartsCore },
          { default: PriceIndicator },
          { default: Exporting },
          { default: Accessibility },
        ] = await Promise.all([
          // @ts-ignore
          import('highcharts/highstock'),
          // @ts-ignore
          import('highcharts/modules/price-indicator'),
          // @ts-ignore
          import('highcharts/modules/exporting'),
          // @ts-ignore
          import('highcharts/modules/accessibility'),
        ])

        // Initialize modules
        if (typeof PriceIndicator === 'function') {
          PriceIndicator(HighchartsCore)
        }
        if (typeof Exporting === 'function') {
          Exporting(HighchartsCore)
        }
        if (typeof Accessibility === 'function') {
          Accessibility(HighchartsCore)
        }

        setHighcharts(HighchartsCore)
        setIsClient(true)
      } catch (error) {
        console.error('Failed to load Highcharts:', error)
      }
    }

    loadHighcharts()
  }, [])

  // Helper function to get new point - similar to original structure
  const getNewPoint = (i: number, data: PricePoint[]): PricePoint => {
    const lastPoint = data[data.length - 1]

    // Add new point every 10 iterations
    if (i === 0 || i % 10 === 0) {
      return [
        lastPoint[0] + 60000, // Add 1 minute
        lastPoint[1], // close = previous close
      ]
    }

    // Modify last data point
    const newClose = Highcharts?.correctFloat
      ? Highcharts.correctFloat(
          lastPoint[1] + Highcharts.correctFloat(Math.random() - 0.5, 2),
          4
        )
      : Number((lastPoint[1] + (Math.random() - 0.5)).toFixed(4))

    return [
      lastPoint[0], // same timestamp
      newClose, // close
    ]
  }

  // Initialize chart
  useEffect(() => {
    if (!isClient || !Highcharts || !containerRef.current) return

    const options: any = {
      title: {
        text: 'Dynamic data in Highcharts Stock',
      },
      xAxis: {
        overscroll: 500000,
        range: 4 * 200000,
        gridLineWidth: 1,
      },
      rangeSelector: {
        buttons: [
          {
            type: 'minute',
            count: 15,
            text: '15m',
          },
          {
            type: 'hour',
            count: 1,
            text: '1h',
          },
          {
            type: 'all',
            count: 1,
            text: 'All',
          },
        ],
        selected: 2,
        inputEnabled: false,
      },
      navigator: {
        series: {
          color: '#000000',
        },
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

            // 실제 데이터로 차트 업데이트는 useEffect에서 처리
            // interval은 제거 (실시간 소켓 데이터로 대체)
          },
        },
      },
    }

    // Create the chart
    const chart = Highcharts.stockChart(containerRef.current, options)
    chartRef.current = chart

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

  // 웹소켓 실시간 데이터로 마지막 포인트만 업데이트
  useEffect(() => {
    if (!chartRef.current || !latestPrice) return

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
  }, [latestPrice])

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
