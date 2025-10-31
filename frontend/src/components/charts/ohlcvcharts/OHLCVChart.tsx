"use client"

// @ts-nocheck

import React, { useEffect, useRef, useState } from 'react'
import { useOhlcv, useIntraday, useDelayedQuotes } from '@/hooks'

interface OHLCVData {
  timestamp_utc: string
  open_price: string | number
  high_price: string | number
  low_price: string | number
  close_price: string | number
  volume: string | number
}

interface OHLCVChartProps {
  assetIdentifier: string
  dataInterval?: string
  height?: number
  showVolume?: boolean
  showRangeSelector?: boolean
  showExporting?: boolean
  title?: string
  subtitle?: string
  backgroundColor?: string
  volumeColor?: string
  volumeOpacity?: number
  onDataLoad?: (data: { ohlcData: number[][]; volumeData: number[][]; totalCount: number }) => void
  onError?: (error: string) => void
  customOptions?: Record<string, unknown>
  externalOhlcvData?: OHLCVData[] | null
  useIntradayData?: boolean
}

const OHLCVChart: React.FC<OHLCVChartProps> = ({
  assetIdentifier,
  dataInterval = '1d',
  height = 600,
  showVolume = true,
  showRangeSelector = true,
  showExporting = true,
  title,
  subtitle = 'OHLCV Data',
  backgroundColor = '#fff',
  volumeColor = '#7cb5ec',
  volumeOpacity = 0.7,
  onDataLoad,
  onError,
  customOptions = {},
  externalOhlcvData = null,
  useIntradayData = false
}) => {
  const [HighchartsReact, setHighchartsReact] = useState<any>(null)
  const [Highcharts, setHighcharts] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)
  const chartRef = useRef<any>(null)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  const [chartData, setChartData] = useState<number[][] | null>(null)
  const [volumeData, setVolumeData] = useState<number[][] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadHighcharts = async () => {
      try {
        // @ts-ignore
        const [HighchartsReactModule, HighchartsCoreModule] = await Promise.all([
          // @ts-ignore
          import('highcharts-react-official'),
          // @ts-ignore
          import('highcharts/highstock')
        ])

        const HighchartsCore = HighchartsCoreModule.default

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
          () => import('highcharts/modules/stock-tools'),
          // @ts-ignore
          () => import('highcharts/modules/heikinashi'),
          // @ts-ignore
          () => import('highcharts/modules/hollowcandlestick')
        ]

        await Promise.all(
          modules.map(async loader => {
            try {
              const mod = await loader()
              if (typeof mod.default === 'function') {
                ;(mod.default as any)(HighchartsCore)
              }
            } catch {}
          })
        )

        setHighchartsReact(() => HighchartsReactModule.default)
        setHighcharts(HighchartsCore)
        setIsClient(true)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to load Highcharts', e)
      }
    }

    loadHighcharts()
  }, [])

  // 모바일 감지
  useEffect(() => {
    if (!isClient) return
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [isClient])

  // 데이터 소스 선택
  const isTimeData = useIntradayData
  const isDailyData = !useIntradayData

  const { data: timeData, isLoading: timeLoading, error: timeError } = useIntraday(
    assetIdentifier,
    { dataInterval, days: 1 },
    { enabled: !!assetIdentifier && isTimeData, staleTime: 60_000, retry: 3 }
  )

  const { data: delayedData, isLoading: delayedLoading, error: delayedError } = useDelayedQuotes(
    [assetIdentifier],
    { enabled: !!assetIdentifier && isTimeData && dataInterval === '15m', staleTime: 60_000, retry: 3 }
  )

  const { data: dailyData, isLoading: dailyLoading, error: dailyError } = useOhlcv(
    assetIdentifier,
    { dataInterval },
    { enabled: !!assetIdentifier && isDailyData, staleTime: 60_000, retry: 3 }
  )

  const apiData = isTimeData ? (dataInterval === '15m' ? delayedData : timeData) : dailyData
  const apiLoading = isTimeData ? (dataInterval === '15m' ? delayedLoading : timeLoading) : dailyLoading
  const apiError = isTimeData ? (dataInterval === '15m' ? delayedError : timeError) : dailyError

  useEffect(() => {
    if (!assetIdentifier) return

    if (externalOhlcvData && externalOhlcvData.length > 0) {
      const ohlc = externalOhlcvData
        .map((r) => [
          new Date(r.timestamp_utc).getTime(),
          parseFloat(String(r.open_price)) || 0,
          parseFloat(String(r.high_price)) || 0,
          parseFloat(String(r.low_price)) || 0,
          parseFloat(String(r.close_price)) || 0
        ])
        .filter((p) => p[0] > 0)
        .sort((a, b) => a[0] - b[0])

      const vol = externalOhlcvData
        .map((r) => [new Date(r.timestamp_utc).getTime(), parseFloat(String(r.volume)) || 0])
        .filter((p) => p[0] > 0 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && p[1] >= 0)
        .sort((a, b) => a[0] - b[0])

      setChartData(ohlc)
      setVolumeData(vol)
      onDataLoad?.({ ohlcData: ohlc, volumeData: vol, totalCount: externalOhlcvData.length })
      return
    }

    if (apiError) {
      const message = `차트 데이터를 불러오는데 실패했습니다: ${(apiError as Error)?.message || apiError}`
      setError(message)
      onError?.(message)
      return
    }

    let rows: any[] = []
    if (isTimeData && dataInterval === '15m' && delayedData) {
      rows = delayedData.quotes || []
    } else {
      rows = apiData?.data || apiData || []
    }

    if (rows && rows.length > 0) {
      const ohlc = rows
        .map((item: any) => {
          let timestamp: number
          let open: number, high: number, low: number, close: number
          if (isTimeData && dataInterval === '15m') {
            timestamp = new Date(String(item.timestamp_utc)).getTime()
            const price = parseFloat(String(item.price)) || 0
            open = high = low = close = price
          } else if (isTimeData) {
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
        .filter((p) => p[0] > 0)
        .sort((a, b) => a[0] - b[0])

      const vol = rows
        .map((item: any) => {
          const ts = isTimeData
            ? (dataInterval === '15m'
              ? new Date(String(item.timestamp_utc)).getTime()
              : new Date(String(item.timestamp || item.timestamp_utc)).getTime())
            : new Date(String(item.timestamp_utc)).getTime()
          const v = parseFloat(String(item.volume)) || 0
          return [ts, v]
        })
        .filter((p) => p[0] > 0 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && p[1] >= 0)
        .sort((a, b) => a[0] - b[0])

      setChartData(ohlc)
      setVolumeData(vol)
      onDataLoad?.({ ohlcData: ohlc, volumeData: vol, totalCount: rows.length })
    } else if (!apiLoading) {
      setError('차트 데이터가 없습니다.')
    }
  }, [assetIdentifier, dataInterval, onDataLoad, onError, externalOhlcvData, apiData, apiLoading, apiError, isTimeData, isDailyData, delayedData, useIntradayData])

  // 레이아웃 계산 이후 강제 reflow로 NaN 기반 정렬 계산 방지 (항상 선언되어 훅 순서 고정)
  useEffect(() => {
    if (!isClient) return
    const id = requestAnimationFrame(() => {
      try { chartRef.current?.chart?.reflow?.() } catch {}
    })
    return () => cancelAnimationFrame(id)
  }, [isClient, chartData, volumeData, height])

  const options = {
    chart: {
      height,
      backgroundColor,
      events: {
        load: function () {
          try { (this as any).reflow?.() } catch {}
        },
        render: function () {
          try { (this as any).reflow?.() } catch {}
        }
      }
    },
    stockTools: {
      gui: {
        enabled: true,
        // 로컬 퍼블릭 아이콘 경로 사용 (Next.js public)
        iconsURL: '/images/icons/stock-icons/'
      }
    },
    yAxis: [
      {
        labels: { align: 'left' },
        height: showVolume ? '80%' : '100%',
        resize: { enabled: true }
      },
      {
        labels: { align: 'left' },
        top: '80%',
        height: '20%',
        offset: 0
      }
    ],
    rangeSelector: {
      enabled: showRangeSelector && !isMobile && (chartData?.length || 0) > 0,
      selected: showRangeSelector && !isMobile && (chartData?.length || 0) > 0 ? 4 : undefined
    },
    tooltip: {
      shape: 'square',
      headerShape: 'callout',
      borderWidth: 0,
      shadow: false,
      fixed: true
    },
    series: [
      {
        type: 'candlestick',
        id: 'default-candlestick',
        name: `${assetIdentifier} Price`,
        data: chartData || [],
        dataGrouping: { groupPixelWidth: 20 }
      },
      ...(showVolume ? [{
        type: 'column',
        id: 'default-volume',
        name: `${assetIdentifier} Volume`,
        data: volumeData || [],
        yAxis: 1,
        color: volumeColor,
        opacity: volumeOpacity
      }] : [])
    ],
    responsive: {
      rules: [
        {
          condition: { maxWidth: 800 },
          chartOptions: {
            rangeSelector: { inputEnabled: false }
          }
        }
      ]
    },
    credits: { enabled: false },
    exporting: { enabled: showExporting },
    ...(customOptions || {})
  } as any

  if (!isClient || !HighchartsReact || !Highcharts) {
    return (
      <div className="flex justify-center items-center" style={{ height }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-sm text-gray-600">Loading chart...</span>
      </div>
    )
  }

  if (apiLoading) {
    return (
      <div className="flex justify-center items-center" style={{ height }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-sm text-gray-600">Loading chart data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <h5 className="text-red-800 font-medium">Chart Error</h5>
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  // 데이터가 준비되기 전에는 차트를 렌더링하지 않아 초기 NaN 배치 문제를 방지
  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex justify-center items-center" style={{ height }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-sm text-gray-600">Preparing chart...</span>
      </div>
    )
  }

  return (
    <div style={{ height }}>
      <HighchartsReact
        ref={chartRef}
        highcharts={Highcharts}
        constructorType={"stockChart"}
        options={options}
      />
    </div>
  )
}

export default OHLCVChart


