"use client"

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
  maxDataPoints?: number
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
  maxDataPoints,
  onDataLoad,
  onError,
  customOptions = {},
  externalOhlcvData = null,
  useIntradayData = false,
}) => {
  const [chartData, setChartData] = useState<number[][] | null>(null)
  const [volumeData, setVolumeData] = useState<number[][] | null>(null)
  const [volumeChangeSummary, setVolumeChangeSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  const [isClient, setIsClient] = useState(false)
  const [HighchartsReact, setHighchartsReact] = useState<any>(null)
  const [Highcharts, setHighcharts] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const prevVolumeRef = useRef<number[][] | null>(null)
  const chartRef = useRef<any>(null)
  const lastAppliedVolumeRef = useRef<number | null>(null)
  
  // 실시간 가격 데이터 수신 제거 (차트는 실시간 구독하지 않음)

  // 클라이언트 사이드에서 Highcharts 동적 로드
  useEffect(() => {
    const loadHighcharts = async () => {
      try {
        // 브라우저 환경 확인
        if (typeof window === 'undefined') {
          return
        }

        // HighchartsReact와 Highcharts를 동시에 로드
        const [HighchartsReactModule, HighchartsModule] = await Promise.allSettled([
          import('highcharts-react-official'),
          import('highcharts/highstock')
        ])

        if (HighchartsReactModule.status === 'rejected' || HighchartsModule.status === 'rejected') {
          throw new Error('Failed to load core Highcharts modules')
        }

        const HighchartsReactComponent = HighchartsReactModule.value.default
        const HighchartsCore = HighchartsModule.value.default

        // Highcharts 모듈들을 병렬로 로드 (실패해도 계속 진행)
        const modulePromises = [
          import('highcharts/modules/exporting').catch(e => console.warn('Exporting module failed:', e)),
          import('highcharts/modules/accessibility').catch(e => console.warn('Accessibility module failed:', e)),
          import('highcharts/modules/full-screen').catch(e => console.warn('Full-screen module failed:', e)),
          import('highcharts/modules/annotations-advanced').catch(e => console.warn('Annotations module failed:', e)),
          import('highcharts/modules/price-indicator').catch(e => console.warn('Price indicator module failed:', e))
        ]

        await Promise.allSettled(modulePromises)

        setHighchartsReact(() => HighchartsReactComponent)
        setHighcharts(HighchartsCore)
        setIsClient(true)
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to load Highcharts:', error)
        setError('Failed to load chart library')
        setIsLoading(false)
      }
    }

    loadHighcharts()
  }, [])

  // 모바일 감지
  useEffect(() => {
    if (!isClient) return

    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [isClient])

  // 데이터 소스에 따른 API 선택 로직
  const isTimeData = useIntradayData // 시간 데이터 (15m, 1h, 4h)
  const isDailyData = !useIntradayData // 일간 데이터 (1d, 1w, 1m)

  // 시간 데이터 훅 (15m, 1h, 4h)
  const { 
    data: timeData, 
    isLoading: timeLoading, 
    error: timeError 
  } = useIntraday(assetIdentifier, {
    dataInterval,
    days: 1
  }, {
    enabled: !!assetIdentifier && isTimeData,
    staleTime: 1 * 60 * 1000, // 1분
    retry: 3,
  })

  // 15m 데이터는 별도 엔드포인트 사용
  const { 
    data: delayedData, 
    isLoading: delayedLoading, 
    error: delayedError 
  } = useDelayedQuotes([assetIdentifier], {
    enabled: !!assetIdentifier && isTimeData && dataInterval === '15m',
    staleTime: 1 * 60 * 1000, // 1분
    retry: 3,
  })

  // 일간 데이터 훅 (1d, 1w, 1m)
  const { 
    data: dailyData, 
    isLoading: dailyLoading, 
    error: dailyError 
  } = useOhlcv(assetIdentifier, {
    dataInterval
  }, {
    enabled: !!assetIdentifier && isDailyData,
    staleTime: 1 * 60 * 1000, // 1분
    retry: 3,
  })

  // 현재 사용할 데이터 결정
  const apiData = isTimeData ? (dataInterval === '15m' ? delayedData : timeData) : dailyData
  const apiLoading = isTimeData ? (dataInterval === '15m' ? delayedLoading : timeLoading) : dailyLoading
  const apiError = isTimeData ? (dataInterval === '15m' ? delayedError : timeError) : dailyError

  useEffect(() => {
    if (!assetIdentifier) return

    // 간결한 상태 로그
    console.log('[OHLCVChart] fetch start', { assetIdentifier, dataInterval, isTimeData })

    // 외부 데이터가 있으면 그것을 사용
    if (externalOhlcvData && externalOhlcvData.length > 0) {
      const ohlcData = externalOhlcvData
        .map((item) => [
          new Date(item.timestamp_utc).getTime(),
          parseFloat(String(item.open_price)) || 0,
          parseFloat(String(item.high_price)) || 0,
          parseFloat(String(item.low_price)) || 0,
          parseFloat(String(item.close_price)) || 0,
        ])
        .filter((item) => item[0] > 0)
        .sort((a, b) => a[0] - b[0])

      const volumeData = externalOhlcvData
        .map((item) => [new Date(item.timestamp_utc).getTime(), parseFloat(String(item.volume)) || 0])
        .filter((item) => 
          item[0] > 0 && 
          !isNaN(item[0]) && 
          isFinite(item[0]) &&
          !isNaN(item[1]) && 
          isFinite(item[1]) &&
          item[1] >= 0
        )
        .sort((a, b) => a[0] - b[0])

      // 볼륨 검증 로그
      try {
        const volumes = volumeData.map((p) => p[1])
        const min = Math.min(...volumes)
        const max = Math.max(...volumes)
        let decreases = 0
        for (let i = 1; i < volumes.length; i++) {
          if (volumes[i] < volumes[i - 1]) decreases++
        }
        const nans = volumes.filter((v) => Number.isNaN(v)).length
        const negatives = volumes.filter((v) => v < 0).length
        console.log('[OHLCVChart][VALIDATE_VOLUME]', {
          source: 'external',
          assetIdentifier,
          dataInterval,
          points: volumeData.length,
          min,
          max,
          nans,
          negatives,
          decreases,
          last3: volumeData.slice(-3),
        })

        // 변경 요약 계산 및 표시
        const prev = prevVolumeRef.current
        const prevLen = prev?.length || 0
        const nextLen = volumeData.length
        const prevLast = prevLen > 0 ? prev![prevLen - 1][1] : undefined
        const nextLast = nextLen > 0 ? volumeData[nextLen - 1][1] : undefined
        const pointsAdded = nextLen - prevLen
        const changed = prevLast !== nextLast || pointsAdded !== 0
        if (changed) {
          const ts = nextLen > 0 ? new Date(volumeData[nextLen - 1][0]).toISOString() : ''
          const summary = `volume updated (${pointsAdded >= 0 ? '+' : ''}${pointsAdded} pts) last ${prevLast ?? '-'} → ${nextLast ?? '-'} @ ${ts}`
          setVolumeChangeSummary(summary)
          console.log('[OHLCVChart][VOLUME_CHANGE]', { summary })
        }
        prevVolumeRef.current = volumeData
      } catch {}
      setChartData(ohlcData)
      setVolumeData(volumeData)
      return
    }

    // 훅 데이터 사용
    if (apiError) {
      console.error('❌ OHLCVChart: API error:', apiError)
      const errorMessage = `차트 데이터를 불러오는데 실패했습니다: ${(apiError as Error)?.message || apiError}`
      setError(errorMessage)
      if (onError) onError(errorMessage)
      return
    }

    // 데이터 타입에 따른 처리
    let rows: any[] = []
    
    if (isTimeData && dataInterval === '15m' && delayedData) {
      // 15m 지연 데이터는 quotes 배열 안에 있음
      rows = delayedData.quotes || []
    } else {
      // 시간 데이터 또는 일간 데이터
      rows = apiData?.data || apiData || []
    }

    if (rows && rows.length > 0) {
      const ohlcData = rows
        .map((item: Record<string, unknown>) => {
          let timestamp: number
          let open: number, high: number, low: number, close: number

          if (isTimeData && dataInterval === '15m') {
            // 15m 지연 데이터 구조 처리 (quotes 배열의 각 항목)
            timestamp = new Date(String(item.timestamp_utc)).getTime()
            const price = parseFloat(String(item.price)) || 0
            open = high = low = close = price // 지연 데이터는 현재 가격만 있음
          } else if (isTimeData) {
            // 시간 데이터 구조 (1h, 4h)
            timestamp = new Date(String(item.timestamp || item.timestamp_utc)).getTime()
            open = parseFloat(String(item.open || item.open_price)) || 0
            high = parseFloat(String(item.high || item.high_price)) || 0
            low = parseFloat(String(item.low || item.low_price)) || 0
            close = parseFloat(String(item.close || item.close_price)) || 0
          } else {
            // 일간 데이터 구조 (1d, 1w, 1m)
            timestamp = new Date(String(item.timestamp_utc)).getTime()
            open = parseFloat(String(item.open_price)) || 0
            high = parseFloat(String(item.high_price)) || 0
            low = parseFloat(String(item.low_price)) || 0
            close = parseFloat(String(item.close_price)) || 0
          }

          return [timestamp, open, high, low, close]
        })
        .filter((item) => item[0] > 0)
        .sort((a, b) => a[0] - b[0])

      const volumeData = rows
        .map((item: Record<string, unknown>) => {
          let timestamp: number
          if (isTimeData && dataInterval === '15m') {
            timestamp = new Date(String(item.timestamp_utc)).getTime()
          } else if (isTimeData) {
            timestamp = new Date(String(item.timestamp || item.timestamp_utc)).getTime()
          } else {
            timestamp = new Date(String(item.timestamp_utc)).getTime()
          }
          const volume = parseFloat(String(item.volume)) || 0
          return [timestamp, volume]
        })
        .filter((item) => 
          item[0] > 0 && 
          !isNaN(item[0]) && 
          isFinite(item[0]) &&
          !isNaN(item[1]) && 
          isFinite(item[1]) &&
          item[1] >= 0
        )
        .sort((a, b) => a[0] - b[0])

      // 볼륨 검증 로그 (요약)
      try {
        const volumes = volumeData.map((p) => p[1])
        const min = Math.min(...volumes)
        const max = Math.max(...volumes)
        let decreases = 0
        for (let i = 1; i < volumes.length; i++) {
          if (volumes[i] < volumes[i - 1]) decreases++
        }
        const nans = volumes.filter((v) => Number.isNaN(v)).length
        const negatives = volumes.filter((v) => v < 0).length
        const source = isTimeData ? (dataInterval === '15m' ? 'delayed15m' : 'time') : 'daily'
        console.log('[OHLCVChart][VALIDATE_VOLUME]', {
          source,
          assetIdentifier,
          dataInterval,
          points: volumeData.length,
          min,
          max,
          nans,
          negatives,
          decreases,
          last3: volumeData.slice(-3),
        })

        // 변경 요약 계산 및 표시
        const prev = prevVolumeRef.current
        const prevLen = prev?.length || 0
        const nextLen = volumeData.length
        const prevLast = prevLen > 0 ? prev![prevLen - 1][1] : undefined
        const nextLast = nextLen > 0 ? volumeData[nextLen - 1][1] : undefined
        const pointsAdded = nextLen - prevLen
        const changed = prevLast !== nextLast || pointsAdded !== 0
        if (changed) {
          const ts = nextLen > 0 ? new Date(volumeData[nextLen - 1][0]).toISOString() : ''
          const summary = `volume updated (${pointsAdded >= 0 ? '+' : ''}${pointsAdded} pts) last ${prevLast ?? '-'} → ${nextLast ?? '-'} @ ${ts}`
          setVolumeChangeSummary(summary)
          console.log('[OHLCVChart][VOLUME_CHANGE]', { summary })
        }
        prevVolumeRef.current = volumeData
      } catch {}

      setChartData(ohlcData)
      setVolumeData(volumeData)
      if (onDataLoad) onDataLoad({ ohlcData, volumeData, totalCount: rows.length })
    } else if (!apiLoading) {
      console.warn('[OHLCVChart] no data', { rowsLength: rows.length, isTimeData, dataInterval })
      setError('차트 데이터가 없습니다.')
    }
  }, [assetIdentifier, dataInterval, onDataLoad, onError, externalOhlcvData, apiData, apiLoading, apiError, isTimeData, isDailyData, delayedData, useIntradayData])

  const chartOptions = {
    chart: {
      height: height,
      backgroundColor: backgroundColor,
      spacingTop: 10,
      spacingRight: 10,
      spacingBottom: 10,
      spacingLeft: 10,
      style: {
        fontFamily: 'Arial, sans-serif'
      },
      // 모바일 설정
      zoomType: 'xy',
      panning: {
        enabled: true,
        type: 'xy'
      },
      pinchType: 'xy',
      events: {
        redraw: function () {
          try {
            const chart = this
            const xExt = chart.xAxis && chart.xAxis[0] ? chart.xAxis[0].getExtremes() : null
            const volAxis = chart.yAxis && chart.yAxis[1] ? chart.yAxis[1] : null
            const volSeries = chart.get && chart.get('volume')
            if (!xExt || !volSeries || !volAxis) return
            const minX = xExt.min, maxX = xExt.max
            const pts = volSeries.points || []
            let lastVisibleVol = null
            for (let i = pts.length - 1; i >= 0; i--) {
              const p = pts[i]
              if (p && typeof p.x === 'number' && p.x >= minX && p.x <= maxX) {
                lastVisibleVol = typeof p.y === 'number' ? p.y : null
                break
              }
            }
            const prev = lastAppliedVolumeRef.current
            if (lastVisibleVol !== null && prev !== lastVisibleVol) {
              lastAppliedVolumeRef.current = lastVisibleVol
              const yExt = volAxis.getExtremes()
              console.log('[OHLCVChart][APPLIED_VOLUME]', {
                assetIdentifier,
                dataInterval,
                lastVisibleVol,
                yMin: yExt.min,
                yMax: yExt.max,
                xMin: minX,
                xMax: maxX,
              })
            }
          } catch {}
        }
      }
    },
    title: {
      text: title || `${assetIdentifier} Price Chart`,
    },
    subtitle: {
      text: subtitle,
    },
    xAxis: {
      type: 'datetime',
      opposite: false,
      labels: {
        enabled: true,
      },
    },
    yAxis: [
      {
        labels: { 
          align: 'left', 
          format: '{value:.2f}',
          style: {
            fontSize: isMobile ? '0px' : '12px' // 모바일에서 라벨 숨김
          }
        },
        height: showVolume ? '70%' : '100%',
        resize: { enabled: true },
        title: { 
          text: 'Price',
          style: {
            fontSize: isMobile ? '0px' : '12px' // 모바일에서 제목 숨김
          }
        },
      },
      ...(showVolume
        ? [
            {
              labels: { 
                align: 'left',
                formatter: function(this: any) {
                  const value = this.value
                  if (value == null || isNaN(value) || !isFinite(value)) return ''
                  return Math.round(value).toLocaleString()
                },
                style: {
                  fontSize: isMobile ? '0px' : '12px' // 모바일에서 라벨 숨김
                }
              },
              top: '70%',
              height: '30%',
              offset: 0,
              opposite: false,
              title: { 
                text: 'Volume',
                style: {
                  fontSize: isMobile ? '0px' : '12px' // 모바일에서 제목 숨김
                }
              },
              gridLineWidth: 0,
              min: 0,
              startOnTick: false,
              endOnTick: false,
              events: {
                setExtremes: function (e: any) {
                  try {
                    const chart = chartRef.current?.chart
                    const volSeries = chart?.get && chart.get('volume')
                    const xExt = chart?.xAxis && chart.xAxis[0] ? chart.xAxis[0].getExtremes() : null
                    if (!volSeries || !xExt) return
                    // 콘솔에 볼륨 축의 x/y 범위 출력
                    try {
                      console.log('[OHLCVChart][VOLUME_AXIS_EXTREMES]', {
                        xMin: xExt.min,
                        xMax: xExt.max,
                        yMin: e?.min,
                        yMax: e?.max,
                      })
                    } catch {}
                    const minX = xExt.min, maxX = xExt.max
                    const pts = volSeries.points || []
                    let lastVisibleVol = null
                    for (let i = pts.length - 1; i >= 0; i--) {
                      const p = pts[i]
                      if (p && typeof p.x === 'number' && p.x >= minX && p.x <= maxX) {
                        lastVisibleVol = typeof p.y === 'number' ? p.y : null
                        break
                      }
                    }
                    if (lastVisibleVol !== null) {
                      const prev = lastAppliedVolumeRef.current
                      if (prev !== lastVisibleVol) {
                        lastAppliedVolumeRef.current = lastVisibleVol
                      }
                    }
                  } catch {}
                }
              }
            },
          ]
        : []),
    ],
    rangeSelector: {
      selected: showRangeSelector && !isMobile ? 4 : undefined,
      enabled: showRangeSelector && !isMobile,
      buttons: [{
        type: 'month',
        count: 1,
        text: '1m',
        title: 'View 1 month'
      }, {
        type: 'month',
        count: 3,
        text: '3m',
        title: 'View 3 months'
      }, {
        type: 'month',
        count: 6,
        text: '6m',
        title: 'View 6 months'
      }, {
        type: 'ytd',
        text: 'YTD',
        title: 'View year to date'
      }, {
        type: 'year',
        count: 1,
        text: '1y',
        title: 'View 1 year'
      }, {
        type: 'all',
        text: 'All',
        title: 'View all'
      }]
    },
    tooltip: {
      shared: true,
    },
    series: [
      {
        type: 'candlestick',
        id: 'price',
        name: `${assetIdentifier} Price`,
        data: chartData || [],
      },
      ...(showVolume
        ? [
            {
              type: 'column',
              id: 'volume',
              name: `${assetIdentifier} Volume`,
              data: (volumeData || []).filter((point: number[]) => 
                Array.isArray(point) && 
                point.length >= 2 && 
                typeof point[0] === 'number' && 
                !isNaN(point[0]) &&
                typeof point[1] === 'number' && 
                !isNaN(point[1]) &&
                isFinite(point[0]) &&
                isFinite(point[1])
              ),
              yAxis: 1,
              xAxis: 0,
              color: volumeColor,
              opacity: volumeOpacity,
            },
          ]
        : []),
    ],
    credits: {
      enabled: false,
    },
    exporting: {
      enabled: showExporting,
    },
    // 모바일 최적화 설정
    responsive: {
      rules: [{
        condition: {
          maxWidth: 768
        },
        chartOptions: {
          chart: {
            height: Math.min(height, 800),
            spacing: [10, 10, 10, 10]
          },
          rangeSelector: {
            inputEnabled: false
          },
          tooltip: {
            positioner: function (labelWidth: number, labelHeight: number, point: any) {
              return {
                x: Math.min(point.plotX + this.chart.plotLeft, this.chart.chartWidth - labelWidth - 10),
                y: Math.max(point.plotY + this.chart.plotTop - labelHeight - 10, 10)
              };
            }
          }
        }
      }]
    },
    ...customOptions,
  }

  // 클라이언트 사이드에서만 차트 렌더링
  if (!isClient || !HighchartsReact || !Highcharts) {
    return (
      <div className="flex justify-center items-center h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-sm text-gray-600">Loading chart library...</span>
      </div>
    )
  }

  if (apiLoading) return (
    <div className="flex justify-center items-center h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-3 text-sm text-gray-600">Loading chart data...</span>
    </div>
  )
  
  if (error || apiError) return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4">
      <h5 className="text-red-800 font-medium">Chart Error</h5>
      <p className="text-red-600">{error || (apiError as Error)?.message || 'Unknown error occurred'}</p>
    </div>
  )
  
  // 로딩 상태 처리
  if (isLoading || !isClient) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-sm text-gray-600">Loading chart library...</div>
        </div>
      </div>
    )
  }

  if (!chartData || chartData.length === 0) return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
      <h5 className="text-yellow-800 font-medium">No Data Available</h5>
      <p className="text-yellow-600">차트 데이터가 없습니다. (데이터 포인트: {chartData?.length || 0})</p>
    </div>
  )

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="border-b border-gray-200 px-6 py-4">
        <h5 className="text-lg font-medium text-gray-900">가격 차트 - {assetIdentifier}</h5>
      </div>
      <div className="p-6">
        <div 
          style={{ 
            height: `${height}px`,
            position: 'relative',
            zIndex: 1
          }}
        >
          {volumeChangeSummary && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'rgba(17,24,39,0.8)',
                color: '#fff',
                padding: '6px 8px',
                borderRadius: 6,
                fontSize: 12,
                zIndex: 2,
                pointerEvents: 'none'
              }}
              aria-live="polite"
            >
              {volumeChangeSummary}
            </div>
          )}
          <HighchartsReact
            ref={chartRef}
            highcharts={Highcharts}
            constructorType={'stockChart'}
            options={chartOptions}
          />
        </div>
      </div>
    </div>
  )
}

export default OHLCVChart
