import React from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'

/**
 * 추정 데이터 탭 컴포넌트 (주식 전용)
 */
const EstimatesTab = ({ asset, cryptoData }) => {
  return (
    <div className="tab-pane active">
      <div className="alert alert-info">
        <h5>Estimates Data</h5>
        <p>This tab will display analyst estimates and forecasts for {asset?.name || 'this asset'}.</p>
        <p>Estimates data is currently being processed and will be available soon.</p>
      </div>
    </div>
  )
}

export default EstimatesTab
