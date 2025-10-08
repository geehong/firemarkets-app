import React, { useState } from 'react'
import { CButton, CCard, CCardBody, CCardHeader } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMinus, cilPlus } from '@coreui/icons'

/**
 * 자산 프로필 탭 컴포넌트 (주식/ETF/Crypto 공통)
 * 모든 자산 유형에 대한 통합 프로필 정보 표시
 */
const ProfileTab = ({ asset, ohlcvData, cryptoData }) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

  // OHLCV 데이터에서 필요한 값들을 계산하는 함수
  const calculateOHLCVMetrics = () => {
    if (!ohlcvData || !Array.isArray(ohlcvData) || ohlcvData.length === 0) {
      return {
        prevClose: null,
        prevVolume: null,
        week52High: null,
        week52Low: null,
        day50Avg: null,
        day200Avg: null
      }
    }

    const sortedData = [...ohlcvData].sort((a, b) => new Date(b.timestamp_utc) - new Date(a.timestamp_utc))
    
    // 최근 데이터 (이전 종가, 이전 거래량)
    const latestData = sortedData[0]
    const prevData = sortedData[1]
    
    // 52주 고가/저가 (최근 365일)
    const oneYearAgo = new Date()
    oneYearAgo.setDate(oneYearAgo.getDate() - 365)
    const yearData = sortedData.filter(item => new Date(item.timestamp_utc) >= oneYearAgo)
    
    // 50일, 200일 이동평균
    const day50Data = sortedData.slice(0, 50)
    const day200Data = sortedData.slice(0, 200)

    return {
      prevClose: prevData?.close_price || null,
      prevVolume: prevData?.volume || null,
      week52High: yearData.length > 0 ? Math.max(...yearData.map(d => d.high_price)) : null,
      week52Low: yearData.length > 0 ? Math.min(...yearData.map(d => d.low_price)) : null,
      day50Avg: day50Data.length > 0 ? day50Data.reduce((sum, d) => sum + d.close_price, 0) / day50Data.length : null,
      day200Avg: day200Data.length > 0 ? day200Data.reduce((sum, d) => sum + d.close_price, 0) / day200Data.length : null
    }
  }

  const ohlcvMetrics = calculateOHLCVMetrics()

  // 자산 타입별 설명 가져오기
  const getAssetDescription = () => {
    switch (asset?.type_name) {
      case 'Stocks':
        return cryptoData?.description || 'Detailed company information will be displayed here.'
      case 'ETFs':
        return cryptoData?.description || 'Detailed ETF product description will be displayed here.'
      case 'Crypto':
        return cryptoData?.description || 'Detailed cryptocurrency information will be displayed here.'
      case 'Commodities':
        return cryptoData?.description || 'Detailed commodity information will be displayed here.'
      default:
        return 'Detailed asset information will be displayed here.'
    }
  }

  // 자산 타입별 비즈니스 정보
  const getBusinessInfo = () => {
    switch (asset?.type_name) {
      case 'Stocks':
        return {
          ceo: cryptoData?.ceo || 'N/A',
          employees: cryptoData?.employees_count || 'N/A',
          ipoDate: cryptoData?.ipo_date || 'N/A',
          country: cryptoData?.country || 'N/A',
          city: cryptoData?.city || 'N/A',
          address: cryptoData?.address || 'N/A',
          phone: cryptoData?.phone || 'N/A',
          website: cryptoData?.website || 'N/A',
        }
      
      case 'ETFs':
        return {
          ceo: 'N/A',
          employees: 'N/A',
          ipoDate: cryptoData?.inception_date || 'N/A',
          country: cryptoData?.country || 'N/A',
          city: cryptoData?.city || 'N/A',
          address: cryptoData?.address || 'N/A',
          phone: cryptoData?.phone || 'N/A',
          website: cryptoData?.website || 'N/A',
        }
      
      case 'Crypto':
        return {
          ceo: 'N/A',
          employees: 'N/A',
          ipoDate: cryptoData?.launch_date || 'N/A',
          country: cryptoData?.country || 'N/A',
          city: 'N/A',
          address: 'N/A',
          phone: 'N/A',
          website: cryptoData?.website || 'N/A',
        }
      
      default:
        return {
          ceo: 'N/A',
          employees: 'N/A',
          ipoDate: 'N/A',
          country: 'N/A',
          city: 'N/A',
          address: 'N/A',
          phone: 'N/A',
          website: 'N/A',
        }
    }
  }

  // 주식 정보 가져오기
  const getStockInfo = () => {
    if (asset?.type_name === 'Stocks' && cryptoData) {
      // cryptoData가 {data: [...]} 구조인 경우 data 배열 사용
      const financialsArray = cryptoData.data || cryptoData
      const financialData = Array.isArray(financialsArray) ? financialsArray[0] : financialsArray

      if (!financialData)
        return {
          marketCap: 'N/A',
          prevClose: ohlcvMetrics.prevClose ? ohlcvMetrics.prevClose.toFixed(2) : 'N/A',
          prevVolume: ohlcvMetrics.prevVolume ? `${(ohlcvMetrics.prevVolume / 1000000).toFixed(3)}M` : 'N/A',
          week52High: ohlcvMetrics.week52High ? ohlcvMetrics.week52High.toFixed(2) : 'N/A',
          week52Low: ohlcvMetrics.week52Low ? ohlcvMetrics.week52Low.toFixed(2) : 'N/A',
          day50Avg: ohlcvMetrics.day50Avg ? ohlcvMetrics.day50Avg.toFixed(2) : 'N/A',
          day200Avg: ohlcvMetrics.day200Avg ? ohlcvMetrics.day200Avg.toFixed(2) : 'N/A',
        }

      return {
        marketCap: financialData.market_cap
          ? `${(financialData.market_cap / 1000000000).toFixed(2)}B`
          : 'N/A',
        prevClose: ohlcvMetrics.prevClose ? ohlcvMetrics.prevClose.toFixed(2) : 'N/A',
        prevVolume: ohlcvMetrics.prevVolume ? `${(ohlcvMetrics.prevVolume / 1000000).toFixed(3)}M` : 'N/A',
        week52High: ohlcvMetrics.week52High ? ohlcvMetrics.week52High.toFixed(2) : 'N/A',
        week52Low: ohlcvMetrics.week52Low ? ohlcvMetrics.week52Low.toFixed(2) : 'N/A',
        day50Avg: ohlcvMetrics.day50Avg ? ohlcvMetrics.day50Avg.toFixed(2) : 'N/A',
        day200Avg: ohlcvMetrics.day200Avg ? ohlcvMetrics.day200Avg.toFixed(2) : 'N/A',
      }
    }
    return {
      marketCap: 'N/A',
      prevClose: ohlcvMetrics.prevClose ? ohlcvMetrics.prevClose.toFixed(2) : 'N/A',
      prevVolume: ohlcvMetrics.prevVolume ? `${(ohlcvMetrics.prevVolume / 1000000).toFixed(3)}M` : 'N/A',
      week52High: ohlcvMetrics.week52High ? ohlcvMetrics.week52High.toFixed(2) : 'N/A',
      week52Low: ohlcvMetrics.week52Low ? ohlcvMetrics.week52Low.toFixed(2) : 'N/A',
      day50Avg: ohlcvMetrics.day50Avg ? ohlcvMetrics.day50Avg.toFixed(2) : 'N/A',
      day200Avg: ohlcvMetrics.day200Avg ? ohlcvMetrics.day200Avg.toFixed(2) : 'N/A',
    }
  }

  // 지표 정보 가져오기
  const getIndicators = () => {
    if (asset?.type_name === 'Stocks' && cryptoData) {
      // cryptoData가 {data: [...]} 구조인 경우 data 배열 사용
      const financialsArray = cryptoData.data || cryptoData
      const financialData = Array.isArray(financialsArray) ? financialsArray[0] : financialsArray

      if (!financialData)
        return {
          peRatio: 'N/A',
          pbRatio: 'N/A',
          eps: 'N/A',
          roe: 'N/A',
          beta: 'N/A',
          dividendYield: 'N/A',
          ebitda: 'N/A',
        }

      return {
        peRatio: financialData.pe_ratio ? `${financialData.pe_ratio.toFixed(1)}x` : 'N/A',
        pbRatio: financialData.price_to_book_ratio
          ? `${financialData.price_to_book_ratio.toFixed(1)}x`
          : 'N/A',
        eps: financialData.eps ? financialData.eps.toFixed(2) : 'N/A',
        roe: financialData.return_on_equity_ttm
          ? `${(financialData.return_on_equity_ttm * 100).toFixed(1)}%`
          : 'N/A',
        beta: financialData.beta ? financialData.beta.toFixed(2) : 'N/A',
        dividendYield: financialData.dividend_yield
          ? `${(financialData.dividend_yield * 100).toFixed(1)}%`
          : 'N/A',
        ebitda: financialData.ebitda ? `${(financialData.ebitda / 1000000000).toFixed(1)}B` : (
          // EBITDA가 없으면 Revenue와 Profit Margin으로 계산
          financialData.revenue_ttm && financialData.profit_margin_ttm 
            ? `${((financialData.revenue_ttm * financialData.profit_margin_ttm * 1.3) / 1000000000).toFixed(1)}B`
            : 'N/A'
        ),
      }
    }
    return {
      peRatio: 'N/A',
      pbRatio: 'N/A',
      eps: 'N/A',
      roe: 'N/A',
      beta: 'N/A',
      dividendYield: 'N/A',
      ebitda: 'N/A',
    }
  }

  const businessInfo = getBusinessInfo()
  const stockInfo = getStockInfo()
  const indicators = getIndicators()
  const description = getAssetDescription()

  // 설명 텍스트를 1줄로 제한하는 함수
  const getTruncatedDescription = (text, maxLength = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const InfoRow = ({ label, value, isLink = false }) => (
    <div className="d-flex justify-content-between border-bottom pb-2 mb-2">
      <span className="text-body-secondary">{label}</span>
      <span className="fw-semibold">
        {isLink && value !== 'N/A' ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-decoration-none"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </span>
    </div>
  )

  return (
    <div className="tab-pane active">
      {/* Company Name and Asset Info */}
      <div className="mb-4">
        <h4 className="mb-2">
          {businessInfo.website !== 'N/A' ? (
            <a
              href={businessInfo.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-decoration-none"
            >
              {asset?.name || 'Company Name'}
            </a>
          ) : (
            asset?.name || 'Company Name'
          )}
        </h4>

        {/* Scrolling Asset Info Component */}
        <div className="p-2 rounded">
          <div className="d-flex align-items-center text-muted small overflow-auto">
            <div className="d-flex align-items-center flex-nowrap" style={{ minWidth: 'max-content' }}>
              <span className="badge bg-info me-2">{asset?.type_name || 'Stocks'}</span>
              <span className="me-2">/</span>
              <span className="badge bg-info me-2">{asset?.exchange || 'NASDAQ'}</span>
              <span className="me-2">/</span>
              <span className="badge bg-info me-2">{asset?.ticker || 'MSFT'}</span>
              <span className="me-2">/</span>
              <span className="badge bg-info me-2">{cryptoData?.sector || 'Technology'}</span>
              <span className="me-2">/</span>
              <span className="badge bg-info me-2">{asset?.currency || 'USD'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description with Toggle */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="fw-semibold mb-0">Description</h6>
          {description.length > 100 && (
            <CButton
              type="button"
              color="transparent"
              size="sm"
              className="btn-tool"
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              title={isDescriptionExpanded ? 'Collapse' : 'Expand'}
            >
              <CIcon icon={isDescriptionExpanded ? cilMinus : cilPlus} />
            </CButton>
          )}
        </div>
        <div className="card-text text-body-secondary">
          {isDescriptionExpanded ? description : getTruncatedDescription(description)}
        </div>
      </div>

      {/* Three Column Layout */}
      <div className="row g-2 g-sm-3 g-md-4">
        {/* Company Column */}
        <div className="col-12 col-sm-6 col-md-4">
          <CCard className="h-100">
            <CCardHeader>
              <h6 className="fw-semibold mb-0">Company</h6>
            </CCardHeader>
            <CCardBody>
              <InfoRow label="CEO" value={businessInfo.ceo} />
              <InfoRow label="Count" value={businessInfo.employees} />
              <InfoRow label="IPO" value={businessInfo.ipoDate} />
              <InfoRow label="Country" value={businessInfo.country} />
              <InfoRow label="City" value={businessInfo.city} />
              <InfoRow label="Address" value={businessInfo.address} />
              <InfoRow label="Phone" value={businessInfo.phone} />
            </CCardBody>
          </CCard>
        </div>

        {/* Stock Column */}
        <div className="col-12 col-sm-6 col-md-4">
          <CCard className="h-100">
            <CCardHeader>
              <h6 className="fw-semibold mb-0">Stock</h6>
            </CCardHeader>
            <CCardBody>
              <InfoRow label="Market Cap" value={stockInfo.marketCap} />
              <InfoRow label="Prev. Close" value={stockInfo.prevClose} />
              <InfoRow label="Prev. Volume" value={stockInfo.prevVolume} />
              <InfoRow label="52 wk High" value={stockInfo.week52High} />
              <InfoRow label="52 wk Low" value={stockInfo.week52Low} />
              <InfoRow label="50 day Avg" value={stockInfo.day50Avg} />
              <InfoRow label="200 day Avg" value={stockInfo.day200Avg} />
            </CCardBody>
          </CCard>
        </div>

        {/* Indicators Column */}
        <div className="col-12 col-sm-6 col-md-4">
          <CCard className="h-100">
            <CCardHeader>
              <h6 className="fw-semibold mb-0">Indicators</h6>
            </CCardHeader>
            <CCardBody>
              <InfoRow label="P/E Ratio" value={indicators.peRatio} />
              <InfoRow label="P/B Ratio" value={indicators.pbRatio} />
              <InfoRow label="EPS" value={indicators.eps} />
              <InfoRow label="ROE" value={indicators.roe} />
              <InfoRow label="Beta" value={indicators.beta} />
              <InfoRow label="Yield" value={indicators.dividendYield} />
              <InfoRow label="EBITDA" value={indicators.ebitda} />
            </CCardBody>
          </CCard>
        </div>
      </div>
    </div>
  )
}

export default ProfileTab