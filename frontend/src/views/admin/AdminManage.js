import React, { useState, useEffect } from 'react'
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
  CButton,
  CButtonGroup,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSettings,
  cilClock,
  cilDataTransferDown,
  cilList,
  cilMediaPlay,
  cilMediaStop,
  cilReload,
  cilMediaPause,
  cilGlobeAlt,
  cilInfo,
} from '@coreui/icons'

// Hooks
import { useLogManager } from '../../hooks/useLogManager'
import useWebSocketLogs from '../../hooks/useWebSocketLogs'
import { useConfigurations } from '../../hooks/useConfigurations'
import { useScheduler } from '../../hooks/useScheduler'
import { useOnChain } from '../../hooks/useOnChain'
import { useGlobalTickerData } from '../../hooks/useGlobalTickerData'
import { useSchedulerLogs } from '../../hooks/useSchedulerLogs'
import { useTickerMutations } from '../../hooks/useTickerMutations'

// API
import { schedulerAPI } from '../../services/api'

// Components
import SchedulerControls from '../../components/admin/config/SchedulerControls'
import ConfigSection from '../../components/admin/config/ConfigSection'
import OHLCVIntervalSettings from '../../components/admin/config/OHLCVIntervalSettings'
import OnChainMetrics from '../../components/admin/onchain/OnChainMetrics'
import OnChainActions from '../../components/admin/onchain/OnChainActions'
import OnChainStatus from '../../components/admin/onchain/OnChainStatus'
import WorldAssetsCollectionSettings from '../../components/admin/config/WorldAssetsCollectionSettings'
import RealTimeLogs from '../../components/admin/logs/RealTimeLogs'
import LogsTable from '../../components/admin/logs/LogsTable'
import CardTools from '../../components/common/CardTools'
import ConfigReadMe from '../../components/common/ConfigReadMe'
import '../../components/common/CardTools.css'

// Ticker Management Components
import TickerTabs from '../../components/admin/ticker/temp/TickerTabs'
//import TickerTable from '../../components/admin/ticker/TickerTable'
import TickerTableAgGrid from '../../components/admin/ticker/TickerTableAgGrid'
//import TickerTableReactTable from '../../components/admin/ticker/temp/TickerTableReactTable'
import useAssetTypes from '../../hooks/useAssetTypes'

