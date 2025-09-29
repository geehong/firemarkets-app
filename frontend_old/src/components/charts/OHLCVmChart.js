import React, { useEffect, useState } from 'react'
import HighchartsReact from 'highcharts-react-official'
import axios from 'axios'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import CardTools from '../common/CardTools'

// Highcharts 모듈들을 import 및 초기화
import Highcharts from 'highcharts/highstock'
import 'highcharts/modules/exporting'
import 'highcharts/modules/accessibility'

const OHLCVmChart = ({
  assetIdentifier,
  dataInterval = '1d',
  height = 350, // 모바일에서는 높이를 줄임
  showVolume = true,
  showRangeSelector = true,
  showStockTools = false, // 모바일에서는 비활성화
  showExporting = false, // 모바일에서는 비활성화
  title,
  subtitle = 'OHLCV Data',
  backgroundColor = '#fff',
  volumeColor = '#7cb5ec',
  volumeOpacity = 0.7,
  maxDataPoints = 500, // 모바일에서는 데이터 포인트 수 제한
  onDataLoad,
  onError,
  customOptions = {},
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
        console.log('OHLCVmChart - Using external data:', externalOhlcvData.length, 'records')

        const ohlcData = externalOhlcvData
          .slice(0, maxDataPoints) // 모바일에서는 데이터 포인트 수 제한
          .map((item) => [
            new Date(item.timestamp_utc).getTime(),
            parseFloat(item.open_price) || 0,
            parseFloat(item.high_price) || 0,
            parseFloat(item.low_price) || 0,
            parseFloat(item.close_price) || 0,
          ])
          .filter((item) => item[0] > 0)

        const volumeData = externalOhlcvData
          .slice(0, maxDataPoints)
          .map((item) => [new Date(item.timestamp_utc).getTime(), parseFloat(item.volume) || 0])
          .filter((item) => item[0] > 0)

        setChartData(ohlcData)
        setVolumeData(volumeData)
        setLoading(false)
        return
      }

      // 외부 데이터가 없으면 API에서 가져오기
      setLoading(true)
      setError(null)
      try {
        console.log('Fetching mobile chart data for:', assetIdentifier)
        
        // 모바일에서는 최근 1개월 데이터만 가져오기
        const endDate = new Date()
        const startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 1)
        
        const response = await axios.get(
          `/api/v1/ohlcv/${assetIdentifier}?data_interval=${dataInterval}&start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}&limit=${maxDataPoints}`,
        )

        const data = response.data?.data || response.data || []

        if (data && data.length > 0) {
          const ohlcData = data
            .map((item) => [
              new Date(item.timestamp_utc).getTime(),
              parseFloat(item.open_price) || 0,
              parseFloat(item.high_price) || 0,
              parseFloat(item.low_price) || 0,
              parseFloat(item.close_price) || 0,
            ])
            .filter((item) => item[0] > 0)

          const volumeData = data
            .map((item) => [new Date(item.timestamp_utc).getTime(), parseFloat(item.volume) || 0])
            .filter((item) => item[0] > 0)

          setChartData(ohlcData)
          setVolumeData(volumeData)

          if (onDataLoad) {
            onDataLoad({ ohlcData, volumeData, totalCount: data.length })
          }
        } else {
          setError('차트 데이터가 없습니다.')
        }
      } catch (err) {
        console.error('Mobile chart data fetch error:', err)
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

  // 모바일 최적화된 차트 옵션
  const chartOptions = {
    chart: {
      height: height,
      backgroundColor: backgroundColor,
      spacing: [10, 5, 10, 5], // 좌우 여백을 더 줄여서 차트 영역 확대
      zoomType: 'xy', // 줌 기능 활성화
      panning: { enabled: true, type: 'xy' }, // 팬 기능
    },
    title: {
      text: title || `${assetIdentifier} Price Chart`,
      style: { fontSize: '16px', fontWeight: 'bold' }
    },
    subtitle: {
      text: subtitle,
      style: { fontSize: '12px' }
    },
    stockTools: {
      gui: { enabled: showStockTools },
    },
    xAxis: {
      type: 'datetime',
      labels: {
        style: { fontSize: '11px' }
      }
    },
    yAxis: [
      {
        labels: { 
          enabled: false // 가격 라벨 숨기기
        },
        height: showVolume ? '70%' : '100%',
        resize: { enabled: true },
        title: { 
          text: 'Price',
          style: { fontSize: '12px' }
        },
        gridLineWidth: 0, // 그리드 라인도 숨기기
      },
      ...(showVolume
        ? [
            {
              labels: { 
                enabled: false // 거래량 라벨도 숨기기
              },
              top: '70%',
              height: '30%',
              offset: 0,
              title: { 
                text: 'Volume',
                style: { fontSize: '12px' }
              },
              gridLineWidth: 0, // 그리드 라인도 숨기기
            },
          ]
        : []),
    ],
    rangeSelector: {
      selected: showRangeSelector ? 2 : undefined, // 기본값을 3개월로 변경
      enabled: showRangeSelector,
      buttons: [
        {
          type: 'week',
          count: 1,
          text: '1W',
          title: 'View 1 week'
        },
        {
          type: 'month',
          count: 1,
          text: '1M',
          title: 'View 1 month'
        },
        {
          type: 'month',
          count: 3,
          text: '3M',
          title: 'View 3 months'
        },
        {
          type: 'all',
          text: 'ALL',
          title: 'View all'
        }
      ],
      inputEnabled: false, // 모바일에서는 입력 필드 비활성화
      buttonTheme: {
        width: 60,
        height: 30,
        style: {
          fontSize: '12px'
        }
      }
    },
    tooltip: {
      shared: true,
      useHTML: true,
      style: { fontSize: '12px' },
      positioner: function() {
        return { x: 10, y: 10 }; // 모바일에서 툴팁 위치 고정
      },
      formatter: function() {
        const date = Highcharts.dateFormat('%Y-%m-%d', this.x)
        let tooltip = `<b>${date}</b><br/>`
        
        this.points.forEach(point => {
          if (point.series.type === 'candlestick') {
            tooltip += `<span style="color:${point.color}">●</span> ${point.series.name}:<br/>`
            tooltip += `Open: $${point.open?.toFixed(2) || 'N/A'}<br/>`
            tooltip += `High: $${point.high?.toFixed(2) || 'N/A'}<br/>`
            tooltip += `Low: $${point.low?.toFixed(2) || 'N/A'}<br/>`
            tooltip += `Close: $${point.close?.toFixed(2) || 'N/A'}<br/>`
          } else {
            tooltip += `<span style="color:${point.color}">●</span> ${point.series.name}: ${point.y?.toLocaleString() || 'N/A'}<br/>`
          }
        })
        
        return tooltip
      }
    },
    plotOptions: {
      candlestick: {
        point: {
          events: {
            click: function() {
              // 터치 시 상세 정보 표시 (선택적)
              console.log('Candlestick clicked:', this)
            }
          }
        }
      }
    },
    series: [
      {
        type: 'candlestick',
        id: 'price',
        name: `${assetIdentifier} Price`,
        data: chartData || [],
        color: '#26a69a',
        upColor: '#26a69a',
        downColor: '#ef5350',
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
    // 모바일 성능 최적화
    dataGrouping: {
      enabled: true,
      forced: true,
      units: [['day', [1]]]
    },
    ...customOptions,
  }

  console.log('[OHLCVmChart] Render state:', { 
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

export default OHLCVmChart
