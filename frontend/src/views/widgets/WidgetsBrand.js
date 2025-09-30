import React from 'react'
import PropTypes from 'prop-types'
import { CWidgetStatsD, CRow, CCol } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cibFacebook, cibLinkedin, cibTwitter, cilCalendar } from '@coreui/icons'
import { CChart } from '@coreui/react-chartjs'
import { useRealtimePricesWebSocket } from '../../hooks/useWebSocket'
import { useDelaySparklinePg } from '../../hooks/useRealtime'

const WidgetsBrand = (props) => {
  // 실시간 암호화폐 데이터
  const cryptoSymbols = ['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'BNB', 'SOL', 'USDC', 'DOGEUSDT', 'TRX', 'ADAUSDT', 'LINK', 'AVAX', 'WBTC', 'XLM', 'BCHUSDT', 'HBAR', 'LTCUSDT', 'CRO', 'SHIB', 'TON', 'DOTUSDT']
  const { prices: realtimePrices, connected } = useRealtimePricesWebSocket(cryptoSymbols)
  const { data: sparklineData } = useDelaySparklinePg(cryptoSymbols, '15m', 1)
  
  const chartOptions = {
    elements: {
      line: {
        tension: 0.4,
      },
      point: {
        radius: 0,
        hitRadius: 10,
        hoverRadius: 4,
        hoverBorderWidth: 3,
      },
    },
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
      },
    },
  }

  return (
    <CRow className={props.className} xs={{ gutter: 4 }}>
      {cryptoSymbols.slice(0, 4).map((symbol, index) => {
        const coin = realtimePrices[symbol] || {}
        const name = symbol.replace('USDT', '')
        const price = coin.price || 0
        const changePercent = coin.change_percent || 0
        const sparklinePoints = sparklineData[symbol] || []
        const chartData = sparklinePoints.map(point => point.price || point.close_price || 0)
        
        const icons = [cibFacebook, cibLinkedin, cibTwitter, cilCalendar]
        const colors = ['#3b5998', '#0077b5', '#1da1f2', '#ff6b6b']
        
        return (
          <CCol key={symbol} sm={6} xl={4} xxl={3}>
            <CWidgetStatsD
              {...(props.withCharts && {
                chart: (
                  <CChart
                    className="position-absolute w-100 h-100"
                    type="line"
                    data={{
                      labels: chartData.map((_, i) => i),
                      datasets: [
                        {
                          backgroundColor: 'rgba(255,255,255,.1)',
                          borderColor: changePercent > 0 ? 'rgba(40,167,69,.8)' : 'rgba(220,53,69,.8)',
                          pointHoverBackgroundColor: '#fff',
                          borderWidth: 2,
                          data: chartData,
                          fill: true,
                        },
                      ],
                    }}
                    options={chartOptions}
                  />
                ),
              })}
              icon={<CIcon icon={icons[index]} height={52} className="my-4 text-white" />}
              values={[
                { title: '가격', value: `$${price.toLocaleString()}` },
                { title: '변화율', value: `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%` },
              ]}
              style={{
                '--cui-card-cap-bg': colors[index],
              }}
            />
          </CCol>
        )
      })}
      <CCol sm={6} xl={4} xxl={3}>
        <CWidgetStatsD
          {...(props.withCharts && {
            chart: (
              <CChart
                className="position-absolute w-100 h-100"
                type="line"
                data={{
                  labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
                  datasets: [
                    {
                      backgroundColor: 'rgba(255,255,255,.1)',
                      borderColor: 'rgba(255,255,255,.55)',
                      pointHoverBackgroundColor: '#fff',
                      borderWidth: 2,
                      data: [1, 13, 9, 17, 34, 41, 38],
                      fill: true,
                    },
                  ],
                }}
                options={chartOptions}
              />
            ),
          })}
          icon={<CIcon icon={cibTwitter} height={52} className="my-4 text-white" />}
          values={[
            { title: 'followers', value: '973k' },
            { title: 'tweets', value: '1.792' },
          ]}
          style={{
            '--cui-card-cap-bg': '#00aced',
          }}
        />
      </CCol>
      <CCol sm={6} xl={4} xxl={3}>
        <CWidgetStatsD
          {...(props.withCharts && {
            chart: (
              <CChart
                className="position-absolute w-100 h-100"
                type="line"
                data={{
                  labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
                  datasets: [
                    {
                      backgroundColor: 'rgba(255,255,255,.1)',
                      borderColor: 'rgba(255,255,255,.55)',
                      pointHoverBackgroundColor: '#fff',
                      borderWidth: 2,
                      data: [78, 81, 80, 45, 34, 12, 40],
                      fill: true,
                    },
                  ],
                }}
                options={chartOptions}
              />
            ),
          })}
          icon={<CIcon icon={cibLinkedin} height={52} className="my-4 text-white" />}
          values={[
            { title: 'contacts', value: '500' },
            { title: 'feeds', value: '1.292' },
          ]}
          style={{
            '--cui-card-cap-bg': '#4875b4',
          }}
        />
      </CCol>
      <CCol sm={6} xl={4} xxl={3}>
        <CWidgetStatsD
          color="warning"
          {...(props.withCharts && {
            chart: (
              <CChart
                className="position-absolute w-100 h-100"
                type="line"
                data={{
                  labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
                  datasets: [
                    {
                      backgroundColor: 'rgba(255,255,255,.1)',
                      borderColor: 'rgba(255,255,255,.55)',
                      pointHoverBackgroundColor: '#fff',
                      borderWidth: 2,
                      data: [35, 23, 56, 22, 97, 23, 64],
                      fill: true,
                    },
                  ],
                }}
                options={chartOptions}
              />
            ),
          })}
          icon={<CIcon icon={cilCalendar} height={52} className="my-4 text-white" />}
          values={[
            { title: 'events', value: '12+' },
            { title: 'meetings', value: '4' },
          ]}
        />
      </CCol>
    </CRow>
  )
}

WidgetsBrand.propTypes = {
  className: PropTypes.string,
  withCharts: PropTypes.bool,
}

export default WidgetsBrand
