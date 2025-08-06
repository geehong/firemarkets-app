import React from 'react'
import {
  CCol,
  CRow,
  CWidgetStatsB,
  CWidgetStatsC,
  CWidgetStatsE,
  CWidgetStatsF,
} from '@coreui/react'
import { CChartBar, CChartLine } from '@coreui/react-chartjs'

const StatsWidget = ({
  type = 'statsB', // 'statsB', 'statsC', 'statsE', 'statsF'
  items = [],
  gutter = 4,
  responsive = { xs: 12, sm: 6, xl: 4, xxl: 3 },
}) => {
  const renderWidget = (item, index) => {
    const { key, ...commonProps } = {
      color: item.color,
      inverse: item.inverse,
      value: item.value,
      title: item.title,
      text: item.text,
    }

    const widgetKey = item.id || index

    switch (type) {
      case 'statsB':
        return <CWidgetStatsB key={widgetKey} {...commonProps} progress={item.progress} />
      case 'statsC':
        return (
          <CWidgetStatsC key={widgetKey} {...commonProps} icon={item.icon} chart={item.chart} />
        )
      case 'statsE':
        return <CWidgetStatsE key={widgetKey} {...commonProps} chart={item.chart} />
      case 'statsF':
        return (
          <CWidgetStatsF key={widgetKey} {...commonProps} icon={item.icon} chart={item.chart} />
        )
      default:
        return <CWidgetStatsB key={widgetKey} {...commonProps} progress={item.progress} />
    }
  }

  return (
    <CRow xs={{ gutter }}>
      {items.map((item, index) => (
        <CCol
          key={item.id || index}
          xs={responsive.xs}
          sm={responsive.sm}
          xl={responsive.xl}
          xxl={responsive.xxl}
        >
          {renderWidget(item, index)}
        </CCol>
      ))}
    </CRow>
  )
}

// Preset configurations
export const createStatsBWidgets = (items) => ({
  type: 'statsB',
  items: items.map((item) => ({
    ...item,
    progress: item.progress || { color: 'primary', value: 0 },
  })),
})

export const createStatsCWidgets = (items) => ({
  type: 'statsC',
  items: items.map((item) => ({
    ...item,
    chart: item.chart || null,
  })),
})

export const createStatsEWidgets = (items) => ({
  type: 'statsE',
  items: items.map((item) => ({
    ...item,
    chart: item.chart || null,
  })),
})

export const createStatsFWidgets = (items) => ({
  type: 'statsF',
  items: items.map((item) => ({
    ...item,
    icon: item.icon || null,
    chart: item.chart || null,
  })),
})

export default StatsWidget