const AdminManage = () => {
  const { user, isAdmin, hasPermission } = useAuth()
  const [activeTab, setActiveTab] = useState('config-readme')
  const [tickerActiveTab, setTickerActiveTab] = useState('Stocks')
  const [alert, setAlert] = useState(null)
  const [collapsedCards, setCollapsedCards] = useState({})
  const [schedulerPeriod, setSchedulerPeriod] = useState('day')

  // Hooks
  const { logs, addLog, clearLogs } = useLogManager()
  const { logs: wsLogs, isConnected: wsConnected, clearLogs: clearWsLogs } = useWebSocketLogs()
  const {
    configurations,
    groupedConfigurations,
    loading: configLoading,
    saving: configSaving,
    error: configError,
    loadConfigurations,
    updateConfiguration,
    applyCategoryChanges,
  } = useConfigurations()
  const {
    data: schedulerStatus,
    isLoading: schedulerLoading,
    error: schedulerError,
  } = useScheduler(schedulerPeriod)
  const {
    metrics,
    loading: onchainLoading,
    collecting,
    stopping: onchainStopping,
    error: onchainError,
    loadMetrics,
    updateMetric,
    collectData,
    stopCollection,
    refreshData,
    runMetric,
  } = useOnChain()

  // 스케줄러 로그 데이터
  const {
    data: schedulerLogs,
    isLoading: logsLoading,
    error: logsError,
  } = useSchedulerLogs()

  // 알림 표시 함수
  const showAlert = (type, message) => {
    setAlert({ type, message })
    setTimeout(() => setAlert(null), 5000)
  }

  // 스케줄러 제어 핸들러
  const handleSchedulerStart = async () => {
    try {
      const response = await schedulerAPI.startScheduler()
      const result = response.data
      showAlert('success', `Scheduler started successfully. (Jobs: ${result.job_count})`)
      addLog({ level: 'success', message: `Scheduler started successfully. (Jobs: ${result.job_count})` })
    } catch (error) {
      showAlert('error', error.response?.data?.detail || error.message)
      addLog({ level: 'error', message: error.response?.data?.detail || error.message })
    }
  }

  const handleSchedulerTrigger = async () => {
    try {
      const response = await schedulerAPI.triggerScheduler()
      const result = response.data
      showAlert('success', 'Data collection started successfully')
      addLog({ level: 'success', message: 'Data collection started successfully' })
    } catch (error) {
      showAlert('error', error.response?.data?.detail || error.message)
      addLog({ level: 'error', message: error.response?.data?.detail || error.message })
    }
  }

  const handleSchedulerStop = async () => {
    try {
      const response = await schedulerAPI.stopScheduler()
      const result = response.data
      showAlert('success', 'Scheduler stopped successfully')
      addLog({ level: 'warning', message: 'Scheduler stopped successfully' })
    } catch (error) {
      showAlert('error', error.response?.data?.detail || error.message)
      addLog({ level: 'error', message: error.response?.data?.detail || error.message })
    }
  }

  const handleSchedulerPause = async () => {
    try {
      const response = await schedulerAPI.pauseScheduler()
      const result = response.data
      showAlert('success', 'Scheduler paused successfully')
      addLog({ level: 'info', message: 'Scheduler paused successfully' })
    } catch (error) {
      showAlert('error', error.response?.data?.detail || error.message)
      addLog({ level: 'error', message: error.response?.data?.detail || error.message })
    }
  }

  // 설정 변경 핸들러
  const handleConfigChange = async (field, value) => {
    const result = await updateConfiguration(field, value)
    if (result.success) {
      showAlert('success', result.message)
      addLog({ level: 'success', message: result.message })
    } else {
      showAlert('error', result.message)
      addLog({ level: 'error', message: result.message })
    }
  }

  const handleConfigSave = async () => {
    const result = await applyCategoryChanges('general')
    if (result.success) {
      showAlert('success', result.message)
      addLog({ level: 'success', message: result.message })
    } else {
      showAlert('error', result.message)
      addLog({ level: 'error', message: result.message })
    }
  }

  // 온체인 메트릭 변경 핸들러
  const handleMetricsChange = async (metricId, config) => {
    if (config.action === 'run') {
      const result = await runMetric(metricId)
      if (result.success) {
        showAlert('success', result.message)
        addLog({ level: 'success', message: result.message })
      } else {
        showAlert('error', result.message)
        addLog({ level: 'error', message: result.message })
      }
    } else {
      const result = await updateMetric(metricId, config)
      if (result.success) {
        showAlert('success', result.message)
        addLog({ level: 'info', message: result.message })
      } else {
        showAlert('error', result.message)
        addLog({ level: 'error', message: result.message })
      }
    }
  }

  const handleCollect = async () => {
    const result = await collectData()
    if (result.success) {
      showAlert('success', result.message)
      addLog({ level: 'success', message: result.message })
    } else {
      showAlert('error', result.message)
      addLog({ level: 'error', message: result.message })
    }
  }

  const handleStop = async () => {
    const result = await stopCollection()
    if (result.success) {
      showAlert('warning', result.message)
      addLog({ level: 'warning', message: result.message })
    } else {
      showAlert('error', result.message)
      addLog({ level: 'error', message: result.message })
    }
  }

  const handleRefresh = async () => {
    const result = await refreshData()
    if (result.success) {
      showAlert('success', result.message)
      addLog({ level: 'info', message: result.message })
    } else {
      showAlert('error', result.message)
      addLog({ level: 'error', message: result.message })
    }
  }

  // 로그 새로고침
  const handleLogRefresh = () => {
    loadSchedulerStatus()
    loadJobDetails()
    loadConfigurations()
    loadMetrics()
  }

  // 탭 변경 핸들러
  const handleTabChange = (tab) => {
    setActiveTab(tab)
  }

  // 카드 접기/펼치기 핸들러
  const handleCardCollapse = (cardId, collapsed) => {
    setCollapsedCards((prev) => ({
      ...prev,
      [cardId]: collapsed,
    }))
  }

  // 스케줄러 설정만 필터링
  const schedulerConfigs = configurations.filter((config) => config.category === 'scheduler')

  // 온체인 메트릭 설정만 필터링
  const onchainConfigs = configurations.filter((config) => config.category === 'onchain_metrics')



  // 권한 확인
  if (!isAdmin) {
    // 로그인 페이지로 리다이렉트
    window.location.href = '/admin/login';
    return null;
  }

  return (
    <CContainer fluid>
      <CRow>
        <CCol xs={12}>
          <h2 className="mb-4">System Administration</h2>
          <p className="text-muted">관리자: {user?.username} ({user?.role})</p>

          {/* 알림 */}
          {alert && (
            <CAlert color={alert.type} dismissible onClose={() => setAlert(null)}>
              {alert.message}
            </CAlert>
          )}

          {/* 통합된 스케줄러 관리 */}
          <CCard className={`mb-4 ${collapsedCards['scheduler-management'] ? 'collapsed' : ''}`}>
            <CCardHeader>
              <CCardTitle>
                <CIcon icon={cilClock} className="me-2" />
                Scheduler Management
              </CCardTitle>
              <CardTools
                onCollapse={(collapsed) => handleCardCollapse('scheduler-management', collapsed)}
                onAction={(action) => {
                  if (action === 'refresh') {
                    handleLogRefresh()
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

          {/* 로그 컴포넌트들 */}
          <RealTimeLogs 
            logs={logs}
            collapsedCards={collapsedCards}
            onCardCollapse={handleCardCollapse}
            onRefresh={handleLogRefresh}
          />

          {/* 네비게이션 탭 */}
          <CNav variant="tabs" className="mb-4">
            <CNavItem>
              <CNavLink
                active={activeTab === 'config-readme'}
                onClick={() => handleTabChange('config-readme')}
                style={{ cursor: 'pointer' }}
              >
                <CIcon icon={cilInfo} className="me-2" />
                Config ReadMe
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 'scheduler'}
                onClick={() => handleTabChange('scheduler')}
                style={{ cursor: 'pointer' }}
              >
                <CIcon icon={cilClock} className="me-2" />
                Scheduler
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 'configuration'}
                onClick={() => handleTabChange('configuration')}
                style={{ cursor: 'pointer' }}
              >
                <CIcon icon={cilSettings} className="me-2" />
                Configuration
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 'onchain'}
                onClick={() => handleTabChange('onchain')}
                style={{ cursor: 'pointer' }}
              >
                <CIcon icon={cilDataTransferDown} className="me-2" />
                OnChain
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 'world-assets'}
                onClick={() => handleTabChange('world-assets')}
                style={{ cursor: 'pointer' }}
              >
                <CIcon icon={cilGlobeAlt} className="me-2" />
                World Assets
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 'ticker'}
                onClick={() => handleTabChange('ticker')}
                style={{ cursor: 'pointer' }}
              >
                <CIcon icon={cilList} className="me-2" />
                Ticker
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 'logs'}
                onClick={() => handleTabChange('logs')}
                style={{ cursor: 'pointer' }}
              >
                <CIcon icon={cilList} className="me-2" />
                Logs
              </CNavLink>
            </CNavItem>
          </CNav>

          {/* 탭 컨텐츠 */}
          <CTabContent style={{ maxHeight: 'none', overflow: 'visible' }}>
            {/* Config ReadMe 탭 */}
            <CTabPane
              visible={activeTab === 'config-readme'}
              style={{ maxHeight: 'none', overflow: 'visible' }}
            >
              <CCard className={`mb-4 ${collapsedCards['config-readme'] ? 'collapsed' : ''}`}>
                <CCardHeader>
                  <CCardTitle>
                    <CIcon icon={cilInfo} className="me-2" />
                    Configuration Documentation
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

            {/* 스케줄러 탭 */}
            <CTabPane
              visible={activeTab === 'scheduler'}
              style={{ maxHeight: 'none', overflow: 'visible' }}
            >
              {/* OHLCV 간격 설정 */}
              <CCard className={`mb-4 ${collapsedCards['ohlcv-settings'] ? 'collapsed' : ''}`}>
                <CCardHeader>
                  <CCardTitle>OHLCV Interval Settings</CCardTitle>
                  <CardTools
                    onCollapse={(collapsed) => handleCardCollapse('ohlcv-settings', collapsed)}
                  />
                </CCardHeader>
                <CCardBody>
                  <OHLCVIntervalSettings
                    configurations={configurations}
                    updateConfiguration={handleConfigChange}
                    saving={configSaving}
                  />
                </CCardBody>
              </CCard>

              {/* 스케줄러 설정 */}
              <CCard className={`mb-4 ${collapsedCards['scheduler-config'] ? 'collapsed' : ''}`}>
                <CCardHeader>
                  <CCardTitle>Scheduler Configuration</CCardTitle>
                  <CardTools
                    onCollapse={(collapsed) => handleCardCollapse('scheduler-config', collapsed)}
                  />
                </CCardHeader>
                <CCardBody>
                  <div className="alert alert-info">
                    <h6>Scheduler Configuration</h6>
                    <p className="mb-0">
                      Scheduler settings are now managed through the grouped JSON configuration system.
                      Please refer to the Config ReadMe tab for detailed information about available settings.
                    </p>
                  </div>
                </CCardBody>
              </CCard>
            </CTabPane>

            {/* 설정 탭 */}
            <CTabPane
              visible={activeTab === 'configuration'}
              style={{ maxHeight: 'none', overflow: 'visible' }}
            >
              <ConfigSection title="Configuration Management">
                <div className="alert alert-info">
                  <h6>Configuration Status</h6>
                  <p className="mb-0">
                    {configError ? (
                      <span className="text-danger">Error: {configError}</span>
                    ) : (
                      <span className="text-success">Configuration loaded successfully</span>
                    )}
                  </p>
                </div>
                
                <div className="d-flex gap-2">
                  <button 
                    className="btn btn-primary" 
                    onClick={handleConfigSave}
                    disabled={configSaving}
                  >
                    {configSaving ? 'Saving...' : 'Save Configuration'}
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => loadConfigurations()}
                  >
                    Reload Configuration
                  </button>
                </div>
              </ConfigSection>
            </CTabPane>

            {/* 온체인 탭 */}
            <CTabPane
              visible={activeTab === 'onchain'}
              style={{ maxHeight: 'none', overflow: 'visible' }}
            >
              <div className="alert alert-info mb-4">
                <h6>On-chain Status</h6>
                <p className="mb-0">
                  {onchainError ? (
                    <span className="text-danger">Error: {onchainError}</span>
                  ) : (
                    <span className="text-success">On-chain metrics loaded successfully</span>
                  )}
                </p>
              </div>

              <CCard className={`mb-4 ${collapsedCards['onchain-metrics'] ? 'collapsed' : ''}`}>
                <CCardHeader>
                  <CCardTitle>On-Chain Metrics Configuration</CCardTitle>
                  <CardTools
                    onCollapse={(collapsed) => handleCardCollapse('onchain-metrics', collapsed)}
                  />
                </CCardHeader>
                <CCardBody>
                  <OnChainMetrics
                    metrics={metrics}
                    onMetricsChange={handleMetricsChange}
                    runningMetrics={new Set()}
                  />
                </CCardBody>
              </CCard>

              <CCard className={`mb-4 ${collapsedCards['onchain-settings'] ? 'collapsed' : ''}`}>
                <CCardHeader>
                  <CCardTitle>On-Chain Collection Settings</CCardTitle>
                  <CardTools
                    onCollapse={(collapsed) => handleCardCollapse('onchain-settings', collapsed)}
                  />
                </CCardHeader>
                <CCardBody>
                  <div className="alert alert-info">
                    <h6>On-chain Configuration</h6>
                    <p className="mb-0">
                      On-chain settings are now managed through the grouped JSON configuration system.
                      Please refer to the Config ReadMe tab for detailed information about available settings.
                    </p>
                  </div>
                </CCardBody>
              </CCard>

              <ConfigSection title="Actions">
                <OnChainActions
                  onCollect={handleCollect}
                  onStop={handleStop}
                  onRefresh={handleRefresh}
                  onExport={() => addLog({ level: 'info', message: 'On-chain data exported' })}
                  onImport={() => addLog({ level: 'info', message: 'On-chain data imported' })}
                  isCollecting={collecting}
                  isStopping={onchainStopping}
                />
              </ConfigSection>
            </CTabPane>

            {/* World Assets 탭 */}
            <CTabPane
              visible={activeTab === 'world-assets'}
              style={{ maxHeight: 'none', overflow: 'visible' }}
            >
              <WorldAssetsCollectionSettings />
            </CTabPane>

            {/* 티커 탭 */}
            <CTabPane
              visible={activeTab === 'ticker'}
              style={{ maxHeight: 'none', overflow: 'visible' }}
            >
              <CCard className={`mb-4 ${collapsedCards['ticker-management'] ? 'collapsed' : ''}`}>
                <CCardHeader>
                  <CCardTitle>
                    <CIcon icon={cilList} className="me-2" />
                    Ticker Management
                  </CCardTitle>
                  <CardTools
                    onCollapse={(collapsed) => handleCardCollapse('ticker-management', collapsed)}
                    onAction={(action) => {
                      if (action === 'refresh') {
                        handleLogRefresh()
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

            {/* 로그 탭 */}
            <CTabPane
              visible={activeTab === 'logs'}
              style={{ maxHeight: 'none', overflow: 'visible' }}
            >
              <CCard className={`mb-4 ${collapsedCards['logs-management'] ? 'collapsed' : ''}`}>
                <CCardHeader>
                  <CCardTitle>
                    <CIcon icon={cilList} className="me-2" />
                    System Logs
                  </CCardTitle>
                  <CardTools
                    onCollapse={(collapsed) => handleCardCollapse('logs-management', collapsed)}
                    onAction={(action) => {
                      if (action === 'refresh') {
                        handleLogRefresh()
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
                  <LogsTable 
                    logs={schedulerLogs || []}
                    loading={logsLoading}
                    error={logsError}
                    height={600}
                  />
                </CCardBody>
              </CCard>
            </CTabPane>
          </CTabContent>
        </CCol>
      </CRow>
    </CContainer>
  )
}

export default AdminManage
