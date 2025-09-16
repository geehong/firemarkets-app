import React from 'react'
import { CCard, CCardBody, CCardHeader, CButton, CListGroup, CListGroupItem } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilTrash, cilReload } from '@coreui/icons'

const ExecutionLogs = ({ logs, onClearLogs, onRefresh }) => {
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getLogIcon = (type) => {
    switch (type) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      default:
        return '📝'
    }
  }

  const getLogColor = (type) => {
    switch (type) {
      case 'success':
        return 'success'
      case 'error':
        return 'danger'
      case 'warning':
        return 'warning'
      case 'info':
        return 'info'
      default:
        return 'primary'
    }
  }

  return (
    <CCard className="mb-3">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <h6 className="mb-0">실행 로그 ({logs.length}개)</h6>
        <div>
          <CButton color="info" size="sm" className="me-2" onClick={onRefresh}>
            <CIcon icon={cilReload} className="me-1" />
            새로고침
          </CButton>
          <CButton color="danger" size="sm" onClick={onClearLogs} disabled={logs.length === 0}>
            <CIcon icon={cilTrash} className="me-1" />
            로그 지우기
          </CButton>
        </div>
      </CCardHeader>
      <CCardBody className="p-0">
        {logs.length === 0 ? (
          <div className="text-center p-4 text-muted">실행 로그가 없습니다.</div>
        ) : (
          <CListGroup flush style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {logs.map((log) => (
              <CListGroupItem
                key={log.id}
                className={`border-0 border-bottom ${getLogColor(log.type)}-subtle`}
              >
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center mb-1">
                      <span className="me-2">{getLogIcon(log.type)}</span>
                      <strong className={`text-${getLogColor(log.type)}`}>
                        {log.title || log.message}
                      </strong>
                    </div>
                    {log.details && <div className="text-muted small ms-4 mb-1">{log.details}</div>}
                    {log.ticker && (
                      <div className="text-muted small ms-4">
                        티커: <strong>{log.ticker}</strong>
                      </div>
                    )}
                  </div>
                  <div className="text-muted small ms-2">{formatTimestamp(log.timestamp)}</div>
                </div>
              </CListGroupItem>
            ))}
          </CListGroup>
        )}
      </CCardBody>
    </CCard>
  )
}

export default ExecutionLogs
