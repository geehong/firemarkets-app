import React, { useEffect, useRef, useState } from 'react'

import { CChartLine } from '@coreui/react-chartjs'
import { getStyle } from '@coreui/utils'

const ASSETS = [
  { symbol: 'BTCUSDT', color: '--cui-primary', label: 'BTCUSDT', yAxisID: 'y-btc' },
  { symbol: 'GCUSD', color: '--cui-info', label: 'GCUSD', yAxisID: 'y-gold' },
  { symbol: 'SPY', color: '--cui-warning', label: 'SPY', yAxisID: 'y-spy' },
  { symbol: 'MSFT', color: '--cui-danger', label: 'MSFT', yAxisID: 'y-msft' },
]

const MainChart = () => {
  const chartRef = useRef(null)
  const [chartData, setChartData] = useState(null)
  const [scales, setScales] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      setError(null)
      try {
        const today = new Date()
        const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
        const startDate = oneYearAgo.toISOString().split('T')[0]
        const endDate = today.toISOString().split('T')[0]
        // 여러 asset_id의 데이터를 병렬로 요청
        const results = await Promise.all(
          ASSETS.map(async ({ symbol }) => {
            const resp = await fetch(
              `/api/ohlcv/${symbol}?data_interval=1d&start_date=${startDate}&end_date=${endDate}`,
            )
            if (!resp.ok) throw new Error(`${symbol} fetch failed`)
            const jsonResponse = await resp.json()
            return jsonResponse.data.map((item) => ({
              time: item.timestamp_utc.split('T')[0],
              close: parseFloat(item.close_price),
            }))
          }),
        )
        // x축 라벨(날짜) 통합 (모든 자산의 날짜를 합집합)
        const allDatesSet = new Set()
        results.forEach((arr) => arr.forEach((d) => allDatesSet.add(d.time)))
        const allDates = Array.from(allDatesSet).sort()
        // 각 자산별로 날짜에 맞는 데이터 매핑 (없으면 null)
        const datasets = ASSETS.map((asset, idx) => {
          const arr = results[idx]
          const priceMap = Object.fromEntries(arr.map((d) => [d.time, d.close]))
          return {
            label: asset.label,
            data: allDates.map((date) => priceMap[date] ?? null),
            borderColor: getStyle(asset.color),
            backgroundColor: 'transparent',
            pointBackgroundColor: getStyle(asset.color),
            borderWidth: 2,
            spanGaps: true,
            yAxisID: asset.yAxisID,
          }
        })
        // 각 데이터셋의 min/max 계산
        const yScales = {}
        datasets.forEach((ds, idx) => {
          const vals = ds.data.filter((v) => v !== null)
          const min = Math.min(...vals)
          const max = Math.max(...vals)
          yScales[ASSETS[idx].yAxisID] = {
            type: 'linear',
            display: false, // 눈금/라벨 숨김
            min: min,
            max: max,
            position: idx % 2 === 0 ? 'left' : 'right',
            grid: { drawOnChartArea: false },
            ticks: { display: false },
          }
        })
        setChartData({ labels: allDates, datasets })
        setScales({
          ...yScales,
          x: {
            type: 'category',
            grid: { color: getStyle('--cui-border-color-translucent'), drawOnChartArea: false },
            ticks: { color: getStyle('--cui-body-color'), maxTicksLimit: 12, autoSkip: true },
          },
        })
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  useEffect(() => {
    document.documentElement.addEventListener('ColorSchemeChange', () => {
      if (chartRef.current && chartData) {
        setTimeout(() => {
          chartRef.current.options.scales.x.grid.borderColor = getStyle(
            '--cui-border-color-translucent',
          )
          chartRef.current.options.scales.x.grid.color = getStyle('--cui-border-color-translucent')
          chartRef.current.options.scales.x.ticks.color = getStyle('--cui-body-color')
          Object.values(chartRef.current.options.scales).forEach((scale) => {
            if (scale && scale.ticks) scale.ticks.color = getStyle('--cui-body-color')
          })
          chartRef.current.update()
        })
      }
    })
  }, [chartRef, chartData])

  if (loading)
    return (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    )
  if (error)
    return (
      <div
        style={{
          height: 300,
          color: 'red',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Error: {error}
      </div>
    )
  if (!chartData || !scales) return null

  return (
    <>
      <CChartLine
        ref={chartRef}
        style={{ height: '300px', marginTop: '40px' }}
        data={chartData}
        options={{
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              labels: {
                generateLabels: (chart) => {
                  // 데이터셋 label만 반환
                  return chart.data.datasets.map((ds, i) => ({
                    text: ds.label,
                    fillStyle: ds.borderColor,
                    strokeStyle: ds.borderColor,
                    lineWidth: 2,
                    hidden: !chart.isDatasetVisible(i),
                    index: i,
                  }))
                },
              },
            },
            tooltip: {
              enabled: true,
              callbacks: {
                label: function (context) {
                  let label = context.dataset.label || ''
                  if (label) label += ': '
                  if (context.parsed.y !== null) {
                    label += new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      maximumFractionDigits: 2,
                    }).format(context.parsed.y)
                  }
                  return label
                },
              },
            },
          },
          scales: scales,
          elements: {
            line: {
              tension: 0.4,
            },
            point: {
              radius: 0,
              hitRadius: 10,
              hoverRadius: 4,
              hoverBorderWidth: 3,
            },
          },
        }}
      />
    </>
  )
}

export default MainChart
