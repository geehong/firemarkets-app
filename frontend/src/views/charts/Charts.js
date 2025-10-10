import React, { lazy, Suspense, useEffect, useMemo } from 'react'
import { CCard, CCardBody, CCol, CCardHeader, CRow } from '@coreui/react'
import useWebSocketStore from '../../store/websocketStore'

const MiniPriceCryptoChart = lazy(() => import('src/components/charts/minicharts/MiniPriceCryptoChart'))
const MiniPriceCommoditiesChart = lazy(() => import('src/components/charts/minicharts/MiniPriceCommoditiesChart'))
const MiniPriceStocksEtfChart = lazy(() => import('src/components/charts/minicharts/MiniPriceStocksEtfChart'))

const groupDefs = [
  {
    title: 'Crypto (선택 목록)',
    items: ['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'BNB', 'SOL', 'DOGE', 'TRX', 'ADA'],
    comp: MiniPriceCryptoChart
  },
  {
    title: 'US Stocks Top 8',
    items: ['AAPL', 'MSFT', 'NVDA', 'GOOG', 'AMZN', 'META', 'NFLX', 'AVGO','SPY','QQQ'],
    comp: MiniPriceStocksEtfChart
  },
  {
    title: 'Commodities (Gold & Silver)',
    items: ['GCUSD', 'SIUSD'],
    comp: MiniPriceCommoditiesChart
  }
]

const Charts = () => {
  // 구독 대상 심볼 목록
  const allSymbols = useMemo(() => groupDefs.flatMap((g) => g.items), [])

  // WebSocket 연결 상태
  const connected = useWebSocketStore((state) => state.connected)

  // 초기 연결 및 구독 (Test01/MainDashboard 스타일)
  useEffect(() => {
    const { connect, subscribeSymbols } = useWebSocketStore.getState()
    if (allSymbols.length > 0) {
      console.log('[Charts] Initializing WebSocket for symbols:', allSymbols)
      connect()
      subscribeSymbols(allSymbols)
    }
  }, [allSymbols])

  // 연결되면 재구독 보장
  useEffect(() => {
    if (connected) {
      const { subscribeSymbols } = useWebSocketStore.getState()
      console.log('[Charts] Connected. Ensuring subscriptions:', allSymbols)
      subscribeSymbols(allSymbols)
    }
  }, [connected, allSymbols])

  // 연결 끊기면 재시도
  useEffect(() => {
    if (!connected && allSymbols.length > 0) {
      const { connect, subscribeSymbols } = useWebSocketStore.getState()
      console.log('[Charts] Disconnected. Scheduling reconnect...')
      const t = setTimeout(() => {
        connect()
        setTimeout(() => subscribeSymbols(allSymbols), 1000)
      }, 3000)
      return () => clearTimeout(t)
    }
  }, [connected, allSymbols])

  return (
    <CRow>
      {groupDefs.map((g) => (
        <CCol xs={12} key={g.title}>
          <CCard className="mb-4">
            <CCardHeader>{g.title}</CCardHeader>
            <CCardBody>
              <CRow>
                {g.items.map((symbol, idx) => (
                  <CCol xs={12} md={6} key={`${g.title}-${symbol}-${idx}`} className="mb-4">
                    <Suspense fallback={<div style={{ height: '300px' }} className="d-flex align-items-center justify-content-center">Loading {symbol}...</div>}>
                      <g.comp assetIdentifier={symbol} />
                    </Suspense>
                  </CCol>
                ))}
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>
      ))}
    </CRow>
  )
}

export default Charts
