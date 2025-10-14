"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useDelayedQuotes } from "@/hooks/useRealtime"
import { useRealtimePrices } from "@/hooks/useSocket"
// CSS는 globals.css에서 글로벌로 로드됨

// 연결 상태 표시 컴포넌트
const ConnectionStatus: React.FC<{ isConnected: boolean }> = ({ isConnected }) => {
  if (isConnected) {
    // ON 상태 (녹색)
    return (
      <div style={{ 
        color: '#10B981', 
        fontWeight: 'bold', 
        fontSize: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        🟢 ON
      </div>
    )
  } else {
    // OFF 상태 (빨간색)
    return (
      <div style={{ 
        color: '#dc2626', 
        fontWeight: 'bold', 
        fontSize: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        🔴 OFF
      </div>
    )
  }
}

type MiniPriceChartProps = {
  containerId?: string
  assetIdentifier?: string
  chartType?: string
  useWebSocket?: boolean
  apiInterval?: string | null
  marketHours?: boolean
  title?: string
}

type ApiResponse = {
  quotes?: Array<{
    timestamp_utc: string
    price: string | number
  }>
}

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && isFinite(v)

const formatCompact = (v: unknown) => {
  const n = Number(v)
  const abs = Math.abs(n)
  if (!isFiniteNumber(n)) return ""
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + "T"
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + "B"
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + "M"
  if (abs >= 1e3) return (n / 1e3).toFixed(2) + "K"
  return n.toFixed(2)
}

const MiniPriceChart: React.FC<MiniPriceChartProps> = ({
  containerId = "mini-chart-test",
  assetIdentifier = "BTCUSDT",
  chartType = "crypto",
  useWebSocket = true,
  apiInterval = null,
  marketHours = null,
  title,
}) => {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const [chart, setChart] = useState<any>(null)
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const [isClient, setIsClient] = useState<boolean>(false)
  const [highchartsLoaded, setHighchartsLoaded] = useState(false)

  // 클라이언트 사이드 렌더링 확인
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 화면 크기 감지 (클라이언트에서만, 안전하게)
  useEffect(() => {
    if (!isClient) return

    const checkIsMobile = () => {
      // 더 안전한 모바일 감지
      const width = window.innerWidth
      const isMobileDevice = width <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setIsMobile(isMobileDevice)
    }
    
    // 초기 체크 (약간의 지연을 두어 안정성 확보)
    const timeoutId = setTimeout(checkIsMobile, 100)
    
    // 리사이즈 이벤트 리스너
    window.addEventListener('resize', checkIsMobile)
    
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', checkIsMobile)
    }
  }, [isClient])

  // 웹소켓 실시간 데이터 수신
  const { latestPrice, priceHistory, isConnected: socketConnected } = useRealtimePrices(assetIdentifier)
  
  // 실제 연결 상태 (시장 개장 시간 고려)
  const actualConnectionStatus = useMemo(() => {
    if (chartType === 'stocks' && marketHours === false) {
      return false // 주식/ETF이고 폐장 시간이면 OFF
    }
    return socketConnected // 그 외에는 WebSocket 연결 상태 그대로
  }, [socketConnected, chartType, marketHours])

  // Highcharts 동적 로드
  useEffect(() => {
    const loadHighcharts = async () => {
      if (typeof window !== "undefined") {
        try {
          // @ts-ignore - runtime dynamic import; types may not be present
          const Highcharts = (await import("highcharts")).default
          // @ts-ignore - runtime dynamic import; types may not be present
          const HighchartsStock = (await import("highcharts/modules/stock")).default
          
          // Highcharts Stock 모듈 초기화
          if (typeof HighchartsStock === 'function') {
            (HighchartsStock as any)(Highcharts)
          }
          
          // 전역에 Highcharts 설정
          ;(window as any).Highcharts = Highcharts
          setHighchartsLoaded(true)
        } catch (error) {
          // console.error("Failed to load Highcharts:", error)
        }
      }
    }
    
    loadHighcharts()
  }, [])

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  // API 데이터 로드 (지연 데이터 기반 시계열)
  const { data: apiResponse, isLoading, error } = useDelayedQuotes([assetIdentifier])

  // 시계열 데이터로 변환 (API 데이터 + 실시간 데이터)
  const chartData: [number, number][] = useMemo(() => {
    let baseData: [number, number][] = []
    
    // API 데이터 추가 (quotes-delay-price 응답 구조에 맞게)
    if (apiResponse && Array.isArray(apiResponse)) {
      // apiResponse가 배열인 경우 (여러 자산)
      const assetData = apiResponse.find((item: any) => item.asset_identifier === assetIdentifier)
      if (assetData?.quotes && assetData.quotes.length > 0) {
        baseData = assetData.quotes
          .map((q: any) => {
            const ts = new Date(q.timestamp_utc).getTime()
            if (!ts || !isFinite(ts)) return null
            return [ts, parseFloat(q.price)] as [number, number]
          })
          .filter((p: any): p is [number, number] => p !== null)
          .sort((a: [number, number], b: [number, number]) => a[0] - b[0])
      }
    } else if (apiResponse?.quotes && apiResponse.quotes.length > 0) {
      // apiResponse가 단일 객체인 경우
      baseData = apiResponse.quotes
        .map((q: any) => {
          const ts = new Date(q.timestamp_utc).getTime()
          if (!ts || !isFinite(ts)) return null
          return [ts, parseFloat(q.price)] as [number, number]
        })
        .filter((p: any): p is [number, number] => p !== null)
        .sort((a: [number, number], b: [number, number]) => a[0] - b[0])
    }
    
    // 실시간 데이터 추가 (최신 가격)
    if (latestPrice) {
      const realtimePoint: [number, number] = [
        new Date(latestPrice.timestamp).getTime(),
        parseFloat(latestPrice.price.toString())
      ]
      
      // 중복 제거 (같은 시간대 데이터가 있으면 실시간 데이터로 교체)
      const existingIndex = baseData.findIndex((point) => 
        Math.abs(point[0] - realtimePoint[0]) < 60000 // 1분 이내
      )
      
      if (existingIndex >= 0) {
        baseData[existingIndex] = realtimePoint
      } else {
        baseData.push(realtimePoint)
      }
    }
    
    return baseData.sort((a, b) => a[0] - b[0])
  }, [apiResponse, latestPrice])

  // 전일 클로즈 가격(24:00) 계산
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
    return isFiniteNumber(candidate) ? candidate : null
  }, [chartData])

  // x축 범위 (우측 패딩만 유지)
  const xAxisRange = useMemo(() => {
    if (chartData.length === 0) return { min: null as number | null, max: null as number | null }
    const times = chartData.map((p) => p[0])
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    const span = maxTime - minTime
    const leftPad = span * 0.05
    const rightPad = 4 * 60 * 60 * 1000
    return { min: minTime - leftPad, max: maxTime + rightPad }
  }, [chartData])

  // 차트 초기 생성 (API 데이터 기반)
  useEffect(() => {
    if (!chartRef.current) return
    if (!highchartsLoaded) return
    if (isLoading || chartData.length === 0) return
    if (chart) return // 이미 차트가 있으면 스킵

    const last = chartData[chartData.length - 1]
    const lastPrice = last ? last[1] : null
    let isRising: boolean | null = null
    if (isFiniteNumber(lastPrice) && isFiniteNumber(prevClosePrice)) {
      const diff = lastPrice - prevClosePrice
      if (diff > 0) isRising = true
      else if (diff < 0) isRising = false
      else isRising = null
    }
    const lineColor = isRising === null ? "#999999" : (isRising ? "#18c58f" : "#ff4d4f")

    const options: any = {
      chart: {
        height: 192, // 부모 컨테이너 높이와 동일하게 설정
        backgroundColor: "#1a1a1a", 
        animation: false,
        scrollablePlotArea: { minHeight: 0 },
        zoomType: null,
        panning: { enabled: false },
        panKey: 'shift',
        events: {
          wheel: function(e: any) {
            e.preventDefault();
            e.stopPropagation();
            return false;
          },
          load: function() {
            // 차트 로드 후 휠 이벤트 완전 차단
            const chartAny = this as any;
            const container = chartAny && chartAny.container ? chartAny.container : null;
            
            // 모든 휠 이벤트 차단
            const preventWheel = (e: any) => {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              return false;
            };
            
            // 다양한 이벤트 타입에 대해 차단
            if (container) {
              ['wheel', 'mousewheel', 'DOMMouseScroll'].forEach(eventType => {
                container.addEventListener(eventType, preventWheel, { passive: false, capture: true });
              });
            }
          }
        }
      },
      title: {
        text: title || null, // 차트 내부 타이틀 설정
        style: {
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 'bold'
        },
        align: 'center',
        verticalAlign: 'top',
        y: 10,
        x: 0
      },
      xAxis: {
        type: "datetime",
        min: xAxisRange.min,
        max: xAxisRange.max,
        gridLineColor: "rgba(255,255,255,0.06)",
        gridLineWidth: 0.5,
        labels: { enabled: true, style: { color: "#cccccc" } },
        lineColor: "rgba(255,255,255,0.12)",
        tickColor: "rgba(255,255,255,0.15)",
        minPadding: 0,
        maxPadding: 0,
        softMax: xAxisRange.max,
        softMin: xAxisRange.min,
        events: {
          setExtremes: function(e: any) {
            // 휠로 인한 자동 범위 변경 방지
            if (e.trigger === 'zoom' || e.trigger === 'pan') {
              return false;
            }
          }
        }
      },
      yAxis: {
        opposite: true,
        gridLineColor: "rgba(255,255,255,0.06)",
        gridLineWidth: 0.5,
        labels: {
          enabled: true,
          style: { color: "#cccccc" },
          align: "left",
          x: 15,
          formatter: function (this: any) {
            return formatCompact(this.value)
          },
        },
        title: { text: null, style: { color: "#cccccc" } },
        plotLines: isFiniteNumber(lastPrice)
          ? [
              {
                id: "current-price-line",
                value: Math.round(lastPrice * 100) / 100,
                color: lineColor,
                width: 0.75,
                zIndex: 10,
              },
            ]
          : [],
      },
      rangeSelector: { enabled: false },
      navigator: { enabled: false },
      scrollbar: { enabled: false },
      credits: { enabled: false },
      exporting: { enabled: false },
      accessibility: { enabled: false },
      series: [
        { type: "line", name: "Price", color: "#00d4ff", lineWidth: 2, marker: { enabled: false }, data: chartData },
        {
          type: "scatter",
          name: "Last",
          data: last ? [[last[0], last[1]]] : [],
          color: lineColor,
          marker: { enabled: true, radius: 3, symbol: "circle" },
          dataLabels: {
            enabled: true,
            formatter: function (this: any) {
              const val = Number(this.y)
              if (!isFinite(val)) return ""
              if (isFiniteNumber(prevClosePrice) && prevClosePrice !== 0) {
                const diff = val - prevClosePrice
                const pct = (diff / prevClosePrice) * 100
                const sign = diff > 0 ? "+" : diff < 0 ? "-" : ""
                return `$${val.toFixed(2)} (${sign}${Math.abs(pct).toFixed(2)}%, ${sign}$${Math.abs(diff).toFixed(2)})`
              }
              return `$${val.toFixed(2)}`
            },
            style: { fontWeight: "900", color: lineColor, fontSize: "14px" },
          },
        },
      ],
    }

    let newChart: any
    try {
      const Highcharts = (window as any).Highcharts
      if (Highcharts) {
        newChart = Highcharts.stockChart(chartRef.current as any, options)
        setChart(newChart)
        
        // 차트 생성 후 추가 휠 이벤트 차단
        if (newChart && newChart.container) {
          const container = newChart.container;
          const preventWheel = (e: any) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
          };
          
          // 모든 휠 관련 이벤트 차단
          ['wheel', 'mousewheel', 'DOMMouseScroll'].forEach(eventType => {
            container.addEventListener(eventType, preventWheel, { passive: false, capture: true });
          });
        }
        
        // console.log(`[MiniPriceChart - ${assetIdentifier}] 차트 초기 생성 완료`)
      }
    } catch (e) {
      // console.error(`[MiniPriceChart - ${assetIdentifier}] chart init error:`, e)
    }
  }, [assetIdentifier, isLoading, highchartsLoaded, chart])

  // 실시간 데이터 업데이트 (마지막 포인트만 움직이는 효과)
  useEffect(() => {
    if (!chart || !latestPrice) return

    const realtimePoint: [number, number] = [
      new Date(latestPrice.timestamp).getTime(),
      parseFloat(latestPrice.price.toString())
    ]

    try {
      // 전일 종가 대비 상승/하락/보합 판단 및 컬러 결정
      let isRising: boolean | null = null
      if (isFiniteNumber(realtimePoint[1]) && isFiniteNumber(prevClosePrice)) {
        const diff = realtimePoint[1] - prevClosePrice
        if (diff > 0) isRising = true
        else if (diff < 0) isRising = false
        else isRising = null
      }
      const lineColor = isRising === null ? '#999999' : (isRising ? '#18c58f' : '#ff4d4f')

      // 메인 라인 시리즈 업데이트: 마지막 포인트와 이어지도록 동작
      const lineSeries = chart.series[0]
      if (lineSeries) {
        const lastPointObject = lineSeries.data && lineSeries.data.length > 0 ? lineSeries.data[lineSeries.data.length - 1] : null
        if (!lastPointObject) {
          // 첫 번째 포인트인 경우
          lineSeries.addPoint(realtimePoint, false, false, false)
        } else {
          // 동일 버킷 판정: 1분(60000ms) 이내면 업데이트, 초과 시 새 포인트 추가
          const isSameBucket = Math.abs(realtimePoint[0] - lastPointObject.x) < (60 * 1000)
          if (isSameBucket) {
            // x, y 모두 업데이트하여 라인 끝과 마커가 동일 시각으로 정렬되도록 함
            lastPointObject.update(realtimePoint, false)
          } else {
            lineSeries.addPoint(realtimePoint, false, false, false)
          }
        }
      }

      // x축 우측 패딩 4시간 유지: 현재 시각을 기준으로 max를 앞으로 밀기
      const xAxis = chart.xAxis[0]
      if (xAxis) {
        const rightPadMs = 4 * 60 * 60 * 1000
        const extremes = xAxis.getExtremes()
        const newMax = realtimePoint[0] + rightPadMs
        const newMin = extremes && isFinite(extremes.min) ? extremes.min : undefined
        if (!extremes || !isFinite(extremes.max) || newMax > extremes.max) {
          xAxis.setExtremes(newMin, newMax, false, false)
        }
      }

      // yAxis plotLines 업데이트 (현재가)
      const yAxis = chart.yAxis[0]
      if (yAxis) {
        yAxis.removePlotLine('current-price-line')
        yAxis.addPlotLine({
          id: 'current-price-line',
          value: Math.round(realtimePoint[1] * 100) / 100,
          color: lineColor,
          width: 0.75,
          zIndex: 10,
        })
      }

      // 마커 시리즈 업데이트 (색상과 라벨 포함)
      const markerSeries = chart.series[1]
      if (markerSeries) {
        markerSeries.update({
          color: lineColor,
          dataLabels: {
            enabled: true,
            formatter: function (this: any) {
              const val = Number(this.y)
              if (!isFinite(val)) return ''
              if (isFiniteNumber(prevClosePrice) && prevClosePrice !== 0) {
                const diff = val - prevClosePrice
                const pct = (diff / prevClosePrice) * 100
                const sign = diff > 0 ? '+' : diff < 0 ? '-' : ''
                return `$${val.toFixed(2)} (${sign}${Math.abs(pct).toFixed(2)}%, ${sign}$${Math.abs(diff).toFixed(2)})`
              }
              return `$${val.toFixed(2)}`
            },
            style: { color: lineColor, fontWeight: '900', fontSize: '12px' }
          }
        }, false)
        markerSeries.setData([realtimePoint], false, false, false)
      }

      // 차트 리드로우 (애니메이션 없이)
      chart.redraw(false)
      
      // console.log(`[MiniPriceChart - ${assetIdentifier}] 실시간 데이터 업데이트: $${realtimePoint[1]} (${isRising === true ? '상승' : isRising === false ? '하락' : '보합'})`)
    } catch (e) {
      // console.error(`[MiniPriceChart - ${assetIdentifier}] 실시간 업데이트 오류:`, e)
    }
  }, [chart, latestPrice, assetIdentifier, prevClosePrice])

  // 차트 정리
  useEffect(() => {
    return () => {
      if (chart) {
        // console.log(`[MiniPriceChart - ${assetIdentifier}] 차트 정리`)
        chart.destroy()
        setChart(null)
      }
    }
  }, [chart, assetIdentifier])

  // 웹소켓 연동은 테스트 페이지에서는 사용하지 않음 (store 미존재 환경 호환)

  // 클라이언트 사이드 렌더링이 완료되기 전에는 기본 높이 사용
  const chartHeight = isClient ? (isMobile ? "200px" : "300px") : "300px"

  return (
    <div 
      className="mini-price-chart-container" 
      style={{ 
        position: 'relative',
        height: '100%',
        width: '100%',
        overflow: 'hidden'
      }}
    >
      <div
        ref={chartRef}
        id={containerId}
        className={`mini-price-chart ${isLoading ? "loading" : ""} ${error ? "error" : ""}`}
        style={{ 
          height: '100%',
          width: '100%',
          minHeight: '192px',
          maxHeight: '192px'
        }}
      />
    </div>
  )
}

export default MiniPriceChart


