import React from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CCardTitle,
  CBadge,
} from '@coreui/react'
import CardTools from '../../common/CardTools'

const RealTimeLogs = ({ logs, collapsedCards, onCardCollapse, onRefresh, stopDetails }) => {
  // derive last stop info from props or logs
  const lastStop = (() => {
    if (stopDetails && (stopDetails.reason || stopDetails.message)) return stopDetails
    if (!Array.isArray(logs)) return null
    // find last log that hints stop
    const stopIdx = [...logs].reverse().findIndex(
      (l) =>
        (l.level && l.level.toLowerCase() === 'error') ||
        (typeof l.message === 'string' && /stopp?ed|stop\s?reason|realtime collectors stopped/i.test(l.message)),
    )
    if (stopIdx === -1) return null
    const log = logs[logs.length - 1 - stopIdx]
    return {
      timestamp: log.timestamp,
      reason: log.error || undefined,
      message: log.message,
    }
  })()
  return (
    <CCard className={`mb-4 ${collapsedCards['realtime-logs'] ? 'collapsed' : ''}`}>
      <CCardHeader>
        <CCardTitle>Real-time Logs</CCardTitle>
        <CardTools
          onCollapse={(collapsed) => onCardCollapse('realtime-logs', collapsed)}
          onAction={(action) => {
            if (action === 'refresh') {
              onRefresh()
            }
          }}
          showCollapse={true}
          showRemove={false}
          showDropdown={false}
          showRefresh={true}
          showExport={false}
        />
      </CCardHeader>
      <CCardBody>
        {lastStop && (
          <div className="alert alert-warning d-flex justify-content-between align-items-start" role="alert">
            <div>
              <div className="fw-semibold">Realtime stopped</div>
              <div className="small text-muted">
                {lastStop.timestamp ? new Date(lastStop.timestamp).toLocaleString() + ' · ' : ''}
                {lastStop.reason || lastStop.message || 'Unknown reason'}
              </div>
            </div>
            <CBadge color="warning">Stopped</CBadge>
          </div>
        )}
        <div
          className="border rounded p-3"
          style={{
            maxHeight: '200px',
            overflowY: 'auto',
            backgroundColor: '#f8f9fa',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
          }}
        >
          {logs.length === 0 ? (
            <div className="text-muted text-center py-4">No real-time logs available</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-2">
                <div className="d-flex align-items-start">
                  <CBadge
                    color={
                      log.level === 'error'
                        ? 'danger'
                        : log.level === 'success'
                          ? 'success'
                          : 'info'
                    }
                    className="me-2 mt-1"
                    style={{ minWidth: '60px' }}
                  >
                    {log.level?.toUpperCase() || 'INFO'}
                  </CBadge>

                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="mt-1">{log.message}</div>
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

export default RealTimeLogs 