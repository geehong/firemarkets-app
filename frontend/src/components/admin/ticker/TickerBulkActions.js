import React from 'react'
import { CButton, CCard, CCardBody, CRow, CCol } from '@coreui/react'

const TickerBulkActions = ({
  onBulkExecute,
  onBulkDelete,
  onBulkRefresh,
  onStopExecution,
  isExecuting,
  executionProgress,
  totalTickers,
  assetType,
}) => {
  return (
    <CCard className="mb-3">
      <CCardBody>
        <CRow className="align-items-center">
          <CCol>
            <h6 className="mb-0">
              대량 작업 ({totalTickers}개 티커)
              {isExecuting && (
                <span className="ms-2 text-primary">
                  실행 중... {executionProgress.current}/{executionProgress.total}
                  {executionProgress.currentTicker && ` (${executionProgress.currentTicker})`}
                </span>
              )}
            </h6>
          </CCol>
          <CCol className="text-end">
            <CButton
              color="success"
              size="sm"
              className="me-2"
              onClick={() => onBulkExecute('all')}
              disabled={isExecuting}
            >
              ▶ 전체 실행
            </CButton>
            <CButton
              color="info"
              size="sm"
              className="me-2"
              onClick={() => onBulkExecute(assetType)}
              disabled={isExecuting}
            >
              ▶ {assetType} 실행
            </CButton>

            {isExecuting ? (
              <CButton color="danger" size="sm" className="me-2" onClick={onStopExecution}>
                ⏹ 중지
              </CButton>
            ) : (
              <CButton color="warning" size="sm" className="me-2" onClick={onBulkRefresh}>
                ↻ 새로고침
              </CButton>
            )}
            <CButton color="danger" size="sm" onClick={onBulkDelete} disabled={isExecuting}>
              🗑 전체 삭제
            </CButton>
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

export default TickerBulkActions
