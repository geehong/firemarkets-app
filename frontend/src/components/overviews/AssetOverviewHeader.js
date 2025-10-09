import React from 'react'
import { useAPI } from '../../hooks/useAPI'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import useMetaTags from '../../hooks/useMetaTags'

/**
 * 자산 개요 헤더 컴포넌트 (데스크톱/모바일 통합)
 * CSS 미디어 쿼리를 사용하여 반응형으로 동작
 */
const AssetOverviewHeader = ({ assetId, asset, ohlcvData, cryptoData }) => {
  // 실시간 가격 데이터 (useAPI 사용)
  const { data: livePrices } = useAPI.assetsoverviews.realtime(asset?.ticker ? [asset.ticker] : [])
  
  // 현재가와 변동률 계산
  const getCurrentPriceData = () => {
    // 실시간 데이터 우선
    if (livePrices && livePrices[asset?.ticker]) {
      const live = livePrices[asset.ticker]
      return {
        price: live.price || live.close || live.last_price || 0,
        change: live.change || live.change_amount || 0,
        changePercent: live.change_percent || live.changePercent || 0
      }
    }

    // OHLCV 데이터 fallback
    if (ohlcvData && ohlcvData.length > 0) {
      const latest = ohlcvData[0]
      const previous = ohlcvData[1]
      const latestClose = latest?.close_price || latest?.close || 0
      const previousClose = previous?.close_price || previous?.close || 0
      
      if (latestClose && previousClose) {
        const change = latestClose - previousClose
        const changePercent = (change / previousClose) * 100
        return { price: latestClose, change, changePercent }
      }
      
      return { price: latestClose, change: 0, changePercent: 0 }
    }

    return { price: 0, change: 0, changePercent: 0 }
  }

  const { price, change, changePercent } = getCurrentPriceData()
  const isPositive = change >= 0

  // SEO 최적화: 동적 제목 및 메타 태그 설정
  const pageTitle = asset?.name ? `${asset.name} (${asset.ticker}) - 실시간 가격 및 분석` : '자산 분석'
  const pageDescription = asset?.name 
    ? `${asset.name} (${asset.ticker})의 실시간 가격, 변동률, 시가총액 등 상세 분석 정보를 확인하세요. ${asset.type_name} 투자 데이터 제공.`
    : '실시간 금융 시장 데이터 및 자산 분석 정보'

  useDocumentTitle(pageTitle)
  useMetaTags({
    title: pageTitle,
    description: pageDescription,
    keywords: `${asset?.name || ''}, ${asset?.ticker || ''}, ${asset?.type_name || ''}, 주식, 암호화폐, ETF, 실시간가격, 투자분석`,
    ogTitle: pageTitle,
    ogDescription: pageDescription,
    ogImage: asset?.type_name === 'Crypto' 
      ? (cryptoData?.logo_url || `https://cryptoicons.org/api/icon/${asset?.ticker?.toLowerCase()}/200`)
      : `https://images.financialmodelingprep.com/symbol/${asset?.ticker}.png`
  })

  // 자산 타입별 주요 메트릭스
  const getAssetMetrics = () => {
    switch (asset?.type_name) {
      case 'Stocks':
        return {
          primary: {
            label: '시가총액',
            value: cryptoData?.market_cap ? `₩${(cryptoData.market_cap / 1e12).toFixed(1)}조` : 'N/A'
          },
          secondary: {
            label: 'PER',
            value: cryptoData?.pe_ratio ? cryptoData.pe_ratio.toFixed(1) : 'N/A'
          }
        }
      
      case 'ETFs':
        return {
          primary: {
            label: 'AUM',
            value: cryptoData?.aum ? `$${(cryptoData.aum / 1e9).toFixed(1)}B` : 'N/A'
          },
          secondary: {
            label: '수수료율',
            value: cryptoData?.expense_ratio ? `${(cryptoData.expense_ratio * 100).toFixed(2)}%` : 'N/A'
          }
        }
      
      case 'Crypto':
        return {
          primary: {
            label: '시가총액',
            value: cryptoData?.market_cap ? `$${(cryptoData.market_cap / 1e9).toFixed(1)}B` : 'N/A'
          },
          secondary: {
            label: '24h 거래량',
            value: cryptoData?.volume_24h ? `$${(cryptoData.volume_24h / 1e6).toFixed(1)}M` : 'N/A'
          }
        }
      
      default:
        return {
          primary: { label: 'N/A', value: 'N/A' },
          secondary: { label: 'N/A', value: 'N/A' }
        }
    }
  }

  const metrics = getAssetMetrics()

  // 자산 로고 렌더링
  const renderAssetLogo = () => {
    if (!asset?.ticker) return null

    if (asset.type_name === 'Crypto') {
      return (
        <img
          src={cryptoData?.logo_url || `https://cryptoicons.org/api/icon/${asset.ticker.toLowerCase()}/48`}
          alt={asset.name}
          className="me-3"
          style={{ width: 48, height: 48, borderRadius: '50%' }}
          onError={(e) => { e.target.style.display = 'none' }}
        />
      )
    }

    return (
      <img
        src={`https://images.financialmodelingprep.com/symbol/${asset.ticker}.png`}
        alt={`${asset.name} Logo`}
        className="me-3"
        style={{ width: 48, height: 48, borderRadius: '50%' }}
        onError={(e) => { e.target.style.display = 'none' }}
      />
    )
  }

  return (
    <div className="card mb-4">
      <div className="card-body">
        {/* 데스크톱 레이아웃 */}
        <div className="d-none d-md-flex justify-content-between align-items-center">
          {/* 로고와 제목 */}
          <div className="d-flex align-items-center">
            {renderAssetLogo()}
            <div>
              <h1 className="h3 mb-0 fw-bold">
                {asset?.name || 'Unknown'} ({asset?.ticker || 'N/A'})
              </h1>
              <div className="d-flex align-items-center text-muted small">
                <span className="badge bg-primary me-2">{asset?.type_name}</span>
                <span className="me-2">/</span>
                <span className="badge bg-info me-2">{asset?.exchange}</span>
                <span className="me-2">/</span>
                <span className="badge bg-info me-2">{asset?.currency}</span>
              </div>
            </div>
          </div>

          {/* 메트릭스 카드 */}
          <div className="card p-3">
            <div className="d-flex align-items-center">
              <div className="text-center border-end pe-3 me-3">
                <div className="fs-5 fw-bold">${price.toFixed(2)}</div>
                <div className={`small ${isPositive ? 'text-success' : 'text-danger'}`}>
                  {isPositive ? '+' : ''}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
                </div>
              </div>
              <div className="text-center border-end pe-3 me-3">
                <div className="small text-body-secondary">{metrics.primary.label}</div>
                <div className="fw-semibold">{metrics.primary.value}</div>
              </div>
              <div className="text-center">
                <div className="small text-body-secondary">{metrics.secondary.label}</div>
                <div className="fw-semibold">{metrics.secondary.value}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 모바일 레이아웃 */}
        <div className="d-md-none">
          {/* 자산 기본 정보 */}
          <div className="text-center mb-4">
            <h4 className="mb-1">{asset?.name}</h4>
            <p className="text-muted mb-0">
              {asset?.ticker} • {asset?.exchange} • {asset?.type_name}
            </p>
          </div>

          {/* 현재가 및 변동률 */}
          <div className="row text-center mb-4">
            <div className="col-6">
              <div className="border-end">
                <div className="h3 mb-1">${price.toFixed(2)}</div>
                <div className="small text-muted">현재가</div>
              </div>
            </div>
            <div className="col-6">
              <div className={`h4 mb-1 ${isPositive ? 'text-success' : 'text-danger'}`}>
                {isPositive ? '+' : ''}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
              </div>
              <div className="small text-muted">변동</div>
            </div>
          </div>

          {/* 자산 타입별 메트릭스 */}
          <div className="row text-center">
            <div className="col-6 mb-3">
              <div className="small text-muted">{metrics.primary.label}</div>
              <div className="fw-semibold">{metrics.primary.value}</div>
            </div>
            <div className="col-6 mb-3">
              <div className="small text-muted">{metrics.secondary.label}</div>
              <div className="fw-semibold">{metrics.secondary.value}</div>
            </div>
          </div>

          {/* 추가 정보 (접을 수 있는 섹션) */}
          <div className="mt-3">
            <details className="border-top pt-3">
              <summary className="text-muted small">추가 정보</summary>
              <div className="mt-2 small">
                {asset?.sector && (
                  <div className="mb-1">
                    <span className="text-muted">섹터:</span> {asset.sector}
                  </div>
                )}
                {asset?.industry && (
                  <div className="mb-1">
                    <span className="text-muted">산업:</span> {asset.industry}
                  </div>
                )}
                {asset?.currency && (
                  <div className="mb-1">
                    <span className="text-muted">통화:</span> {asset.currency}
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AssetOverviewHeader
