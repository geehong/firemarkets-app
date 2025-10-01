import React from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'

/**
 * 재무 데이터 탭 컴포넌트 (주식 전용)
 */
const FinancialsTab = ({ asset, cryptoData }) => {
  return (
    <div className="tab-pane active">
      <div className="alert alert-info">
        <h5>Financials Data</h5>
        <p>This tab will display detailed financial information for {asset?.name || 'this asset'}.</p>
        <p>Financial data is currently being processed and will be available soon.</p>
      </div>
    </div>
  )
}

export default FinancialsTab
