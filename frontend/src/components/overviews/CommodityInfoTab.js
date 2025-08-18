import React from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CRow, CProgress, CBadge } from '@coreui/react'
import { CIcon } from '@coreui/icons-react'
import { cilChart, cilBarChart, cilFactory, cilTrendingUp } from '@coreui/icons'

const CommodityInfoTab = ({ commodityData }) => {
  const formatValue = (value, type = 'number') => {
    if (value === 'N/A' || value === null || value === undefined) return 'N/A'

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

  // Mock data for demonstration - replace with actual commodity data
  const mockCommodityData = {
    futuresData: {
      currentPrice: commodityData?.price || 1850.5,
      openInterest: commodityData?.open_interest || 450000,
      volume: commodityData?.volume || 125000,
      bid: commodityData?.bid || 1849.8,
      ask: commodityData?.ask || 1850.2,
      high: commodityData?.high || 1865.3,
      low: commodityData?.low || 1840.1,
      previousClose: commodityData?.previous_close || 1845.2,
    },
    supplyDemand: {
      globalSupply: commodityData?.global_supply || 3500,
      globalDemand: commodityData?.global_demand || 3600,
      production: commodityData?.production || 3200,
      consumption: commodityData?.consumption || 3300,
      reserves: commodityData?.reserves || 50000,
      stockpile: commodityData?.stockpile || 2500,
    },
    marketMetrics: {
      marketCap: commodityData?.market_cap || 6500000000000,
      volatility: commodityData?.volatility || 18.5,
      correlation: commodityData?.correlation || -0.15,
      seasonality: commodityData?.seasonality || 'Strong',
    },
  }

  const renderFuturesDataCard = () => (
    <CCol xs={12} lg={6} className="mb-4">
      <CCard>
        <CCardHeader>
          <div className="d-flex align-items-center">
            <CIcon icon={cilBarChart} className="me-2" />
            <h5 className="mb-0">Futures Data</h5>
          </div>
        </CCardHeader>
        <CCardBody>
          <CRow>
            <CCol xs={6}>
              <div className="mb-3">
                <small className="text-muted">Current Price</small>
                <div className="fw-bold">
                  {formatValue(mockCommodityData.futuresData.currentPrice, 'currency')}
                </div>
              </div>
            </CCol>
            <CCol xs={6}>
              <div className="mb-3">
                <small className="text-muted">Previous Close</small>
                <div className="fw-bold">
                  {formatValue(mockCommodityData.futuresData.previousClose, 'currency')}
                </div>
              </div>
            </CCol>
            <CCol xs={6}>
              <div className="mb-3">
                <small className="text-muted">Day High</small>
                <div className="fw-bold text-success">
                  {formatValue(mockCommodityData.futuresData.high, 'currency')}
                </div>
              </div>
            </CCol>
            <CCol xs={6}>
              <div className="mb-3">
                <small className="text-muted">Day Low</small>
                <div className="fw-bold text-danger">
                  {formatValue(mockCommodityData.futuresData.low, 'currency')}
                </div>
              </div>
            </CCol>
            <CCol xs={6}>
              <div className="mb-3">
                <small className="text-muted">Bid</small>
                <div className="fw-bold">
                  {formatValue(mockCommodityData.futuresData.bid, 'currency')}
                </div>
              </div>
            </CCol>
            <CCol xs={6}>
              <div className="mb-3">
                <small className="text-muted">Ask</small>
                <div className="fw-bold">
                  {formatValue(mockCommodityData.futuresData.ask, 'currency')}
                </div>
              </div>
            </CCol>
            <CCol xs={6}>
              <div className="mb-3">
                <small className="text-muted">Volume</small>
                <div className="fw-bold">
                  {formatValue(mockCommodityData.futuresData.volume, 'number')}
                </div>
              </div>
            </CCol>
            <CCol xs={6}>
              <div className="mb-3">
                <small className="text-muted">Open Interest</small>
                <div className="fw-bold">
                  {formatValue(mockCommodityData.futuresData.openInterest, 'number')}
                </div>
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>
    </CCol>
  )

  const renderSupplyDemandCard = () => (
    <CCol xs={12} lg={6} className="mb-4">
      <CCard>
        <CCardHeader>
          <div className="d-flex align-items-center">
            <CIcon icon={cilFactory} className="me-2" />
            <h5 className="mb-0">Supply & Demand</h5>
          </div>
        </CCardHeader>
        <CCardBody>
          <CRow>
            <CCol xs={6}>
              <div className="mb-3">
                <small className="text-muted">Global Supply</small>
                <div className="fw-bold">
                  {formatValue(mockCommodityData.supplyDemand.globalSupply, 'number')} tons
                </div>
              </div>
            </CCol>
            <CCol xs={6}>
              <div className="mb-3">
                <small className="text-muted">Global Demand</small>
                <div className="fw-bold">
                  {formatValue(mockCommodityData.supplyDemand.globalDemand, 'number')} tons
                </div>
              </div>
            </CCol>
            <CCol xs={6}>
              <div className="mb-3">
                <small className="text-muted">Production</small>
                <div className="fw-bold">
                  {formatValue(mockCommodityData.supplyDemand.production, 'number')} tons
                </div>
              </div>
            </CCol>
            <CCol xs={6}>
              <div className="mb-3">
                <small className="text-muted">Consumption</small>
                <div className="fw-bold">
                  {formatValue(mockCommodityData.supplyDemand.consumption, 'number')} tons
                </div>
              </div>
            </CCol>
            <CCol xs={6}>
              <div className="mb-3">
                <small className="text-muted">Reserves</small>
                <div className="fw-bold">
                  {formatValue(mockCommodityData.supplyDemand.reserves, 'number')} tons
                </div>
              </div>
            </CCol>
            <CCol xs={6}>
              <div className="mb-3">
                <small className="text-muted">Stockpile</small>
                <div className="fw-bold">
                  {formatValue(mockCommodityData.supplyDemand.stockpile, 'number')} tons
                </div>
              </div>
            </CCol>
          </CRow>
          <div className="mt-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <small className="text-muted">Supply/Demand Balance</small>
              <small className="text-muted">
                {mockCommodityData.supplyDemand.globalSupply >
                mockCommodityData.supplyDemand.globalDemand
                  ? 'Surplus'
                  : 'Deficit'}
              </small>
            </div>
            <CProgress
              value={
                (mockCommodityData.supplyDemand.globalSupply /
                  mockCommodityData.supplyDemand.globalDemand) *
                100
              }
              color={
                mockCommodityData.supplyDemand.globalSupply >
                mockCommodityData.supplyDemand.globalDemand
                  ? 'success'
                  : 'danger'
              }
            />
          </div>
        </CCardBody>
      </CCard>
    </CCol>
  )

  const renderMarketMetricsCard = () => (
    <CCol xs={12} lg={6} className="mb-4">
      <CCard>
        <CCardHeader>
          <div className="d-flex align-items-center">
            <CIcon icon={cilChart} className="me-2" />
            <h5 className="mb-0">Market Metrics</h5>
          </div>
        </CCardHeader>
        <CCardBody>
          <CRow>
            <CCol xs={6}>
              <div className="mb-3">
                <small className="text-muted">Market Cap</small>
                <div className="fw-bold">
                  {formatValue(mockCommodityData.marketMetrics.marketCap, 'currency')}
                </div>
              </div>
            </CCol>
            <CCol xs={6}>
              <div className="mb-3">
                <small className="text-muted">Volatility</small>
                <div className="fw-bold">
                  {formatValue(mockCommodityData.marketMetrics.volatility, 'percentage')}
                </div>
              </div>
            </CCol>
            <CCol xs={6}>
              <div className="mb-3">
                <small className="text-muted">USD Correlation</small>
                <div className="fw-bold">{mockCommodityData.marketMetrics.correlation}</div>
              </div>
            </CCol>
            <CCol xs={6}>
              <div className="mb-3">
                <small className="text-muted">Seasonality</small>
                <div className="fw-bold">
                  <CBadge
                    color={
                      mockCommodityData.marketMetrics.seasonality === 'Strong'
                        ? 'success'
                        : 'warning'
                    }
                  >
                    {mockCommodityData.marketMetrics.seasonality}
                  </CBadge>
                </div>
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>
    </CCol>
  )

  const renderSeasonalAnalysisCard = () => (
    <CCol xs={12} lg={6} className="mb-4">
      <CCard>
        <CCardHeader>
          <div className="d-flex align-items-center">
            <CIcon icon={cilTrendingUp} className="me-2" />
            <h5 className="mb-0">Seasonal Analysis</h5>
          </div>
        </CCardHeader>
        <CCardBody>
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <small className="text-muted">Q1 (Jan-Mar)</small>
              <small className="text-muted">+8.5%</small>
            </div>
            <CProgress value={85} color="success" className="mb-2" />
          </div>
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <small className="text-muted">Q2 (Apr-Jun)</small>
              <small className="text-muted">+2.3%</small>
            </div>
            <CProgress value={23} color="info" className="mb-2" />
          </div>
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <small className="text-muted">Q3 (Jul-Sep)</small>
              <small className="text-muted">-1.2%</small>
            </div>
            <CProgress value={12} color="warning" className="mb-2" />
          </div>
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <small className="text-muted">Q4 (Oct-Dec)</small>
              <small className="text-muted">+5.8%</small>
            </div>
            <CProgress value={58} color="primary" className="mb-2" />
          </div>
        </CCardBody>
      </CCard>
    </CCol>
  )

  return (
    <div className="commodity-info-tab">
      <CRow>
        {renderFuturesDataCard()}
        {renderSupplyDemandCard()}
        {renderMarketMetricsCard()}
        {renderSeasonalAnalysisCard()}
      </CRow>
    </div>
  )
}

export default CommodityInfoTab

