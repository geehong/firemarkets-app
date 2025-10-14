"use client"

import React, { useEffect, useState } from 'react'
import HighchartsReact from 'highcharts-react-official'
import { apiClient } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'

// Highcharts 모듈들을 import 및 초기화
import Highcharts from 'highcharts/highstock'
import 'highcharts/modules/exporting'
import 'highcharts/modules/accessibility'
import 'highcharts/modules/stock-tools'
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
  showStockTools?: boolean
  showExporting?: boolean
  title?: string
  subtitle?: string
  backgroundColor?: string
  volumeColor?: string
  volumeOpacity?: number
  maxDataPoints?: number
  onDataLoad?: (data: { ohlcData: number[][]; volumeData: number[][]; totalCount: number }) => void
  onError?: (error: string) => void
  customOptions?: any
  externalOhlcvData?: OHLCVData[] | null
  useIntradayApi?: boolean
}

const OHLCVChart: React.FC<OHLCVChartProps> = ({
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
  maxDataPoints = 50000,
  onDataLoad,
  onError,
  customOptions = {},
  externalOhlcvData = null,
  useIntradayApi = false,
}) => {
  const [chartData, setChartData] = useState<number[][] | null>(null)
  const [volumeData, setVolumeData] = useState<number[][] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { data: apiData, isLoading: apiLoading, error: apiError } = useQuery({
    queryKey: ['ohlcv', assetIdentifier, dataInterval, useIntradayApi ? 'intraday' : 'assets'],
    queryFn: () => {
      if (useIntradayApi) {
        // ohlcv_intraday_data 테이블 사용 (1h, 4h, 6h, 12h, 24h 간격)
        return apiClient.getIntradayOhlcv({
          asset_identifier: assetIdentifier,
          data_interval: dataInterval,
          ohlcv: true,
          days: 1,
          limit: 1000 // 최대 1000개 데이터 포인트
        })
      } else {
        // ohlcv_day_data 테이블 사용 (1d 간격)
        return apiClient.getAssetsOhlcv({
          asset_identifier: assetIdentifier,
          data_interval: dataInterval,
          limit: 1000
        })
      }
    },
    enabled: !!assetIdentifier,
    staleTime: 1 * 60 * 1000, // 1분
    retry: 3,
  })

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
      setLoading(false)
      return
    }

    // 훅 데이터 사용
    setLoading(apiLoading)
    if (apiError) {
      const errorMessage = `차트 데이터를 불러오는데 실패했습니다: ${apiError.message || apiError}`
      setError(errorMessage)
      if (onError) onError(errorMessage)
      return
    }

    const rows = apiData?.data || apiData || []
    if (rows && rows.length > 0) {
      const ohlcData = rows
        .map((item: any) => {
          // useIntradayApi에 따라 다른 필드명 사용
          const timestamp = useIntradayApi 
            ? new Date(item.timestamp || item.timestamp_utc).getTime()
            : new Date(item.timestamp_utc).getTime()
          
          const open = useIntradayApi 
            ? parseFloat(item.open || item.open_price) || 0
            : parseFloat(item.open_price) || 0
            
          const high = useIntradayApi 
            ? parseFloat(item.high || item.high_price) || 0
            : parseFloat(item.high_price) || 0
            
          const low = useIntradayApi 
            ? parseFloat(item.low || item.low_price) || 0
            : parseFloat(item.low_price) || 0
            
          const close = useIntradayApi 
            ? parseFloat(item.close || item.close_price) || 0
            : parseFloat(item.close_price) || 0

          return [timestamp, open, high, low, close]
        })
        .filter((item) => item[0] > 0)
        .sort((a, b) => a[0] - b[0])

      const volumeData = rows
        .map((item: any) => {
          const timestamp = useIntradayApi 
            ? new Date(item.timestamp || item.timestamp_utc).getTime()
            : new Date(item.timestamp_utc).getTime()
          const volume = parseFloat(item.volume) || 0
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
  }, [assetIdentifier, dataInterval, maxDataPoints, onDataLoad, onError, externalOhlcvData, apiData, apiLoading, apiError])

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
      gui: {
        enabled: showStockTools,
        // Use local public assets to avoid CDN rate limits
        iconsURL: '/assets/icon/stock-icons/'
      },
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

  if (loading) return (
    <div className="flex justify-center items-center h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-3 text-gray-600">Loading chart data...</span>
    </div>
  )
  
  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4">
      <h5 className="text-red-800 font-medium">Chart Error</h5>
      <p className="text-red-600">{error}</p>
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
        <div style={{ height: `${height}px` }}>
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
