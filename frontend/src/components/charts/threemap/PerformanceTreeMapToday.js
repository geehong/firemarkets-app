import React, { useEffect, useRef, useMemo, useState } from 'react'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import { usePerformanceTreeMapDataFromTreeMap } from '../../../hooks/useTreeMapData'
import useWebSocketStore from '../../../store/websocketStore'

// Highcharts 모듈들을 최소한으로 로드
import 'highcharts/modules/treemap'
import 'highcharts/modules/coloraxis'

// 모듈 초기화 확인
if (typeof Highcharts !== 'undefined') {
  // TreeMap 모듈이 제대로 로드되었는지 확인
  if (!Highcharts.seriesTypes.treemap) {
    console.warn('Highcharts treemap module not loaded properly')
  }
}

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
  legend: {
    itemStyle: {
      color: 'white',
    },
  },
})

const PerformanceTreeMapToday = () => {
  const chartRef = useRef(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30000) // 30초
  const intervalRef = useRef(null)

  // usePerformanceTreeMapDataFromTreeMap 훅 사용
  const { data, loading, error, refreshData } = usePerformanceTreeMapDataFromTreeMap()
  
  // WebSocket 스토어 사용
  const { socket, isConnected } = useWebSocketStore()


  // TreeMap 데이터 구조 생성
  const createTreeMapData = (assets) => {

    const treemapData = []

    // 1단계: 카테고리별 그룹화 (본드 제외)
    const categories = {}
    let filteredAssets = 0
    let bondAssets = 0
    
    assets.forEach((asset) => {
      // 본드 데이터 제외
      if (asset.is_bond || asset.bond_type) {
        bondAssets++
        return
      }
      filteredAssets++
      
      const category = asset.category || asset.type_name || 'Other'
      if (!categories[category]) {
        categories[category] = {
          id: category,
          name: category,
          value: 0,
          children: [],
        }
      }
      let categoryValue = asset.market_cap || asset.market_cap_usd || 1
      
      // 자산 유형별 크기 조정 (카테고리 그룹화용)
      if (category.toLowerCase().includes('commodit') || category.toLowerCase().includes('metal')) {
        categoryValue = categoryValue * 0.7
      } else if (category.toLowerCase().includes('crypto') || category.toLowerCase().includes('cryptocurrency')) {
        categoryValue = categoryValue * 1.3
      }
      
      categories[category].value += categoryValue
    })
    

    // 카테고리를 데이터에 추가
    Object.values(categories).forEach((category) => {
      treemapData.push({
        id: category.id,
        name: category.name,
        custom: {
          fullName: category.name,
        },
      })
    })

    // 2단계: 자산들을 카테고리 하위에 추가 (본드 제외)
    let assetsAdded = 0
    assets.forEach((asset, index) => {
      // 본드 데이터 제외
      if (asset.is_bond || asset.bond_type) {
        return
      }
      assetsAdded++
      
      const category = asset.category || asset.type_name || 'Other'
      const isEtfOrFund = (category.toLowerCase().includes('etf') || category.toLowerCase().includes('fund'))
      const displayName = isEtfOrFund ? (asset.ticker || asset.name) : asset.name
      
      let value = asset.market_cap || asset.market_cap_usd || 1
      
      // 자산 유형별 크기 조정
      if (category.toLowerCase().includes('commodit') || category.toLowerCase().includes('metal')) {
        // 커머디티: 70% 크기로 조정
        value = value * 0.7
      } else if (category.toLowerCase().includes('crypto') || category.toLowerCase().includes('cryptocurrency')) {
        // 크립토: 130% 크기로 조정
        value = value * 1.3
      }
      
      // 성과 데이터: performance 또는 daily_change_percent 사용
      const colorValue = asset.performance !== undefined ? asset.performance : (asset.daily_change_percent || 0)

      const childNode = {
        name: displayName,
        id: asset.ticker || asset.name,
        value: value,
        parent: category,
        colorValue: colorValue,
        custom: {
          fullName: displayName,
          originalName: asset.name,
          displayTicker: asset.ticker,
          performance: (() => {
            const perf = asset.performance !== undefined ? asset.performance : (asset.daily_change_percent || 0)
            return (perf < 0 ? '' : '+') + perf.toFixed(2) + '%'
          })(),
          ticker: asset.ticker,
          price: asset.price || asset.current_price || asset.price_usd,  // API에서 가져온 price 필드 우선 사용
          volume: asset.volume || 0,
          change_24h: asset.change_percent_24h || asset.daily_change_percent || 0,
          country: asset.country,
          sector: asset.sector,
          rank: asset.rank,
          category: category,  // 카테고리 정보 추가
          type_name: asset.type_name,
        },
      }

      treemapData.push(childNode)
    })


    return treemapData
  }

  // props로 받은 데이터를 TreeMap 형식으로 변환
  const treemapData = useMemo(() => {
    // 로딩 중이거나 데이터가 없으면 빈 배열 반환
    if (loading) {
      return []
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return []
    }

    const result = createTreeMapData(data)
    return result
  }, [data, loading])

  // 최신 업데이트 날짜(YYYY-MM-DD) 계산
  const updatedDateLabel = useMemo(() => {
    if (!data || data.length === 0) return ''
    const toDate = (v) => (v ? new Date(v) : null)
    let latest = null
    for (const a of data) {
      const r = toDate(a.realtime_updated_at)
      const d = toDate(a.daily_data_updated_at)
      if (r && (!latest || r > latest)) latest = r
      if (d && (!latest || d > latest)) latest = d
    }
    if (!latest) return ''
    const yyyy = latest.getFullYear()
    const mm = String(latest.getMonth() + 1).padStart(2, '0')
    const dd = String(latest.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }, [data])

  // 자동 새로고침 설정
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        console.log('[PerformanceTreeMap] Auto-refreshing data...')
        refreshData()
      }, refreshInterval)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [autoRefresh, refreshInterval, refreshData])

  // WebSocket 연결 상태 모니터링
  useEffect(() => {
    if (socket && isConnected) {
      console.log('[PerformanceTreeMap] WebSocket connected, subscribing to real-time updates')
      
      // 실시간 가격 업데이트 구독
      const handleRealtimeUpdate = (updateData) => {
        console.log('[PerformanceTreeMap] Received real-time update:', updateData)
        // 실시간 데이터가 오면 자동 새로고침
        if (autoRefresh) {
          refreshData()
        }
      }

      // WebSocket 이벤트 리스너 등록
      socket.on('price_update', handleRealtimeUpdate)
      socket.on('market_update', handleRealtimeUpdate)

      return () => {
        if (socket) {
          socket.off('price_update', handleRealtimeUpdate)
          socket.off('market_update', handleRealtimeUpdate)
        }
      }
    }
  }, [socket, isConnected, autoRefresh, refreshData])

  // 수동 새로고침 핸들러
  const handleManualRefresh = () => {
    console.log('[PerformanceTreeMap] Manual refresh triggered')
    refreshData()
  }

  // 자동 새로고침 토글
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh)
  }

  // Plugin for relative font size
  useEffect(() => {
    Highcharts.addEvent(Highcharts.Series, 'drawDataLabels', function () {
      if (this.type === 'treemap') {
        this.points.forEach((point) => {
          // 카테고리 레벨 (자식이 있는 노드)
          if (point.node.children && point.node.children.length > 0) {
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


  const chartOptions = useMemo(
    () => ({
      chart: {
        backgroundColor: '#252931',
        height: 650,  // 서브타이틀 제거로 인한 높이 증가
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
              },
            },
          },
          events: {
            afterDrawDataLabels: function () {
            },
            mouseOver: function () {
            },
          },
        },
      ],
      title: {
        text: `Today's Asset Performance TreeMap (Daily Change : ${updatedDateLabel || 'N/A'} Updated) ${autoRefresh ? '🔄' : '⏸️'} ${isConnected ? '🔗' : '🔌'}`,
        align: 'left',
        style: {
          color: 'white',
          cursor: 'pointer',
        },
        useHTML: true,
        events: {
          click: function() {
            // 제목 클릭 시 자동 새로고침 토글
            toggleAutoRefresh()
          },
          mouseOver: function() {
            // 툴팁 표시 (서브타이틀 내용 포함)
            this.renderer.label(
              `<div style="background: rgba(37, 41, 49, 0.95); border: 1px solid #00d4ff; border-radius: 5px; padding: 10px; color: white; font-size: 12px; max-width: 350px; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">
                <div style="font-weight: bold; color: #00d4ff; margin-bottom: 8px;">Chart Information</div>
                <div style="margin-bottom: 6px;"><b>Color shows daily change:</b> Red (loss) → Gray (neutral) → Green (gain)</div>
                <div style="margin-bottom: 6px;"><b>Data source:</b> /api/v1/treemap/live (treemap_live_view)</div>
                <div style="margin-bottom: 6px;"><b>Real-time updates:</b> ${autoRefresh ? 'Enabled' : 'Disabled'} (${refreshInterval/1000}s interval)</div>
                <div style="margin-bottom: 6px;"><b>WebSocket:</b> ${isConnected ? 'Connected' : 'Disconnected'}</div>
                <div style="margin-bottom: 6px;"><b>Interaction:</b> Click to drill down</div>
                <div style="margin-bottom: 6px;"><b>Size adjustment:</b> Commodities (70%), Crypto (130%)</div>
                <div style="margin-bottom: 6px;"><b>Assets:</b> Stocks, ETFs, Cryptocurrencies</div>
                <div style="margin-bottom: 6px;"><b>Click title:</b> Toggle auto-refresh</div>
              </div>`,
              this.chart.plotLeft + 10,
              this.chart.plotTop + 10,
              'callout',
              this.chart.plotLeft + 10,
              this.chart.plotTop + 10,
              true
            ).attr({
              zIndex: 1000
            }).add();
          },
          mouseOut: function() {
            // 툴팁 제거
            this.chart.renderer.labelElements.forEach(label => {
              if (label.element && label.element.innerHTML && label.element.innerHTML.includes('Chart Information')) {
                label.destroy();
              }
            });
          }
        }
      },
      tooltip: {
        followPointer: true,
        outside: true,
        formatter: function() {
          const point = this.point;
          const colorValue = point.colorValue || 0;
          let changeColor = '#a0a0a0'; // 기본 회색
          
          if (colorValue > 0) {
            changeColor = '#2ecc59'; // 초록색
          } else if (colorValue < 0) {
            changeColor = '#f73539'; // 빨간색
          }
          
          let tooltipContent = '<div style="padding: 5px;">';
          const cat = (point.custom.category || point.custom.type_name || 'Other').toLowerCase();
          const isEtfOrFund = cat.includes('etf') || cat.includes('fund');
          // Header: ETF/펀드는 "Name(Ticker)" 형식으로 표시, 그 외는 fullName
          if (isEtfOrFund && point.custom.originalName) {
            const tkr = point.custom.displayTicker || point.custom.ticker || '';
            const nameTicker = tkr ? (point.custom.originalName + ' (' + tkr + ')') : point.custom.originalName;
            tooltipContent += '<div style="font-weight:bold; color:#00d4ff; margin-bottom:4px">' + nameTicker + '</div><br/>';
          } else if (point.custom.fullName) {
            tooltipContent += '<div style="font-weight:bold; color:#00d4ff; margin-bottom:4px">' + point.custom.fullName + '</div><br/>';
          }
          // 원본 시가총액 계산 (조정된 값에서 역산)
          let originalMarketCap = point.value;
          const category = point.custom.category || point.custom.type_name || 'Other';
          if (category.toLowerCase().includes('commodit') || category.toLowerCase().includes('metal')) {
            originalMarketCap = point.value / 0.7; // 70%로 조정된 것을 원복
          } else if (category.toLowerCase().includes('crypto') || category.toLowerCase().includes('cryptocurrency')) {
            originalMarketCap = point.value / 1.3; // 130%로 조정된 것을 원복
          }
          
          tooltipContent += '<b style="color: #ffffff;">Market Cap:</b> <span style="color: #00d4ff;">USD ' + (originalMarketCap / 1000000000).toFixed(1) + ' BIN</span><br/>';
          
          if (point.custom.performance) {
            tooltipContent += '<b style="color: #ffffff;">Daily Change:</b> <span style="color: ' + changeColor + ';">' + point.custom.performance + '</span><br/>';
          }
          
          if (point.custom.price) {
            tooltipContent += '<b style="color: #ffffff;">Price:</b> <span style="color: #00d4ff;">$' + point.custom.price + '</span><br/>';
          }
          
          // ETF/펀드는 Ticker 라인 생략
          if (point.custom.ticker && !isEtfOrFund) {
            tooltipContent += '<b style="color: #ffffff;">Ticker:</b> <span style="color: #a0a0a0;">' + point.custom.ticker + '</span><br/>';
          }
          
          if (point.custom.country) {
            tooltipContent += '<b style="color: #ffffff;">Country:</b> <span style="color: #a0a0a0;">' + point.custom.country + '</span><br/>';
          }
          
          if (point.custom.rank) {
            tooltipContent += '<b style="color: #ffffff;">Rank:</b> <span style="color: #a0a0a0;">#' + point.custom.rank + '</span><br/>';
          }
          
          if (point.custom.volume) {
            tooltipContent += '<b style="color: #ffffff;">Volume:</b> <span style="color: #a0a0a0;">' + (point.custom.volume / 1000000).toFixed(1) + 'M</span><br/>';
          }
          
          tooltipContent += '</div>';
          return tooltipContent;
        },
        backgroundColor: 'rgba(37, 41, 49, 0.95)',
        borderColor: '#00d4ff',
        borderWidth: 1,
        borderRadius: 5,
        style: {
          color: '#ffffff',
          fontSize: '12px',
        },
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
    [treemapData, autoRefresh, refreshInterval, isConnected, updatedDateLabel, toggleAutoRefresh],
  )

  if (loading) {
    return (
      <div
        style={{ 
          height: '650px', 
          minHeight: '650px',
          maxHeight: '650px',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#252931'
        }}
      >
        <div className="text-white">
          <div>Loading today's asset performance data...</div>
          <div style={{ fontSize: '12px', marginTop: '10px', opacity: 0.7 }}>
            {autoRefresh ? '🔄 Auto-refresh enabled' : '⏸️ Auto-refresh disabled'} | 
            {isConnected ? ' 🔗 WebSocket connected' : ' 🔌 WebSocket disconnected'}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{ 
          height: '650px', 
          minHeight: '650px',
          maxHeight: '650px',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#252931'
        }}
      >
        <div className="text-red-500">
          <div>Error loading today's market caps data: {error}</div>
          <div style={{ fontSize: '12px', marginTop: '10px', opacity: 0.7 }}>
            {autoRefresh ? '🔄 Auto-refresh enabled' : '⏸️ Auto-refresh disabled'} | 
            {isConnected ? ' 🔗 WebSocket connected' : ' 🔌 WebSocket disconnected'}
          </div>
          <button 
            onClick={handleManualRefresh}
            style={{ 
              marginTop: '10px', 
              padding: '5px 10px', 
              backgroundColor: '#00d4ff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!loading && !error && (!data || data.length === 0)) {
    return (
      <div
        style={{ 
          height: '650px', 
          minHeight: '650px',
          maxHeight: '650px',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#252931'
        }}
      >
        <div className="text-white">
          <p>No performance data available for today</p>
          <p>Data length: {data?.length || 0}</p>
          <p>Transform data length: {treemapData?.length || 0}</p>
          <p>Using today's data from /api/v1/treemap/live (treemap_live_view)</p>
          <div style={{ fontSize: '12px', marginTop: '10px', opacity: 0.7 }}>
            {autoRefresh ? '🔄 Auto-refresh enabled' : '⏸️ Auto-refresh disabled'} | 
            {isConnected ? ' 🔗 WebSocket connected' : ' 🔌 WebSocket disconnected'}
          </div>
          <button 
            onClick={handleManualRefresh}
            style={{ 
              marginTop: '10px', 
              padding: '5px 10px', 
              backgroundColor: '#00d4ff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Refresh Data
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      height: '650px', 
      minHeight: '650px',
      maxHeight: '650px',
      backgroundColor: '#252931',
      width: '100%'
    }}>
      <style>
        {`
          .highcharts-container {
            height: 650px !important;
            min-height: 650px !important;
            max-height: 650px !important;
          }
        `}
      </style>
      <HighchartsReact 
        highcharts={Highcharts} 
        options={chartOptions} 
        ref={chartRef}
        containerProps={{ style: { height: '650px', minHeight: '650px' } }}
      />
    </div>
  )
}

export default PerformanceTreeMapToday
