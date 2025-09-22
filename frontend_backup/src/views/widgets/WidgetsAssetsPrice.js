import React from 'react'
import PropTypes from 'prop-types'
import { CRow, CCol, CWidgetStatsA, CWidgetStatsE } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowBottom, cilArrowTop } from '@coreui/icons'
import { CChartLine } from '@coreui/react-chartjs'

const WidgetsAssetsPrice = ({ asset }) => {
  if (!asset) {
    return null
  }

  // Use latest price info from the asset object
  const currentPrice = asset.current_price
  const changePercent = asset.change_percent_24h
  const volume = asset.volume_24h
  const lastMonthOhlcv = asset.last_month_ohlcv || []

  const priceDisplay =
    currentPrice !== null && currentPrice !== undefined
      ? `$${currentPrice.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : 'N/A'

  const changeDisplay =
    changePercent !== null && changePercent !== undefined ? `${changePercent.toFixed(2)}%` : 'N/A'

  const arrowIcon =
    changePercent !== null && changePercent !== undefined
      ? changePercent >= 0
        ? cilArrowTop
        : cilArrowBottom
      : null

  const volumeDisplay =
    volume !== null && volume !== undefined
      ? volume.toLocaleString(undefined, { notation: 'compact', compactDisplay: 'short' })
      : 'N/A'

  const chartData = {
    labels: lastMonthOhlcv.map((d) => new Date(d.timestamp_utc).toLocaleDateString()),
    datasets: [
      {
        backgroundColor: 'transparent',
        borderColor: '#321fdb',
        borderWidth: 2,
        data: lastMonthOhlcv.map((d) => parseFloat(d.close_price)),
      },
    ],
  }

  const chartOptions = {
    maintainAspectRatio: false,
    elements: {
      line: {
        tension: 0.4,
      },
      point: {
        radius: 0,
      },
    },
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
    <CRow className="mb-4">
      {/* <CCol sm={6} lg={4}>
        <CWidgetStatsA
          className="h-100"
          color="primary"
          value={
            <>
              {priceDisplay}{' '}
              {arrowIcon && (
                <span
                  className={`fs-6 fw-normal ${changePercent >= 0 ? 'text-success-emphasis' : 'text-danger-emphasis'}`}
                >
                  ({changeDisplay} <CIcon icon={arrowIcon} />)
                </span>
              )}
            </>
          }
          title="Current Price"
        />
      </CCol>
      <CCol sm={6} lg={4}>
        <CWidgetStatsA className="h-100" color="info" value={volumeDisplay} title="24h Volume" />
      </CCol> */}
      <CCol sm={6} lg={4}>
        <CWidgetStatsE
          className="h-100"
          chart={
            <CChartLine
              className="mx-auto"
              style={{ height: '40px' }}
              data={chartData}
              options={chartOptions}
            />
          }
          title="Price & Last 30 Days Chart"
          value={priceDisplay}
        />
      </CCol>
    </CRow>
  )
}

WidgetsAssetsPrice.propTypes = {
  asset: PropTypes.object,
}

export default WidgetsAssetsPrice
