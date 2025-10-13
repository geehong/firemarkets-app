import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CCardTitle,
  CButton,
  CSpinner,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilReload } from '@coreui/icons'
import CardTools from '../../common/CardTools'

const SystemLogs = ({ collapsedCards, onCardCollapse }) => {
  const [dbLogs, setDbLogs] = useState([])
  const [loadingDbLogs, setLoadingDbLogs] = useState(false)

  // 데이터베이스 로그 로드 함수
  const loadDatabaseLogs = async () => {
    setLoadingDbLogs(true)
    try {
      // 스케줄러 로그와 API 로그를 모두 가져오기
      const [schedulerResponse, apiResponse] = await Promise.all([
        fetch('/api/v1/logs/scheduler?limit=100'),
        fetch('/api/v1/logs/api?limit=100'),
      ])

      if (schedulerResponse.ok && apiResponse.ok) {
        const schedulerLogs = await schedulerResponse.json()
        const apiLogs = await apiResponse.json()

        // 로그 형식 통합
        const combinedLogs = []

        // 스케줄러 로그 변환
        schedulerLogs.forEach((log) => {
          combinedLogs.push({
            id: `scheduler_${log.log_id}`,
            timestamp: new Date(log.start_time),
            level:
              log.status === 'completed' ? 'success' : log.status === 'failed' ? 'error' : 'info',
            message: `Job: ${log.job_name} - Status: ${log.status}`,
            details: {
              job_name: log.job_name,
              assets_processed: log.assets_processed,
              data_points_added: log.data_points_added,
              duration_seconds: log.duration_seconds,
              error_message: log.error_message,
            },
            type: 'scheduler',
          })
        })

        // API 로그 변환
        apiLogs.forEach((log) => {
          combinedLogs.push({
            id: `api_${log.log_id}`,
            timestamp: new Date(log.created_at),
            level: log.status_code < 400 ? 'success' : 'error',
            message: `API: ${log.api_name} - ${log.endpoint} - Status: ${log.status_code}`,
            details: {
              api_name: log.api_name,
              endpoint: log.endpoint,
              asset_ticker: log.asset_ticker,
              status_code: log.status_code,
              response_time_ms: log.response_time_ms,
              success: log.success,
              error_message: log.error_message,
            },
            type: 'api',
          })
        })

        // 시간순 정렬 (최신순)
        combinedLogs.sort((a, b) => b.timestamp - a.timestamp)
        setDbLogs(combinedLogs)
      }
    } catch (error) {
      console.error('Error loading database logs:', error)
    } finally {
      setLoadingDbLogs(false)
    }
  }

  // 컴포넌트 마운트 시 데이터베이스 로그 로드
  useEffect(() => {
    loadDatabaseLogs()
  }, [])

  return (
    <CCard className={`mb-4 ${collapsedCards['system-logs'] ? 'collapsed' : ''}`}>
      <CCardHeader>
        <CCardTitle>System Logs</CCardTitle>
        <CardTools
          onCollapse={(collapsed) => onCardCollapse('system-logs', collapsed)}
          onAction={(action) => {
            if (action === 'refresh') {
              loadDatabaseLogs()
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
        {/* 데이터베이스 로그 */}
        <div className="mb-4">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h6 className="mb-0">Database Logs</h6>
            <CButton
              color="outline-primary"
              size="sm"
              onClick={loadDatabaseLogs}
              disabled={loadingDbLogs}
            >
              {loadingDbLogs ? (
                <>
                  <CSpinner size="sm" className="me-2" />
                  Loading...
                </>
              ) : (
                <>
                  <CIcon icon={cilReload} className="me-2" />
                  Refresh
                </>
              )}
            </CButton>
          </div>

          <div
            className="border rounded p-3"
            style={{
              maxHeight: '300px',
              overflowY: 'auto',
              backgroundColor: '#f8f9fa',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
            }}
          >
            {dbLogs.length === 0 ? (
              <div className="text-muted text-center py-4">
                {loadingDbLogs ? 'Loading database logs...' : 'No database logs available'}
              </div>
            ) : (
              dbLogs.map((log) => (
                <div key={log.id} className="mb-2">
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
                      {log.level.toUpperCase()}
                    </CBadge>

                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">{log.timestamp.toLocaleString()}</span>
                        <span className="text-info">[{log.type}]</span>
                      </div>

                      <div className="mt-1">{log.message}</div>

                      {log.details && (
                        <div className="text-muted small mt-1">
                          {log.details.error_message && (
                            <div>Error: {log.details.error_message}</div>
                          )}
                          {log.details.duration_seconds && (
                            <div>Duration: {log.details.duration_seconds}s</div>
                          )}
                          {log.details.assets_processed && (
                            <div>Assets: {log.details.assets_processed}</div>
                          )}
                          {log.details.response_time_ms && (
                            <div>Response: {log.details.response_time_ms}ms</div>
                          )}
                          {log.details.asset_ticker && (
                            <div>Asset: {log.details.asset_ticker}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <hr className="my-2" style={{ borderColor: '#dee2e6' }} />
                </div>
              ))
            )}
          </div>
        </div>
      </CCardBody>
    </CCard>
  )
}

export default SystemLogs 