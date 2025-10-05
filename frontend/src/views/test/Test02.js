import React, { useMemo, Suspense } from 'react'
import { CContainer, CRow, CCol, CCard, CCardBody } from '@coreui/react'
import MiniPriceChartTest from 'src/components/charts/minicharts/MiniPriceChart_test'

const Test02 = () => {
  // Test01과 동일한 티커 목록
  const symbols = useMemo(() => [
    'BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'BNB', 'SOL', 'USDC', 'DOGEUSDT', 'TRX', 
    'ADAUSDT', 'LINK', 'AVAX', 'WBTC', 'XLM', 'BCHUSDT', 'HBAR', 'LTCUSDT', 
    'CRO', 'SHIB', 'TON', 'DOTUSDT'
  ], [])

  return (
    <CContainer fluid>
      <h2 className="mb-4">정적 미니 차트 (API 시계열만, 실시간 없음)</h2>
      <CRow className="g-3">
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
      </CRow>
    </CContainer>
  )
}

export default Test02


