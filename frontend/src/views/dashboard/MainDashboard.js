import React, { useMemo, useState, useEffect, lazy, Suspense } from 'react'
import { CRow, CCol, CCard, CCardHeader, CCardBody, CCardTitle } from '@coreui/react'
import { useDelaySparklinePg } from 'src/hooks/useRealtime'
import { useRealtimePricesWebSocket } from 'src/hooks/useWebSocket'
import useWebSocketStore from 'src/store/websocketStore'

// 지연 로딩으로 번들 크기 감소 (TreeMap은 모듈 의존성 때문에 즉시 로드)
import { PerformanceTreeMapToday } from 'src/components/charts/threemap'
const DefaultChart = lazy(() => import('src/components/charts/defaultchart/DefaultChart'))
const HistoryTableDefault = lazy(() => import('src/components/tables/HistoryTableDefault'))
const RealTimeWidgetsTypeA = lazy(() => import('src/components/widgets/RealTimeWidgetsTypeA'))
const MiniPriceChart = lazy(() => import('src/components/charts/MiniPriceChart'))

const MainDashboard = () => {
  const [isUSMarketOpen, setIsUSMarketOpen] = useState(false);

  // 한국시간 기준 미국 주식/ETF 개장시간 체크
  useEffect(() => {
    const checkMarketStatus = () => {
      const now = new Date();
      const kstTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
      const hour = kstTime.getHours();
      const day = kstTime.getDay(); // 0=일요일, 6=토요일

      // 주말(토, 일)은 폐장
      if (day === 0 || day === 6) {
        setIsUSMarketOpen(false);
        return;
      }
      // 평일: 한국시간 22:30 ~ 05:00 (미국 동부시간 09:30 ~ 16:00)
      setIsUSMarketOpen((hour === 22 && kstTime.getMinutes() >= 30) || hour >= 23 || hour < 5);
    };

    checkMarketStatus();
    const interval = setInterval(checkMarketStatus, 60000); // 1분마다 시장 상태 체크
    return () => clearInterval(interval);
  }, []);

  // 차트 그룹별 심볼 정의
  const chartGroups = useMemo(() => {
    if (isUSMarketOpen) {
      // 미국 시장 개장시간: 전체 차트 표시
      return [
        {
          title: 'Cryptocurrency',
          symbols: ['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'ADAUSDT']
        },
        {
          title: 'Technology Stocks',
          symbols: ['AVGO', 'TSLA', 'AAPL', 'MSFT']
        },
        {
          title: 'Growth Stocks',
          symbols: ['AMZN', 'NVDA', 'GOOG', 'META']
        },
        {
          title: 'ETFs',
          symbols: ['SPY', 'QQQ']
        }
      ];
    } else {
      // 미국 시장 폐장시간: 코인 상위 6개만 표시
      return [
        {
          title: 'Top Cryptocurrencies',
          symbols: ['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'ADAUSDT', 'SOL', 'BNB']
        }
      ];
    }
  }, [isUSMarketOpen]);

  // --- 데이터 중앙집중식 요청 ---
  // 1. 모든 심볼 목록을 한 번에 계산
  const allSymbols = useMemo(() => 
    Array.from(new Set(chartGroups.flatMap(g => g.symbols))), 
    [chartGroups]
  );

  // 2. 모든 심볼에 대한 과거 데이터를 단일 API 호출로 가져오기
  const { data: delayData, isLoading: isDelayDataLoading } = useDelaySparklinePg(allSymbols, '15m', 1);
  
  // 3. 모든 심볼에 대한 실시간 데이터를 단일 WebSocket 구독으로 가져오기
  const { prices: wsPrices, connected: wsConnected } = useRealtimePricesWebSocket(allSymbols);
  
  // WebSocket 연결 강제 시작
  useEffect(() => {
    if (allSymbols.length > 0) {
      // WebSocket 스토어에서 연결 시작
      const { connect } = useWebSocketStore.getState();
      connect();
    }
  }, [allSymbols]);
  
  // 웹소켓 데이터 로깅
  useEffect(() => {
    // console.log('[MainDashboard] === WebSocket Status ===')
    // console.log('[MainDashboard] wsConnected:', wsConnected)
    // console.log('[MainDashboard] wsPrices:', wsPrices)
    
    // if (wsConnected) {
    //   console.log('[MainDashboard] ✅ WebSocket Connected')
    // } else {
    //   console.log('[MainDashboard] ❌ WebSocket Disconnected')
    // }
    
    // if (wsPrices && Object.keys(wsPrices).length > 0) {
    //   console.log('[MainDashboard] 🚀 WebSocket Data Received:', Object.keys(wsPrices))
    // } else {
    //   console.log('[MainDashboard] ⚠️ No WebSocket Data')
    // }
  }, [wsPrices, wsConnected])

  return (
    <>
      {/* 시장 상태에 따른 차트 표시 */}
      <CCard className="mb-4">
        <CCardHeader>
          <CCardTitle className="card-title">
            {isUSMarketOpen ? 'Real-time Price Charts (US Market Open)' : 'Top Cryptocurrencies (US Market Closed)'}
          </CCardTitle>
        </CCardHeader>
        <CCardBody style={{ padding: '8px' }}>
          <CRow>
            {chartGroups.flatMap((group, groupIndex) => 
              group.symbols.map((symbol, index) => (
                <CCol 
                  key={`${group.title}-${symbol}-${index}`} 
                  xs={12} sm={12} md={6} lg={6} xl={6} 
                  className="mb-3"
                >
                  <div style={{ height: '300px', minHeight: '300px', width: '100%' }}>
                    <Suspense fallback={<div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading {symbol} chart...</div>}>
                      <MiniPriceChart 
                        assetIdentifier={symbol} 
                        delayData={delayData?.[symbol]} // 개별 심볼 데이터 전달
                        wsPrices={wsPrices} // 전체 실시간 가격 객체 전달
                      />
                    </Suspense>
                  </div>
                </CCol>
              ))
            )}
          </CRow>
        </CCardBody>
      </CCard>

      {/* Real-time Widgets */}
      <Suspense fallback={<div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Real-time Widgets...</div>}>
        <RealTimeWidgetsTypeA />
      </Suspense>

      {/* Performance TreeMap */}
      <div className="card mb-4">
        <div className="card-body">
          <PerformanceTreeMapToday />
        </div>
      </div>

      {/* Default Chart */}
      <Suspense fallback={<div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Chart...</div>}>
        <DefaultChart />
      </Suspense>
      
      {/* History Table */}
      <Suspense fallback={<div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Table...</div>}>
        <HistoryTableDefault />
      </Suspense>
    </>
  )
}

export default MainDashboard
