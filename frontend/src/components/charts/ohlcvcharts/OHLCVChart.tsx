"use client"

import React, { useEffect, useState } from 'react'
import HighchartsReact from 'highcharts-react-official'
import { useOhlcv, useIntraday, useDelayedQuotes } from '@/hooks'

// Highcharts 모듈들을 import 및 초기화
import Highcharts from 'highcharts/highstock'
import 'highcharts/modules/exporting'
import 'highcharts/modules/accessibility'
import 'highcharts/modules/full-screen'
import 'highcharts/modules/annotations-advanced'
import 'highcharts/modules/price-indicator'

interface OHLCVData {
  timestamp_utc: string
  open_price: string | number
  high_price: string | number
  low_price: string | number
  close_price: string | number
  volume: string | number
}

interface OHLCVChartProps {
  assetIdentifier: string
  dataInterval?: string
  height?: number
  showVolume?: boolean
  showRangeSelector?: boolean
  showExporting?: boolean
  title?: string
  subtitle?: string
  backgroundColor?: string
  volumeColor?: string
  volumeOpacity?: number
  maxDataPoints?: number
  onDataLoad?: (data: { ohlcData: number[][]; volumeData: number[][]; totalCount: number }) => void
  onError?: (error: string) => void
  customOptions?: Record<string, unknown>
  externalOhlcvData?: OHLCVData[] | null
  useIntradayData?: boolean
}

