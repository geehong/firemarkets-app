import React from 'react'
import { CCard, CCardBody, CCardHeader, CRow, CCol } from '@coreui/react'

const EtfInfos = ({ etfInfo }) => {
  if (!etfInfo || etfInfo.length === 0) {
    return (
      <CCard className="mb-4">
        <CCardHeader>ETF Information</CCardHeader>
        <CCardBody>
          <p>No ETF data available.</p>
        </CCardBody>
      </CCard>
    )
  }

  // Displaying the latest available data
  const latestData = etfInfo[0]

  const metrics = [
    {
      label: 'Net Assets',
      value: latestData.net_assets?.toLocaleString('en-US', {
        notation: 'compact',
        compactDisplay: 'short',
      }),
    },
    {
      label: 'Expense Ratio',
      value: latestData.net_expense_ratio
        ? `${(latestData.net_expense_ratio * 100).toFixed(2)}%`
        : null,
    },
    {
      label: 'Portfolio Turnover',
      value: latestData.portfolio_turnover
        ? `${(latestData.portfolio_turnover * 100).toFixed(2)}%`
        : null,
    },
    {
      label: 'Dividend Yield',
      value: latestData.dividend_yield ? `${(latestData.dividend_yield * 100).toFixed(2)}%` : null,
    },
    {
      label: 'Leveraged',
      value: latestData.leveraged ? 'Yes' : 'No',
    },
  ]

  return (
    <CCard className="mb-4">
      <CCardHeader>ETF Information</CCardHeader>
      <CCardBody>
        <CRow>
          {metrics.map((metric, index) => (
            <CCol key={index} sm={6} md={4} lg={3} className="mb-3">
              <div className="text-body-secondary small text-uppercase">{metric.label}</div>
              <div className="fs-5 fw-semibold">{metric.value || 'N/A'}</div>
            </CCol>
          ))}
        </CRow>
        <hr />
        <h5>ETF Details</h5>
        <p>
          <strong>Inception Date:</strong>{' '}
          {latestData.inception_date
            ? new Date(latestData.inception_date).toLocaleDateString()
            : 'N/A'}
        </p>
        <p>
          <strong>Snapshot Date:</strong>{' '}
          {latestData.snapshot_date
            ? new Date(latestData.snapshot_date).toLocaleDateString()
            : 'N/A'}
        </p>
      </CCardBody>
    </CCard>
  )
}

export default EtfInfos

