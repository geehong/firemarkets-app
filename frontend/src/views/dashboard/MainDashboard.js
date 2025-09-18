import React, { useState, useEffect } from 'react'
import { CRow, CCol, CCard, CCardHeader, CCardBody, CCardTitle } from '@coreui/react'
import DashboardChart from 'src/components/charts/DashboardChart'
import DashboardTable from 'src/components/tables/DashboardTable'
import { PerformanceTreeMapToday } from 'src/components/charts/threemap'
import RealTimeWidgetsTypeA from 'src/components/widgets/RealTimeWidgetsTypeA'
import MiniPriceChartPgSql from 'src/components/charts/MiniPriceChartPgSql'
 

const MainDashboard = () => {
  // 차트 그룹 정의 (그룹별로 다른 딜레이) - 티커 사용
  const chartGroups = [
    { name: 'crypto', symbols: ['BTCUSDT', 'ETHUSDT'], interval: 10000, delay: 0 }, // 0초 후 시작
    { name: 'crypto2', symbols: ['XRPUSDT', 'ADAUSDT'], interval: 10000, delay: 1000 }, // 1초 후 시작
    { name: 'commodity', symbols: ['GCUSD', 'GCUSD'], interval: 10000, delay: 2000 }, // 2초 후 시작 (금만 사용)
    { name: 'stock1', symbols: ['AAPL', 'MSFT'], interval: 10000, delay: 3000 }, // 3초 후 시작
    { name: 'stock2', symbols: ['AMZN', 'NVDA'], interval: 10000, delay: 4000 }, // 4초 후 시작
    { name: 'stock3', symbols: ['GOOG', 'META'], interval: 10000, delay: 5000 }, // 5초 후 시작
    { name: 'stock4', symbols: ['AVGO', 'TSLA'], interval: 10000, delay: 6000 }, // 6초 후 시작
    { name: 'etf', symbols: ['SPY', 'QQQ'], interval: 10000, delay: 7000 } // 7초 후 시작
  ]

  // 각 그룹의 현재 표시 인덱스 상태
  const [groupIndices, setGroupIndices] = useState({})

  // 그룹별 타이머 설정 (딜레이 적용)
  useEffect(() => {
    const allTimers = []

    chartGroups.forEach((group, groupIndex) => {
      // 각 그룹마다 다른 딜레이로 시작
      const startTimer = setTimeout(() => {
        // 첫 번째 전환
        setGroupIndices(prev => ({
          ...prev,
          [groupIndex]: 1
        }))
        
        // 이후 주기적으로 전환
        const intervalTimer = setInterval(() => {
          setGroupIndices(prev => ({
            ...prev,
            [groupIndex]: (prev[groupIndex] || 0) === 0 ? 1 : 0
          }))
        }, group.interval)
        
        allTimers.push(intervalTimer)
      }, group.delay)
      
      allTimers.push(startTimer)
    })

    return () => {
      allTimers.forEach(timer => {
        if (timer) {
          clearTimeout(timer)
          clearInterval(timer)
        }
      })
    }
  }, [])


  // 현재 표시할 심볼들을 계산
  const getCurrentSymbols = () => {
    return chartGroups.map((group, groupIndex) => {
      const currentIndex = groupIndices[groupIndex] || 0
      return group.symbols[currentIndex]
    }).filter(symbol => symbol) // undefined 제거
  }

  const currentSymbols = getCurrentSymbols()

  return (
    <>
      <CCard className="mb-4">
        <CCardHeader>
          <CCardTitle className="card-title">Real-time Price Charts</CCardTitle>
        </CCardHeader>
        <CCardBody style={{ padding: '8px' }}>
          <CRow>
            {currentSymbols.map((symbol, index) => {
              // 티커를 기반으로 고유한 key 생성
              const groupIndex = chartGroups.findIndex(group => 
                group.symbols.includes(symbol)
              )
              const uniqueKey = `${groupIndex}-${symbol}-${index}`
              
              return (
                <CCol key={uniqueKey} xs={12} sm={6} md={6} lg={6} xl={6} className="mb-3">
                  <div style={{ 
                    height: '300px',
                    minHeight: '300px',
                    width: '100%'
                  }}>
                    <MiniPriceChartPgSql assetIdentifier={symbol} />
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
      <DashboardChart />
      <DashboardTable />
    </>
  )
}

export default MainDashboard
