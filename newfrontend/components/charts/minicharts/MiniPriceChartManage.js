import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CRow, CBadge } from '@coreui/react'
import useWebSocketStore from 'src/store/websocketStore'

// Lazy load mini chart variants per asset category
const MiniPriceCryptoChart = React.lazy(() => import('src/components/charts/minicharts/MiniPriceCryptoChart'))
const MiniPriceCommoditiesChart = React.lazy(() => import('src/components/charts/minicharts/MiniPriceCommoditiesChart'))
const MiniPriceStocksEtfChart = React.lazy(() => import('src/components/charts/minicharts/MiniPriceStocksEtfChart'))

// Default groups and symbols managed by this component
const defaultGroups = [
  {
    key: 'crypto',
    title: 'Crypto',
    items: ['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'BNBUSDT', 'SOLUSDT', 'DOGEUSDT', 'TRXUSDT', 'ADAUSDT'],
    Comp: MiniPriceCryptoChart,
  },
  {
    key: 'stocks',
    title: 'US Stocks Top 8',
    items: ['AAPL', 'MSFT', 'NVDA', 'GOOG', 'AMZN', 'META', 'NFLX', 'AVGO'],
    Comp: MiniPriceStocksEtfChart,
  },
  {
    key: 'commodities',
    title: 'Commodities',
    items: ['GCUSD', 'SIUSD'],
    Comp: MiniPriceCommoditiesChart,
  },
]

// Utility: compute session change values based on a baseline map
function computeChange(baseline, current) {
  if (baseline == null || current == null) return { changeAmount: 0, changePercent: 0 }
  const changeAmount = current - baseline
  const changePercent = baseline !== 0 ? (changeAmount / baseline) * 100 : 0
  return { changeAmount, changePercent }
}

const MiniPriceChartManage = ({ groups = defaultGroups, showTopLeaders = false }) => {
  // websocket connection state
  const connected = useWebSocketStore((state) => state.connected)
  const prices = useWebSocketStore((state) => state.prices)

  const groupsToUse = useMemo(() => {
    if (!showTopLeaders) return groups
    return [
      { key: 'crypto', title: 'Crypto - Top 1', items: ['BTCUSDT'], Comp: MiniPriceCryptoChart },
      { key: 'stocks', title: 'US Stocks - Top 1', items: ['NVDA'], Comp: MiniPriceStocksEtfChart },
      { key: 'etf', title: 'ETF - Top 1', items: ['SPY'], Comp: MiniPriceStocksEtfChart },
      { key: 'commodities', title: 'Commodities - Top 1', items: ['GCUSD'], Comp: MiniPriceCommoditiesChart },
    ]
  }, [groups, showTopLeaders])

  const allSymbols = useMemo(() => groupsToUse.flatMap((g) => g.items), [groupsToUse])

  // track selected symbols per group (simple all-selected default)
  const [selectedMap, setSelectedMap] = useState(() => {
    const init = {}
    for (const g of groupsToUse) init[g.key] = new Set(g.items)
    return init
  })

  // session baseline per symbol (first seen price in this session)
  const baselineRef = useRef({})

  // subscribe on mount
  useEffect(() => {
    const { connect, subscribeSymbols } = useWebSocketStore.getState()
    if (allSymbols.length > 0) {
      connect()
      // small delay to ensure socket join
      setTimeout(() => subscribeSymbols(allSymbols), 300)
    }
    // no unsubscribe here because other views may share the store
  }, [allSymbols])

  // ensure re-subscribe on reconnect
  useEffect(() => {
    if (connected && allSymbols.length > 0) {
      const { subscribeSymbols } = useWebSocketStore.getState()
      subscribeSymbols(allSymbols)
    }
  }, [connected, allSymbols])

  // update baselines when new symbols appear
  useEffect(() => {
    for (const symbol of Object.keys(prices || {})) {
      const price = prices[symbol]?.price
      if (price != null && baselineRef.current[symbol] == null) {
        baselineRef.current[symbol] = price
      }
    }
  }, [prices])

  const isSelected = (groupKey, symbol) => {
    const set = selectedMap[groupKey]
    return !!set && set.has(symbol)
  }

  const toggleSymbol = (groupKey, symbol) => {
    setSelectedMap((prev) => {
      const next = { ...prev }
      const set = new Set(next[groupKey] || [])
      if (set.has(symbol)) set.delete(symbol)
      else set.add(symbol)
      next[groupKey] = set
      return next
    })
  }

  if (showTopLeaders) {
    const leaders = [
      { key: 'crypto-BTCUSDT', symbol: 'BTCUSDT', Comp: MiniPriceCryptoChart },
      { key: 'commodities-GCUSD', symbol: 'GCUSD', Comp: MiniPriceCommoditiesChart },
      { key: 'stocks-NVDA', symbol: 'NVDA', Comp: MiniPriceStocksEtfChart },
      { key: 'etf-SPY', symbol: 'SPY', Comp: MiniPriceStocksEtfChart },
    ]

    return (
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>Top Leaders</CCardHeader>
            <CCardBody>
              <CRow>
                {leaders.map(({ key, symbol, Comp }) => {
                  const price = prices?.[symbol]?.price
                  const { changeAmount, changePercent } = computeChange(
                    baselineRef.current[symbol],
                    price,
                  )
                  return (
                    <CCol xs={12} md={6} key={key} className="mb-4">
                      <Suspense
                        fallback={
                          <div
                            style={{ height: '300px' }}
                            className="d-flex align-items-center justify-content-center"
                          >
                            Loading {symbol}...
                          </div>
                        }
                      >
                        <Comp
                          assetIdentifier={symbol}
                          sessionChangeAmount={changeAmount}
                          sessionChangePercent={changePercent}
                        />
                      </Suspense>
                    </CCol>
                  )
                })}
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    )
  }

  return (
    <CRow>
      {groupsToUse.map(({ key, title, items, Comp }) => (
        <CCol xs={12} key={key}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex align-items-center justify-content-between">
              <span>{title}</span>
              <div className="d-flex flex-wrap gap-2">
                {items.map((s) => (
                  <CBadge
                    key={`${key}-${s}`}
                    color={isSelected(key, s) ? 'primary' : 'secondary'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleSymbol(key, s)}
                  >
                    {/* 티커 텍스트 제거 (시각적 노출 X) */}
                  </CBadge>
                ))}
              </div>
            </CCardHeader>
            <CCardBody>
              <CRow>
                {items
                  .filter((s) => isSelected(key, s))
                  .map((symbol, idx) => {
                    const price = prices?.[symbol]?.price
                    const { changeAmount, changePercent } = computeChange(
                      baselineRef.current[symbol],
                      price,
                    )
                    return (
                      <CCol xs={12} md={6} key={`${key}-${symbol}-${idx}`} className="mb-4">
                        <Suspense
                          fallback={
                            <div
                              style={{ height: '300px' }}
                              className="d-flex align-items-center justify-content-center"
                            >
                              Loading {symbol}...
                            </div>
                          }
                        >
                          <Comp
                            assetIdentifier={symbol}
                            // pass computed change values for display if mini chart supports it
                            sessionChangeAmount={changeAmount}
                            sessionChangePercent={changePercent}
                          />
                        </Suspense>
                      </CCol>
                    )
                  })}
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>
      ))}
    </CRow>
  )
}

export default MiniPriceChartManage


