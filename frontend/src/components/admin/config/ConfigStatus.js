import React from 'react'
import { CAlert, CSpinner, CBadge } from '@coreui/react'

const ConfigStatus = ({ status, message, isLoading = false, lastUpdated }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'success'
      case 'error':
        return 'danger'
      case 'warning':
        return 'warning'
      case 'info':
        return 'info'
      default:
        return 'secondary'
    }
  }

  if (isLoading) {
    return (
      <CAlert color="info" className="d-flex align-items-center">
        <CSpinner size="sm" className="me-2" />
        Loading configuration...
      </CAlert>
    )
  }

  if (!status && !message) {
    return null
  }

  return (
    <div className="mb-3">
      {status && (
        <CAlert color={getStatusColor(status)}>
          <div className="d-flex justify-content-between align-items-center">
            <span>{message || `Status: ${status}`}</span>
            <CBadge color={getStatusColor(status)}>{status.toUpperCase()}</CBadge>
          </div>
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

export default ConfigStatus
