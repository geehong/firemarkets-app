import React from 'react'
import { CCard, CCardBody, CCardHeader, CRow, CCol } from '@coreui/react'

const StockInfos = ({ fundamentals }) => {
  if (!fundamentals || fundamentals.length === 0) {
    return (
      <CCard className="mb-4">
        <CCardHeader>Key Metrics</CCardHeader>
        <CCardBody>
          <p>No fundamental data available.</p>
        </CCardBody>
      </CCard>
    )
  }

  // Displaying the latest available data
  const latestData = fundamentals[0]

  const metrics = [
    {
      label: 'Market Cap',
      value: latestData.market_capitalization?.toLocaleString('en-US', {
        notation: 'compact',
        compactDisplay: 'short',
      }),
    },
    { label: 'P/E Ratio', value: latestData.per_ratio?.toFixed(2) },
    { label: 'EPS', value: latestData.eps?.toFixed(2) },
    {
      label: 'Dividend Yield',
      value: latestData.dividend_yield ? `${(latestData.dividend_yield * 100).toFixed(2)}%` : null,
    },
    { label: 'Book Value', value: latestData.book_value?.toFixed(2) },
    { label: '52 Week High', value: latestData['52_week_high']?.toFixed(2) },
    { label: '52 Week Low', value: latestData['52_week_low']?.toFixed(2) },
    { label: 'Beta', value: latestData.beta?.toFixed(2) },
  ]

  return (
    <CCard className="mb-4">
      <CCardHeader>Key Metrics</CCardHeader>
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
        <h5>Company Profile</h5>
        <p>
          <strong>Sector:</strong> {latestData.sector || 'N/A'}
        </p>
        <p>
          <strong>Industry:</strong> {latestData.industry || 'N/A'}
        </p>
        <p>
          <strong>Description:</strong> {latestData.description || 'No description available.'}
        </p>
      </CCardBody>
    </CCard>
  )
}

export default StockInfos
