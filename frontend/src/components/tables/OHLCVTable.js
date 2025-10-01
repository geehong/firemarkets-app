import React from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'

/**
 * OHLCV 데이터 테이블 컴포넌트
 */
const OHLCVTable = ({ assetId, height = 500 }) => {
  return (
    <div className="tab-pane active">
      <CCard>
        <CCardHeader>
          <h5>Historical Price Data</h5>
        </CCardHeader>
        <CCardBody>
          <div className="alert alert-info">
            <h6>OHLCV Data Table</h6>
            <p>Historical price data for asset: {assetId}</p>
            <p>This table will display Open, High, Low, Close, Volume data.</p>
            <p>Data is currently being processed and will be available soon.</p>
          </div>
        </CCardBody>
      </CCard>
    </div>
  )
}

export default OHLCVTable
