import React, { useState } from 'react'
import { CButton, CButtonGroup, CBadge } from '@coreui/react'

// SVG 아이콘 컴포넌트들
const PlayIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="currentColor"
  >
    <path d="M8 5v14l11-7z" />
  </svg>
)

const PauseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="currentColor"
  >
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
)

const StopIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="currentColor"
  >
    <path d="M6 6h12v12H6z" />
  </svg>
)

const ChevronUpIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="currentColor"
  >
    <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="currentColor"
  >
    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
  </svg>
)

const DownloadIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="currentColor"
  >
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
  </svg>
)

const StopCircleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="currentColor"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
  </svg>
)

const SchedulerControls = ({
  isRunning,
  onStart,
  onStop,
  onPause,
  onResume,
  onTrigger,
  status,
  schedulerStatus,
  jobDetails = [],
  period = 'day',
  onPeriodChange,
}) => {
  const [isCollecting, setIsCollecting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [isTriggering, setIsTriggering] = useState(false)
  const [showStatusDetails, setShowStatusDetails] = useState(false)
  const [showJobDetails, setShowJobDetails] = useState(false)
  const [diagnostics, setDiagnostics] = useState(null)
  const [rtBusy, setRtBusy] = useState(false)
  const [rtSchedule, setRtSchedule] = useState({
    timezone: 'America/New_York',
    open_time: '09:30',
    close_time: '16:00',
    weekdays_only: true,
  })

  // 간단한 대기 유틸
  const delay = (ms) => new Promise((res) => setTimeout(res, ms))

  // 잡 등록 여부 확인 (백엔드 초기화 레이스 회피)
  const waitForJobsRegistered = async (timeoutMs = 5000) => {
    const startedAt = Date.now()
    while (Date.now() - startedAt < timeoutMs) {
      try {
        const resp = await fetch('/api/v1/scheduler/jobs', { headers: { accept: 'application/json' } })
        if (resp.ok) {
          const data = await resp.json()
          if (data?.jobs && data.jobs.length > 0) return true
        }
      } catch (e) {
        // ignore and retry
      }
      await delay(500)
    }
    return false
  }

  const ensureSchedulerRunning = async () => {
    try {
      const statusResp = await fetch('/api/v1/scheduler/status', { headers: { accept: 'application/json' } })
      const status = statusResp.ok ? await statusResp.json() : null
      if (!status?.isRunning) {
        const resp = await fetch('/api/v1/scheduler/start?include_diagnostics=true&fix_running=true', { method: 'POST' })
        if (resp.ok) {
          const data = await resp.json()
          if (data?.diagnostics) setDiagnostics(data.diagnostics)
        }
        await delay(1000)
      }
    } catch (e) {
      await fetch('/api/v1/scheduler/start?include_diagnostics=true&fix_running=true', { method: 'POST' })
      await delay(1000)
    }
  }

  const handleStart = async () => {
    setIsCollecting(true)
    try {
      const resp = await fetch('/api/v1/scheduler/start?include_diagnostics=true&fix_running=true', { method: 'POST' })
      if (resp.ok) {
        const data = await resp.json()
        if (data?.diagnostics) setDiagnostics(data.diagnostics)
      }
      await delay(800)
      await waitForJobsRegistered(4000)
    } finally {
      setIsCollecting(false)
    }
  }

  const handleStop = async () => {
    setIsStopping(true)
    try {
      await onStop()
    } finally {
      setIsStopping(false)
    }
  }

  const handleTrigger = async () => {
    setIsTriggering(true)
    try {
      await ensureSchedulerRunning()
      const hasJobs = await waitForJobsRegistered(5000)
      if (!hasJobs) {
        await delay(1000)
      }
      await fetch('/api/v1/collectors/ohlcv/run', { method: 'POST', headers: { accept: 'application/json' } })
    } finally {
      setIsTriggering(false)
    }
  }

  const handleRealtimeStart = async () => {
    setRtBusy(true)
    try {
      await fetch('/api/v1/realtime/start', { method: 'POST' })
    } finally { setRtBusy(false) }
  }

  const handleRealtimeStop = async () => {
    setRtBusy(true)
    try {
      await fetch('/api/v1/realtime/stop', { method: 'POST' })
    } finally { setRtBusy(false) }
  }

  const handleRealtimeSchedule = async () => {
    setRtBusy(true)
    try {
      await fetch('/api/v1/realtime/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rtSchedule) })
    } finally { setRtBusy(false) }
  }

  return (
    <div>
      {/* Scheduler Control */}
      <div className="mb-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h6 className="mb-2">Scheduler Control</h6>
            <CBadge color={isRunning ? 'success' : 'secondary'} className="mb-2">
              {isRunning ? 'Running' : 'Stopped'}
            </CBadge>
            {status && <div className="text-muted small">{status}</div>}
          </div>

          <CButtonGroup className="d-flex justify-content-center" style={{ gap: '8px' }}>
            <CButton
              color={isCollecting ? 'warning' : 'success'}
              onClick={handleStart}
              disabled={isRunning || isCollecting}
              size="sm"
              className="px-4 py-2"
              style={{
                fontSize: '0.9rem',
                fontWeight: '500',
                borderRadius: '6px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                minWidth: '140px',
                animation: isCollecting ? 'pulse 1.5s infinite' : 'none',
              }}
            >
              {isCollecting ? <DownloadIcon className="me-2" /> : <PlayIcon className="me-2" />}
              {isCollecting ? 'Collecting...' : 'Start Scheduler'}
            </CButton>

            <CButton
              color="info"
              onClick={handleTrigger}
              disabled={isTriggering}
              size="sm"
              className="px-3 py-2"
              style={{
                fontSize: '0.85rem',
                fontWeight: '500',
                borderRadius: '6px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                minWidth: '120px',
                animation: isTriggering ? 'pulse 1.5s infinite' : 'none',
              }}
            >
              <DownloadIcon className="me-2" />
              {isTriggering ? 'Triggering...' : 'Collect Data'}
            </CButton>

            <CButton
              color="warning"
              onClick={onPause}
              disabled={!isRunning}
              size="sm"
              className="px-3 py-2"
              style={{
                fontSize: '0.85rem',
                fontWeight: '500',
                borderRadius: '6px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                minWidth: '100px',
              }}
            >
              <PauseIcon className="me-2" />
              Pause
            </CButton>

            <CButton
              color={isStopping ? 'danger' : 'danger'}
              onClick={handleStop}
              disabled={!isRunning || isStopping}
              size="sm"
              className="px-3 py-2"
              style={{
                fontSize: '0.85rem',
                fontWeight: '500',
                borderRadius: '6px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                minWidth: '100px',
                animation: isStopping ? 'pulse 1.5s infinite' : 'none',
              }}
            >
              {isStopping ? <StopCircleIcon className="me-2" /> : <StopIcon className="me-2" />}
              {isStopping ? 'Stopping...' : 'Stop'}
            </CButton>
            <CButton color="secondary" onClick={handleRealtimeStart} disabled={rtBusy} size="sm" className="px-3 py-2" style={{ fontSize: '0.85rem', fontWeight: '500', borderRadius: '6px', minWidth: '110px' }}>RT Start</CButton>
            <CButton color="secondary" onClick={handleRealtimeStop} disabled={rtBusy} size="sm" className="px-3 py-2" style={{ fontSize: '0.85rem', fontWeight: '500', borderRadius: '6px', minWidth: '110px' }}>RT Stop</CButton>
          </CButtonGroup>
        </div>
      </div>

      {/* Scheduler Status */}
      <div>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="mb-0">Scheduler Status</h6>
          <div className="d-flex align-items-center gap-2">
            {/* 기간별 필터 버튼 */}
            <CButtonGroup size="sm">
              <CButton
                color={period === 'day' ? 'primary' : 'secondary'}
                onClick={() => onPeriodChange?.('day')}
                size="sm"
              >
                Day
              </CButton>
              <CButton
                color={period === 'week' ? 'primary' : 'secondary'}
                onClick={() => onPeriodChange?.('week')}
                size="sm"
              >
                Week
              </CButton>
              <CButton
                color={period === 'month' ? 'primary' : 'secondary'}
                onClick={() => onPeriodChange?.('month')}
                size="sm"
              >
                Month
              </CButton>
            </CButtonGroup>
            <CButton
              color="link"
              size="sm"
              onClick={() => setShowStatusDetails(!showStatusDetails)}
              className="p-0"
            >
              {showStatusDetails ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </CButton>
          </div>
        </div>

        {showStatusDetails && (
          <>
            <div className="row g-3">
              <div className="col-6 col-md-3">
                <div className="card border-0 bg-primary bg-opacity-10 text-center">
                  <div className="card-body p-3">
                    <h4 className="text-primary mb-1">{schedulerStatus?.totalJobs || 0}</h4>
                    <small className="text-muted">Jobs</small>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card border-0 bg-success bg-opacity-10 text-center">
                  <div className="card-body p-3">
                    <h4 className="text-success mb-1">{schedulerStatus?.completedJobs || 0}</h4>
                    <small className="text-muted">Completed</small>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card border-0 bg-danger bg-opacity-10 text-center">
                  <div className="card-body p-3">
                    <h4 className="text-danger mb-1">{schedulerStatus?.failedJobs || 0}</h4>
                    <small className="text-muted">Failed</small>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card border-0 bg-warning bg-opacity-10 text-center">
                  <div className="card-body p-3">
                    <h4 className="text-warning mb-1">{schedulerStatus?.pendingJobs || 0}</h4>
                    <small className="text-muted">Pending</small>
                  </div>
                </div>
              </div>
            </div>

            {schedulerStatus?.lastRun && (
              <div className="mt-3">
                <small className="text-muted">
                  <strong>Last Run:</strong> {new Date(schedulerStatus.lastRun).toLocaleString()}
                </small>
              </div>
            )}
            {schedulerStatus?.nextRun && (
              <div>
                <small className="text-muted">
                  <strong>Next Run:</strong> {new Date(schedulerStatus.nextRun).toLocaleString()}
                </small>
              </div>
            )}
            {diagnostics && (
              <div className="mt-3">
                <h6 className="mb-2">Diagnostics</h6>
                <div className="small text-muted">Jobs: {(diagnostics.jobs || []).map((j) => (j.id || j)).join(', ') || 'N/A'}</div>
                {Array.isArray(diagnostics.recent_logs) && diagnostics.recent_logs.length > 0 && (
                  <div className="mt-2" style={{ maxHeight: 180, overflowY: 'auto' }}>
                    {diagnostics.recent_logs.map((l, i) => (
                      <div key={i} className="border-bottom py-1">
                        <div className="d-flex justify-content-between">
                          <span>{l.job_name}</span>
                          <span className={`badge bg-${l.status === 'failed' ? 'danger' : l.status === 'completed' ? 'success' : 'secondary'}`}>{l.status}</span>
                        </div>
                        <div className="small text-muted">{l.error || ''}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3">
                  <h6 className="mb-2">Realtime Schedule</h6>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <input className="form-control form-control-sm" style={{ width: 220 }} value={rtSchedule.timezone} onChange={(e) => setRtSchedule({ ...rtSchedule, timezone: e.target.value })} />
                    <input className="form-control form-control-sm" style={{ width: 100 }} value={rtSchedule.open_time} onChange={(e) => setRtSchedule({ ...rtSchedule, open_time: e.target.value })} />
                    <input className="form-control form-control-sm" style={{ width: 100 }} value={rtSchedule.close_time} onChange={(e) => setRtSchedule({ ...rtSchedule, close_time: e.target.value })} />
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" checked={rtSchedule.weekdays_only} onChange={(e) => setRtSchedule({ ...rtSchedule, weekdays_only: e.target.checked })} />
                      <label className="form-check-label small">Weekdays only</label>
                    </div>
                    <CButton color="secondary" size="sm" onClick={handleRealtimeSchedule} disabled={rtBusy}>Set Schedule</CButton>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

export default SchedulerControls

