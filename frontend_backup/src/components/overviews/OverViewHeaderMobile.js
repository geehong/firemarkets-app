import React from 'react'
import useRealtimePrices from 'src/hooks/useRealtimePrices'

const OverViewHeaderMobile = ({
  asset,
  ohlcvData,
  stockFinancials,
  stockProfile,
  etfInfo,
  cryptoMetrics,
  cryptoData,
}) => {
  // 현재가와 변동률 계산 - OHLCV 기반 Fallback
  const getFallbackPrice = () => {
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

  // 실시간 가격 훅
  const ticker = asset?.ticker
  const assetType = asset?.type_name === 'Stocks' ? 'stock' : 'crypto'
  const { data: liveMap } = useRealtimePrices(
    ticker ? [ticker] : [],
    assetType,
    { enabled: !!ticker, refetchInterval: 15000, staleTime: 14000 }
  )

  const live = ticker ? liveMap?.[ticker] : undefined
  const livePrice = live != null ? Number(live.price ?? live.close ?? live.last_price ?? live.last) : undefined
  const liveChangePercent = live != null
    ? Number(
        live.change_percent ??
        live.changePercent ??
        live.change_percent_today ??
        live.percent_change
      )
    : undefined
  const liveChange = live != null
    ? Number(
        live.change ??
        live.change_amount ??
        (livePrice != null && liveChangePercent != null ? (livePrice * liveChangePercent) / 100 : undefined)
      )
    : undefined

  const { price: fbPrice, change: fbChange, changePercent: fbChangePercent } = getFallbackPrice()
  const price = (typeof livePrice === 'number' && !Number.isNaN(livePrice)) ? livePrice : fbPrice
  const changePercent = (typeof liveChangePercent === 'number' && !Number.isNaN(liveChangePercent)) ? liveChangePercent : fbChangePercent
  const change = (typeof liveChange === 'number' && !Number.isNaN(liveChange)) ? liveChange : fbChange

  return (
    <div className="card mb-4">
      <div className="card-body p-4">
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
              <div className="h3 mb-1">
                ${price.toFixed(2)}
              </div>
              <div className="small text-muted">현재가</div>
            </div>
          </div>
          <div className="col-6">
            <div className={`h4 mb-1 ${change >= 0 ? 'text-success' : 'text-danger'}`}>
              {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
            </div>
            <div className="small text-muted">변동</div>
          </div>
        </div>

        {/* 자산 타입별 주요 메트릭스 */}
        <div className="row text-center">
          {asset?.type_name === 'Stocks' && (
            <>
              <div className="col-6 mb-3">
                <div className="small text-muted">시가총액</div>
                <div className="fw-semibold">
                  {stockFinancials?.data?.[0]?.market_cap 
                    ? `₩${(stockFinancials.data[0].market_cap / 1e12).toFixed(1)}조` 
                    : 'N/A'}
                </div>
              </div>
              <div className="col-6 mb-3">
                <div className="small text-muted">PER</div>
                <div className="fw-semibold">
                  {stockFinancials?.data?.[0]?.pe_ratio 
                    ? stockFinancials.data[0].pe_ratio.toFixed(1) 
                    : 'N/A'}
                </div>
              </div>
            </>
          )}

          {asset?.type_name === 'Crypto' && (
            <>
              <div className="col-6 mb-3">
                <div className="small text-muted">시가총액</div>
                <div className="fw-semibold">
                  {cryptoMetrics?.market_cap 
                    ? `$${(cryptoMetrics.market_cap / 1e9).toFixed(1)}B` 
                    : 'N/A'}
                </div>
              </div>
              <div className="col-6 mb-3">
                <div className="small text-muted">24h 거래량</div>
                <div className="fw-semibold">
                  {cryptoMetrics?.volume_24h 
                    ? `$${(cryptoMetrics.volume_24h / 1e6).toFixed(1)}M` 
                    : 'N/A'}
                </div>
              </div>
            </>
          )}

          {asset?.type_name === 'ETFs' && (
            <>
              <div className="col-6 mb-3">
                <div className="small text-muted">AUM</div>
                <div className="fw-semibold">
                  {etfInfo?.aum 
                    ? `$${(etfInfo.aum / 1e9).toFixed(1)}B` 
                    : 'N/A'}
                </div>
              </div>
              <div className="col-6 mb-3">
                <div className="small text-muted">수수료</div>
                <div className="fw-semibold">
                  {etfInfo?.expense_ratio 
                    ? `${(etfInfo.expense_ratio * 100).toFixed(2)}%` 
                    : 'N/A'}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 추가 정보 (접을 수 있는 섹션) */}
        <div className="mt-3">
          <details className="border-top pt-3">
            <summary className="text-muted small">추가 정보</summary>
            <div className="mt-2 small">
              {stockProfile?.sector && (
                <div className="mb-1">
                  <span className="text-muted">섹터:</span> {stockProfile.sector}
                </div>
              )}
              {stockProfile?.industry && (
                <div className="mb-1">
                  <span className="text-muted">산업:</span> {stockProfile.industry}
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
  )
}

export default OverViewHeaderMobile

