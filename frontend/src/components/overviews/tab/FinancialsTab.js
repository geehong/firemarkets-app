import React from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'

/**
 * 재무 데이터 탭 컴포넌트 (주식 전용) - 위젯 형식으로 변경
 */
const FinancialsTab = ({ asset, stockData, overviewData }) => {
  const formatValue = (value, type = 'number') => {
    if (value === 'N/A' || value === null || value === undefined || isNaN(value)) return 'N/A'

    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value)
      case 'percentage':
        return `${parseFloat(value).toFixed(2)}%`
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(value)
    }
  }

  // 변화율 색상 결정
  const getChangeColor = (value) => {
    if (value === null || value === undefined || isNaN(value)) return 'secondary'
    return parseFloat(value) >= 0 ? 'success' : 'danger'
  }


  if (asset?.type_name !== 'Stocks' || !stockData) {
    return (
      <div className="tab-pane active">
        <div className="alert alert-info">
          <h5>Financials Data</h5>
          <p>This tab displays detailed financial information for stocks only.</p>
          <p>Current asset type: {asset?.type_name || 'Unknown'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="tab-pane active">
      <CRow>
        {/* 기본 재무 지표 */}
        <CCol xs={12} lg={6} className="mb-4">
          <CCard>
            <CCardHeader>
              <h5 className="mb-0">Basic Financials</h5>
            </CCardHeader>
            <CCardBody>
              <div className="row g-3">
                <div className="col-6">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Market Cap:</span>
                    <strong>{formatValue(stockData.market_cap, 'currency')}</strong>
                  </div>
                </div>
                <div className="col-6">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Revenue (TTM):</span>
                    <strong>{formatValue(stockData.revenue_ttm, 'currency')}</strong>
                  </div>
                </div>
                <div className="col-6">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">EBITDA:</span>
                    <strong>{formatValue(stockData.ebitda, 'currency')}</strong>
                  </div>
                </div>
                <div className="col-6">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">EPS:</span>
                    <strong>{formatValue(stockData.eps, 'currency')}</strong>
                  </div>
                </div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        {/* 비율 지표 */}
        <CCol xs={12} lg={6} className="mb-4">
          <CCard>
            <CCardHeader>
              <h5 className="mb-0">Ratios & Margins</h5>
            </CCardHeader>
            <CCardBody>
              <div className="row g-3">
                <div className="col-6">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">P/E Ratio:</span>
                    <strong>{formatValue(stockData.pe_ratio, 'number')}</strong>
                  </div>
                </div>
                <div className="col-6">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">P/B Ratio:</span>
                    <strong>{formatValue(stockData.price_to_book_ratio, 'number')}</strong>
                  </div>
                </div>
                <div className="col-6">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Profit Margin:</span>
                    <strong>{formatValue(stockData.profit_margin_ttm, 'percentage')}</strong>
                  </div>
                </div>
                <div className="col-6">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">ROE:</span>
                    <strong>{formatValue(stockData.return_on_equity_ttm, 'percentage')}</strong>
                  </div>
                </div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        {/* 성장률 및 기타 지표 */}
        <CCol xs={12} lg={6} className="mb-4">
          <CCard>
            <CCardHeader>
              <h5 className="mb-0">Growth & Risk</h5>
            </CCardHeader>
            <CCardBody>
              <div className="row g-3">
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
                <div className="col-6">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Beta:</span>
                    <strong>{formatValue(stockData.beta, 'number')}</strong>
                  </div>
                </div>
                <div className="col-6">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Dividend Yield:</span>
                    <strong>{formatValue(stockData.dividend_yield, 'percentage')}</strong>
                  </div>
                </div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        {/* 52주 고저가 및 이동평균 */}
        <CCol xs={12} lg={6} className="mb-4">
          <CCard>
            <CCardHeader>
              <h5 className="mb-0">Price Analysis</h5>
            </CCardHeader>
            <CCardBody>
              <div className="row g-3">
                <div className="col-6">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">52W High:</span>
                    <strong>{formatValue(stockData.week_52_high, 'currency')}</strong>
                  </div>
                </div>
                <div className="col-6">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">52W Low:</span>
                    <strong>{formatValue(stockData.week_52_low, 'currency')}</strong>
                  </div>
                </div>
                <div className="col-6">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">50D Avg:</span>
                    <strong>{formatValue(stockData.day_50_avg, 'currency')}</strong>
                  </div>
                </div>
                <div className="col-6">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">200D Avg:</span>
                    <strong>{formatValue(stockData.day_200_avg, 'currency')}</strong>
                  </div>
                </div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  )
}

export default FinancialsTab