const OHLCVChart: React.FC<OHLCVChartProps> = ({
  assetIdentifier,
  dataInterval = '1d',
  height = 600,
  showVolume = true,
  showRangeSelector = true,
  showExporting = true,
  title,
  subtitle = 'OHLCV Data',
  backgroundColor = '#fff',
  volumeColor = '#7cb5ec',
  volumeOpacity = 0.7,
  maxDataPoints,
  onDataLoad,
  onError,
  customOptions = {},
  externalOhlcvData = null,
  useIntradayData = false,
}) => {
  const [chartData, setChartData] = useState<number[][] | null>(null)
  const [volumeData, setVolumeData] = useState<number[][] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 데이터 소스에 따른 API 선택 로직
  const isTimeData = useIntradayData // 시간 데이터 (15m, 1h, 4h)
  const isDailyData = !useIntradayData // 일간 데이터 (1d, 1w, 1m)

  // 시간 데이터 훅 (15m, 1h, 4h)
  const { 
    data: timeData, 
    isLoading: timeLoading, 
    error: timeError 
  } = useIntraday(assetIdentifier, {
    dataInterval,
    days: 1
  }, {
    enabled: !!assetIdentifier && isTimeData,
    staleTime: 1 * 60 * 1000, // 1분
    retry: 3,
  })

  // 15m 데이터는 별도 엔드포인트 사용
  const { 
    data: delayedData, 
    isLoading: delayedLoading, 
    error: delayedError 
  } = useDelayedQuotes([assetIdentifier], {
    enabled: !!assetIdentifier && isTimeData && dataInterval === '15m',
    staleTime: 1 * 60 * 1000, // 1분
    retry: 3,
  })

  // 일간 데이터 훅 (1d, 1w, 1m)
  const { 
    data: dailyData, 
    isLoading: dailyLoading, 
    error: dailyError 
  } = useOhlcv(assetIdentifier, {
    dataInterval
  }, {
    enabled: !!assetIdentifier && isDailyData,
    staleTime: 1 * 60 * 1000, // 1분
    retry: 3,
  })

  // 현재 사용할 데이터 결정
  const apiData = isTimeData ? (dataInterval === '15m' ? delayedData : timeData) : dailyData
  const apiLoading = isTimeData ? (dataInterval === '15m' ? delayedLoading : timeLoading) : dailyLoading
  const apiError = isTimeData ? (dataInterval === '15m' ? delayedError : timeError) : dailyError

  useEffect(() => {
    if (!assetIdentifier) return

    // 외부 데이터가 있으면 그것을 사용
    if (externalOhlcvData && externalOhlcvData.length > 0) {
      const ohlcData = externalOhlcvData
        .map((item) => [
          new Date(item.timestamp_utc).getTime(),
          parseFloat(String(item.open_price)) || 0,
          parseFloat(String(item.high_price)) || 0,
          parseFloat(String(item.low_price)) || 0,
          parseFloat(String(item.close_price)) || 0,
        ])
        .filter((item) => item[0] > 0)
        .sort((a, b) => a[0] - b[0])

      const volumeData = externalOhlcvData
        .map((item) => [new Date(item.timestamp_utc).getTime(), parseFloat(String(item.volume)) || 0])
        .filter((item) => item[0] > 0)
        .sort((a, b) => a[0] - b[0])

      setChartData(ohlcData)
      setVolumeData(volumeData)
      return
    }

    // 훅 데이터 사용
    if (apiError) {
      const errorMessage = `차트 데이터를 불러오는데 실패했습니다: ${(apiError as Error)?.message || apiError}`
      setError(errorMessage)
      if (onError) onError(errorMessage)
      return
    }

    // 데이터 타입에 따른 처리
    let rows: any[] = []
    
    if (isTimeData && dataInterval === '15m' && delayedData) {
      // 15m 지연 데이터는 quotes 배열 안에 있음
      rows = delayedData.quotes || []
    } else {
      // 시간 데이터 또는 일간 데이터
      rows = apiData?.data || apiData || []
    }

    if (rows && rows.length > 0) {
      const ohlcData = rows
        .map((item: Record<string, unknown>) => {
          let timestamp: number
          let open: number, high: number, low: number, close: number

          if (isTimeData && dataInterval === '15m') {
            // 15m 지연 데이터 구조 처리 (quotes 배열의 각 항목)
            timestamp = new Date(String(item.timestamp_utc)).getTime()
            const price = parseFloat(String(item.price)) || 0
            open = high = low = close = price // 지연 데이터는 현재 가격만 있음
          } else if (isTimeData) {
            // 시간 데이터 구조 (1h, 4h)
            timestamp = new Date(String(item.timestamp || item.timestamp_utc)).getTime()
            open = parseFloat(String(item.open || item.open_price)) || 0
            high = parseFloat(String(item.high || item.high_price)) || 0
            low = parseFloat(String(item.low || item.low_price)) || 0
            close = parseFloat(String(item.close || item.close_price)) || 0
          } else {
            // 일간 데이터 구조 (1d, 1w, 1m)
            timestamp = new Date(String(item.timestamp_utc)).getTime()
            open = parseFloat(String(item.open_price)) || 0
            high = parseFloat(String(item.high_price)) || 0
            low = parseFloat(String(item.low_price)) || 0
            close = parseFloat(String(item.close_price)) || 0
          }

          return [timestamp, open, high, low, close]
        })
        .filter((item) => item[0] > 0)
        .sort((a, b) => a[0] - b[0])

      const volumeData = rows
        .map((item: Record<string, unknown>) => {
          let timestamp: number
          if (isTimeData && dataInterval === '15m') {
            timestamp = new Date(String(item.timestamp_utc)).getTime()
          } else if (isTimeData) {
            timestamp = new Date(String(item.timestamp || item.timestamp_utc)).getTime()
          } else {
            timestamp = new Date(String(item.timestamp_utc)).getTime()
          }
          const volume = parseFloat(String(item.volume)) || 0
          return [timestamp, volume]
        })
        .filter((item) => item[0] > 0)
        .sort((a, b) => a[0] - b[0])

      setChartData(ohlcData)
      setVolumeData(volumeData)
      if (onDataLoad) onDataLoad({ ohlcData, volumeData, totalCount: rows.length })
    } else if (!apiLoading) {
      setError('차트 데이터가 없습니다.')
    }
  }, [assetIdentifier, dataInterval, onDataLoad, onError, externalOhlcvData, apiData, apiLoading, apiError, isTimeData, isDailyData, delayedData, useIntradayData])

  const chartOptions = {
    chart: {
      height: height,
      backgroundColor: backgroundColor,
      spacingTop: 10,
      spacingRight: 10,
      spacingBottom: 10,
      spacingLeft: 10,
      style: {
        fontFamily: 'Arial, sans-serif'
      }
    },
    title: {
      text: title || `${assetIdentifier} Price Chart`,
    },
    subtitle: {
      text: subtitle,
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

  if (apiLoading) return (
    <div className="flex justify-center items-center h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-3 text-sm text-gray-600">Loading chart data...</span>
    </div>
  )
  
  if (error || apiError) return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4">
      <h5 className="text-red-800 font-medium">Chart Error</h5>
      <p className="text-red-600">{error || (apiError as Error)?.message || 'Unknown error occurred'}</p>
    </div>
  )
  
  if (!chartData || chartData.length === 0) return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
      <h5 className="text-yellow-800 font-medium">No Data Available</h5>
      <p className="text-yellow-600">차트 데이터가 없습니다. (데이터 포인트: {chartData?.length || 0})</p>
    </div>
  )

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="border-b border-gray-200 px-6 py-4">
        <h5 className="text-lg font-medium text-gray-900">가격 차트 - {assetIdentifier}</h5>
      </div>
      <div className="p-6">
        <div 
          style={{ 
            height: `${height}px`,
            position: 'relative',
            zIndex: 1
          }}
        >
          <HighchartsReact
            highcharts={Highcharts}
            constructorType={'stockChart'}
            options={chartOptions}
          />
        </div>
      </div>
    </div>
  )
}

export default OHLCVChart
