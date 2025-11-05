"use client"

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useAssetPriceWithRange } from '@/hooks/useAssets'

interface SeriesData {
  name: string
  data: number[][]
  tooltip?: {
    valueDecimals: number
  }
}

interface CompareMultipleAssetsChartProps {
  assetIdentifiers: string[]
  assetNames?: string[]
  dataInterval?: string
  height?: number
  title?: string
  subtitle?: string
  backgroundColor?: string
  showRangeSelector?: boolean
  showExporting?: boolean
  showNavigator?: boolean
  startDate?: string
  endDate?: string
  onDataLoad?: (data: SeriesData[]) => void
  onError?: (error: string) => void
  customOptions?: Record<string, unknown>
}

const CompareMultipleAssetsChart: React.FC<CompareMultipleAssetsChartProps> = ({
  assetIdentifiers = ['BTCUSDT', 'ETHUSDT', 'AAPL'],
  assetNames,
  dataInterval = '1d',
  height = 600,
  title = 'Asset Comparison',
  subtitle = 'Percentage Change Comparison',
  backgroundColor = '#fff',
  showRangeSelector = true,
  showExporting = true,
  showNavigator = true,
  startDate,
  endDate,
  onDataLoad,
  onError,
  customOptions = {},
}) => {
  const [isClient, setIsClient] = useState(false)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  const [HighchartsReact, setHighchartsReact] = useState<any>(null)
  const [Highcharts, setHighcharts] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const chartRef = useRef<any>(null)

  // 각 자산에 대해 useAssetPriceWithRange hook 사용
  const assetQueries = assetIdentifiers.map(identifier => 
    useAssetPriceWithRange(identifier, {
      dataInterval,
      startDate,
      endDate,
      limit: 1000
    }, {
      enabled: !!identifier && isClient,
      staleTime: 5 * 60 * 1000,
      retry: 3,
    })
  )

  // 클라이언트 사이드에서 Highcharts 동적 로드
  useEffect(() => {
    const loadHighcharts = async () => {
      try {
        if (typeof window === 'undefined') {
          return
        }

        const [HighchartsReactModule, HighchartsModule] = await Promise.allSettled([
          import('highcharts-react-official'),
          import('highcharts/highstock')
        ])

        if (HighchartsReactModule.status === 'rejected' || HighchartsModule.status === 'rejected') {
          throw new Error('Failed to load core Highcharts modules')
        }

        const HighchartsReactComponent = HighchartsReactModule.value.default
        const HighchartsCore = HighchartsModule.value.default

        // Highcharts 모듈들을 병렬로 로드
        const modulePromises = [
          import('highcharts/modules/exporting').catch(e => console.warn('Exporting module failed:', e)),
          import('highcharts/modules/accessibility').catch(e => console.warn('Accessibility module failed:', e)),
          import('highcharts/modules/full-screen').catch(e => console.warn('Full-screen module failed:', e)),
        ]

        await Promise.allSettled(modulePromises)

        setHighchartsReact(() => HighchartsReactComponent)
        setHighcharts(HighchartsCore)
        setIsClient(true)
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to load Highcharts:', error)
        setIsLoading(false)
      }
    }

    loadHighcharts()
  }, [])

  // 모바일 감지
  useEffect(() => {
    if (!isClient) return

    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [isClient])

  // 쿼리 상태 확인
  const isDataLoading = assetQueries.some(q => q.isLoading)
  const hasError = assetQueries.some(q => q.error)
  const errorMessage = assetQueries.find(q => q.error)?.error as Error

  // 데이터를 Highcharts 형식으로 변환
  const seriesData = useMemo(() => {
    if (!isClient) return []

    const series: SeriesData[] = []

    assetQueries.forEach((query, index) => {
      if (!query.data) return

      // API 응답 구조: { data: [{ date, value, change_percent }], asset_id, ticker, total_count }
      const rawData = query.data.data || []
      if (!Array.isArray(rawData) || rawData.length === 0) return

      // 가격 데이터를 [timestamp, price] 형식으로 변환
      const chartData = rawData
        .map((item: any) => {
          // date 필드는 "YYYY-MM-DD" 형식, value는 가격
          const dateStr = item.date || item.timestamp_utc || item.timestamp
          if (!dateStr) return null
          
          const timestamp = new Date(dateStr).getTime()
          const price = parseFloat(String(item.value || item.price || item.close_price || item.current_price)) || 0
          
          if (!timestamp || !isFinite(timestamp) || price <= 0) return null
          return [timestamp, price]
        })
        .filter((item: number[] | null): item is number[] => item !== null)
        .sort((a: number[], b: number[]) => a[0] - b[0])

      if (chartData.length > 0) {
        series.push({
          name: assetNames?.[index] || assetIdentifiers[index],
          data: chartData,
          tooltip: {
            valueDecimals: 2
          }
        })
      }
    })

    return series
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetQueries, isClient, assetNames, assetIdentifiers])

  // 데이터 로드 완료 시 콜백 호출
  useEffect(() => {
    if (seriesData.length > 0 && onDataLoad) {
      onDataLoad(seriesData)
      console.log('[CompareChart] Data loaded', { 
        assets: assetIdentifiers, 
        seriesCount: seriesData.length,
        pointsCounts: seriesData.map(s => s.data.length)
      })
    }
  }, [seriesData, onDataLoad, assetIdentifiers])

  // 에러 발생 시 콜백 호출
  useEffect(() => {
    if (hasError && onError) {
      onError(errorMessage?.message || 'Failed to load data')
    }
  }, [hasError, errorMessage, onError])

  const chartOptions = {
    chart: {
      height,
      backgroundColor,
      spacingTop: 10,
      spacingRight: 10,
      spacingBottom: 10,
      spacingLeft: 10,
      style: {
        fontFamily: 'Arial, sans-serif'
      },
      zoomType: 'x',
      panning: {
        enabled: true,
        type: 'x'
      },
      pinchType: 'x',
    },
    
    title: {
      text: title,
      style: {
        fontSize: isMobile ? '16px' : '18px'
      }
    },
    
    subtitle: {
      text: subtitle,
      style: {
        fontSize: isMobile ? '12px' : '14px'
      }
    },

    rangeSelector: {
      selected: 4,
      enabled: showRangeSelector && !isMobile,
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
      }],
      inputEnabled: !isMobile
    },

    yAxis: {
      labels: {
        formatter: function(this: any) {
          return (this.value > 0 ? '+' : '') + this.value + '%'
        },
        style: {
          fontSize: isMobile ? '10px' : '12px'
        }
      },
      plotLines: [{
        value: 0,
        width: 2,
        color: '#999'
      }],
      title: {
        text: 'Percentage Change',
        style: {
          fontSize: isMobile ? '0px' : '12px'
        }
      }
    },

    xAxis: {
      type: 'datetime',
      labels: {
        style: {
          fontSize: isMobile ? '10px' : '12px'
        }
      }
    },

    tooltip: {
      pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b> ({point.change}%)<br/>',
      valueDecimals: 2,
      split: true,
      shared: true,
      style: {
        fontSize: isMobile ? '11px' : '12px'
      }
    },

    plotOptions: {
      series: {
        compare: 'percent',
        showInNavigator: showNavigator,
        lineWidth: 2,
        states: {
          hover: {
            lineWidth: 3
          }
        },
        marker: {
          enabled: false,
          radius: 2
        }
      }
    },

    navigator: {
      enabled: showNavigator && !isMobile,
      height: isMobile ? 40 : 50
    },

    scrollbar: {
      enabled: !isMobile
    },

    series: seriesData,

    legend: {
      enabled: true,
      align: 'center',
      verticalAlign: 'bottom',
      layout: isMobile ? 'horizontal' : 'horizontal',
      itemStyle: {
        fontSize: isMobile ? '11px' : '12px'
      }
    },

    credits: {
      enabled: false
    },

    exporting: {
      enabled: showExporting && !isMobile
    },

    // 모바일 최적화
    responsive: {
      rules: [{
        condition: {
          maxWidth: 768
        },
        chartOptions: {
          chart: {
            height: Math.min(height, 400),
            spacing: [10, 10, 10, 10]
          },
          rangeSelector: {
            enabled: false
          },
          navigator: {
            enabled: false
          },
          scrollbar: {
            enabled: false
          }
        }
      }]
    },

    ...customOptions,
  }

  // 클라이언트 사이드에서만 차트 렌더링
  if (!isClient || !HighchartsReact || !Highcharts) {
    return (
      <div className="flex justify-center items-center h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-sm text-gray-600">Loading chart library...</span>
      </div>
    )
  }

  // 로딩 상태
  if (isLoading || isDataLoading) {
    return (
      <div className="flex justify-center items-center h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-sm text-gray-600">Loading chart data...</span>
      </div>
    )
  }

  // 에러 상태
  if (hasError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <h5 className="text-red-800 font-medium">Chart Error</h5>
        <p className="text-red-600">{errorMessage?.message || 'Failed to load chart data'}</p>
      </div>
    )
  }

  // 데이터 없음
  if (seriesData.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <h5 className="text-yellow-800 font-medium">No Data Available</h5>
        <p className="text-yellow-600">비교할 자산 데이터가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="border-b border-gray-200 px-6 py-4">
        <h5 className="text-lg font-medium text-gray-900">자산 비교 차트</h5>
        <p className="text-sm text-gray-500 mt-1">
          {assetIdentifiers.join(', ')} - 백분율 변화 비교
        </p>
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
            ref={chartRef}
            highcharts={Highcharts}
            constructorType={'stockChart'}
            options={chartOptions}
          />
        </div>
      </div>
    </div>
  )
}

export default CompareMultipleAssetsChart
