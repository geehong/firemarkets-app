import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CCardTitle,
  CBadge,
  CButton,
  CFormInput,
} from '@coreui/react'
import { cilReload, cilTrash, cilCloudDownload } from '@coreui/icons'
import CIcon from '@coreui/icons-react'

const ExecutionLogs = ({
  logs = [],
  maxHeight = '400px',
  title = 'Execution Logs',
  onRefresh,
  onClear,
  onExport,
  showControls = true,
  autoScroll = true,
}) => {
  const [filteredLogs, setFilteredLogs] = useState(logs)
  const [searchTerm, setSearchTerm] = useState('')
  const [logLevel, setLogLevel] = useState('all')

  useEffect(() => {
    setFilteredLogs(logs)
  }, [logs])

  useEffect(() => {
    let filtered = logs

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.metric?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.level?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // 로그 레벨 필터링
    if (logLevel !== 'all') {
      filtered = filtered.filter((log) => log.level === logLevel)
    }

    setFilteredLogs(filtered)
  }, [logs, searchTerm, logLevel])

  const getLogLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'error':
        return 'danger'
      case 'warning':
        return 'warning'
      case 'info':
        return 'info'
      case 'success':
        return 'success'
      case 'debug':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleString()
  }

  const handleExport = () => {
    if (onExport) {
      onExport(filteredLogs)
    } else {
      const data = {
        logs: filteredLogs,
        exportedAt: new Date().toISOString(),
        totalLogs: filteredLogs.length,
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `execution-logs-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleClear = () => {
    if (onClear) {
      onClear()
    }
  }

  return (
    <CCard>
      <CCardHeader>
        <CCardTitle className="d-flex justify-content-between align-items-center">
          <span>{title}</span>
          <div className="d-flex align-items-center gap-2">
            <CBadge color="secondary">{filteredLogs.length} entries</CBadge>
            {showControls && (
              <div className="d-flex gap-1">
                <CButton size="sm" color="outline-primary" onClick={onRefresh} title="Refresh logs">
                  <CIcon icon={cilReload} size="sm" />
                </CButton>
                <CButton
                  size="sm"
                  color="outline-success"
                  onClick={handleExport}
                  title="Export logs"
                >
                  <CIcon icon={cilCloudDownload} size="sm" />
                </CButton>
                <CButton size="sm" color="outline-danger" onClick={handleClear} title="Clear logs">
                  <CIcon icon={cilTrash} size="sm" />
                </CButton>
              </div>
            )}
          </div>
        </CCardTitle>
      </CCardHeader>
      <CCardBody>
        {/* 필터 컨트롤 */}
        <div className="row mb-3">
          <div className="col-md-6">
            <CFormInput
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="sm"
            />
          </div>
          <div className="col-md-3">
            <select
              className="form-select form-select-sm"
              value={logLevel}
              onChange={(e) => setLogLevel(e.target.value)}
            >
              <option value="all">All Levels</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="debug">Debug</option>
            </select>
          </div>
          <div className="col-md-3">
            <small className="text-muted">
              Showing {filteredLogs.length} of {logs.length} logs
            </small>
          </div>
        </div>

        {/* 로그 표시 영역 */}
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
          {filteredLogs.length === 0 ? (
            <div className="text-muted text-center py-4">
              {logs.length === 0 ? 'No logs available' : 'No logs match the current filters'}
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <div key={index} className="mb-2">
                <div className="d-flex align-items-start">
                  <CBadge
                    color={getLogLevelColor(log.level)}
                    className="me-2 mt-1"
                    style={{ minWidth: '60px' }}
                  >
                    {log.level?.toUpperCase() || 'INFO'}
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

                {index < filteredLogs.length - 1 && (
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

export default ExecutionLogs
