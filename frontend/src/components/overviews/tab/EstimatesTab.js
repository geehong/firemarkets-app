import React from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CRow, CTable } from '@coreui/react'

/**
 * 추정 데이터 탭 컴포넌트 (주식 전용) - 위젯 형식으로 변경
 */
const EstimatesTab = ({ asset, stockData, overviewData }) => {
  const formatValue = (value, type = 'number') => {
    if (value === 'N/A' || value === null || value === undefined || isNaN(value)) return 'N/A'

    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value)
      case 'percentage':
        return `${parseFloat(value).toFixed(2)}%`
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(value)
    }
  }


  if (asset?.type_name !== 'Stocks' || !stockData) {
    return (
      <div className="tab-pane active">
        <div className="alert alert-info">
          <h5>Analyst Estimates</h5>
          <p>This tab displays analyst estimates and forecasts for stocks only.</p>
          <p>Current asset type: {asset?.type_name || 'Unknown'}</p>
        </div>
      </div>
    )
  }

  // 애널리스트 추정치 데이터 (현재는 stockData에서 가져오지만, 추후 별도 API로 분리 가능)
  const estimatesData = {
    revenue: {
      current: stockData.revenue_ttm,
      estimate: stockData.revenue_ttm ? stockData.revenue_ttm * 1.1 : null, // 예시: 10% 성장 추정
      high: stockData.revenue_ttm ? stockData.revenue_ttm * 1.15 : null,
      low: stockData.revenue_ttm ? stockData.revenue_ttm * 1.05 : null,
    },
    earnings: {
      current: stockData.eps,
      estimate: stockData.eps ? stockData.eps * 1.08 : null, // 예시: 8% 성장 추정
      high: stockData.eps ? stockData.eps * 1.12 : null,
      low: stockData.eps ? stockData.eps * 1.04 : null,
    },
    targetPrice: stockData.analyst_target_price || (stockData.eps && stockData.pe_ratio ? stockData.eps * stockData.pe_ratio : null),
  }

  return (
    <div className="tab-pane active">
      <CRow>
        {/* 애널리스트 추정치 요약 */}
        <CCol xs={12} lg={6} className="mb-4">
          <CCard>
            <CCardHeader>
              <h5 className="mb-0">Analyst Estimates Summary</h5>
            </CCardHeader>
            <CCardBody>
              <div className="row g-3">
                <div className="col-6">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Target Price:</span>
                    <strong>{formatValue(estimatesData.targetPrice, 'currency')}</strong>
                  </div>
                </div>
                <div className="col-6">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Forward P/E:</span>
                    <strong>{formatValue(stockData.forward_pe, 'number')}</strong>
                  </div>
                </div>
                <div className="col-6">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Revenue Growth:</span>
                    <strong>{formatValue(stockData.quarterly_revenue_growth_yoy, 'percentage')}</strong>
                  </div>
                </div>
                <div className="col-6">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Earnings Growth:</span>
                    <strong>{formatValue(stockData.quarterly_earnings_growth_yoy, 'percentage')}</strong>
                  </div>
                </div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        {/* 성장률 및 밸류에이션 */}
        <CCol xs={12} lg={6} className="mb-4">
          <CCard>
            <CCardHeader>
              <h5 className="mb-0">Growth & Valuation</h5>
            </CCardHeader>
            <CCardBody>
              <div className="row g-3">
                <div className="col-6">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">PEG Ratio:</span>
                    <strong>{formatValue(stockData.peg_ratio, 'number')}</strong>
                  </div>
                </div>
                <div className="col-6">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Price/Sales:</span>
                    <strong>{formatValue(stockData.price_to_sales_ratio, 'number')}</strong>
                  </div>
                </div>
                <div className="col-6">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">EV/Revenue:</span>
                    <strong>{formatValue(stockData.ev_to_revenue, 'number')}</strong>
                  </div>
                </div>
                <div className="col-6">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">EV/EBITDA:</span>
                    <strong>{formatValue(stockData.ev_to_ebitda, 'number')}</strong>
                  </div>
                </div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        {/* 상세 추정치 테이블 */}
        <CCol xs={12} className="mb-4">
          <CCard>
            <CCardHeader>
              <h5 className="mb-0">Detailed Estimates</h5>
            </CCardHeader>
            <CCardBody>
              <CTable responsive striped>
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Current</th>
                    <th>Estimate</th>
                    <th>High</th>
                    <th>Low</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Revenue (TTM)</strong></td>
                    <td>{formatValue(estimatesData.revenue.current, 'currency')}</td>
                    <td>{formatValue(estimatesData.revenue.estimate, 'currency')}</td>
                    <td>{formatValue(estimatesData.revenue.high, 'currency')}</td>
                    <td>{formatValue(estimatesData.revenue.low, 'currency')}</td>
                  </tr>
                  <tr>
                    <td><strong>EPS</strong></td>
                    <td>{formatValue(estimatesData.earnings.current, 'currency')}</td>
                    <td>{formatValue(estimatesData.earnings.estimate, 'currency')}</td>
                    <td>{formatValue(estimatesData.earnings.high, 'currency')}</td>
                    <td>{formatValue(estimatesData.earnings.low, 'currency')}</td>
                  </tr>
                </tbody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  )
}

export default EstimatesTab
