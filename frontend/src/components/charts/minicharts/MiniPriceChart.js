import React, { useEffect, useMemo, useRef, useState } from 'react'
import Highcharts from 'highcharts/highstock'
import { useAPI } from '../../../hooks/useAPI'
import useWebSocketStore from '../../../store/websocketStore'
import './MiniPriceChart.css'

// 그래프 표시 전용: 구독/실시간 업데이트/현재가 라인 제거
const MiniPriceChartTest = ({
  containerId = 'mini-chart-test',
    assetIdentifier = 'BTCUSDT',
  chartType = 'crypto',
    useWebSocket = true,
  apiInterval = null,
  marketHours = null
}) => {
  const chartRef = useRef(null)
  const [chart, setChart] = useState(null)
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false))

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const wsPrice = useWebSocketStore((state) => state.prices[assetIdentifier])

  // API 데이터 로드 (지연 데이터 기반 시계열)
    const { data: apiResponse, loading: isLoading, error } = useAPI.realtime.pricesPg({
        asset_identifier: assetIdentifier,
    data_interval: '15m',
    limit: 500
  })

  // 시계열 데이터로 변환 (정렬 포함)
    const chartData = useMemo(() => {
    if (!apiResponse?.quotes || apiResponse.quotes.length === 0) return []
    return apiResponse.quotes
      .map((q) => {
        const ts = new Date(q.timestamp_utc).getTime()
        if (!ts || !isFinite(ts)) return null
        return [ts, parseFloat(q.price)]
      })
      .filter((p) => p !== null)
      .sort((a, b) => a[0] - b[0])
  }, [apiResponse])

  // 전일 클로즈 가격(24:00) 계산: 오늘 00:00 UTC 이전의 마지막 포인트
  const prevClosePrice = useMemo(() => {
    if (!chartData.length) return null
    const now = new Date()
    const todayStartUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
    // todayStartUtc 이하의 마지막 포인트를 prev close 로 사용
    let candidate = null
    for (let i = chartData.length - 1; i >= 0; i -= 1) {
      const [ts, price] = chartData[i]
      if (ts <= todayStartUtc) {
        candidate = price
        break
      }
    }
    return Number.isFinite(candidate) ? candidate : null
  }, [chartData])

  const isFiniteNumber = (v) => typeof v === 'number' && isFinite(v)
  const formatTwo = (v) => (isFiniteNumber(v) ? v.toFixed(2) : '0.00')
  const formatCompact = (v) => {
    const n = Number(v)
    const abs = Math.abs(n)
    if (!isFiniteNumber(n)) return ''
    if (abs >= 1e12) return (n / 1e12).toFixed(2) + 'T'
    if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B'
    if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M'
    if (abs >= 1e3) return (n / 1e3).toFixed(2) + 'K'
    return n.toFixed(2)
  }

  // x축 범위 (우측 패딩만 유지)
  const xAxisRange = useMemo(() => {
    if (chartData.length === 0) return { min: null, max: null }
    const times = chartData.map((p) => p[0])
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    const span = maxTime - minTime
    const leftPad = span * 0.05
    const rightPad = 4 * 60 * 60 * 1000
    return { min: minTime - leftPad, max: maxTime + rightPad }
  }, [chartData])

  // 차트 생성 (초기 로드 전용)
  useEffect(() => {
    if (!chartRef.current) return
    if (isLoading || chartData.length === 0) return

    const last = chartData[chartData.length - 1]
    const lastPrice = last ? last[1] : null
    // isRising: 전일 클로즈와 비교
    let isRising = null
    if (isFiniteNumber(lastPrice) && isFiniteNumber(prevClosePrice)) {
      const diff = lastPrice - prevClosePrice
      if (diff > 0) isRising = true
      else if (diff < 0) isRising = false
      else isRising = null
    }
    const lineColor = isRising === null ? '#999999' : (isRising ? '#18c58f' : '#ff4d4f')

    const options = {
      // 차트 중앙에 심볼 표시 (다크 모드 스타일)
      title: { text: `${assetIdentifier}`, align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', fontWeight: 'bold', color: '#ffffff' } },
      xAxis: {
        type: 'datetime',
        min: xAxisRange.min,
        max: xAxisRange.max,
        gridLineColor: 'rgba(255,255,255,0.06)',
        gridLineWidth: 0.5,
        labels: { enabled: true, style: { color: '#cccccc' } },
        lineColor: 'rgba(255,255,255,0.12)',
        tickColor: 'rgba(255,255,255,0.15)',
        minPadding: 0,
        maxPadding: 0,
        softMax: xAxisRange.max,
        softMin: xAxisRange.min,
      },
            yAxis: {
                opposite: true,
                gridLineColor: 'rgba(255,255,255,0.06)',
        gridLineWidth: 0.5,
        labels: { 
          enabled: true, 
          style: { color: '#cccccc' }, 
          align: 'left', 
          x: 15,
          formatter: function () {
            return formatCompact(this.value)
          }
        },
        title: { text: null, style: { color: '#cccccc' } },
        plotLines: [
          // 현재가 라인 (전일 종가 대비 색상)
          ...(isFiniteNumber(lastPrice)
            ? [{
                id: 'current-price-line',
                value: Math.round(lastPrice * 100) / 100,
                color: lineColor,
                width: 0.75,
                zIndex: 10,
                // 현재가 텍스트 라벨은 마커 라벨로만 표시하여 중복 제거
              }]
            : []),
          // 전일 종가 기준선은 표시하지 않음
        ]
      },
      rangeSelector: { enabled: false },
      navigator: { enabled: false },
      scrollbar: { enabled: false },
      credits: { enabled: false },
      exporting: { enabled: false },
      accessibility: { enabled: false },
      chart: { backgroundColor: '#1a1a1a', animation: false },
      series: [
        { type: 'line', name: 'Price', color: '#00d4ff', lineWidth: 2, marker: { enabled: false }, data: chartData },
        { type: 'scatter', name: 'Last', data: last ? [[last[0], last[1]]] : [], color: lineColor,
          marker: { enabled: true, radius: 3, symbol: 'circle' },
          dataLabels: { enabled: true, formatter: function() {
            const val = Number(this.y)
            if (!isFinite(val)) return ''
            if (isFiniteNumber(prevClosePrice) && prevClosePrice !== 0) {
              const diff = val - prevClosePrice
              const pct = (diff / prevClosePrice) * 100
              const sign = diff > 0 ? '+' : diff < 0 ? '-' : ''
              return `$${val.toFixed(2)} (${sign}${Math.abs(pct).toFixed(2)}%, ${sign}$${Math.abs(diff).toFixed(2)})`
            }
            return `$${val.toFixed(2)}`
          }, style: { fontWeight: '900', color: lineColor, fontSize: '14px' } }
        }
      ]
    }

    let newChart
    try {
      newChart = Highcharts.stockChart(chartRef.current, options)
      setChart(newChart)
      return () => {
        if (newChart) {
          newChart.destroy()
          setChart(null)
        }
      }
    } catch (e) {
      console.error(`[MiniPriceChart_test - ${assetIdentifier}] chart init error:`, e)
    }
  }, [assetIdentifier, chartData, isLoading, xAxisRange])

  // 단순 구독: 마지막 포인트 마커/가격만 업데이트 (useWebSocket=true인 경우에만)
  useEffect(() => {
    if (!useWebSocket) return
    const { connect, subscribeSymbols, unsubscribeSymbols } = useWebSocketStore.getState()
    connect()
    subscribeSymbols([assetIdentifier])
    return () => unsubscribeSymbols([assetIdentifier])
  }, [assetIdentifier, useWebSocket])

  // WebSocket 가격으로 라인 및 마커 갱신, x축 우측 패딩 유지
  useEffect(() => {
    if (!chart) return
    if (!wsPrice) return
    const { price, timestamp_utc } = wsPrice
    const ts = new Date(timestamp_utc).getTime()
    const val = parseFloat(price)
    if (!isFinite(ts) || !isFinite(val)) return
    const lineSeries = chart.series && chart.series[0]
    const markerSeries = chart.series && chart.series[1]
    if (!lineSeries || !markerSeries) return
    // 전일 종가 대비 상승/하락/보합 판단 및 컬러 결정
    let isRising = null
    if (isFiniteNumber(val) && isFiniteNumber(prevClosePrice)) {
      const diff = val - prevClosePrice
      if (diff > 0) isRising = true
      else if (diff < 0) isRising = false
      else isRising = null
    }
    const lineColor = isRising === null ? '#999999' : (isRising ? '#18c58f' : '#ff4d4f')

    // yAxis plotLines 업데이트 (현재가/전일종가)
    const yAxis = chart.yAxis && chart.yAxis[0]
      if (yAxis) {
      const plotLines = []
      if (isFiniteNumber(val)) {
        plotLines.push({
          id: 'current-price-line',
          value: Math.round(val * 100) / 100,
          color: lineColor,
          width: 0.75,
          zIndex: 10,
          // 현재가 텍스트 라벨은 마커 라벨로만 표시하여 중복 제거
        })
      }
      // prev-close plot line 제거
      yAxis.update({ plotLines }, false)
    }

    // 메인 라인 시리즈 업데이트: 마지막 포인트와 이어지도록 동작
    const lastPointObject = lineSeries.data && lineSeries.data.length > 0 ? lineSeries.data[lineSeries.data.length - 1] : null
    if (!lastPointObject) {
      lineSeries.addPoint([ts, val], false, false, false)
    } else {
      // 동일 버킷 판정: 1분(60000ms) 이내면 업데이트, 초과 시 새 포인트 추가
      const isSameBucket = Math.abs(ts - lastPointObject.x) < (60 * 1000)
      if (isSameBucket) {
        // x, y 모두 업데이트하여 라인 끝과 마커가 동일 시각으로 정렬되도록 함
        lastPointObject.update([ts, val], false)
      } else {
        lineSeries.addPoint([ts, val], false, false, false)
      }
    }

    // x축 우측 패딩 4시간 유지: 현재 시각을 기준으로 max를 앞으로 밀기
    const xAxis = chart.xAxis && chart.xAxis[0]
    if (xAxis) {
      const rightPadMs = 4 * 60 * 60 * 1000
      const extremes = xAxis.getExtremes()
      const newMax = ts + rightPadMs
      const newMin = extremes && isFinite(extremes.min) ? extremes.min : undefined
      if (!extremes || !isFinite(extremes.max) || newMax > extremes.max) {
        xAxis.setExtremes(newMin, newMax, false, false)
      }
    }

    // 마커 및 라벨 컬러 반영 후 데이터 갱신
    markerSeries.update({
      color: lineColor,
      dataLabels: {
        formatter: function () {
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
    markerSeries.setData([[ts, val]], false, false, false)

    chart.redraw()
  }, [chart, wsPrice])

    return (
        <div className="mini-price-chart-container">
            <div 
                ref={chartRef} 
                id={containerId}
                className={`mini-price-chart ${isLoading ? 'loading' : ''} ${error ? 'error' : ''}`}
                style={{ height: isMobile ? '200px' : '300px' }}
            />
        </div>
  )
}

export default MiniPriceChartTest


