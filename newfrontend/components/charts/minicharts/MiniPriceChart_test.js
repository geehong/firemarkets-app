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
      title: { text: `${assetIdentifier} Price`, align: 'left', verticalAlign: 'top', style: { fontSize: '14px', fontWeight: 'bold' } },
            xAxis: {
                type: 'datetime',
                min: xAxisRange.min,
                max: xAxisRange.max,
                gridLineColor: '#e6e6e6',
        labels: { enabled: true, style: { color: '#666666' } },
                lineColor: '#cccccc',
        tickColor: '#cccccc'
      },
            yAxis: {
                opposite: true,
                gridLineColor: '#e6e6e6',
        labels: { enabled: true, style: { color: '#666666' }, align: 'left', x: 15 },
        title: { text: 'Price (USD)', style: { color: '#666666' } },
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
      exporting: { enabled: false },
      accessibility: { enabled: false },
      chart: { backgroundColor: 'transparent', animation: false },
      series: [
        { type: 'line', name: 'Price', color: '#006064', lineWidth: 2, marker: { enabled: false }, data: chartData },
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

  // WebSocket 가격으로 마커 갱신
  useEffect(() => {
    if (!chart) return
    if (!wsPrice) return
    const { price, timestamp_utc } = wsPrice
    const ts = new Date(timestamp_utc).getTime()
    const val = parseFloat(price)
    if (!isFinite(ts) || !isFinite(val)) return
    const markerSeries = chart.series && chart.series[1]
    if (!markerSeries) return
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
    markerSeries.setData([[ts, val]], true, false, false)
  }, [chart, wsPrice])

    return (
        <div className="mini-price-chart-container">
            <div 
                ref={chartRef} 
                id={containerId}
                className={`mini-price-chart ${isLoading ? 'loading' : ''} ${error ? 'error' : ''}`}
                style={{ height: '300px' }}
            />
        </div>
  )
}

export default MiniPriceChartTest


