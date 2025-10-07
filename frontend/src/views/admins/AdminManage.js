import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardHeader,
  CCardBody,
  CCardTitle,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CAlert,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilClock, cilList, cilInfo, cilDataTransferDown } from '@coreui/icons'

// Use migrated admin components under components/admin
import SchedulerControls from '../../components/admin/config/SchedulerControls'
import RealtimeWebSocketSettings from '../../components/admin/config/RealtimeWebSocketSettings'
import RealTimeLogs from '../../components/admin/logs/RealTimeLogs'
import LogsTable from '../../components/admin/logs/LogsTable'
import CardTools from '../../components/common/CardTools'
import ConfigReadMe from '../../components/common/ConfigReadMe'
import SchedulerSettings from '../../components/admin/config/SchedulerSettings'
import OnChainSettings from '../../components/admin/onchain/OnChainSettings'
import TickerTableAgGrid from '../../components/admin/ticker/TickerTableAgGrid'

// Hooks (keep minimal path usage, remove unused to avoid dead imports)
import { schedulerAPI } from '../../services/api'
import { useScheduler } from '../../hooks/useScheduler'
import { useSchedulerLogs } from '../../hooks/useSchedulerLogs'

const AdminManage = () => {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('config-readme')
  const [tickerActiveTab, setTickerActiveTab] = useState('Stocks')
  const [alert, setAlert] = useState(null)
  const [collapsedCards, setCollapsedCards] = useState({})
  const [schedulerPeriod, setSchedulerPeriod] = useState('day')

  const {
    data: schedulerStatus,
    loading: schedulerLoading,
    error: schedulerError,
  } = useScheduler({ period: schedulerPeriod, enabled: isAdmin })

  const {
    data: schedulerLogs,
    isLoading: logsLoading,
    error: logsError,
  } = useSchedulerLogs()

  const showAlert = (type, message) => {
    setAlert({ type, message })
    setTimeout(() => setAlert(null), 4000)
  }

  const handleCardCollapse = (cardId, collapsed) => {
    setCollapsedCards((prev) => ({ ...prev, [cardId]: collapsed }))
  }

  const handleSchedulerStart = async () => {
    try {
      const { data } = await schedulerAPI.startScheduler()
      showAlert('success', `Scheduler started (Jobs: ${data.job_count})`)
    } catch (error) {
      showAlert('danger', error.response?.data?.detail || error.message)
    }
  }
  const handleSchedulerTrigger = async () => {
    try {
      await schedulerAPI.triggerScheduler()
      showAlert('success', 'Data collection triggered')
    } catch (error) {
      showAlert('danger', error.response?.data?.detail || error.message)
    }
  }
  const handleSchedulerStop = async () => {
    try {
      await schedulerAPI.stopScheduler()
      showAlert('warning', 'Scheduler stopped')
    } catch (error) {
      showAlert('danger', error.response?.data?.detail || error.message)
    }
  }
  const handleSchedulerPause = async () => {
    try {
      await schedulerAPI.pauseScheduler()
      showAlert('info', 'Scheduler paused')
    } catch (error) {
      showAlert('danger', error.response?.data?.detail || error.message)
    }
  }

  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin/login', { replace: true })
    }
  }, [isAdmin, navigate])

  if (!isAdmin) return null

  return (
    <CContainer fluid>
      <CRow>
        <CCol xs={12}>
          <h2 className="mb-4">System Administration</h2>
          <p className="text-muted">관리자: {user?.username} ({user?.role})</p>

          {alert && (
            <CAlert color={alert.type} dismissible onClose={() => setAlert(null)}>
              {alert.message}
            </CAlert>
          )}

          <CCard className={`mb-4 ${collapsedCards['scheduler-management'] ? 'collapsed' : ''}`}>
            <CCardHeader>
              <CCardTitle>
                <CIcon icon={cilClock} className="me-2" /> Scheduler Management
              </CCardTitle>
              <CardTools
                onCollapse={(collapsed) => handleCardCollapse('scheduler-management', collapsed)}
                showCollapse={true}
                showRemove={false}
                showDropdown={false}
                showRefresh={false}
                showExport={false}
              />
            </CCardHeader>
            <CCardBody>
              {schedulerLoading ? (
                <div className="text-center p-4">
                  <CSpinner size="sm" />
                  <div className="mt-2">스케줄러 상태를 불러오는 중...</div>
                </div>
              ) : schedulerError ? (
                <div className="text-center p-4 text-danger">
                  <div>스케줄러 상태를 불러오는데 실패했습니다.</div>
                  <div className="small">{schedulerError.message}</div>
                </div>
              ) : (
                <SchedulerControls
                  isRunning={schedulerStatus?.isRunning || false}
                  status={schedulerStatus?.status || 'Unknown'}
                  schedulerStatus={schedulerStatus || {}}
                  jobDetails={[]}
                  period={schedulerPeriod}
                  onPeriodChange={setSchedulerPeriod}
                  onStart={handleSchedulerStart}
                  onStop={handleSchedulerStop}
                  onPause={handleSchedulerPause}
                  onTrigger={handleSchedulerTrigger}
                />
              )}
            </CCardBody>
          </CCard>

          <CNav variant="tabs" className="mb-4">
            <CNavItem>
              <CNavLink
                active={activeTab === 'config-readme'}
                onClick={() => setActiveTab('config-readme')}
                style={{ cursor: 'pointer' }}
              >
                <CIcon icon={cilInfo} className="me-2" /> Config ReadMe
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 'scheduler'}
                onClick={() => setActiveTab('scheduler')}
                style={{ cursor: 'pointer' }}
              >
                <CIcon icon={cilClock} className="me-2" /> Scheduler
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 'onchain'}
                onClick={() => setActiveTab('onchain')}
                style={{ cursor: 'pointer' }}
              >
                <CIcon icon={cilDataTransferDown} className="me-2" /> OnChain
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 'realtime-websocket'}
                onClick={() => setActiveTab('realtime-websocket')}
                style={{ cursor: 'pointer' }}
              >
                <CIcon icon={cilList} className="me-2" /> Realtime
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 'ticker'}
                onClick={() => setActiveTab('ticker')}
                style={{ cursor: 'pointer' }}
              >
                <CIcon icon={cilList} className="me-2" /> Ticker
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 'logs'}
                onClick={() => setActiveTab('logs')}
                style={{ cursor: 'pointer' }}
              >
                <CIcon icon={cilList} className="me-2" /> Logs
              </CNavLink>
            </CNavItem>
          </CNav>

          <CTabContent style={{ maxHeight: 'none', overflow: 'visible' }}>
            <CTabPane visible={activeTab === 'config-readme'}>
              <CCard className={`mb-4 ${collapsedCards['config-readme'] ? 'collapsed' : ''}`}>
                <CCardHeader>
                  <CCardTitle>
                    <CIcon icon={cilInfo} className="me-2" /> Configuration Documentation
                  </CCardTitle>
                  <CardTools
                    onCollapse={(collapsed) => handleCardCollapse('config-readme', collapsed)}
                    showCollapse={true}
                    showRemove={false}
                    showDropdown={false}
                    showRefresh={false}
                    showExport={false}
                  />
                </CCardHeader>
                <CCardBody>
                  <ConfigReadMe />
                </CCardBody>
              </CCard>
            </CTabPane>

            <CTabPane visible={activeTab === 'realtime-websocket'}>
              <CCard className={`mb-4 ${collapsedCards['realtime-websocket'] ? 'collapsed' : ''}`}>
                <CCardHeader>
                  <CCardTitle>Realtime & WebSocket Settings</CCardTitle>
                  <CardTools onCollapse={(c) => handleCardCollapse('realtime-websocket', c)} />
                </CCardHeader>
                <CCardBody>
                  <RealtimeWebSocketSettings />
                </CCardBody>
              </CCard>
            </CTabPane>

            <CTabPane visible={activeTab === 'scheduler'}>
              <CCard className={`mb-4 ${collapsedCards['scheduler-settings'] ? 'collapsed' : ''}`}>
                <CCardHeader>
                  <CCardTitle>Scheduler Settings</CCardTitle>
                  <CardTools onCollapse={(c) => handleCardCollapse('scheduler-settings', c)} />
                </CCardHeader>
                <CCardBody>
                  <SchedulerSettings />
                </CCardBody>
              </CCard>
            </CTabPane>

            <CTabPane visible={activeTab === 'onchain'}>
              <CCard className={`mb-4 ${collapsedCards['onchain-settings'] ? 'collapsed' : ''}`}>
                <CCardHeader>
                  <CCardTitle>On-Chain Settings</CCardTitle>
                  <CardTools onCollapse={(c) => handleCardCollapse('onchain-settings', c)} />
                </CCardHeader>
                <CCardBody>
                  <OnChainSettings />
                </CCardBody>
              </CCard>
            </CTabPane>

            <CTabPane visible={activeTab === 'ticker'}>
              <CCard className={`mb-4 ${collapsedCards['ticker-management'] ? 'collapsed' : ''}`}>
                <CCardHeader>
                  <CCardTitle>
                    <CIcon icon={cilList} className="me-2" /> Ticker Management
                  </CCardTitle>
                  <CardTools onCollapse={(c) => handleCardCollapse('ticker-management', c)} />
                </CCardHeader>
                <CCardBody>
                  <TickerTableAgGrid 
                    assetType={tickerActiveTab}
                    onSettingChange={() => {}}
                    onExecute={() => {}}
                    onDelete={() => {}}
                    searchTerm=""
                    onSearchChange={() => {}}
                    isExecuting={false}
                    executingTickers={[]}
                    onExecutePerAsset={() => {}}
                    onBulkSave={() => {}}
                    isBulkUpdatingSettings={false}
                    height={600}
                    onAssetTypeChange={setTickerActiveTab}
                    isTabActive={activeTab === 'ticker'}
                  />
                </CCardBody>
              </CCard>
            </CTabPane>

            <CTabPane visible={activeTab === 'logs'}>
              <CCard className={`mb-4 ${collapsedCards['logs'] ? 'collapsed' : ''}`}>
                <CCardHeader>
                  <CCardTitle>
                    <CIcon icon={cilList} className="me-2" /> System Logs
                  </CCardTitle>
                  <CardTools onCollapse={(c) => handleCardCollapse('logs', c)} showRefresh={false} />
                </CCardHeader>
                <CCardBody>
                  <LogsTable logs={schedulerLogs || []} loading={logsLoading} error={logsError} height={600} />
                </CCardBody>
              </CCard>
              <RealTimeLogs logs={[]} collapsedCards={collapsedCards} onCardCollapse={handleCardCollapse} onRefresh={() => {}} />
            </CTabPane>
          </CTabContent>
        </CCol>
      </CRow>
    </CContainer>
  )
}

export default AdminManage


