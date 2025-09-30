import React, { useMemo, useEffect, useState, useRef } from 'react'
import Highcharts from 'highcharts/highstock'
import HighchartsReact from 'highcharts-react-official'
import { useDelaySparklinePg, useRealtimePricesPg } from '../../hooks/useRealtime'
import { useRealtimePricesWebSocket } from '../../hooks/useWebSocket'

const MiniPriceChart = ({ assetIdentifier = 'BTCUSDT' }) => {
  // Fetch delay quotes (15m interval, 1 day)
  const { data: delayData, isLoading } = useDelaySparklinePg(
    assetIdentifier ? [assetIdentifier] : [],
    '15m',
    1
  )

  // WebSocket 실시간 가격 (우선 사용), API는 폴백으로만 사용
  // WebSocket 구독 심볼: 기본 심볼이 USDT로 끝나지 않으면 USDT 페어도 같이 구독
  const wsSymbols = useMemo(() => {
    if (!assetIdentifier) return []
    const up = String(assetIdentifier).toUpperCase()
    return up.endsWith('USDT') ? [up] : [up, `${up}USDT`]
  }, [assetIdentifier])

  const { prices: wsPrices, connected: wsConnected } = useRealtimePricesWebSocket(wsSymbols)
  // API 폴백 (낮은 빈도)
  const { data: realtimeMap } = useRealtimePricesPg(
    assetIdentifier ? [assetIdentifier] : [],
    'crypto',
    { refetchInterval: 120000 }
  )

  // Map quotes -> [timestampMs, close(price)]
  const seriesData = useMemo(() => {
    const quotes = delayData?.[assetIdentifier] || []
    if (!Array.isArray(quotes) || quotes.length === 0) return []

    // Deduplicate by timestamp: prefer coinbase > binance > others
    const sourcePriority = { coinbase: 1, binance: 2 }
    const bestByTs = new Map()

    for (const q of quotes) {
      const t = q?.timestamp_utc || q?.timestamp
      const ts = t ? new Date(t).getTime() : undefined
      const priceNum = typeof q?.price !== 'undefined' ? Number(q.price) : undefined
      if (!ts || !isFinite(ts) || typeof priceNum !== 'number' || !isFinite(priceNum)) continue

      const prev = bestByTs.get(ts)
      if (!prev) {
        bestByTs.set(ts, q)
        continue
      }
      const prevRank = sourcePriority[prev?.data_source] ?? 999
      const curRank = sourcePriority[q?.data_source] ?? 999
      if (curRank < prevRank) {
        bestByTs.set(ts, q)
      }
    }

    const points = Array.from(bestByTs.entries())
      .map(([ts, q]) => [Number(ts), Number(q.price)])
      .sort((a, b) => a[0] - b[0])
    return points
  }, [delayData, assetIdentifier])

  // Debug: show first 10 and last 10 points actually used in the chart
  useEffect(() => {
    if (!seriesData || seriesData.length === 0) return
    const head = seriesData.slice(0, 10)
    const tail = seriesData.slice(-10)
    console.log('[MiniPriceChart] seriesData head(10):', head)
    console.log('[MiniPriceChart] seriesData tail(10):', tail)
    // Additionally log duplicate resolution stats
    const allTs = (delayData?.[assetIdentifier] || [])
      .map((q) => q?.timestamp_utc || q?.timestamp)
      .filter(Boolean)
    const uniqueCount = new Set(allTs).size
    console.log('[MiniPriceChart] dedup stats:', {
      total: allTs.length,
      unique: uniqueCount,
      removed: allTs.length - uniqueCount,
    })
  }, [seriesData])

  // Fixed Y-axis range based on current seriesData (like PgSql example)
  const [yAxisRange, setYAxisRange] = useState({ min: null, max: null })
  // Fixed X-axis range to prevent chart movement
  const [xAxisRange, setXAxisRange] = useState({ min: null, max: null })
  useEffect(() => {
    if (!seriesData || seriesData.length === 0) return
    const prices = seriesData.map(p => p[1]).filter(v => typeof v === 'number' && isFinite(v))
    if (prices.length === 0) return
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const range = maxPrice - minPrice
    const padding = range * 0.1 // 10% padding
          setYAxisRange({
      min: Number((minPrice - padding).toFixed(4)),
      max: Number((maxPrice + padding).toFixed(4)),
    })
    
    // Set X-axis range with padding (like PgSql example)
    const timestamps = seriesData.map(p => p[0]).filter(v => typeof v === 'number' && isFinite(v))
    if (timestamps.length > 0) {
      const minTime = Math.min(...timestamps)
      const maxTime = Math.max(...timestamps)
      // Add padding: left 2h, right 4h (like PgSql)
      const leftPaddingMs = 2 * 60 * 60 * 1000  // 2h
      const rightPaddingMs = 4 * 60 * 60 * 1000 // 4h
          setXAxisRange({
            min: Math.round(minTime - leftPaddingMs),
            max: Math.round(maxTime + rightPaddingMs)
      })
    }
  }, [seriesData])

  // 마지막 포인트: WebSocket 가격 우선, 없으면 마지막 종가
  const [lastAnimatedY, setLastAnimatedY] = useState(null)
  const baseYRef = useRef(null)

  // 기준 가격 갱신: WebSocket 가격 우선, 없으면 API, 최종적으로 마지막 종가
  useEffect(() => {
    if (!seriesData || seriesData.length === 0) return
    // WebSocket 가격: 정확 키 우선, 없으면 USDT 페어 키 참조
    const upId = String(assetIdentifier).toUpperCase()
    const wsPriceRaw = wsPrices?.[upId]?.price ?? wsPrices?.[`${upId}USDT`]?.price
    const wsPrice = typeof wsPriceRaw !== 'undefined' ? Number(wsPriceRaw) : undefined
    const apiPriceRaw = realtimeMap?.[upId]?.price ?? realtimeMap?.[`${upId}USDT`]?.price
    const apiPrice = typeof apiPriceRaw !== 'undefined' ? Number(apiPriceRaw) : undefined
    const close = seriesData[seriesData.length - 1][1]
    const base = (typeof wsPrice === 'number' && isFinite(wsPrice))
      ? wsPrice
      : (typeof apiPrice === 'number' && isFinite(apiPrice))
        ? apiPrice
        : close
    baseYRef.current = base
    setLastAnimatedY((prev) => (prev == null ? base : prev))
  }, [wsPrices, realtimeMap, seriesData, assetIdentifier])

  // WebSocket 업데이트 시 마지막 포인트를 즉시 갱신 (임의 변동 제거)
  useEffect(() => {
    if (!seriesData || seriesData.length === 0) return
    const lastClose = seriesData[seriesData.length - 1][1]
    const upId2 = String(assetIdentifier).toUpperCase()
    const wsPriceRaw = wsPrices?.[upId2]?.price ?? wsPrices?.[`${upId2}USDT`] ?.price
    const wsPrice = typeof wsPriceRaw !== 'undefined' ? Number(wsPriceRaw) : undefined
    const apiPriceRaw = realtimeMap?.[upId2]?.price ?? realtimeMap?.[`${upId2}USDT`]?.price
    const apiPrice = typeof apiPriceRaw !== 'undefined' ? Number(apiPriceRaw) : undefined
    const next = (typeof wsPrice === 'number' && isFinite(wsPrice))
      ? wsPrice
      : (typeof apiPrice === 'number' && isFinite(apiPrice))
        ? apiPrice
        : lastClose
    setLastAnimatedY(next)
  }, [wsPrices, realtimeMap, seriesData, assetIdentifier])

  const lastPointData = useMemo(() => {
    if (!seriesData || seriesData.length === 0) return []
    const n = seriesData.length
    const prevTs = n > 1 ? seriesData[n - 2][0] : seriesData[n - 1][0]
    const prevY = n > 1 ? seriesData[n - 2][1] : seriesData[n - 1][1]
    const lastTs = seriesData[n - 1][0]
    const y = (typeof lastAnimatedY === 'number' && isFinite(lastAnimatedY)) ? lastAnimatedY : seriesData[n - 1][1]
    const change = y - prevY
    const changePercent = prevY !== 0 ? (change / prevY) * 100 : 0
    const isUp = change >= 0
    const upColor = '#18c58f'
    const downColor = '#ff4d4f'
    // Connector point: no marker/label
    const p1 = { x: prevTs, y: prevY, marker: { enabled: false }, dataLabels: { enabled: false }, color: isUp ? upColor : downColor }
    // Last point with custom payload for label formatter
    const p2 = {
      x: lastTs,
      y,
      color: isUp ? upColor : downColor,
      marker: { enabled: true, fillColor: isUp ? upColor : downColor, lineColor: '#ffffff', lineWidth: 2, radius: 5 },
      custom: { prevY, change, changePercent, isUp }
    }
    return [p1, p2]
  }, [seriesData, lastAnimatedY])

  // Simple name mapping for title display
  const tickerNames = {
    BTCUSDT: 'Bitcoin',
    ETHUSDT: 'Ethereum',
    XRPUSDT: 'Ripple',
    ADAUSDT: 'Cardano',
    AVGO: 'Broadcom Inc.',
    TSLA: 'Tesla Inc.',
    GCUSD: 'Gold Spot',
    AAPL: 'Apple Inc.',
    MSFT: 'Microsoft Corporation',
    AMZN: 'Amazon.com, Inc.',
    NVDA: 'NVIDIA Corporation',
    GOOG: 'Alphabet Inc.',
    META: 'Meta Platforms Inc.',
    SPY: 'SPDR S&P 500 ETF Trust',
    QQQ: 'Invesco QQQ Trust',
  }
  const titleText = `${tickerNames[assetIdentifier] || assetIdentifier} (${assetIdentifier})`

  const options = useMemo(() => ({
    title: { text: titleText, style: { color: '#ffffff' } },
    chart: { height: 300, backgroundColor: '#1a1a1a', style: { fontFamily: 'Inter, sans-serif' }, animation: false },
    accessibility: { enabled: false },
    rangeSelector: {
      enabled: false,
        inputEnabled: false,
    },
    navigator: { enabled: false, height: 0 },
    scrollbar: { enabled: false },
    // Add right padding so the last point and its label have space
    xAxis: {
        type: 'datetime',
        gridLineWidth: 1,
        gridLineColor: '#333333',
        labels: { style: { color: '#a0a0a0' } },
      overscroll: 14400000, 
      maxPadding: 0.05,
      min: typeof xAxisRange.min === 'number' ? xAxisRange.min : undefined,
      max: typeof xAxisRange.max === 'number' ? xAxisRange.max : undefined,
        minPadding: 0,
      maxPadding: 0,
      startOnTick: false,
      endOnTick: false
    },
    yAxis: {
      title: { text: 'Close', style: { color: '#a0a0a0' } },
      gridLineColor: '#333333',
      labels: { style: { color: '#a0a0a0' }, formatter: function () { return typeof this.value === 'number' ? this.value.toFixed(2) : this.value } },
      min: typeof yAxisRange.min === 'number' ? yAxisRange.min : undefined,
      max: typeof yAxisRange.max === 'number' ? yAxisRange.max : undefined,
        minPadding: 0,
        maxPadding: 0,
        startOnTick: false,
        endOnTick: false,
        lastVisiblePrice: {
            enabled: true,
            label: {
                enabled: true,
                style: { color: '#000000', fontWeight: 'bold' },
                backgroundColor: '#00d4ff',
                borderColor: '#ffffff',
                borderWidth: 1,
                borderRadius: 2,
                padding: 2
            }
        }
    },
    // tooltip: { enabled: false },
    plotOptions: {
        series: {
            animation: false,
        dataLabels: {
          defer: false
        }
      },
      spline: { animation: false },
      line: { animation: false }
    },
    series: [
        {
        type: 'line',
        name: assetIdentifier,
        data: seriesData,
            color: '#00d4ff',
        lineWidth: 2,
        marker: { enabled: false }
        },
      // Highlight the last point with a visible marker and label (realtime price),
      // and draw a short connecting segment to the previous point
        {
            id: 'last-point',
            type: 'spline',
        name: 'Last',
        data: lastPointData,
            color: '#00d4ff',
            lineWidth: 1,
            className: 'highcharts-last-point-marker',
            marker: {
                enabled: true,
                symbol: 'circle',
                radius: 5,
          fillColor: '#00d4ff',
                lineColor: '#ffffff',
          lineWidth: 2,
            },
            dataLabels: {
                enabled: true,
                align: 'left',
                x: -150,
                y: 40,
                useHTML: true,
                defer: false,
                allowOverlap: true,
                overflow: 'allow',
                crop: false,
                formatter: function () {
                  const y = typeof this.y === 'number' ? this.y : null
                  const c = this.point?.custom
                  if (y == null || !c) return y
                  const fmt = (v) => (typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 4 }) : v)
                  const priceStr = fmt(y)
                  const chgAmt = c.change
                  const chgPct = c.changePercent
                  const signAmt = chgAmt >= 0 ? '+' : '-'
                  const signPct = chgPct >= 0 ? '+' : ''
                  const pctStr = `${signPct}${(Math.abs(chgPct)).toFixed(2)}%`
                  const amtStr = `${signAmt}${fmt(Math.abs(chgAmt))}`
                  const color = c.isUp ? '#18c58f' : '#ff4d4f'
                  return `<span style="color:${color}">${priceStr} (${pctStr}, ${amtStr})</span>`
                },
                backgroundColor: 'transparent',
                borderColor: 'transparent',
                borderWidth: 0,
                borderRadius: 0,
                padding: 4,
                style: { color: '#e6f7ff', fontWeight: 'bold', fontSize: '12px', textOutline: 'none' },
            },
      },
    ],
  }), [seriesData, assetIdentifier, lastPointData, xAxisRange, yAxisRange])

  if (isLoading && (!seriesData || seriesData.length === 0)) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '300px',
        width: '100%'
      }}>
        <div>Loading delay quotes...</div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes glowing {
          0% { filter: drop-shadow(0 0 3px #00d4ff); }
          50% { filter: drop-shadow(0 0 10px #00d4ff) drop-shadow(0 0 10px #00d4ff); }
          100% { filter: drop-shadow(0 0 3px #00d4ff); }
        }
        .highcharts-last-point-marker .highcharts-point {
          animation: glowing 1.5s infinite;
          transition: transform 0.5s ease-out;
        }
      `}</style>
      <HighchartsReact
        highcharts={Highcharts}
        constructorType={'stockChart'}
        options={options}
      />
    </>
  )
}

export default MiniPriceChart