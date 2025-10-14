import React from 'react'
import { CCard, CCardBody, CCol, CRow } from '@coreui/react'

/**
 * 시장 데이터 탭 컴포넌트 (모든 자산 유형 공통)
 * 모든 자산 유형에서 공통적으로 사용하는 시장 데이터 표시
 */
const MarketDataTab = ({
  assetId,
  assetType,
  stockFinancials,
  cryptoData,
  etfData,
  commodityData,
  ohlcvData,
}) => {
  // 자산 타입별 시장 데이터
  const getMarketData = () => {
    const normalizedAssetType = assetType?.toLowerCase().replace(/s$/, '')

    switch (normalizedAssetType) {
      case 'stock':
        return {
          marketCap: stockFinancials?.market_cap || 'N/A',
          peRatio: stockFinancials?.pe_ratio || 'N/A',
          pbRatio: stockFinancials?.pb_ratio || 'N/A',
          dividendYield: stockFinancials?.dividend_yield || 'N/A',
        }

      case 'crypto':
        return {
          marketCap: cryptoData?.market_cap || 'N/A',
          circulatingSupply: cryptoData?.circulating_supply || 'N/A',
          maxSupply: cryptoData?.max_supply || 'N/A',
        }

      case 'etf':
        return {
          marketCap: etfData?.net_assets || 'N/A',
          expenseRatio: etfData?.net_expense_ratio || 'N/A',
          aum: etfData?.net_assets || 'N/A',
        }

      case 'commodity':
        return {
          marketCap: commodityData?.market_value || 'N/A',
          openInterest: commodityData?.open_interest || 'N/A',
        }

      default:
        return {
          marketCap: 'N/A',
        }
    }
  }

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
      case 'volume':
        return new Intl.NumberFormat('en-US', {
          notation: 'compact',
          maximumFractionDigits: 1,
        }).format(value)
      case 'marketCap':
        if (value >= 1e12) {
          return `${(value / 1e12).toFixed(2)}T`
        } else if (value >= 1e9) {
          return `${(value / 1e9).toFixed(2)}B`
        } else if (value >= 1e6) {
          return `${(value / 1e6).toFixed(2)}M`
        } else {
          return new Intl.NumberFormat('en-US').format(value)
        }
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(value)
    }
  }

  const marketData = getMarketData()
  const normalizedAssetType = assetType?.toLowerCase().replace(/s$/, '')

  const renderDataCard = (title, value, type = 'number', color = 'primary') => {
    // N/A 값이면 카드를 렌더링하지 않음
    if (value === 'N/A' || value === null || value === undefined || isNaN(value)) {
      return null
    }

    return (
      <CCol xs={12} sm={6} md={4} lg={3} className="mb-3">
        <CCard className="h-100">
          <CCardBody className="text-center">
            <div className="d-flex align-items-center justify-content-center mb-2">
              <h6 className="mb-0">{title}</h6>
            </div>
            <h4 className={`text-${color} mb-0`}>{formatValue(value, type)}</h4>
          </CCardBody>
        </CCard>
      </CCol>
    )
  }

  return (
    <div className="market-data-tab">
      <CRow>
        {/* 자산 타입별 특화 데이터 */}
        {normalizedAssetType === 'stock' && (
          <>
            {renderDataCard('Market Cap', marketData.marketCap, 'marketCap', 'primary')}
            {renderDataCard('P/E Ratio', marketData.peRatio, 'number', 'info')}
            {renderDataCard('P/B Ratio', marketData.pbRatio, 'number', 'success')}
            {renderDataCard('Dividend Yield', marketData.dividendYield, 'percentage', 'warning')}
          </>
        )}

        {normalizedAssetType === 'crypto' && (
          <>
            {renderDataCard('Market Cap', marketData.marketCap, 'marketCap', 'primary')}
            {renderDataCard('Circulating Supply', marketData.circulatingSupply, 'number', 'warning')}
            {renderDataCard('Max Supply', marketData.maxSupply, 'number', 'secondary')}
          </>
        )}

        {normalizedAssetType === 'etf' && (
          <>
            {renderDataCard('AUM', marketData.aum, 'marketCap', 'primary')}
            {renderDataCard('Expense Ratio', marketData.expenseRatio, 'percentage', 'warning')}
          </>
        )}

        {normalizedAssetType === 'commodity' && (
          <>
            {renderDataCard('Market Value', marketData.marketCap, 'marketCap', 'primary')}
            {renderDataCard('Open Interest', marketData.openInterest, 'number', 'warning')}
          </>
        )}
      </CRow>
    </div>
  )
}

export default MarketDataTab