import React from 'react'
import { CButton, CButtonGroup } from '@coreui/react'

const OnChainActions = ({
  onCollect,
  onStop,
  onRefresh,
  onExport,
  onImport,
  isCollecting = false,
  isStopping = false,
}) => {
  return (
    <div className="d-flex justify-content-between align-items-center">
      <CButtonGroup>
        <CButton color="primary" onClick={onCollect} disabled={isCollecting}>
          {isCollecting ? 'Collecting...' : 'Collect On-Chain Data'}
        </CButton>

        <CButton color="danger" onClick={onStop} disabled={isStopping || !isCollecting}>
          {isStopping ? 'Stopping...' : 'Stop Collection'}
        </CButton>

        <CButton color="info" onClick={onRefresh}>
          Refresh Data
        </CButton>
      </CButtonGroup>

      <CButtonGroup>
        <CButton color="outline-primary" onClick={onExport}>
          Export Data
        </CButton>

        <CButton color="outline-secondary" onClick={onImport}>
          Import Data
        </CButton>
      </CButtonGroup>
    </div>
  )
}

export default OnChainActions
