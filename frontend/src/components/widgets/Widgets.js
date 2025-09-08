import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { CCard, CCardBody, CCardHeader, CRow, CCol, CWidgetStatsA } from '@coreui/react'
import { CChartBar, CChartLine } from '@coreui/react-chartjs'
import { DocsExample } from 'src/components'

import WidgetsBrand from './WidgetsBrand'
import WidgetsDropdown from './WidgetsDropdown'
import AssetPriceWidget from './AssetPriceWidget'
import RealtimeTickerWidget from './RealtimeTickerWidget'
import StatsWidget, {
  createStatsBWidgets,
  createStatsCWidgets,
  createStatsEWidgets,
  createStatsFWidgets,
} from './StatsWidget'

const Widgets = ({
  showAssetPrices = true,
  showExamples = true,
  assetPriceConfig = {},
  onAssetDataLoad,
  onAssetError,
}) => {
  // 실제 데이터 연동: WidgetsDropdown과 동일한 API 사용
  const fetchTickerSummary = async (tickers) => {
    try {
      const response = await fetch(`/api/v1/widgets/ticker-summary?tickers=${tickers.join(',')}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data.data
    } catch (error) {
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

  const targetTickers = ['BTCUSDT', 'GCUSD', 'SPY', 'MSFT']
  const { data: widgetData = [], isLoading: isLoadingWidgets, error: widgetsError } = useQuery({
    queryKey: ['widget-ticker-summary', targetTickers],
    queryFn: () => fetchTickerSummary(targetTickers),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const widgetColorMap = {
    BTCUSDT: '#F7931A',
    GCUSD: '#FFD700',
    MSFT: '#0078D4',
    SPY: '#006400',
  }

  const monthLabels = (() => {
    const labels = []
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      labels.push(d.toLocaleString('default', { month: 'short' }))
    }
    return labels
  })()

  // Example widget configurations
  const exampleStatsB = createStatsBWidgets([
    {
      id: 'widget1',
      progress: { color: 'success', value: 89.9 },
      text: 'Lorem ipsum dolor sit amet enim.',
      title: 'Widget title',
      value: '89.9%',
    },
    {
      id: 'widget2',
      value: '12.124',
      title: 'Widget title',
      progress: { color: 'info', value: 89.9 },
      text: 'Lorem ipsum dolor sit amet enim.',
    },
    {
      id: 'widget3',
      value: '$98.111,00',
      title: 'Widget title',
      progress: { color: 'warning', value: 89.9 },
      text: 'Lorem ipsum dolor sit amet enim.',
    },
    {
      id: 'widget4',
      value: '2 TB',
      title: 'Widget title',
      progress: { color: 'primary', value: 89.9 },
      text: 'Lorem ipsum dolor sit amet enim.',
    },
  ])

  const exampleStatsBInverse = createStatsBWidgets([
    {
      id: 'widget5',
      color: 'success',
      inverse: true,
      value: '89.9%',
      title: 'Widget title',
      progress: { value: 89.9 },
      text: 'Lorem ipsum dolor sit amet enim.',
    },
    {
      id: 'widget6',
      color: 'info',
      inverse: true,
      value: '12.124',
      title: 'Widget title',
      progress: { value: 89.9 },
      text: 'Lorem ipsum dolor sit amet enim.',
    },
    {
      id: 'widget7',
      color: 'warning',
      inverse: true,
      value: '$98.111,00',
      title: 'Widget title',
      progress: { value: 89.9 },
      text: 'Lorem ipsum dolor sit amet enim.',
    },
    {
      id: 'widget8',
      color: 'primary',
      inverse: true,
      value: '2 TB',
      title: 'Widget title',
      progress: { value: 89.9 },
      text: 'Lorem ipsum dolor sit amet enim.',
    },
  ])

  return (
    <>
      {/* 새로운 실시간 간단 위젯 */}
      <RealtimeTickerWidget cryptoSymbols={['BTC', 'ETH', 'ADA']} stockSymbols={['AAPL', 'MSFT', 'TSLA']} />

      {/* 실시간 자산 가격 위젯 */}
      {showAssetPrices && (
        <AssetPriceWidget
          {...assetPriceConfig}
          onDataLoad={onAssetDataLoad}
          onError={onAssetError}
        />
      )}

      {/* 예제 위젯들 */}
      {showExamples && (
        <>
          <CCard className="mb-4">
            <CCardHeader>Widgets</CCardHeader>
            <CCardBody>
              {/* CWidgetStatsA with Spline Area charts */}
              <DocsExample href="components/widgets/#cwidgetstatsa">
                <CRow xs={{ gutter: 4 }}>
                  {isLoadingWidgets || widgetsError || widgetData.length === 0
                    ? targetTickers.map((ticker) => (
                        <CCol sm={6} xl={4} xxl={3} key={ticker}>
                          <CWidgetStatsA
                            style={{ backgroundColor: widgetColorMap[ticker] || '#888', color: '#fff' }}
                            value={<>Loading...</>}
                            title={ticker}
                            chart={<div style={{ height: '70px' }}></div>}
                          />
                        </CCol>
                      ))
                    : widgetData.map((w, idx) => {
                        const color = widgetColorMap[w.ticker] || '#888888'
                        const valueText =
                          w.current_price !== null
                            ? `$${w.current_price.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : 'N/A'
                        const prices = w.monthly_prices_7m && w.monthly_prices_7m.some((p) => p !== null)
                          ? w.monthly_prices_7m
                          : []
                        return (
                          <CCol sm={6} xl={4} xxl={3} key={w.ticker || idx}>
                            <CWidgetStatsA
                              style={{ backgroundColor: color, color: '#fff' }}
                              value={<>{valueText}</>}
                              title={w.name || w.ticker}
                              chart={
                                prices.length > 0 ? (
                                  <CChartLine
                                    className="mt-3 mx-3"
                                    style={{ height: '70px' }}
                                    data={{
                                      labels: monthLabels,
                                      datasets: [{
                                        label: w.ticker,
                                        data: prices,
                                        borderColor: 'rgba(255,255,255,0.95)',
                                        backgroundColor: 'rgba(255,255,255,0.35)',
                                        fill: true,
                                        tension: 0.4,
                                        pointRadius: 0,
                                        borderWidth: 2,
                                      }],
                                    }}
                                    options={{
                                      plugins: { legend: { display: false } },
                                      maintainAspectRatio: false,
                                      scales: { x: { display: false }, y: { display: false } },
                                      elements: { point: { hitRadius: 10, hoverRadius: 4 } },
                                    }}
                                  />
                                ) : (
                                  <div style={{ height: '70px' }} />
                                )
                              }
                            />
                          </CCol>
                        )
                      })}
                </CRow>
              </DocsExample>

              <DocsExample href="components/widgets/#cwidgetstatsa">
                <WidgetsDropdown />
              </DocsExample>

              <DocsExample href="components/widgets/#cwidgetstatsb">
                <StatsWidget {...exampleStatsB} />
              </DocsExample>

              <DocsExample href="components/widgets/#cwidgetstatsb">
                <StatsWidget {...exampleStatsBInverse} />
              </DocsExample>

              <DocsExample href="components/widgets/#cwidgetstatse">
                <StatsWidget
                  type="statsE"
                  responsive={{ sm: 4, md: 3, xl: 2 }}
                  items={[
                    {
                      id: 'chart1',
                      chart: (
                        <CChartBar
                          className="mx-auto"
                          style={{ height: '40px', width: '80px' }}
                          data={{
                            labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
                            datasets: [
                              {
                                backgroundColor: 'rgba(255,255,255,.2)',
                                data: [78, 81, 80, 45, 34, 12, 40],
                                fill: true,
                              },
                              {
                                backgroundColor: 'rgba(255,255,255,.2)',
                                data: [35, 40, 60, 47, 88, 27, 30],
                                fill: true,
                              },
                            ],
                          }}
                          options={{
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
                          }}
                        />
                      ),
                      title: 'title',
                      value: '1,123',
                    },
                  ]}
                />
              </DocsExample>

              <DocsExample href="components/widgets/#cwidgetstatsf">
                <StatsWidget
                  type="statsF"
                  responsive={{ sm: 6, xl: 3 }}
                  items={[
                    {
                      id: 'f1',
                      icon: 'cil-settings',
                      title: 'title',
                      value: '87.500',
                      text: 'Lorem ipsum dolor sit amet enim.',
                    },
                    {
                      id: 'f2',
                      icon: 'cil-user',
                      title: 'title',
                      value: '385.200',
                      text: 'Lorem ipsum dolor sit amet enim.',
                    },
                    {
                      id: 'f3',
                      icon: 'cil-bell',
                      title: 'title',
                      value: '1238',
                      text: 'Lorem ipsum dolor sit amet enim.',
                    },
                    {
                      id: 'f4',
                      icon: 'cil-chartPie',
                      title: 'title',
                      value: '28%',
                      text: 'Lorem ipsum dolor sit amet enim.',
                    },
                  ]}
                />
              </DocsExample>
            </CCardBody>
          </CCard>

          <WidgetsBrand />
        </>
      )}
    </>
  )
}

export default Widgets
