import React from 'react'
import { CCard, CCardHeader, CCardBody, CCardTitle, CBadge } from '@coreui/react'

const OnChainLogs = ({ logs = [], maxHeight = '400px' }) => {
  const getLogLevelColor = (level) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'danger'
      case 'warning':
        return 'warning'
      case 'info':
        return 'info'
      case 'success':
        return 'success'
      default:
        return 'secondary'
    }
  }

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <CCard>
      <CCardHeader>
        <CCardTitle className="d-flex justify-content-between align-items-center">
          <span>On-Chain Data Collection Logs</span>
          <CBadge color="secondary">{logs.length} entries</CBadge>
        </CCardTitle>
      </CCardHeader>
      <CCardBody>
        <div
          className="border rounded p-3"
          style={{
            maxHeight,
            overflowY: 'auto',
            backgroundColor: '#f8f9fa',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
          }}
        >
          {logs.length === 0 ? (
            <div className="text-muted text-center py-4">No logs available</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-2">
                <div className="d-flex align-items-start">
                  <CBadge
                    color={getLogLevelColor(log.level)}
                    className="me-2 mt-1"
                    style={{ minWidth: '60px' }}
                  >
                    {log.level.toUpperCase()}
                  </CBadge>

                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">{formatTimestamp(log.timestamp)}</span>
                      {log.metric && <span className="text-info">[{log.metric}]</span>}
                    </div>

                    <div className="mt-1">{log.message}</div>

                    {log.details && <div className="text-muted small mt-1">{log.details}</div>}
                  </div>
                </div>

                {index < logs.length - 1 && (
                  <hr className="my-2" style={{ borderColor: '#dee2e6' }} />
                )}
              </div>
            ))
          )}
        </div>
      </CCardBody>
    </CCard>
  )
}

export default OnChainLogs
