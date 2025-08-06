import React from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import { CChartBar } from '@coreui/react-chartjs'
import { DocsExample } from 'src/components'

import WidgetsBrand from './WidgetsBrand'
import WidgetsDropdown from './WidgetsDropdown'
import AssetPriceWidget from './AssetPriceWidget'
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
