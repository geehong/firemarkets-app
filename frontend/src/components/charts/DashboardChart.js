import React, { useEffect, useRef, useState, useCallback } from 'react'

import { CChartLine } from '@coreui/react-chartjs'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import { getStyle } from '@coreui/utils'

const DashboardChart = ({
  assets = [
    { symbol: 'BTCUSDT', color: '#F7931A', label: 'Bitcoin', yAxisID: 'y-btc' },
    { symbol: 'GCUSD', color: '#FFD700', label: 'Gold', yAxisID: 'y-gold' },
    { symbol: 'SPY', color: '#006400', label: 'SPDR S&P 500 ETF', yAxisID: 'y-spy' },
    { symbol: 'MSFT', color: '#0078D4', label: 'Microsoft', yAxisID: 'y-msft' },
  ],
  dataInterval = '1d',
  startDate,
  endDate,
  height = '300px',
  showLegend = true,
  showTooltip = true,
  lineTension = 0.4,
  pointRadius = 0,
  maxTicksLimit = 12,
  title = 'Asset Price Chart',
  onDataLoad,
  onError,
  onRemove,
  onRefresh,
}) => {
  const chartRef = useRef(null)
  const [chartData, setChartData] = useState(null)
  const [scales, setScales] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [lastFetchParams, setLastFetchParams] = useState(null)

  // Default date range if not provided
  const getDefaultDateRange = useCallback(() => {
    const today = new Date()
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
    return {
      start: startDate || oneYearAgo.toISOString().split('T')[0],
      end: endDate || today.toISOString().split('T')[0],
    }
  }, [startDate, endDate])

  const fetchAll = useCallback(async () => {
    const currentParams = JSON.stringify({ assets, dataInterval, startDate, endDate })
    if (currentParams === lastFetchParams) {
      return
    }

    setLoading(true)
    setError(null)
    setLastFetchParams(currentParams)

    try {
      const { start, end } = getDefaultDateRange()
      // console.log('Fetching chart data for date range:', start, 'to', end)

      // 최적화: 병렬 요청으로 변경하여 로딩 시간 단축
      const promises = assets.map(async ({ symbol }, index) => {
        try {
          // console.log(`Fetching data for ${symbol} (${index + 1}/${assets.length})`)

          const resp = await fetch(
            `/api/v1/ohlcv/${symbol}?data_interval=${dataInterval}&start_date=${start}&end_date=${end}`,
          )

          if (!resp.ok) {
            // console.warn(`Failed to fetch data for ${symbol}:`, resp.status, resp.statusText)
            return [] // 빈 배열 반환하여 차트가 깨지지 않도록
          }

          const jsonResponse = await resp.json()
          // console.log('API raw response for', symbol, ':', jsonResponse)
          const data = Array.isArray(jsonResponse) ? jsonResponse : jsonResponse.data || []
          // console.log('Parsed data for', symbol, ':', data)

          const parsed =
            data.map((item) => ({
              time: item.timestamp_utc.split('T')[0],
              close: parseFloat(item.close_price),
            })) || []

          // console.log(`Successfully fetched ${parsed.length} data points for ${symbol}`)
          return parsed
        } catch (err) {
          // console.warn(`Error fetching data for ${symbol}:`, err)
          return [] // 에러 시 빈 배열 반환
        }
      })

      // 병렬로 모든 요청 실행
      const results = await Promise.all(promises)

      // 유효한 데이터가 있는지 확인
      const validResults = results.filter((arr) => arr.length > 0)
      if (validResults.length === 0) {
        setError('No valid data available for any assets')
        setLoading(false)
        return
      }

      // x축 라벨(날짜) 통합 (모든 자산의 날짜를 합집합)
      const allDatesSet = new Set()
      validResults.forEach((arr) => arr.forEach((d) => allDatesSet.add(d.time)))
      const allDates = Array.from(allDatesSet).sort()

      // 각 자산별로 날짜에 맞는 데이터 매핑 (없으면 null)
      const datasets = assets.map((asset, idx) => {
        const arr = results[idx] || []
        const priceMap = Object.fromEntries(arr.map((d) => [d.time, d.close]))
        return {
          label: asset.label,
          data: allDates.map((date) => priceMap[date] ?? null),
          borderColor: asset.color,
          backgroundColor: 'transparent',
          pointBackgroundColor: asset.color,
          borderWidth: 2,
          spanGaps: true,
          yAxisID: asset.yAxisID,
        }
      })

      // 각 데이터셋의 min/max 계산
      const yScales = {}
      datasets.forEach((ds, idx) => {
        const vals = ds.data.filter((v) => v !== null)
        if (vals.length > 0) {
          const min = Math.min(...vals)
          const max = Math.max(...vals)
          yScales[assets[idx].yAxisID] = {
            type: 'linear',
            display: false, // 눈금/라벨 숨김
            min: min,
            max: max,
            position: idx % 2 === 0 ? 'left' : 'right',
            grid: { drawOnChartArea: false },
            ticks: { display: false },
          }
        }
      })

      const finalChartData = { labels: allDates, datasets }
      console.log('Chart data prepared:', finalChartData)

      setChartData(finalChartData)
      setScales({
        ...yScales,
        x: {
          type: 'category',
          grid: { color: getStyle('--cui-border-color-translucent'), drawOnChartArea: false },
          ticks: { color: getStyle('--cui-body-color'), maxTicksLimit, autoSkip: true },
        },
      })

      // Callback for data load
      if (onDataLoad) {
        onDataLoad(finalChartData)
      }
    } catch (e) {
      console.error('Chart data fetch error:', e)
      setError(e.message)
      if (onError) {
        onError(e.message)
      }
    } finally {
      setLoading(false)
      setIsInitialized(true)
    }
  }, [
    assets,
    dataInterval,
    startDate,
    endDate,
    getDefaultDateRange,
    onDataLoad,
    onError,
    lastFetchParams,
    chartData,
  ])

  useEffect(() => {
    // 컴포넌트 마운트 시에만 실행
    fetchAll()
  }, []) // 빈 의존성 배열로 마운트 시에만 실행

  // assets, dataInterval, startDate, endDate가 변경될 때만 재실행
  useEffect(() => {
    if (isInitialized) {
      fetchAll()
    }
  }, [assets, dataInterval, startDate, endDate])

  // Color scheme change handler
  useEffect(() => {
    const handleColorSchemeChange = () => {
      if (chartRef.current && chartData && isInitialized) {
        setTimeout(() => {
          try {
            if (chartRef.current && chartRef.current.options && chartRef.current.options.scales) {
              chartRef.current.options.scales.x.grid.borderColor = getStyle(
                '--cui-border-color-translucent',
              )
              chartRef.current.options.scales.x.grid.color = getStyle(
                '--cui-border-color-translucent',
              )
              chartRef.current.options.scales.x.ticks.color = getStyle('--cui-body-color')
              Object.values(chartRef.current.options.scales).forEach((scale) => {
                if (scale && scale.ticks) scale.ticks.color = getStyle('--cui-body-color')
              })
              chartRef.current.update('none') // 애니메이션 없이 업데이트
            }
          } catch (err) {
            console.warn('Error updating chart colors:', err)
          }
        }, 100)
      }
    }

    document.documentElement.addEventListener('ColorSchemeChange', handleColorSchemeChange)

    return () => {
      document.documentElement.removeEventListener('ColorSchemeChange', handleColorSchemeChange)
    }
  }, [chartRef, chartData, isInitialized])

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div>Loading chart data...</div>
        </div>
      )
    }

    if (error) {
      return (
        <div
          style={{
            height,
            color: 'red',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div>Error: {error}</div>
        </div>
      )
    }

    if (!chartData || !scales || !isInitialized) {
      return (
        <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div>Initializing chart...</div>
        </div>
      )
    }

    return (
      <CChartLine
        ref={chartRef}
        style={{ height, marginTop: '40px' }}
        data={chartData}
        options={{
          maintainAspectRatio: false,
          responsive: true,
          animation: {
            duration: 0, // 애니메이션 비활성화로 깜박거림 방지
          },
          plugins: {
            legend: {
              display: showLegend,
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
              enabled: showTooltip,
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
              tension: lineTension,
            },
            point: {
              radius: pointRadius,
              hitRadius: 10,
              hoverRadius: 4,
              hoverBorderWidth: 3,
            },
          },
        }}
      />
    )
  }

  return (
    <CCard className="mb-4">
      <CCardHeader>
        <div className="card-title">{title}</div>
      </CCardHeader>
      <CCardBody>{renderContent()}</CCardBody>
    </CCard>
  )
}

export default DashboardChart
