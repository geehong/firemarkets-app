import React, { useEffect, useRef } from 'react'
import PropTypes from 'prop-types'

import {
  CRow,
  CCol,
  CDropdown,
  CDropdownMenu,
  CDropdownItem,
  CDropdownToggle,
  CWidgetStatsA,
} from '@coreui/react'
import { getStyle } from '@coreui/utils'
import { CChartLine } from '@coreui/react-chartjs'
import CIcon from '@coreui/icons-react'
import { cilArrowBottom, cilArrowTop, cilOptions } from '@coreui/icons'
import { useRealtimePricesWebSocket } from '../../hooks/useWebSocket'
import { useDelaySparklinePg } from '../../hooks/useRealtime'

const WidgetsDropdown = (props) => {
  const widgetChartRef1 = useRef(null)
  const widgetChartRef2 = useRef(null)
  
  // 실시간 암호화폐 데이터
  const cryptoSymbols = ['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'BNB', 'SOL', 'USDC', 'DOGEUSDT', 'TRX', 'ADAUSDT', 'LINK', 'AVAX', 'WBTC', 'XLM', 'BCHUSDT', 'HBAR', 'LTCUSDT', 'CRO', 'SHIB', 'TON', 'DOTUSDT']
  const { prices: realtimePrices, connected } = useRealtimePricesWebSocket(cryptoSymbols)
  const { data: sparklineData } = useDelaySparklinePg(cryptoSymbols, '15m', 1)

  useEffect(() => {
    document.documentElement.addEventListener('ColorSchemeChange', () => {
      if (widgetChartRef1.current) {
        setTimeout(() => {
          widgetChartRef1.current.data.datasets[0].pointBackgroundColor = getStyle('--cui-primary')
          widgetChartRef1.current.update()
        })
      }

      if (widgetChartRef2.current) {
        setTimeout(() => {
          widgetChartRef2.current.data.datasets[0].pointBackgroundColor = getStyle('--cui-info')
          widgetChartRef2.current.update()
        })
      }
    })
  }, [widgetChartRef1, widgetChartRef2])

  return (
    <CRow className={props.className} xs={{ gutter: 4 }}>
      {cryptoSymbols.slice(0, 4).map((symbol, index) => {
        const coin = realtimePrices[symbol] || {}
        const name = symbol.replace('USDT', '')
        const price = coin.price || 0
        const changePercent = coin.change_percent || 0
        const sparklinePoints = sparklineData[symbol] || []
        const chartData = sparklinePoints.map(point => point.price || point.close_price || 0)
        
        const colors = ['primary', 'info', 'warning', 'success']
        const arrowIcon = changePercent > 0 ? cilArrowTop : cilArrowBottom
        
        return (
          <CCol key={symbol} sm={6} xl={4} xxl={3}>
            <CWidgetStatsA
              color={colors[index]}
              value={
                <>
                  ${price.toLocaleString()}{' '}
                  <span className="fs-6 fw-normal">
                    ({changePercent > 0 ? '+' : ''}{changePercent.toFixed(2)}% <CIcon icon={arrowIcon} />)
                  </span>
                </>
              }
              title={name}
              action={
                <CDropdown alignment="end">
                  <CDropdownToggle color="transparent" caret={false} className="text-white p-0">
                    <CIcon icon={cilOptions} />
                  </CDropdownToggle>
                  <CDropdownMenu>
                    <CDropdownItem>실시간 차트</CDropdownItem>
                    <CDropdownItem>상세 정보</CDropdownItem>
                    <CDropdownItem>알림 설정</CDropdownItem>
                    <CDropdownItem disabled>WebSocket: {connected ? '연결됨' : '연결 끊김'}</CDropdownItem>
                  </CDropdownMenu>
                </CDropdown>
              }
              chart={
                <CChartLine
                  ref={index === 0 ? widgetChartRef1 : widgetChartRef2}
                  className="mt-3 mx-3"
                  style={{ height: '70px' }}
                  data={{
                    labels: chartData.map((_, i) => i),
                    datasets: [
                      {
                        label: `${name} Price`,
                        backgroundColor: 'transparent',
                        borderColor: changePercent > 0 ? 'rgba(40,167,69,.8)' : 'rgba(220,53,69,.8)',
                        pointBackgroundColor: getStyle(`--cui-${colors[index]}`),
                        data: chartData,
                      },
                    ],
                  }}
                  options={{
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    maintainAspectRatio: false,
                    scales: {
                      x: {
                        border: {
                          display: false,
                        },
                        grid: {
                          display: false,
                          drawBorder: false,
                        },
                        ticks: {
                          display: false,
                        },
                      },
                      y: {
                        min: chartData.length > 0 ? Math.min(...chartData) * 0.95 : 0,
                        max: chartData.length > 0 ? Math.max(...chartData) * 1.05 : 100,
                        display: false,
                        grid: {
                          display: false,
                        },
                        ticks: {
                          display: false,
                        },
                      },
                    },
                    elements: {
                      line: {
                        borderWidth: 1,
                        tension: 0.4,
                      },
                      point: {
                        radius: 4,
                        hitRadius: 10,
                        hoverRadius: 4,
                      },
                    },
                  }}
                />
              }
            />
          </CCol>
        )
      })}
    </CRow>
  )
}

WidgetsDropdown.propTypes = {
  className: PropTypes.string,
  withCharts: PropTypes.bool,
}

export default WidgetsDropdown