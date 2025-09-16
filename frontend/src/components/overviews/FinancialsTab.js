import React from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'

const FinancialsTab = ({ asset, stockFinancials }) => {
  const getFinancialData = () => {
    if (asset?.type_name === 'Stocks' && stockFinancials) {
      // stockFinancials가 {data: [...]} 구조인 경우 data 배열 사용
      const financialsArray = stockFinancials.data || stockFinancials
      const financialData = Array.isArray(financialsArray) ? financialsArray[0] : financialsArray

      if (!financialData)
        return {
          revenue: 'N/A',
          profitMargin: 'N/A',
          roe: 'N/A',
          eps: 'N/A',
          dividend: 'N/A',
          dividendYield: 'N/A',
          peRatio: 'N/A',
          pbRatio: 'N/A',
          pegRatio: 'N/A',
          beta: 'N/A',
          marketCap: 'N/A',
          sharesOutstanding: 'N/A',
          week52High: 'N/A',
          week52Low: 'N/A',
          day50Avg: 'N/A',
          day200Avg: 'N/A',
        }

      return {
        // Available Financial Data
        revenue: financialData.revenue_ttm
          ? `${(financialData.revenue_ttm / 1000000000).toFixed(2)}B`
          : 'N/A',
        profitMargin: financialData.profit_margin_ttm
          ? `${(financialData.profit_margin_ttm * 100).toFixed(1)}%`
          : 'N/A',
        roe: financialData.return_on_equity_ttm
          ? `${(financialData.return_on_equity_ttm * 100).toFixed(1)}%`
          : 'N/A',
        eps: financialData.eps ? financialData.eps.toFixed(2) : 'N/A',
        dividend: financialData.dividend_per_share
          ? financialData.dividend_per_share.toFixed(2)
          : 'N/A',
        dividendYield: financialData.dividend_yield
          ? `${(financialData.dividend_yield * 100).toFixed(2)}%`
          : 'N/A',
        peRatio: financialData.pe_ratio ? `${financialData.pe_ratio.toFixed(1)}x` : 'N/A',
        pbRatio: financialData.price_to_book_ratio
          ? `${financialData.price_to_book_ratio.toFixed(1)}x`
          : 'N/A',
        pegRatio: financialData.peg_ratio ? `${financialData.peg_ratio.toFixed(1)}x` : 'N/A',
        beta: financialData.beta ? financialData.beta.toFixed(2) : 'N/A',
        marketCap: financialData.market_cap
          ? `${(financialData.market_cap / 1000000000).toFixed(2)}B`
          : 'N/A',
        sharesOutstanding: financialData.shares_outstanding
          ? `${(financialData.shares_outstanding / 1000000000).toFixed(2)}B`
          : 'N/A',
        week52High: financialData.week_52_high ? financialData.week_52_high.toFixed(2) : 'N/A',
        week52Low: financialData.week_52_low ? financialData.week_52_low.toFixed(2) : 'N/A',
        day50Avg: financialData.day_50_moving_avg
          ? financialData.day_50_moving_avg.toFixed(2)
          : 'N/A',
        day200Avg: financialData.day_200_moving_avg
          ? financialData.day_200_moving_avg.toFixed(2)
          : 'N/A',
      }
    }
    return {
      revenue: 'N/A',
      profitMargin: 'N/A',
      roe: 'N/A',
      eps: 'N/A',
      dividend: 'N/A',
      dividendYield: 'N/A',
      peRatio: 'N/A',
      pbRatio: 'N/A',
      pegRatio: 'N/A',
      beta: 'N/A',
      marketCap: 'N/A',
      sharesOutstanding: 'N/A',
      week52High: 'N/A',
      week52Low: 'N/A',
      day50Avg: 'N/A',
      day200Avg: 'N/A',
    }
  }

  const financialData = getFinancialData()

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

  return (
    <div className="tab-pane active">
      {/* Key Metrics Summary */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="text-center p-3 bg-primary bg-opacity-10 rounded">
            <div className="text-primary fw-bold fs-4">{financialData.marketCap}</div>
            <div className="text-muted small">Market Cap</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="text-center p-3 bg-success bg-opacity-10 rounded">
            <div className="text-success fw-bold fs-4">{financialData.revenue}</div>
            <div className="text-muted small">Revenue (TTM)</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="text-center p-3 bg-info bg-opacity-10 rounded">
            <div className="text-info fw-bold fs-4">{financialData.eps}</div>
            <div className="text-muted small">EPS</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="text-center p-3 bg-warning bg-opacity-10 rounded">
            <div className="text-warning fw-bold fs-4">{financialData.dividendYield}</div>
            <div className="text-muted small">Dividend Yield</div>
          </div>
        </div>
      </div>

      {/* Detailed Financial Data */}
      <div className="row g-4">
        {/* Valuation Metrics */}
        <div className="col-md-6">
          <MetricCard title="Valuation Metrics">
            <InfoRow label="P/E Ratio" value={financialData.peRatio} isHighlight={true} />
            <InfoRow label="P/B Ratio" value={financialData.pbRatio} />
            <InfoRow label="PEG Ratio" value={financialData.pegRatio} />
            <InfoRow label="Beta" value={financialData.beta} />
            <InfoRow label="Market Cap" value={financialData.marketCap} />
            <InfoRow label="Shares Outstanding" value={financialData.sharesOutstanding} />
          </MetricCard>
        </div>

        {/* Financial Performance */}
        <div className="col-md-6">
          <MetricCard title="Financial Performance">
            <InfoRow label="Revenue (TTM)" value={financialData.revenue} isHighlight={true} />
            <InfoRow label="Profit Margin" value={financialData.profitMargin} />
            <InfoRow label="Return on Equity" value={financialData.roe} />
            <InfoRow label="EPS" value={financialData.eps} />
            <InfoRow label="Dividend per Share" value={financialData.dividend} />
            <InfoRow label="Dividend Yield" value={financialData.dividendYield} />
          </MetricCard>
        </div>

        {/* Price Data */}
        <div className="col-md-12">
          <MetricCard title="Price Data">
            <div className="row g-3">
              <div className="col-md-3">
                <InfoRow label="52 Week High" value={financialData.week52High} />
              </div>
              <div className="col-md-3">
                <InfoRow label="52 Week Low" value={financialData.week52Low} />
              </div>
              <div className="col-md-3">
                <InfoRow label="50 Day Average" value={financialData.day50Avg} />
              </div>
              <div className="col-md-3">
                <InfoRow label="200 Day Average" value={financialData.day200Avg} />
              </div>
            </div>
          </MetricCard>
        </div>
      </div>

      {/* Data Source Note */}
      <div className="mt-4">
        <div className="alert alert-info" role="alert">
          <small className="text-muted">
            <i className="fas fa-info-circle me-2"></i>
            Data represents the most recent financial information available. Some metrics may not be
            available for all assets.
          </small>
        </div>
      </div>
    </div>
  )
}

export default FinancialsTab
