import React from 'react'
import { CAlert, CSpinner, CBadge, CProgress } from '@coreui/react'

const OnChainStatus = ({
  status,
  message,
  isLoading = false,
  progress = null,
  lastUpdated,
  totalCollected = 0,
  totalAvailable = 0,
}) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'collecting':
        return 'info'
      case 'completed':
        return 'success'
      case 'error':
        return 'danger'
      case 'warning':
        return 'warning'
      default:
        return 'secondary'
    }
  }

  if (isLoading) {
    return (
      <CAlert color="info" className="d-flex align-items-center">
        <CSpinner size="sm" className="me-2" />
        Loading on-chain data...
      </CAlert>
    )
  }

  return (
    <div className="mb-3">
      {status && (
        <CAlert color={getStatusColor(status)}>
          <div className="d-flex justify-content-between align-items-center">
            <span>{message || `Status: ${status}`}</span>
            <CBadge color={getStatusColor(status)}>{status.toUpperCase()}</CBadge>
          </div>

          {progress !== null && (
            <div className="mt-2">
              <CProgress value={progress} className="mb-1" color={getStatusColor(status)} />
              <small className="text-muted">{progress}% Complete</small>
            </div>
          )}

          {totalCollected > 0 && totalAvailable > 0 && (
            <div className="mt-2">
              <small className="text-muted">
                Collected: {totalCollected} / {totalAvailable} metrics
              </small>
            </div>
          )}
        </CAlert>
      )}

      {lastUpdated && (
        <div className="text-muted small">
          Last updated: {new Date(lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  )
}

export default OnChainStatus
