import React from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CRow, CProgress, CBadge } from '@coreui/react'
import { CIcon } from '@coreui/icons-react'
import { useQuery } from '@tanstack/react-query'
import { etfAPI } from '../../../services/api'
// import { cilChart, cilList, cilBarChart, cilInfo } from '@coreui/icons'

const ETFInfoTab = ({ etfData, asset, overviewData }) => {
  console.log('🔍 ETFInfoTab received etfData:', etfData)
  console.log('🔍 ETFInfoTab received asset:', asset)
  console.log('🔍 ETFInfoTab received overviewData:', overviewData)

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
        return `${(parseFloat(value) * 100).toFixed(2)}%`
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
      case 'date':
        try {
          const date = new Date(value)
          const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }
          return date.toLocaleDateString('en-US', options)
        } catch (error) {
          return value
        }
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(value)
    }
  }

  // 실제 ETF 데이터 사용 (overviewData에서 가져오거나 etfData 사용)
  const etfInfo = overviewData || (Array.isArray(etfData) && etfData.length > 0 ? etfData[0] : etfData)
  const etfInfoId = etfInfo?.etf_info_id

  console.log('🔍 Using ETF info:', etfInfo)
  console.log('🔍 ETF Info ID:', etfInfoId)

  // ETF Holdings 데이터 처리 (overviewData에서 직접 가져오기)
  const getHoldingsData = () => {
    if (etfInfo?.holdings) {
      try {
        // JSON 문자열인 경우 파싱
        const holdings = typeof etfInfo.holdings === 'string' 
          ? JSON.parse(etfInfo.holdings) 
          : etfInfo.holdings
        
        console.log('🔍 Parsed holdings data:', holdings)
        return Array.isArray(holdings) ? holdings : []
      } catch (error) {
        console.error('Error parsing holdings data:', error)
        return []
      }
    }
    return []
  }

  // ETF Sector Exposure 데이터 처리 (overviewData에서 직접 가져오기)
  const getSectorData = () => {
    if (etfInfo?.sectors) {
      try {
        // JSON 문자열인 경우 파싱
        const sectors = typeof etfInfo.sectors === 'string' 
          ? JSON.parse(etfInfo.sectors) 
          : etfInfo.sectors
        
        console.log('🔍 Parsed sectors data:', sectors)
        return Array.isArray(sectors) ? sectors : []
      } catch (error) {
        console.error('Error parsing sectors data:', error)
        return []
      }
    }
    return []
  }

  const holdingsData = getHoldingsData()
  const sectorData = getSectorData()

  console.log('🔍 Holdings data:', holdingsData)
  console.log('🔍 Sector data:', sectorData)

  // 실제 ETF 데이터로 fundInfo 구성 (overviewData에서 가져오기)
  const fundInfo = {
    expenseRatio: etfInfo?.net_expense_ratio || etfInfo?.expense_ratio || 'N/A',
    aum: etfInfo?.net_assets || etfInfo?.aum || 'N/A',
    inceptionDate: etfInfo?.inception_date || 'N/A',
    issuer: etfInfo?.issuer || 'N/A',
    index: 'N/A', // ETF 데이터에 index 정보가 없음
    trackingError: 'N/A', // ETF 데이터에 tracking error 정보가 없음
    dividendYield: etfInfo?.etf_dividend_yield || etfInfo?.dividend_yield || 'N/A',
    portfolioTurnover: etfInfo?.portfolio_turnover || 'N/A',
    leveraged: etfInfo?.leveraged || 'N/A',
  }

  console.log('🔍 Fund info:', fundInfo)

  const renderFundInfoCard = () => {
    // 실제 데이터가 있는 항목만 필터링
    const validData = [
      { label: 'Expense Ratio', value: fundInfo.expenseRatio, type: 'percentage' },
      { label: 'AUM', value: fundInfo.aum, type: 'marketCap' },
      { label: 'Inception Date', value: fundInfo.inceptionDate, type: 'date' },
      { label: 'Issuer', value: fundInfo.issuer, type: 'text' },
      { label: 'Index', value: fundInfo.index, type: 'text' },
      { label: 'Tracking Error', value: fundInfo.trackingError, type: 'percentage' },
      { label: 'Dividend Yield', value: fundInfo.dividendYield, type: 'percentage' },
      { label: 'Portfolio Turnover', value: fundInfo.portfolioTurnover, type: 'percentage' },
      { label: 'Leveraged', value: fundInfo.leveraged, type: 'text' },
    ].filter((item) => item.value !== 'N/A' && item.value !== null && item.value !== undefined)

    // 유효한 데이터가 없으면 카드를 렌더링하지 않음
    if (validData.length === 0) {
      console.log('⚠️ No valid fund info data, skipping Fund Information card')
      return null
    }

    return (
      <CCol xs={12} className="mb-4">
        <CCard>
          <CCardHeader>
            <h5 className="mb-0">Fund Information</h5>
          </CCardHeader>
          <CCardBody>
            <CRow>
              {validData.map((item, index) => (
                <CCol xs={6} md={3} key={index}>
                  <div className="mb-3">
                    <small className="text-muted">{item.label}</small>
                    <div className="fw-bold">
                      {item.type === 'text' ? item.value : formatValue(item.value, item.type)}
                    </div>
                  </div>
                </CCol>
              ))}
            </CRow>
          </CCardBody>
        </CCard>
      </CCol>
    )
  }

  const renderTopHoldingsCard = () => {
    // 실제 데이터가 없으면 카드를 렌더링하지 않음
    if (!holdingsData || holdingsData.length === 0) {
      console.log('⚠️ No holdings data available, skipping Top Holdings card')
      console.log('🔍 etfInfo.holdings:', etfInfo?.holdings)
      return null
    }

    return (
      <CCol xs={12} lg={6} className="mb-4">
        <CCard>
          <CCardHeader>
            <h5 className="mb-0">Top Holdings</h5>
          </CCardHeader>
          <CCardBody>
            {holdingsData.slice(0, 5).map((holding, index) => (
              <div key={index} className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="fw-medium">{holding.symbol || holding.ticker}</span>
                  <span className="text-muted">{formatValue(holding.weight, 'percentage')}</span>
                </div>
                <CProgress
                  value={holding.weight * 100}
                  className="mb-2"
                  color={index % 2 === 0 ? 'primary' : 'info'}
                />
              </div>
            ))}
          </CCardBody>
        </CCard>
      </CCol>
    )
  }

  const renderSectorAllocationCard = () => {
    // 실제 데이터가 없으면 카드를 렌더링하지 않음
    if (!sectorData || sectorData.length === 0) {
      console.log('⚠️ No sector data available, skipping Sector Allocation card')
      console.log('🔍 etfInfo.sectors:', etfInfo?.sectors)
      return null
    }

    return (
      <CCol xs={12} lg={6} className="mb-4">
        <CCard>
          <CCardHeader>
            <h5 className="mb-0">Sector Allocation</h5>
          </CCardHeader>
          <CCardBody>
            {sectorData.slice(0, 5).map((sector, index) => (
              <div key={index} className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="fw-medium">{sector.sector}</span>
                  <span className="text-muted">{formatValue(sector.weight, 'percentage')}</span>
                </div>
                <CProgress
                  value={sector.weight * 100}
                  className="mb-2"
                  color={index % 2 === 0 ? 'primary' : 'info'}
                />
              </div>
            ))}
          </CCardBody>
        </CCard>
      </CCol>
    )
  }

  return (
    <div className="etf-info-tab">
      <CRow>
        {renderFundInfoCard()}
        {renderTopHoldingsCard()}
        {renderSectorAllocationCard()}
      </CRow>
    </div>
  )
}

export default ETFInfoTab
