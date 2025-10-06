import React, { Suspense } from 'react'
import { CContainer, CRow, CCol, CCard, CCardBody } from '@coreui/react'
// import MiniPriceChartTest from 'src/components/charts/minicharts/MiniPriceChart_test'
import OHLCVChart from 'src/components/charts/ohlcvchart/OHLCVChart'
import OnChainChart from 'src/components/charts/onchainchart/OnChainChart'
import HalvingChart from 'src/components/charts/onchainchart/HalvingChart'

const Test02 = () => {

  return (
    <CContainer fluid>
      <h2 className="mb-4">정적 미니 차트 (API 시계열만, 실시간 없음)</h2>
      <CRow className="g-3">
        {/* 미니 차트 목록 주석 처리
        {symbols.map((symbol, idx) => (
          <CCol xs={12} md={6} lg={6} key={`${symbol}-${idx}`}>
            <CCard>
              <CCardBody className="p-2">
                <div style={{ height: '300px', width: '100%' }}>
                  <Suspense fallback={<div className="d-flex align-items-center justify-content-center h-100">Loading {symbol}...</div>}>
                    <MiniPriceChartTest assetIdentifier={symbol} containerId={`mini-chart-test-${symbol}-${idx}`} />
                  </Suspense>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        ))}
        */}
        <CCol xs={12}>
          <CCard>
            <CCardBody className="p-2">
              <div style={{ height: '600px', width: '100%' }}>
                <Suspense fallback={<div className="d-flex align-items-center justify-content-center h-100">Loading BTCUSDT...</div>}>
                  <OHLCVChart assetIdentifier="BTCUSDT" height={600} />
                </Suspense>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={12}>
          <CCard>
            <CCardBody className="p-2">
              <div style={{ height: '600px', width: '100%' }}>
                <Suspense fallback={<div className="d-flex align-items-center justify-content-center h-100">Loading On-Chain (MVRV Z-Score)...</div>}>
                  <OnChainChart assetId="BTCUSDT" title="On-Chain: MVRV Z-Score" height={600} useIntegratedData={true} metrics={["mvrv_z_score"]} />
                </Suspense>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={12}>
          <CCard>
            <CCardBody className="p-2">
              <div style={{ height: '800px', width: '100%' }}>
                <Suspense fallback={<div className="d-flex align-items-center justify-content-center h-100">Loading Halving Chart...</div>}>
                  <HalvingChart title="Bitcoin Halving Price Analysis" height={800} />
                </Suspense>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  )
}

export default Test02


