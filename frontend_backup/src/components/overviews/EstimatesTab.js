import React from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'

const EstimatesTab = ({ asset, stockEstimates }) => {
  const formatCurrency = (value) => {
    if (!value) return 'N/A'
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`
    return value.toFixed(2)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
  }

  const getEstimatesData = () => {
    if (asset?.type_name === 'Stocks' && stockEstimates) {
      // stockEstimates가 {data: [...]} 구조인 경우 data 배열 사용
      const estimatesArray = stockEstimates.data || stockEstimates
      
      if (!Array.isArray(estimatesArray)) return null
      
      // Sort by fiscal_date descending (most recent first)
      const sortedEstimates = [...estimatesArray].sort(
        (a, b) => new Date(b.fiscal_date) - new Date(a.fiscal_date),
      )

      // Get the most recent estimate for summary
      const latestEstimate = sortedEstimates[0]

      if (!latestEstimate) return null

      return {
        latest: latestEstimate,
        allEstimates: sortedEstimates,
        summary: {
          latestFiscalDate: formatDate(latestEstimate.fiscal_date),
          latestRevenue: formatCurrency(latestEstimate.revenue_low),
          latestEPS: latestEstimate.eps_avg ? latestEstimate.eps_avg.toFixed(2) : 'N/A',
          latestAnalystsCount: latestEstimate.revenue_analysts_count || 'N/A',
          totalEstimates: sortedEstimates.length,
        },
      }
    }
    return null
  }

  const estimatesData = getEstimatesData()

  const InfoRow = ({ label, value, isHighlight = false }) => (
    <div
      className={`d-flex justify-content-between border-bottom pb-2 mb-2 ${isHighlight ? 'fw-bold' : ''}`}
    >
      <span className="text-body-secondary">{label}</span>
      <span className={`fw-semibold ${isHighlight ? 'text-primary' : ''}`}>{value}</span>
    </div>
  )

  const MetricCard = ({ title, children, className = '' }) => (
    <CCard className={`h-100 ${className}`}>
      <CCardHeader className="bg-light">
        <h6 className="fw-semibold mb-0 text-primary">{title}</h6>
      </CCardHeader>
      <CCardBody>{children}</CCardBody>
    </CCard>
  )

  if (!estimatesData) {
    return (
      <div className="tab-pane active">
        <div className="alert alert-info" role="alert">
          <i className="fas fa-info-circle me-2"></i>
          No analyst estimates data available for this stock.
        </div>
      </div>
    )
  }

  return (
    <div className="tab-pane active">
      {/* Key Metrics Summary */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="text-center p-3 bg-primary bg-opacity-10 rounded">
            <div className="text-primary fw-bold fs-4">
              {estimatesData.summary.latestFiscalDate}
            </div>
            <div className="text-muted small">Latest Fiscal Year</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="text-center p-3 bg-success bg-opacity-10 rounded">
            <div className="text-success fw-bold fs-4">{estimatesData.summary.latestRevenue}</div>
            <div className="text-muted small">Revenue Estimate</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="text-center p-3 bg-info bg-opacity-10 rounded">
            <div className="text-info fw-bold fs-4">{estimatesData.summary.latestEPS}</div>
            <div className="text-muted small">EPS Estimate</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="text-center p-3 bg-warning bg-opacity-10 rounded">
            <div className="text-warning fw-bold fs-4">
              {estimatesData.summary.latestAnalystsCount}
            </div>
            <div className="text-muted small">Analysts Count</div>
          </div>
        </div>
      </div>

      {/* Historical Estimates Table */}
      <div className="row g-4">
        <div className="col-12">
          <MetricCard title="Historical Analyst Estimates">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Fiscal Year</th>
                    <th>Revenue Estimate</th>
                    <th>EPS Estimate</th>
                    <th>Analysts Count</th>
                    <th>Revenue High</th>
                    <th>Revenue Low</th>
                    <th>EPS High</th>
                    <th>EPS Low</th>
                  </tr>
                </thead>
                <tbody>
                  {estimatesData.allEstimates.map((estimate, index) => (
                    <tr key={index} className={index === 0 ? 'table-primary' : ''}>
                      <td>
                        <strong>{formatDate(estimate.fiscal_date)}</strong>
                        {index === 0 && <span className="badge bg-success ms-2">Latest</span>}
                      </td>
                      <td className="fw-semibold">{formatCurrency(estimate.revenue_low)}</td>
                      <td className="fw-semibold">
                        {estimate.eps_avg ? estimate.eps_avg.toFixed(2) : 'N/A'}
                      </td>
                      <td>{estimate.revenue_analysts_count || 'N/A'}</td>
                      <td className="text-success">{formatCurrency(estimate.revenue_high)}</td>
                      <td className="text-danger">{formatCurrency(estimate.revenue_low)}</td>
                      <td className="text-success">
                        {estimate.eps_high ? estimate.eps_high.toFixed(2) : 'N/A'}
                      </td>
                      <td className="text-danger">
                        {estimate.eps_low ? estimate.eps_low.toFixed(2) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </MetricCard>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="row g-4 mt-3">
        <div className="col-md-6">
          <MetricCard title="Revenue Estimates Trend">
            <div className="d-flex flex-column gap-2">
              {estimatesData.allEstimates.slice(0, 5).map((estimate, index) => (
                <div key={index} className="d-flex justify-content-between align-items-center">
                  <span className="text-muted">{formatDate(estimate.fiscal_date)}</span>
                  <span className="fw-semibold">{formatCurrency(estimate.revenue_low)}</span>
                </div>
              ))}
            </div>
          </MetricCard>
        </div>

        <div className="col-md-6">
          <MetricCard title="EPS Estimates Trend">
            <div className="d-flex flex-column gap-2">
              {estimatesData.allEstimates.slice(0, 5).map((estimate, index) => (
                <div key={index} className="d-flex justify-content-between align-items-center">
                  <span className="text-muted">{formatDate(estimate.fiscal_date)}</span>
                  <span className="fw-semibold">
                    {estimate.eps_avg ? estimate.eps_avg.toFixed(2) : 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          </MetricCard>
        </div>
      </div>

      {/* Data Source Note */}
      <div className="mt-4">
        <div className="alert alert-info" role="alert">
          <small className="text-muted">
            <i className="fas fa-info-circle me-2"></i>
            Analyst estimates represent forward-looking projections. Actual results may vary
            significantly from estimates. Data shows revenue and EPS estimates for different fiscal
            years.
          </small>
        </div>
      </div>
    </div>
  )
}

export default EstimatesTab
