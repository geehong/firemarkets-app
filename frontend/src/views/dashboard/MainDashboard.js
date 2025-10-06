import React, { lazy, Suspense, useEffect, useState } from 'react'
import { CRow, CCol, CCard, CCardHeader, CCardBody, CCardTitle } from '@coreui/react'
import useWebSocketStore from '../../store/websocketStore'

// 지연 로딩으로 번들 크기 감소 (TreeMap은 모듈 의존성 때문에 즉시 로드)
import { PerformanceTreeMapToday } from 'src/components/charts/threemap'
const DefaultChart = lazy(() => import('src/components/charts/defaultchart/DefaultChart'))
const HistoryTableDefault = lazy(() => import('src/components/tables/HistoryTableDefault'))
const RealTimeWidgetsTypeA = lazy(() => import('src/components/widgets/RealTimeWidgetsTypeA'))

// 미니차트 매니저
const MiniPriceChartManage = lazy(() => import('src/components/charts/minicharts/MiniPriceChartManage'))

// MainDashboard에서는 매니저가 모든 심볼 관리 및 구독을 처리하므로 별도 심볼 정의 불필요

const MainDashboard = () => {
  // 모바일 전용 UI 설정 제거: 고정 레이아웃 사용

  // WebSocket 연결 상태 가져오기
  const connected = useWebSocketStore((state) => state.connected);
  const loading = useWebSocketStore((state) => state.loading);
  const error = useWebSocketStore((state) => state.error);

  // 모바일 여부 감지 (뷰포트 기준)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // MainDashboard는 연결/구독을 직접 다루지 않음 (매니저가 담당)

  return (
    <>
      {/* WebSocket 연결 상태 표시 */}
      {/* <div className="mb-3">
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-secondary">WebSocket 상태:</span>
          <span className={`badge ${connected ? 'bg-success' : 'bg-danger'}`}>
            {connected ? '연결됨' : '연결 끊김'}
          </span>
          {loading && <span className="badge bg-warning">로딩 중...</span>}
          {error && <span className="badge bg-danger">에러: {error}</span>}
        </div>
      </div> */}


      {/* 시장 상태에 따른 차트 표시 */}
      <div className="card mb-4">
        <div className="card-body">
          <Suspense fallback={<div style={{ height: '300px' }} className="d-flex align-items-center justify-content-center">Loading mini charts...</div>}>
            <MiniPriceChartManage showTopLeaders />
          </Suspense>
        </div>
      </div>

      {/* Real-time Widgets */}
      {/* <Suspense fallback={<div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Real-time Widgets...</div>}>
        <RealTimeWidgetsTypeA />
      </Suspense> */}

      {/* Performance TreeMap */}
      <div className="card mb-4">
        <div className="card-body p-0">
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
