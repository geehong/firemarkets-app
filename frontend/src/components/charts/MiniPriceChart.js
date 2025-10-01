import React, { useMemo, useEffect, useState, useRef } from 'react'
import Highcharts from 'highcharts/highstock'
import HighchartsReact from 'highcharts-react-official'

const MiniPriceChart = ({ assetIdentifier = 'BTCUSDT', delayData, wsPrices }) => {
  // isLoading 상태는 이제 MainDashboard에서 관리되어야 하지만,
  // 여기서는 delayData 유무로 로딩 상태를 판단합니다.
  const isLoading = !delayData;

  // Map quotes -> [timestampMs, close(price)]
  const seriesData = useMemo(() => {
    const quotes = delayData || []
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

  // API 요청 로그 (지연 데이터만)
  useEffect(() => {
    console.log(`[MiniPriceChart] ${assetIdentifier} API 요청 상태:`, {
      delayData: delayData ? Object.keys(delayData) : 'No delay data'
    })
  }, [assetIdentifier, delayData])

  const chartRef = useRef(null)
  const [lastPointData, setLastPointData] = useState([])
  const [yAxisRange, setYAxisRange] = useState({ min: null, max: null })
  const [isYAxisInitialized, setIsYAxisInitialized] = useState(false)

  // temp_debug.js 방식으로 마지막 포인트 업데이트
  useEffect(() => {
    if (!seriesData || seriesData.length === 0) return;

    const n = seriesData.length;
    const lastClose = seriesData[n - 1][1];
    const prevTs = n > 1 ? seriesData[n - 2][0] : seriesData[n - 1][0];
    const prevY = n > 1 ? seriesData[n - 2][1] : seriesData[n - 1][1];
    const lastTs = seriesData[n - 1][0];
    const nowTs = Date.now(); // 마지막 포인트를 현재 시간으로 설정

    const upId2 = String(assetIdentifier).toUpperCase()
    const wsPriceRaw = wsPrices?.[upId2]?.price ?? wsPrices?.[`${upId2}USDT`]?.price
    const wsPrice = typeof wsPriceRaw !== 'undefined' ? Number(wsPriceRaw) : undefined
    

    
    // 우선순위: WebSocket > 마지막 가격
    const next = (typeof wsPrice === 'number' && isFinite(wsPrice))
      ? wsPrice
      : lastClose

    const change = next - prevY
    const changePercent = prevY !== 0 ? (change / prevY) * 100 : 0
    const isUp = change >= 0
    const upColor = '#18c58f'
    const downColor = '#ff4d4f'

    // 가중치 적용: 움직임을 30% 더 크게 (1.3배)
    const weightedChange = change * 1.3
    const weightedNext = prevY + weightedChange

    // --- Y축 범위 초기 설정 (한 번만) ---
    if (!isYAxisInitialized) {
      // 초기 데이터 기준으로 Y축 범위 설정 (PgSql 방식과 동일)
      const prices = seriesData.map(p => p[1]);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceRange = maxPrice - minPrice;
      const padding = priceRange * 0.1; // 10% 패딩 (PgSql과 동일)
      
      setYAxisRange({
        min: parseFloat((minPrice - padding).toFixed(4)),
        max: parseFloat((maxPrice + padding).toFixed(4))
      });
      setIsYAxisInitialized(true);
    }

    // React 상태를 업데이트하여 차트 리렌더링을 유도
    const newLastPoint = {
      x: nowTs, // X축을 현재 시간으로 업데이트
      y: weightedNext, // 가중치가 적용된 가격 사용 (30% 증폭)
      color: isUp ? upColor : downColor,
      marker: { enabled: true, fillColor: isUp ? upColor : downColor, lineColor: '#ffffff', lineWidth: 2, radius: 5 },
      custom: { prevY, change: weightedChange, changePercent: changePercent * 1.3, isUp }
    };
    
    // 연결선 시작점을 마지막 데이터 포인트로 설정
    const p1 = { x: lastTs, y: lastClose, marker: { enabled: false }, dataLabels: { enabled: false }, color: isUp ? upColor : downColor };
    setLastPointData([p1, newLastPoint]);

  }, [wsPrices, seriesData, assetIdentifier]);

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

  // X축 범위는 초기에 한 번만 설정하여 좌우 이동 방지 (PgSql 방식과 동일)
  const [xAxisRange, setXAxisRange] = useState({ min: null, max: null })
  const [isXAxisInitialized, setIsXAxisInitialized] = useState(false)
  
  useEffect(() => {
    if (!seriesData || seriesData.length === 0 || isXAxisInitialized) return;
    
    const timestamps = seriesData.map(p => p[0]);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    
    // 좌/우 패딩: 좌 2시간, 우 4시간 (PgSql과 동일)
    const leftPaddingMs = 2 * 60 * 60 * 1000;  // 2h
    const rightPaddingMs = 4 * 60 * 60 * 1000; // 4h
    
    setXAxisRange({
      min: Math.round(minTime - leftPaddingMs),
      max: Math.round(maxTime + rightPaddingMs)
    });
    setIsXAxisInitialized(true);
  }, [seriesData, isXAxisInitialized, assetIdentifier]);

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
      min: xAxisRange.min,
      max: xAxisRange.max,
      minPadding: 0,
      maxPadding: 0,
      startOnTick: false,
      endOnTick: false
    },
    yAxis: {
      title: { text: 'Close', style: { color: '#a0a0a0' } },
      gridLineColor: '#333333',
      labels: { style: { color: '#a0a0a0' }, formatter: function () { return typeof this.value === 'number' ? this.value.toFixed(2) : this.value } },
      min: yAxisRange.min,
      max: yAxisRange.max,
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
  }), [seriesData, assetIdentifier, lastPointData, xAxisRange, yAxisRange]);

  if (isLoading || !seriesData || seriesData.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '300px',
        width: '100%'
      }}>
        <div>Loading {assetIdentifier} chart...</div>
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
        ref={chartRef}
      />
    </>
  )
}

export default MiniPriceChart