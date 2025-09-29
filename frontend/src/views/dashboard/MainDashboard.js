import React, { useMemo, useState, useEffect } from 'react'
import { CRow, CCol, CCard, CCardHeader, CCardBody, CCardTitle } from '@coreui/react'
import DefaultChart from 'src/components/charts/defaultchart/DefaultChart'
import HistoryTableDefault from 'src/components/tables/HistoryTableDefault'
import { PerformanceTreeMapToday } from 'src/components/charts/threemap'
import RealTimeWidgetsTypeA from 'src/components/widgets/RealTimeWidgetsTypeA'
import MiniPriceChart from 'src/components/charts/MiniPriceChart'

const MainDashboard = () => {
  const chartGroups = [
    { name: 'crypto', symbols: ['BTCUSDT', 'ETHUSDT'], interval: 10000, delay: 0 },
    { name: 'crypto2', symbols: ['XRPUSDT', 'ADAUSDT'], interval: 10000, delay: 1000 },
    { name: 'commodity', symbols: ['GCUSD', 'GCUSD'], interval: 10000, delay: 2000 },
    { name: 'stock1', symbols: ['AAPL', 'MSFT'], interval: 10000, delay: 3000 },
    { name: 'stock2', symbols: ['AMZN', 'NVDA'], interval: 10000, delay: 4000 },
    { name: 'stock3', symbols: ['GOOG', 'META'], interval: 10000, delay: 5000 },
    { name: 'stock4', symbols: ['AVGO', 'TSLA'], interval: 10000, delay: 6000 },
    { name: 'etf', symbols: ['SPY', 'QQQ'], interval: 10000, delay: 7000 },
  ]

  const [groupIndices, setGroupIndices] = useState({})

  useEffect(() => {
    const timers = []
    chartGroups.forEach((group, idx) => {
      const startTimer = setTimeout(() => {
        setGroupIndices((prev) => ({ ...prev, [idx]: 1 }))
        const intervalTimer = setInterval(() => {
          setGroupIndices((prev) => ({ ...prev, [idx]: (prev[idx] || 0) === 0 ? 1 : 0 }))
        }, group.interval)
        timers.push(intervalTimer)
      }, group.delay)
      timers.push(startTimer)
    })
    return () => {
      timers.forEach((t) => {
        clearTimeout(t)
        clearInterval(t)
      })
    }
  }, [])

  const currentSymbols = useMemo(
    () => chartGroups.map((g, gi) => g.symbols[groupIndices[gi] || 0]).filter(Boolean),
    [groupIndices]
  )

  return (
    <>
      <CCard className="mb-4">
        <CCardHeader>
          <CCardTitle className="card-title">Real-time Price Charts</CCardTitle>
        </CCardHeader>
        <CCardBody style={{ padding: '8px' }}>
          <CRow>
            {currentSymbols.map((symbol, index) => {
              const groupIndex = chartGroups.findIndex((g) => g.symbols.includes(symbol))
              const key = `${groupIndex}-${symbol}-${index}`
              return (
                <CCol key={key} xs={12} sm={6} md={6} lg={6} xl={6} className="mb-3">
                  <div style={{ height: '300px', minHeight: '300px', width: '100%' }}>
                    <MiniPriceChart assetIdentifier={symbol} />
                  </div>
                </CCol>
              )
            })}
          </CRow>
        </CCardBody>
      </CCard>

      <div className="card mb-4">
        <div className="card-body">
          <PerformanceTreeMapToday />
        </div>
      </div>

      <CCard className="mb-4">
        <CCardHeader>
          <CCardTitle className="card-title">Real-time Widgets</CCardTitle>
        </CCardHeader>
        <CCardBody>
          <RealTimeWidgetsTypeA symbols={currentSymbols} />
        </CCardBody>
      </CCard>

      <DefaultChart />
      <HistoryTableDefault />
    </>
  )
}

export default MainDashboard
