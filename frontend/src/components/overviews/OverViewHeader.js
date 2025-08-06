import React from 'react'

const OverViewHeader = ({
  asset,
  ohlcvData,
  stockFinancials,
  stockProfile,
  etfInfo,
  cryptoMetrics,
  cryptoData,
}) => {
  console.log('🔍 OverViewHeader Debug:', {
    asset,
    ohlcvDataLength: ohlcvData?.length,
    ohlcvDataSample: ohlcvData?.[0],
    stockFinancialsLength: stockFinancials?.length,
    stockFinancialsSample: stockFinancials?.[0],
    stockProfile,
    cryptoData,
  })

  // 현재가와 변동률 계산 (공통)
  const getCurrentPrice = () => {
    if (!ohlcvData || ohlcvData.length === 0) return { price: 0, change: 0, changePercent: 0 }
    const latest = ohlcvData[0]
    const previous = ohlcvData[1]
    const latestClose = latest?.close_price || latest?.close
    const previousClose = previous?.close_price || previous?.close
    if (!latest || latestClose == null) return { price: 0, change: 0, changePercent: 0 }
    if (!previous || previousClose == null)
      return { price: latestClose, change: 0, changePercent: 0 }
    const change = latestClose - previousClose
    const changePercent = (change / previousClose) * 100
    return { price: latestClose, change, changePercent }
  }

  // 재무 데이터에서 시가총액과 PER 가져오기
  const getFinancialMetrics = () => {
    if (stockFinancials && stockFinancials.data && stockFinancials.data.length > 0) {
      const latestFinancial = stockFinancials.data[0]
      return {
        marketCap: latestFinancial.market_cap,
        peRatio: latestFinancial.pe_ratio,
      }
    }
    return { marketCap: null, peRatio: null }
  }

  // 계층 구조 정보 생성
  const getHierarchyInfo = () => {
    const hierarchy = []

    // 자산 타입 (Stocks, ETFs, Crypto)
    if (asset?.type_name) {
      hierarchy.push(asset.type_name)
    }

    // 거래소 (NASDAQ, NYSE 등)
    if (asset?.exchange) {
      hierarchy.push(asset.exchange)
    }

    // 티커 (MSFT, AAPL 등)
    if (asset?.ticker) {
      hierarchy.push(asset.ticker)
    }

    // 섹터 (Technology, Healthcare 등)
    if (stockProfile?.sector) {
      hierarchy.push(stockProfile.sector)
    }

    // 통화 (USD, KRW 등)
    if (asset?.currency) {
      hierarchy.push(asset.currency)
    }

    return hierarchy
  }

  // 자산 타입별 주요 메트릭스
  const renderMetrics = () => {
    switch (asset?.type_name) {
      case 'Stocks': {
        const marketCap = stockFinancials?.data?.[0]?.market_cap
        const peRatio = stockFinancials?.data?.[0]?.pe_ratio
        return (
          <>
            <div className="text-center border-end pe-3 me-3">
              <div className="small text-body-secondary">시가총액</div>
              <div className="fw-semibold">
                {marketCap ? `₩${(marketCap / 1e12).toFixed(1)}조` : 'N/A'}
              </div>
            </div>
            <div className="text-center">
              <div className="small text-body-secondary">PER</div>
              <div className="fw-semibold">{peRatio ? peRatio.toFixed(1) : 'N/A'}</div>
            </div>
          </>
        )
      }
      case 'ETFs': {
        const info = Array.isArray(etfInfo) ? etfInfo[0] : etfInfo
        return (
          <>
            <div className="text-center border-end pe-3 me-3">
              <div className="small text-body-secondary">AUM</div>
              <div className="fw-semibold">
                {info?.aum ? `$${(info.aum / 1e9).toFixed(1)}B` : 'N/A'}
              </div>
            </div>
            <div className="text-center">
              <div className="small text-body-secondary">수수료율</div>
              <div className="fw-semibold">
                {info?.expense_ratio ? `${(info.expense_ratio * 100).toFixed(2)}%` : 'N/A'}
              </div>
            </div>
          </>
        )
      }
      case 'Crypto': {
        // Use crypto data if available, fallback to crypto metrics
        const cryptoInfo =
          cryptoData?.data ||
          (Array.isArray(cryptoMetrics) ? cryptoMetrics[0] : cryptoMetrics)
        return (
          <>
            <div className="text-center border-end pe-3 me-3">
              <div className="small text-body-secondary">시가총액</div>
              <div className="fw-semibold">
                {cryptoInfo?.market_cap ? `$${(cryptoInfo.market_cap / 1e9).toFixed(1)}B` : 'N/A'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-body-secondary">거래량</div>
              <div className="fw-semibold">
                {cryptoInfo?.volume_24h ? `$${(cryptoInfo.volume_24h / 1e9).toFixed(1)}B` : 'N/A'}
              </div>
            </div>
          </>
        )
      }
      case 'Commodities': {
        const volume = ohlcvData?.[0]?.volume
        const week52High = ohlcvData?.reduce(
          (max, d) => (d.close_price > max ? d.close_price : max),
          0,
        )
        const week52Low = ohlcvData?.reduce(
          (min, d) => (d.close_price < min ? d.close_price : min),
          ohlcvData?.[0]?.close_price || 0,
        )
        return (
          <>
            <div className="text-center border-end pe-3 me-3">
              <div className="small text-body-secondary">거래량</div>
              <div className="fw-semibold">{volume ? `${(volume / 1e6).toFixed(1)}M` : 'N/A'}</div>
            </div>
            <div className="text-center">
              <div className="small text-body-secondary">52주 범위</div>
              <div className="fw-semibold">
                {week52High && week52Low
                  ? `${week52Low.toFixed(2)} - ${week52High.toFixed(2)}`
                  : 'N/A'}
              </div>
            </div>
          </>
        )
      }
      default:
        return null
    }
  }

  // 자산 타입별 로고/타이틀
  const renderLogo = () => {
    // ticker가 없으면 로고를 표시하지 않음
    if (!asset?.ticker) {
      return null
    }

    if (asset?.type_name === 'Crypto') {
      // Use logo_url from crypto data if available
      if (cryptoData?.data?.logo_url) {
        return (
          <img
            src={cryptoData.data.logo_url}
            alt={asset?.name}
            className="me-3"
            style={{ width: 48, height: 48, borderRadius: '50%' }}
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
        )
      }
      // Fallback to cryptoicons.org
      return (
        <img
          src={`https://cryptoicons.org/api/icon/${asset.ticker.toLowerCase()}/48`}
          alt={asset?.name}
          className="me-3"
          style={{ width: 48, height: 48, borderRadius: '50%' }}
          onError={(e) => {
            e.target.style.display = 'none'
          }}
        />
      )
    }
    // 기본: 기존 로고
    return (
      <img
        src={`https://images.financialmodelingprep.com/symbol/${asset.ticker}.png`}
        alt={`${asset?.name} Logo`}
        className="me-3"
        style={{ width: '48px', height: '48px', borderRadius: '50%' }}
        onError={(e) => {
          e.target.style.display = 'none'
        }}
      />
    )
  }

  const { price, change, changePercent } = getCurrentPrice()
  const isPositive = change >= 0
  const hierarchyInfo = getHierarchyInfo()

  console.log('📈 Final metrics:', {
    price,
    change,
    changePercent,
    marketCap: getFinancialMetrics().marketCap,
    peRatio: getFinancialMetrics().peRatio,
  })
  console.log('��️ Hierarchy info:', hierarchyInfo)

  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center">
          {/* 로고와 제목 영역 */}
          <div className="d-flex align-items-center mb-3 mb-sm-0">
            {renderLogo()}
            <div>
              <h1 className="h2 mb-0 fw-bold">
                {asset?.name || 'Unknown'} ({asset?.ticker || 'N/A'})
              </h1>
              {/* 계층 구조 정보 */}
              {/* <div className="d-flex align-items-center text-muted small">
                {hierarchyInfo.map((item, index) => (
                  <React.Fragment key={index}>
                    {index === 0 ? (
                      <span className="badge bg-primary me-2">{item}</span>
                    ) : (
                      <span className={index < hierarchyInfo.length - 1 ? 'me-2' : ''}>{item}</span>
                    )}
                  </React.Fragment>
                ))}
              </div> */}
            </div>
          </div>

          {/* 메트릭스 카드 */}
          <div className="card p-3">
            <div className="d-flex align-items-center">
              <div className="text-center border-end pe-3 me-3">
                <div className="fs-5 fw-bold">
                  ${typeof price === 'number' ? price.toFixed(2) : '0.00'}
                </div>
                <div className={`small ${isPositive ? 'text-success' : 'text-danger'}`}>
                  {isPositive ? '+' : ''}
                  {typeof change === 'number' ? change.toFixed(2) : '0.00'} (
                  {typeof changePercent === 'number' ? changePercent.toFixed(2) : '0.00'}%)
                </div>
              </div>
              {renderMetrics()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OverViewHeader
