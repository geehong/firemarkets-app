import React from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import { CIcon } from '@coreui/icons-react'
// import { cilDollar, cilChartLine, cilTrendingUp, cilTrendingDown } from '@coreui/icons'

const MarketDataTab = ({
  assetId,
  assetType,
  stockFinancials,
  cryptoData,
  etfData,
  commodityData,
  ohlcvData,
}) => {
  console.log('🔍 MarketDataTab rendered with assetId:', assetId, 'assetType:', assetType)
  console.log('🔍 MarketDataTab props:', {
    assetId,
    assetType,
    stockFinancials,
    cryptoData,
    etfData,
    commodityData,
    ohlcvData,
  })

  // OHLCV 데이터에서 계산된 값들
  const calculateMarketData = () => {
    console.log('🔍 calculateMarketData called with ohlcvData:', ohlcvData)

    if (!ohlcvData || ohlcvData.length === 0) {
      console.log('⚠️ No OHLCV data available')
      return {
        week52High: 'N/A',
        week52Low: 'N/A',
        day50Avg: 'N/A',
        day200Avg: 'N/A',
        prevClose: 'N/A',
        prevVolume: 'N/A',
      }
    }

    console.log('📊 OHLCV data length:', ohlcvData.length)
    console.log('📊 First few OHLCV records:', ohlcvData.slice(0, 3))

    const sortedData = [...ohlcvData].sort(
      (a, b) => new Date(a.timestamp_utc) - new Date(b.timestamp_utc),
    )
    const latestData = sortedData[sortedData.length - 1]
    const previousData = sortedData[sortedData.length - 2]

    console.log('📊 Latest data:', latestData)
    console.log('📊 Previous data:', previousData)

    // 52주 데이터 (365일)
    const oneYearAgo = new Date()
    oneYearAgo.setDate(oneYearAgo.getDate() - 365)
    const yearData = sortedData.filter((item) => new Date(item.timestamp_utc) >= oneYearAgo)

    console.log('📊 Year data length:', yearData.length)
    console.log('📊 One year ago date:', oneYearAgo)

    // 올바른 필드명 사용: high_price, low_price, close_price
    const week52High =
      yearData.length > 0 ? Math.max(...yearData.map((item) => item.high_price)) : 'N/A'
    const week52Low =
      yearData.length > 0 ? Math.min(...yearData.map((item) => item.low_price)) : 'N/A'

    // 50일 이동평균
    const day50Data = sortedData.slice(-50)
    const day50Avg =
      day50Data.length > 0
        ? day50Data.reduce((sum, item) => sum + item.close_price, 0) / day50Data.length
        : 'N/A'

    // 200일 이동평균
    const day200Data = sortedData.slice(-200)
    const day200Avg =
      day200Data.length > 0
        ? day200Data.reduce((sum, item) => sum + item.close_price, 0) / day200Data.length
        : 'N/A'

    const result = {
      week52High,
      week52Low,
      day50Avg,
      day200Avg,
      prevClose: previousData?.close_price || 'N/A',
      prevVolume: previousData?.volume || 'N/A',
    }

    console.log('📊 Calculated market data:', result)
    return result
  }

  const getMarketData = () => {
    const calculatedData = calculateMarketData()
    console.log('🔍 getMarketData - assetType:', assetType)
    console.log('🔍 getMarketData - calculatedData:', calculatedData)

    // assetType 정규화 (etfs -> etf, stocks -> stock 등)
    const normalizedAssetType = assetType?.toLowerCase().replace(/s$/, '')
    console.log('🔍 getMarketData - normalizedAssetType:', normalizedAssetType)

    switch (normalizedAssetType) {
      case 'stock':
        const stockData = {
          marketCap: stockFinancials?.market_cap || 'N/A',
          prevClose: calculatedData.prevClose,
          volume: calculatedData.prevVolume,
          peRatio: stockFinancials?.pe_ratio || 'N/A',
          pbRatio: stockFinancials?.pb_ratio || 'N/A',
          dividendYield: stockFinancials?.dividend_yield || 'N/A',
          week52High: calculatedData.week52High,
          week52Low: calculatedData.week52Low,
          day50Avg: calculatedData.day50Avg,
          day200Avg: calculatedData.day200Avg,
        }
        console.log('📊 Stock market data:', stockData)
        return stockData

      case 'crypto':
        const cryptoMarketData = {
          marketCap: cryptoData?.market_cap || 'N/A',
          prevClose: calculatedData.prevClose,
          volume: calculatedData.prevVolume,
          circulatingSupply: cryptoData?.circulating_supply || 'N/A',
          maxSupply: cryptoData?.max_supply || 'N/A',
          week52High: calculatedData.week52High,
          week52Low: calculatedData.week52Low,
          day50Avg: calculatedData.day50Avg,
          day200Avg: calculatedData.day200Avg,
        }
        console.log('📊 Crypto market data:', cryptoMarketData)
        return cryptoMarketData

      case 'etf':
        const etfMarketData = {
          marketCap: etfData?.net_assets || 'N/A',
          prevClose: calculatedData.prevClose,
          volume: calculatedData.prevVolume,
          expenseRatio: etfData?.net_expense_ratio || 'N/A',
          aum: etfData?.net_assets || 'N/A',
          week52High: calculatedData.week52High,
          week52Low: calculatedData.week52Low,
          day50Avg: calculatedData.day50Avg,
          day200Avg: calculatedData.day200Avg,
        }
        console.log('📊 ETF market data:', etfMarketData)
        return etfMarketData

      case 'commodity':
        const commodityMarketData = {
          marketCap: commodityData?.market_value || 'N/A',
          prevClose: calculatedData.prevClose,
          volume: calculatedData.prevVolume,
          openInterest: commodityData?.open_interest || 'N/A',
          week52High: calculatedData.week52High,
          week52Low: calculatedData.week52Low,
          day50Avg: calculatedData.day50Avg,
          day200Avg: calculatedData.day200Avg,
        }
        console.log('📊 Commodity market data:', commodityMarketData)
        return commodityMarketData

      default:
        console.log('⚠️ Unknown asset type:', assetType)
        return {
          marketCap: 'N/A',
          prevClose: calculatedData.prevClose,
          volume: calculatedData.prevVolume,
          week52High: calculatedData.week52High,
          week52Low: calculatedData.week52Low,
          day50Avg: calculatedData.day50Avg,
          day200Avg: calculatedData.day200Avg,
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
  console.log('🔍 Final marketData:', marketData)

  const renderDataCard = (title, value, type = 'number', color = 'primary') => {
    console.log(`🔍 Rendering ${title}:`, value, type)

    // N/A 값이면 카드를 렌더링하지 않음
    if (value === 'N/A' || value === null || value === undefined || isNaN(value)) {
      console.log(`⚠️ Skipping ${title} card - value is N/A`)
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

  const renderPriceRangeCard = () => {
    console.log('🔍 Rendering PriceRangeCard:', marketData.week52High, marketData.week52Low)

    // 52주 범위 데이터가 모두 N/A면 카드를 렌더링하지 않음
    if (
      (marketData.week52High === 'N/A' || isNaN(marketData.week52High)) &&
      (marketData.week52Low === 'N/A' || isNaN(marketData.week52Low))
    ) {
      console.log('⚠️ Skipping PriceRangeCard - both high and low are N/A')
      return null
    }

    return (
      <CCol xs={12} sm={6} md={4} lg={3} className="mb-3">
        <CCard className="h-100">
          <CCardBody className="text-center">
            <div className="d-flex align-items-center justify-content-center mb-2">
              <h6 className="mb-0">52 Week Range</h6>
            </div>
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-success">
                <small>High</small>
                <div className="fw-bold">{formatValue(marketData.week52High, 'currency')}</div>
              </div>
              <div className="text-danger">
                <small>Low</small>
                <div className="fw-bold">{formatValue(marketData.week52Low, 'currency')}</div>
              </div>
            </div>
          </CCardBody>
        </CCard>
      </CCol>
    )
  }

  const renderMovingAveragesCard = () => {
    console.log('🔍 Rendering MovingAveragesCard:', marketData.day50Avg, marketData.day200Avg)

    // 이동평균 데이터가 모두 N/A면 카드를 렌더링하지 않음
    if (
      (marketData.day50Avg === 'N/A' || isNaN(marketData.day50Avg)) &&
      (marketData.day200Avg === 'N/A' || isNaN(marketData.day200Avg))
    ) {
      console.log('⚠️ Skipping MovingAveragesCard - both 50d and 200d are N/A')
      return null
    }

    return (
      <CCol xs={12} sm={6} md={4} lg={3} className="mb-3">
        <CCard className="h-100">
          <CCardBody className="text-center">
            <div className="d-flex align-items-center justify-content-center mb-2">
              <h6 className="mb-0">Moving Averages</h6>
            </div>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <small>50 Day</small>
                <div className="fw-bold">{formatValue(marketData.day50Avg, 'currency')}</div>
              </div>
              <div>
                <small>200 Day</small>
                <div className="fw-bold">{formatValue(marketData.day200Avg, 'currency')}</div>
              </div>
            </div>
          </CCardBody>
        </CCard>
      </CCol>
    )
  }

  // OHLCV 데이터가 없으면 로딩 상태 표시
  if (!ohlcvData || ohlcvData.length === 0) {
    return (
      <div className="market-data-tab">
        <div className="text-center p-4">
          <div className="alert alert-info">
            <p>No market data available for this asset.</p>
            <p>Price data may not have been collected yet.</p>
          </div>
        </div>
      </div>
    )
  }

  // assetType 정규화
  const normalizedAssetType = assetType?.toLowerCase().replace(/s$/, '')
  console.log('🔍 Normalized asset type for rendering:', normalizedAssetType)

  return (
    <div className="market-data-tab">
      <CRow>
        {/* Asset Type Specific Data */}
        {normalizedAssetType === 'stock' && (
          <>{/* 주식은 Market Data 탭이 필요 없으므로 여기서는 아무것도 렌더링하지 않음 */}</>
        )}

        {normalizedAssetType === 'crypto' && (
          <>
            {renderDataCard('Market Cap', marketData.marketCap, 'marketCap', 'primary')}
            {renderDataCard('Previous Close', marketData.prevClose, 'currency', 'info')}
            {renderDataCard('Previous Volume', marketData.volume, 'volume', 'success')}
            {renderDataCard(
              'Circulating Supply',
              marketData.circulatingSupply,
              'number',
              'warning',
            )}
            {renderDataCard('Max Supply', marketData.maxSupply, 'number', 'secondary')}
          </>
        )}

        {normalizedAssetType === 'etf' && (
          <>
            {renderDataCard('Market Cap', marketData.marketCap, 'marketCap', 'primary')}
            {renderDataCard('Previous Close', marketData.prevClose, 'currency', 'info')}
            {renderDataCard('Previous Volume', marketData.volume, 'volume', 'success')}
            {renderDataCard('Expense Ratio', marketData.expenseRatio, 'percentage', 'warning')}
            {renderDataCard('AUM', marketData.aum, 'currency', 'secondary')}
          </>
        )}

        {normalizedAssetType === 'commodity' && (
          <>
            {renderDataCard('Market Value', marketData.marketCap, 'marketCap', 'primary')}
            {renderDataCard('Previous Close', marketData.prevClose, 'currency', 'info')}
            {renderDataCard('Previous Volume', marketData.volume, 'volume', 'success')}
            {renderDataCard('Open Interest', marketData.openInterest, 'number', 'warning')}
          </>
        )}

        {/* Common Data Cards - 실제 데이터가 있을 때만 표시 */}
        {renderPriceRangeCard()}
        {renderMovingAveragesCard()}
      </CRow>
    </div>
  )
}

export default MarketDataTab
