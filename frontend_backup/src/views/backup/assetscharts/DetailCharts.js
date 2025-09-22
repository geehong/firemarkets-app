import React, { useEffect, useState } from 'react'
import HighchartsReact from 'highcharts-react-official'
import axios from 'axios'

// Highcharts 모듈들을 import 및 초기화
import Highcharts from 'highcharts/highstock'
import 'highcharts/modules/exporting'
import 'highcharts/modules/export-data'
import 'highcharts/modules/accessibility'
import 'highcharts/modules/stock-tools'
import 'highcharts/modules/full-screen'
import 'highcharts/modules/annotations-advanced'
import 'highcharts/modules/price-indicator'
import 'highcharts/indicators/indicators-all'

const DetailCharts = ({ assetIdentifier, dataInterval = '1d' }) => {
  const [chartData, setChartData] = useState(null)
  const [volumeData, setVolumeData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchChartData = async () => {
      if (!assetIdentifier) return
      setLoading(true)
      setError(null)
      try {
        console.log('Fetching chart data for:', assetIdentifier)
        // 먼저 전체 데이터 개수를 확인
        const countResponse = await axios.get(
          `/api/ohlcv/${assetIdentifier}?data_interval=${dataInterval}&limit=1`,
        )
        const totalCount = countResponse.data?.total_count || 10000

        // 전체 데이터 요청 (최대 10000개)
        const response = await axios.get(
          `/api/ohlcv/${assetIdentifier}?data_interval=${dataInterval}&limit=${Math.min(totalCount, 10000)}`,
        )
        console.log('API Response:', response.data)

        // API 응답 구조 확인 및 데이터 추출
        const data = response.data?.data || response.data || []
        console.log('Processed data:', data)

        if (data && data.length > 0) {
          const ohlcData = data
            .map((item) => [
              new Date(item.timestamp_utc).getTime(),
              parseFloat(item.open_price) || 0,
              parseFloat(item.high_price) || 0,
              parseFloat(item.low_price) || 0,
              parseFloat(item.close_price) || 0,
            ])
            .filter((item) => item[0] > 0) // 유효한 날짜만 필터링

          const volumeData = data
            .map((item) => [new Date(item.timestamp_utc).getTime(), parseFloat(item.volume) || 0])
            .filter((item) => item[0] > 0) // 유효한 날짜만 필터링

          console.log('OHLC Data:', ohlcData)
          console.log('Volume Data:', volumeData)

          setChartData(ohlcData)
          setVolumeData(volumeData)
        } else {
          setError('차트 데이터가 없습니다.')
        }
      } catch (err) {
        console.error('Chart data fetch error:', err)
        setError(`차트 데이터를 불러오는데 실패했습니다: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }
    fetchChartData()
  }, [assetIdentifier, dataInterval])

  const chartOptions = {
    chart: { height: 600, backgroundColor: '#fff' },
    title: { text: `${assetIdentifier} Price Chart` },
    subtitle: { text: 'OHLCV Data' },
    stockTools: { gui: { enabled: true } },
    xAxis: { type: 'datetime' },
    yAxis: [
      {
        labels: { align: 'left', format: '{value:.2f}' },
        height: '70%',
        resize: { enabled: true },
        title: { text: 'Price' },
      },
      {
        labels: { align: 'left', format: '{value:.0f}' },
        top: '70%',
        height: '30%',
        offset: 0,
        title: { text: 'Volume' },
      },
    ],
    rangeSelector: { selected: 4 },
    tooltip: { shared: true },
    series: [
      { type: 'candlestick', id: 'price', name: `${assetIdentifier} Price`, data: chartData || [] },
      {
        type: 'column',
        id: 'volume',
        name: `${assetIdentifier} Volume`,
        data: volumeData || [],
        yAxis: 1,
        color: '#7cb5ec',
        opacity: 0.7,
      },
    ],
    credits: { enabled: false },
    exporting: { enabled: true },
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>{error}</div>
  if (!chartData || chartData.length === 0) return <div>차트 데이터가 없습니다.</div>

  return (
    <HighchartsReact
      highcharts={Highcharts}
      constructorType={'stockChart'}
      options={chartOptions}
    />
  )
}

export default DetailCharts
