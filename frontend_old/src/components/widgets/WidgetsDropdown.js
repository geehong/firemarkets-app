import React, { useEffect, useRef, useState } from 'react' // useState 추가
import PropTypes from 'prop-types'
import { useQuery } from '@tanstack/react-query'

import {
  CRow,
  CCol,
  CDropdown,
  CDropdownMenu,
  CDropdownItem,
  CDropdownToggle,
  CWidgetStatsA,
  CCard,
  CCardBody,
  CCardHeader,
} from '@coreui/react'
import { getStyle } from '@coreui/utils'
import { CChartLine } from '@coreui/react-chartjs' // CChartBar 제거 (라인 차트만 사용)
import CIcon from '@coreui/icons-react'
import { cilArrowBottom, cilArrowTop, cilOptions, cilWarning } from '@coreui/icons' // cilWarning 추가
import CardTools from '../common/CardTools'
import '../common/CardTools.css'

// API 호출 함수 (별도 파일로 분리 가능)
const fetchTickerSummary = async (tickers) => {
  try {
    const response = await fetch(`/api/v1/widgets/ticker-summary?tickers=${tickers.join(',')}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data.data // { data: [...] } 형태로 오므로 data.data 접근
  } catch (error) {
    // console.error('Error fetching ticker summary:', error)
    // 각 티커에 대해 에러 상태를 포함하는 기본 객체 반환
    return tickers.map((ticker) => ({
      ticker,
      name: `${ticker} (Error)`,
      current_price: null,
      change_percent_7m: null,
      monthly_prices_7m: Array(7).fill(null),
      error: true,
    }))
  }
}

const WidgetsDropdown = (props) => {
  const chartRefs = useRef([]) // 여러 차트 ref를 배열로 관리
  const [isCollapsed, setIsCollapsed] = useState(false)

  // 표시할 티커 목록 (요청하신 티커들)
  // GCUSD는 예시입니다. 실제 금 티커로 변경하세요. (예: GC=F, GOLD 등)
  const targetTickers = ['BTCUSDT', 'GCUSD', 'SPY', 'MSFT']

  // 최적화: React Query를 사용하여 캐싱 및 로딩 상태 관리
  const { data: widgetData = [], isLoading, error } = useQuery({
    queryKey: ['widget-ticker-summary', targetTickers],
    queryFn: () => fetchTickerSummary(targetTickers),
    staleTime: 5 * 60 * 1000, // 5분
    cacheTime: 10 * 60 * 1000, // 10분
    refetchOnWindowFocus: false,
  })

  // ColorSchemeChange 이벤트 리스너를 위한 useEffect
  useEffect(() => {
    // ColorSchemeChange 이벤트 리스너 (기존 로직 유지, 모든 차트에 적용되도록 수정)
    const handleColorSchemeChange = () => {
      if (widgetData.length > 0 && chartRefs.current.length === widgetData.length) {
        chartRefs.current.forEach((chartRef, index) => {
          if (chartRef && chartRef.current) {
            const widget = widgetData[index]
            if (
              widget &&
              !widget.error &&
              chartRef.current.data &&
              chartRef.current.data.datasets &&
              chartRef.current.data.datasets[0]
            ) {
              // 데이터가 있고 에러가 아닐 때만 업데이트
              setTimeout(() => {
                const chartColor =
                  index % 4 === 0 // widgetConfigs 배열 길이에 맞춰 순환
                    ? '--cui-primary'
                    : index % 4 === 1
                      ? '--cui-info'
                      : index % 4 === 2
                        ? '--cui-warning'
                        : '--cui-danger'
                chartRef.current.data.datasets[0].pointBackgroundColor = getStyle(chartColor)
                chartRef.current.update()
              }, 0)
            }
          }
        })
      }
    }

    if (widgetData.length > 0) {
      document.documentElement.addEventListener('ColorSchemeChange', handleColorSchemeChange)
      return () => {
        document.documentElement.removeEventListener('ColorSchemeChange', handleColorSchemeChange)
      }
    }
  }, [widgetData]) // widgetData가 변경될 때 handleColorSchemeChange 내부에서 최신 widgetData를 사용하도록 의존성 설정

  // 각 위젯에 대한 설정 (색상 등)
  const widgetColorMap = {
    BTCUSDT: '#F7931A', // 비트코인 오렌지
    GCUSD: '#FFD700', // 금색
    MSFT: '#0078D4', // 마이크로소프트 파랑
    SPY: '#006400', // SPY 짙은 녹색
  }

  // 기존 widgetConfigs는 사용하지 않음

  // 최근 7개월 라벨 (실제로는 API 응답의 타임스탬프를 사용하는 것이 더 정확)
  const generateMonthLabels = () => {
    const labels = []
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      labels.push(d.toLocaleString('default', { month: 'short' }))
    }
    return labels
  }
  const monthLabels = generateMonthLabels()

  const handleCollapse = (collapsed) => {
    setIsCollapsed(collapsed)
  }

  const handleRemove = () => {
    console.log('Removing WidgetsDropdown')
  }

  const handleAction = (action) => {
    switch (action) {
      case 'refresh':
        console.log('Refreshing widget data')
        // 데이터 새로고침 로직
        break
      case 'settings':
        console.log('Opening widget settings')
        break
      case 'export':
        console.log('Exporting widget data')
        break
      default:
        console.log('Action:', action)
    }
  }

  return (
    <CCard className={`mb-4 ${isCollapsed ? 'collapsed' : ''}`}>
      <CCardHeader>
        <div className="card-title">Ticker Summary Widgets</div>
        <CardTools
          onCollapse={handleCollapse}
          onRemove={handleRemove}
          onAction={handleAction}
          dropdownItems={[
            { label: 'Export Data', action: 'export' },
            { label: 'Full Screen', action: 'fullscreen' },
            { label: 'Customize Layout', action: 'customize' },
          ]}
        />
      </CCardHeader>
      <CCardBody>
        <CRow className={props.className} xs={{ gutter: 4 }}>
          {isLoading ? (
            // 로딩 중 또는 데이터 없는 경우 (4개의 스켈레톤 위젯 표시 가능)
            targetTickers.map((ticker, index) => (
              <CCol sm={6} xl={4} xxl={3} key={ticker}>
                <CWidgetStatsA
                  style={{ backgroundColor: widgetColorMap[ticker] || '#888888', color: '#fff' }}
                  value={<>Loading...</>}
                  title={ticker}
                  chart={<div style={{ height: '70px' }}></div>}
                />
              </CCol>
            ))
          ) : error ? (
            // 에러 발생 시 에러 메시지 표시
            <CCol sm={6} xl={4} xxl={3}>
              <CWidgetStatsA
                style={{ backgroundColor: '#DC3545', color: '#fff' }}
                value={<>Error: {error.message}</>}
                title="Data Fetch Error"
                chart={<div style={{ height: '70px' }}></div>}
              />
            </CCol>
          ) : widgetData.length > 0
            ? widgetData.map((data, index) => {
                // ref 배열 초기화
                if (!chartRefs.current[index]) {
                  chartRefs.current[index] = React.createRef()
                }
                const color = widgetColorMap[data.ticker] || '#888888'
                const priceDisplay =
                  data.current_price !== null
                    ? `$${data.current_price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    : 'N/A'
                const changeDisplay =
                  data.change_percent_7m !== null ? `${data.change_percent_7m.toFixed(2)}%` : 'N/A'
                const arrowIcon =
                  data.change_percent_7m !== null
                    ? data.change_percent_7m >= 0
                      ? cilArrowTop
                      : cilArrowBottom
                    : null

                return (
                  <CCol sm={6} xl={4} xxl={3} key={data.ticker || index}>
                    <CWidgetStatsA
                      style={{ backgroundColor: color, color: '#fff' }}
                      value={
                        <>
                          {priceDisplay}{' '}
                          {!data.error && data.change_percent_7m !== null && (
                            <span
                              className={`fs-6 fw-normal ${
                                data.change_percent_7m >= 0 ? 'text-success' : 'text-danger'
                              }`}
                            >
                              ({changeDisplay} <CIcon icon={arrowIcon} />)
                            </span>
                          )}
                          {data.error && <CIcon icon={cilWarning} title="Error loading data" />}
                        </>
                      }
                      title={data.name || data.ticker}
                      action={
                        !data.error && (
                          <CDropdown alignment="end">
                            <CDropdownToggle
                              color="transparent"
                              caret={false}
                              className="text-white p-0"
                            >
                              <CIcon icon={cilOptions} />
                            </CDropdownToggle>
                            <CDropdownMenu>
                              <CDropdownItem>View Details</CDropdownItem>
                              {/* <CDropdownItem>Another action</CDropdownItem> */}
                            </CDropdownMenu>
                          </CDropdown>
                        )
                      }
                      chart={
                        !data.error &&
                        data.monthly_prices_7m &&
                        data.monthly_prices_7m.some((p) => p !== null) ? ( // 데이터가 하나라도 있을 때 차트 렌더링
                          <CChartLine
                            ref={chartRefs.current[index]}
                            className="mt-3 mx-3"
                            style={{ height: '70px' }}
                            data={{
                              labels: monthLabels,
                              datasets: [
                                {
                                  label: data.ticker,
                                  backgroundColor: 'rgba(255,255,255,0.35)',
                                  borderColor: 'rgba(255,255,255,0.95)',
                                  pointBackgroundColor: '#ffffff',
                                  data: data.monthly_prices_7m, // API에서 받은 7개월치 가격 데이터
                                  fill: true,
                                  tension: 0.4,
                                },
                              ],
                            }}
                            options={{
                              plugins: {
                                legend: { display: false },
                                tooltip: {
                                  displayColors: false,
                                  padding: 6,
                                  caretSize: 5,
                                  titleFont: { size: 10 },
                                  bodyFont: { size: 9 },
                                  footerFont: { size: 9 },
                                  callbacks: {
                                    label: function (context) {
                                      let label = context.dataset.label || ''
                                      if (label) {
                                        label += ': '
                                      }
                                      if (context.parsed.y !== null) {
                                        label += new Intl.NumberFormat('en-US', {
                                          style: 'currency',
                                          currency: 'USD',
                                        }).format(context.parsed.y)
                                      }
                                      return label
                                    },
                                  },
                                },
                              },
                              maintainAspectRatio: false,
                              scales: {
                                x: { display: false },
                                y: { display: false },
                              },
                              elements: {
                                line: { borderWidth: 2, tension: 0.4 },
                                point: { radius: 0, hitRadius: 10, hoverRadius: 4 },
                              },
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              height: '70px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'rgba(255,255,255,.55)',
                            }}
                          >
                            {data.error ? 'Data Error' : 'No chart data'}
                          </div>
                        )
                      }
                    />
                  </CCol>
                )
              })
            : // 로딩 중 또는 데이터 없는 경우 (4개의 스켈레톤 위젯 표시 가능)
              targetTickers.map((ticker, index) => (
                <CCol sm={6} xl={4} xxl={3} key={ticker}>
                  <CWidgetStatsA
                    style={{ backgroundColor: widgetColorMap[ticker] || '#888888', color: '#fff' }}
                    value={<>Loading...</>}
                    title={ticker}
                    chart={<div style={{ height: '70px' }}></div>}
                  />
                </CCol>
              ))}
        </CRow>
      </CCardBody>
    </CCard>
  )
}

WidgetsDropdown.propTypes = {
  className: PropTypes.string,
  // withCharts prop은 더 이상 사용되지 않으므로 제거
}

export default WidgetsDropdown
