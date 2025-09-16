import React, { useEffect, useRef, useMemo, useState } from 'react'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import { usePerformanceTreeMapData, useTreeMapData } from '../../hooks/useTreeMapData'

// Highcharts 모듈들을 최소한으로 로드
import 'highcharts/modules/treemap'
import 'highcharts/modules/coloraxis'

// Highcharts 모듈 등록 확인
// console.log('Highcharts modules loaded:', {
//   treemap: !!Highcharts.seriesTypes.treemap,
//   coloraxis: !!Highcharts.ColorAxis,
// })

// Highcharts 모듈 등록
Highcharts.setOptions({
  chart: {
    backgroundColor: '#252931',
  },
  title: {
    style: {
      color: 'white',
    },
  },
  subtitle: {
    style: {
      color: 'silver',
    },
  },
  legend: {
    itemStyle: {
      color: 'white',
    },
  },
})

const PerformanceTreeMap = () => {
  const chartRef = useRef(null)
  const [performancePeriod, setPerformancePeriod] = useState('1m')

  // 성과 데이터가 없으면 일반 TreeMap 데이터 사용
  const { data: performanceData, loading: performanceLoading, error: performanceError } = usePerformanceTreeMapData(performancePeriod, 100)
  const { data: fallbackData, loading: fallbackLoading, error: fallbackError } = useTreeMapData()
  
  // 성과 데이터가 있으면 사용, 없으면 일반 데이터 사용
  const data = performanceData && performanceData.length > 0 ? performanceData : fallbackData
  const loading = performanceLoading || fallbackLoading
  const error = performanceError || fallbackError

  console.log('=== PERFORMANCE TREEMAP COMPONENT ===')
  console.log('Performance data:', performanceData?.length)
  console.log('Fallback data:', fallbackData?.length)
  console.log('Final data:', data?.length)
  console.log('Loading:', loading)
  console.log('Error:', error)
  console.log('Performance period:', performancePeriod)

  // TreeMap 데이터 구조 생성
  const createTreeMapData = (assets) => {
    console.log('=== CREATE TREEMAP DATA ===')
    console.log('Input assets length:', assets.length)
    console.log('Sample asset structure:', assets[0])

    // temp_debug.js와 동일한 3단계 구조 생성
    const data = []

    // 1단계: 카테고리 (Industry level)
    const categories = {}
    assets.forEach((asset) => {
      const category = asset.type_name || asset.category || 'Other'
      if (!categories[category]) {
        categories[category] = {
          id: category,
          name: category,
          value: 0,
          children: [],
        }
      }
      categories[category].value += asset.market_cap || asset.market_cap_usd || 1
    })

    // 카테고리를 데이터에 추가
    Object.values(categories).forEach((category) => {
      data.push({
        id: category.id,
        name: category.name,
        custom: {
          fullName: category.name,
        },
      })
    })

    // 2단계: 자산들을 카테고리 하위에 추가
    assets.forEach((asset, index) => {
      const category = asset.type_name || asset.category || 'Other'
      // console.log(`Asset ${index}:`, {
      //   name: asset.name,
      //   category: category,
      //   performance: asset.performance,
      //   market_cap: asset.market_cap,
      //   ticker: asset.ticker,
      // })

      const value = asset.market_cap || asset.market_cap_usd || 1
      // 성과 데이터가 없으면 일일 변동률을 사용
      const colorValue = asset.performance !== undefined ? asset.performance : (asset.daily_change_percent || 0)

      const childNode = {
        name: asset.name,
        id: asset.ticker,
        value: value,
        parent: category,
        colorValue: colorValue,
        custom: {
          fullName: asset.name,
          performance: (() => {
            const perf = asset.performance !== undefined ? asset.performance : (asset.daily_change_percent || 0)
            return (perf < 0 ? '' : '+') + perf.toFixed(2) + '%'
          })(),
          ticker: asset.ticker,
          price: asset.current_price || asset.price_usd,
          volume: asset.volume || asset.volume_24h || 0,
          change_24h: asset.change_percent_24h || asset.daily_change_percent || 0,
        },
      }

      // console.log(`Adding child node for ${asset.name}:`, childNode)
      data.push(childNode)
    })

    // console.log('=== FINAL DATA STRUCTURE ===')
    // console.log('Total data points:', data.length)
    // console.log(
    //   'Categories:',
    //   data.filter((d) => !d.parent).map((d) => d.name),
    // )
    // console.log('Assets:', data.filter((d) => d.parent).length)

    return data
  }

  // props로 받은 데이터를 TreeMap 형식으로 변환
  const treemapData = useMemo(() => {
    // console.log('=== TREEMAP DATA PROCESSING ===')
    // console.log('Loading state:', loading)
    // console.log('Input data length:', data?.length)
    // console.log('Input data (first 3):', data?.slice(0, 3))

    // Don't process data while loading or if data is empty
    if (loading) {
      // console.log('Still loading, returning empty array')
      return []
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      // console.log('No data or data is not array or empty')
      return []
    }

    const result = createTreeMapData(data)
    // console.log('Final treemap data structure:', result)
    return result
  }, [data, loading])

  // Plugin for relative font size (temp_debug.js에서 가져옴)
  useEffect(() => {
    Highcharts.addEvent(Highcharts.Series, 'drawDataLabels', function () {
      if (this.type === 'treemap') {
        this.points.forEach((point) => {
          // console.log('Point debug:', {
          //   name: point.name,
          //   level: point.node.level,
          //   hasChildren: point.node.children && point.node.children.length > 0,
          //   dlOptions: point.dlOptions,
          // })

          // 모든 레벨에 대해 스타일 적용 시도
          if (point.node.children && point.node.children.length > 0) {
            // 카테고리 레벨 (자식이 있는 노드)
            const children = point.node.children || []
            if (children.length > 0) {
              const totalValue = children.reduce((sum, child) => sum + (child.point.value || 0), 0)
              const weightedPerformance = children.reduce((sum, child) => {
                const weight = (child.point.value || 0) / totalValue
                return sum + (child.point.colorValue || 0) * weight
              }, 0)

              point.custom = {
                performance:
                  (weightedPerformance < 0 ? '' : '+') + weightedPerformance.toFixed(2) + '%',
              }

              if (point.dlOptions) {
                point.dlOptions.backgroundColor = this.colorAxis.toColor(weightedPerformance)
                point.dlOptions.style = {
                  fontSize: '17px',
                  fontWeight: 'bold',
                  fill: 'white',
                }
                // 카테고리 박스에 라인 추가
                point.dlOptions.borderWidth = 2
                point.dlOptions.borderColor = '#666'
                // console.log('Applied style to category:', point.name, point.dlOptions.style)
              }
            }
          } else {
            // 자산 레벨 (자식이 없는 노드)
            if (point.shapeArgs) {
              const area = point.shapeArgs.width * point.shapeArgs.height
              if (point.dlOptions) {
                point.dlOptions.style.fontSize = `${Math.min(22, 5 + Math.round(area * 0.0006))}px`
              }
            }
          }
        })
      }
    })
  }, [])

  const getPeriodLabel = (period) => {
    const labels = {
      '1d': '1 Day',
      '1w': '1 Week',
      '1m': '1 Month',
      '3m': '3 Months',
      '6m': '6 Months',
      '1y': '1 Year',
      '2y': '2 Years',
      '3y': '3 Years',
      '5y': '5 Years',
      '10y': '10 Years',
    }
    return labels[period] || period
  }

  const chartOptions = useMemo(
    () => ({
      chart: {
        backgroundColor: '#252931',
        height: 600,
      },
      exporting: {
        enabled: false, // 내보내기 메뉴 비활성화
      },
      series: [
        {
          name: 'All',
          type: 'treemap',
          layoutAlgorithm: 'squarified',
          allowDrillToNode: true,
          animationLimit: 1000,
          borderColor: '#252931',
          color: '#252931',
          opacity: 0.01,
          nodeSizeBy: 'leaf',
          dataLabels: {
            enabled: false,
            allowOverlap: true,
            style: {
              fontSize: '0.9em',
              textOutline: 'none',
            },
          },
          levels: [
            {
              level: 1,
              dataLabels: {
                enabled: true,
                headers: true,
                align: 'left',
                style: {
                  fontWeight: 'bold',
                  fontSize: '17px',
                  fill: 'white',
                  lineClamp: 1,
                  textTransform: 'uppercase',
                },
                padding: 3,
              },
              borderWidth: 3,
              borderColor: '#444',
              levelIsConstant: false,
            },
            {
              level: 2,
              dataLabels: {
                enabled: true,
                align: 'center',
                format:
                  '{point.name}<br><span style="font-size: 0.6em">' +
                  '{point.custom.performance}</span>',
                style: {
                  color: 'white',
                  fontSize: '14px',
                },
              },
            },
          ],
          accessibility: {
            exposeAsGroupOnly: true,
          },
          breadcrumbs: {
            buttonTheme: {
              style: {
                color: 'silver',
              },
              states: {
                hover: {
                  fill: '#333',
                },
                select: {
                  style: {
                    color: 'white',
                  },
                },
              },
            },
          },
          data: treemapData,
          point: {
            events: {
              mouseOver: function () {
                              // console.log(
              //   'Mouse over point:',
              //   this.name,
              //   'custom:',
              //   this.custom,
              //   'value:',
              //   this.value,
              // )
              },
            },
          },
          events: {
            afterDrawDataLabels: function () {
              // console.log('=== HIGHCHARTS RENDERING ===')
              // console.log('Total points:', this.points.length)
              // this.points.forEach((point, index) => {
              //   console.log(`Point ${index}:`, {
              //     name: point.name,
              //     value: point.value,
              //     colorValue: point.colorValue,
              //     level: point.node?.level,
              //     custom: point.custom,
              //     parent: point.parent,
              //     hasChildren: point.children && point.children.length > 0,
              //   })
              // })
            },
                          mouseOver: function () {
                // console.log(
                //   'Mouse over point:',
                //   this.name,
                //   'custom:',
                //   this.custom,
                //   'level:',
                //   this.node?.level,
                // )
              },
          },
        },
      ],
      title: {
        text: `Asset Performance TreeMap (Daily Change)`,
        align: 'left',
        style: {
          color: 'white',
        },
      },
      subtitle: {
        text: `Color shows daily change: Red (loss) → Gray (neutral) → Green (gain). Click to drill down.`,
        align: 'left',
        style: {
          color: 'silver',
        },
      },
      tooltip: {
        followPointer: true,
        outside: true,
        headerFormat: '<span style="font-size: 0.9em">' + '{point.custom.fullName}</span><br/>',
        pointFormat:
          '<b>Market Cap:</b>' +
          ' USD {(divide point.value 1000000000):.1f} bln<br/>' +
          '{#if point.custom.performance}' +
          '<b>Daily Change:</b> {point.custom.performance}{/if}',
      },
      colorAxis: {
        minColor: '#f73539', // 빨간색 (손실)
        maxColor: '#2ecc59', // 초록색 (이익)
        stops: [
          [0, '#f73539'], // -5% = 빨간색
          [0.5, '#414555'], // 0% = 회색
          [1, '#2ecc59'], // +5% = 초록색
        ],
        min: -5,
        max: 5,
        gridLineWidth: 0,
        labels: {
          overflow: 'allow',
          format: '{#gt value 0}+{value}{else}{value}{/gt}%',
          style: {
            color: 'white',
          },
        },
      },
      legend: {
        itemStyle: {
          color: 'white',
        },
      },
    }),
    [data, performancePeriod],
  )

  if (loading) {
    return (
      <div
        style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div className="text-white">Loading asset performance data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  if (!loading && !error && (!data || data.length === 0)) {
    return (
      <div
        style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div className="text-white">
          <p>No performance data available</p>
          <p>Performance data: {performanceData?.length || 0}</p>
          <p>Fallback data: {fallbackData?.length || 0}</p>
          <p>Final data: {data?.length || 0}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '600px', position: 'relative' }}>
      {/* 기간 선택 select를 차트 위에 오버레이 */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          background: 'transparent',
        }}
      >
        <select
          value={performancePeriod}
          onChange={(e) => setPerformancePeriod(e.target.value)}
          style={{
            backgroundColor: '#252931',
            color: 'white',
            border: '1px solid #444',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          <option value="1d">1 Day</option>
          <option value="1w">1 Week</option>
          <option value="1m">1 Month</option>
          <option value="3m">3 Months</option>
          <option value="6m">6 Months</option>
          <option value="1y">1 Year</option>
          <option value="2y">2 Years</option>
          <option value="3y">3 Years</option>
          <option value="5y">5 Years</option>
          <option value="10y">10 Years</option>
        </select>
      </div>

      <HighchartsReact highcharts={Highcharts} options={chartOptions} ref={chartRef} />
    </div>
  )
}

export default PerformanceTreeMap
