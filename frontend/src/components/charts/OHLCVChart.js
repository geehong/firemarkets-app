import React, { useEffect, useState } from 'react'
import HighchartsReact from 'highcharts-react-official'
import axios from 'axios'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import CardTools from '../common/CardTools'

// Highcharts 모듈들을 import 및 초기화
import Highcharts from 'highcharts/highstock'
import 'highcharts/modules/exporting'
// import 'highcharts/modules/export-data' // 문제가 있는 모듈 제거
import 'highcharts/modules/accessibility'
// import 'highcharts/modules/stock-tools' // 문제가 있는 모듈 제거
// import 'highcharts/modules/full-screen' // 문제가 있는 모듈 제거
// import 'highcharts/modules/annotations-advanced' // 문제가 있는 모듈 제거
// import 'highcharts/modules/price-indicator' // 문제가 있는 모듈 제거
// import 'highcharts/indicators/indicators-all' // 문제가 있는 모듈 제거

const OHLCVChart = ({
  assetIdentifier,
  dataInterval = '1d',
  height = 600,
  showVolume = true,
  showRangeSelector = true,
  showStockTools = true,
  showExporting = true,
  title,
  subtitle = 'OHLCV Data',
  backgroundColor = '#fff',
  volumeColor = '#7cb5ec',
  volumeOpacity = 0.7,
  maxDataPoints = 10000,
  onDataLoad,
  onError,
  customOptions = {},
  // 외부에서 전달받은 데이터 (선택적)
  externalOhlcvData = null,
}) => {
  const [chartData, setChartData] = useState(null)
  const [volumeData, setVolumeData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchChartData = async () => {
      if (!assetIdentifier) return

      // 외부 데이터가 있으면 그것을 사용
      if (externalOhlcvData && externalOhlcvData.length > 0) {
        console.log('OHLCVChart - Using external data:', externalOhlcvData.length, 'records')
        console.log('OHLCVChart - External data sample:', externalOhlcvData.slice(0, 3))

        const ohlcData = externalOhlcvData
          .map((item) => [
            new Date(item.timestamp_utc).getTime(),
            parseFloat(item.open_price) || 0,
            parseFloat(item.high_price) || 0,
            parseFloat(item.low_price) || 0,
            parseFloat(item.close_price) || 0,
          ])
          .filter((item) => item[0] > 0) // 유효한 날짜만 필터링

        const volumeData = externalOhlcvData
          .map((item) => [new Date(item.timestamp_utc).getTime(), parseFloat(item.volume) || 0])
          .filter((item) => item[0] > 0) // 유효한 날짜만 필터링

        console.log('OHLCVChart - Processed OHLC data:', ohlcData.slice(0, 3))
        console.log('OHLCVChart - Processed volume data:', volumeData.slice(0, 3))
        setChartData(ohlcData)
        setVolumeData(volumeData)
        setLoading(false)
        return
      }

      // 외부 데이터가 없으면 API에서 가져오기
      setLoading(true)
      setError(null)
      try {
        console.log('Fetching chart data for:', assetIdentifier)
        
        // 최근 2달 데이터만 가져오기 (기본값)
        const endDate = new Date()
        const startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 2)
        
        const response = await axios.get(
          `/api/v1/ohlcv/${assetIdentifier}?data_interval=${dataInterval}&start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}&limit=${maxDataPoints}`,
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

          // Callback for data load
          if (onDataLoad) {
            onDataLoad({ ohlcData, volumeData, totalCount: data.length })
          }
        } else {
          setError('차트 데이터가 없습니다.')
        }
      } catch (err) {
        console.error('Chart data fetch error:', err)
        const errorMessage = `차트 데이터를 불러오는데 실패했습니다: ${err.message}`
        setError(errorMessage)
        if (onError) {
          onError(errorMessage)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchChartData()
  }, [assetIdentifier, dataInterval, maxDataPoints, onDataLoad, onError, externalOhlcvData])

  const chartOptions = {
    chart: {
      height: height,
      backgroundColor: backgroundColor,
    },
    title: {
      text: title || `${assetIdentifier} Price Chart`,
    },
    subtitle: {
      text: subtitle,
    },
    stockTools: {
      gui: { enabled: showStockTools },
    },
    xAxis: {
      type: 'datetime',
    },
    yAxis: [
      {
        labels: { align: 'left', format: '{value:.2f}' },
        height: showVolume ? '70%' : '100%',
        resize: { enabled: true },
        title: { text: 'Price' },
      },
      ...(showVolume
        ? [
            {
              labels: { align: 'left', format: '{value:.0f}' },
              top: '70%',
              height: '30%',
              offset: 0,
              title: { text: 'Volume' },
            },
          ]
        : []),
    ],
    rangeSelector: {
      selected: showRangeSelector ? 4 : undefined,
      enabled: showRangeSelector,
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
              data: volumeData || [],
              yAxis: 1,
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
    ...customOptions,
  }

  console.log('[OHLCVChart] Render state:', { 
    loading, 
    error, 
    chartDataLength: chartData?.length,
    hasVolumeData: !!volumeData,
    volumeDataLength: volumeData?.length
  })
  
  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <span className="ms-3">Loading chart data...</span>
    </div>
  )
  
  if (error) return (
    <div className="alert alert-danger">
      <h5>Chart Error</h5>
      <p>{error}</p>
    </div>
  )
  
  if (!chartData || chartData.length === 0) return (
    <div className="alert alert-warning">
      <h5>No Data Available</h5>
      <p>차트 데이터가 없습니다. (데이터 포인트: {chartData?.length || 0})</p>
    </div>
  )

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">가격 차트 - {assetIdentifier}</h5>
        <CardTools />
      </CCardHeader>
      <CCardBody>
        <div style={{ height: `${height}px` }}>
          <HighchartsReact
            highcharts={Highcharts}
            constructorType={'stockChart'}
            options={chartOptions}
          />
        </div>
      </CCardBody>
    </CCard>
  )
}

export default OHLCVChart
