'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect } from 'react'
import { useScheduler } from '@/hooks/admin/useScheduler'
import { useSchedulerLogs } from '@/hooks/admin/useSchedulerLogs'
import SchedulerControls from '@/components/admin/config/SchedulerControls'
import SchedulerSettings from '@/components/admin/config/SchedulerSettings'
import OnChainSettings from '@/components/admin/onchain/OnChainSettings'
import RealtimeWebSocketSettings from '@/components/admin/config/RealtimeWebSocketSettings'
import TickerTableAgGrid from '@/components/admin/ticker/TickerTableAgGrid'
import ConfigReadMe from '@/components/admin/common/ConfigReadMe'
import CardTools from '@/components/admin/common/CardTools'
import LogsTable from '@/components/admin/logs/LogsTable'
import RealTimeLogs from '@/components/admin/logs/RealTimeLogs'

export default function AdminManage() {
  const router = useRouter()
  const { user, loading, error, logout, isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState('config-readme')
  const [tickerActiveTab, setTickerActiveTab] = useState('Stocks')
  const [tickerSearchTerm, setTickerSearchTerm] = useState('')
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null)
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({})
  const [schedulerPeriod, setSchedulerPeriod] = useState('day')

  // 스케줄러 훅 사용
  const {
    data: schedulerStatus,
    loading: schedulerLoading,
    error: schedulerError,
    refetch: refetchScheduler
  } = useScheduler({ period: schedulerPeriod, enabled: isAdmin })

  const {
    data: schedulerLogs,
    isLoading: logsLoading,
    error: logsError
  } = useSchedulerLogs({ enabled: isAdmin })

  const showAlert = (type: string, message: string) => {
    setAlert({ type, message })
    setTimeout(() => setAlert(null), 4000)
  }

  const handleCardCollapse = (cardId: string, collapsed: boolean) => {
    setCollapsedCards((prev) => ({ ...prev, [cardId]: collapsed }))
  }

  const handleSchedulerStart = async () => {
    try {
      const response = await fetch('https://backend.firemarkets.net/api/scheduler/start', {
        method: 'POST',
      })
      
      if (response.ok) {
        const data = await response.json()
        showAlert('success', `Scheduler started (Jobs: ${data.job_count || 0})`)
        refetchScheduler()
      } else {
        showAlert('error', 'Failed to start scheduler')
      }
    } catch (error) {
      showAlert('error', 'Failed to start scheduler')
    }
  }

  const handleSchedulerStop = async () => {
    try {
      const response = await fetch('https://backend.firemarkets.net/api/scheduler/stop', {
        method: 'POST',
      })
      
      if (response.ok) {
        showAlert('warning', 'Scheduler stopped')
        refetchScheduler()
      } else {
        showAlert('error', 'Failed to stop scheduler')
      }
    } catch (error) {
      showAlert('error', 'Failed to stop scheduler')
    }
  }

  const handleSchedulerPause = async () => {
    try {
      const response = await fetch('https://backend.firemarkets.net/api/scheduler/pause', {
        method: 'POST',
      })
      
      if (response.ok) {
        showAlert('info', 'Scheduler paused')
        refetchScheduler()
      } else {
        showAlert('error', 'Failed to pause scheduler')
      }
    } catch (error) {
      showAlert('error', 'Failed to pause scheduler')
    }
  }

  const handleSchedulerTrigger = async () => {
    try {
      const response = await fetch('https://backend.firemarkets.net/api/scheduler/trigger', {
        method: 'POST',
      })
      
      if (response.ok) {
        showAlert('success', 'Data collection triggered')
        refetchScheduler()
      } else {
        showAlert('error', 'Failed to trigger scheduler')
      }
    } catch (error) {
      showAlert('error', 'Failed to trigger scheduler')
    }
  }

  useEffect(() => {
    if (!isAdmin && !loading) {
      router.push('/admin/signin')
    }
  }, [isAdmin, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="mt-3 text-sm text-gray-600">Loading...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/signin')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">System Administration</h2>
          <p className="text-gray-600">관리자: {user?.username} ({user?.role})</p>
        </div>

        {/* Alert */}
        {alert && (
          <div className={`mb-6 p-4 rounded-md ${
            alert.type === 'success' ? 'bg-green-50 border border-green-200' :
            alert.type === 'error' ? 'bg-red-50 border border-red-200' :
            alert.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className={`text-sm ${
              alert.type === 'success' ? 'text-green-700' :
              alert.type === 'error' ? 'text-red-700' :
              alert.type === 'warning' ? 'text-yellow-700' :
              'text-blue-700'
            }`}>
              {alert.message}
            </div>
          </div>
        )}

        {/* Scheduler Management Card */}
        <div className={`bg-white shadow rounded-lg mb-6 ${collapsedCards['scheduler-management'] ? 'opacity-50' : ''}`}>
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                ⏰ Scheduler Management
              </h3>
              <CardTools
                onCollapse={(collapsed) => handleCardCollapse('scheduler-management', collapsed)}
                showCollapse={true}
                showRemove={false}
                showDropdown={false}
                showRefresh={true}
                showExport={false}
              />
            </div>
          </div>
          {!collapsedCards['scheduler-management'] && (
            <div className="p-6">
              {schedulerLoading ? (
                <div className="text-center p-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <div className="mt-2 text-sm text-gray-600">스케줄러 상태를 불러오는 중...</div>
                </div>
              ) : schedulerError ? (
                <div className="text-center p-4 text-red-600">
                  <div>스케줄러 상태를 불러오는데 실패했습니다.</div>
                  <div className="text-sm">{schedulerError?.message}</div>
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
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'config-readme', name: 'Config ReadMe', icon: '📋' },
              { id: 'scheduler', name: 'Scheduler', icon: '⏰' },
              { id: 'onchain', name: 'OnChain', icon: '⛓️' },
              { id: 'realtime-websocket', name: 'Realtime', icon: '🔄' },
              { id: 'ticker', name: 'Ticker', icon: '📈' },
              { id: 'logs', name: 'Logs', icon: '📋' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'config-readme' && (
            <div className={`bg-white shadow rounded-lg ${collapsedCards['config-readme'] ? 'opacity-50' : ''}`}>
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">
                    📋 Configuration Documentation
                  </h3>
                  <CardTools
                    onCollapse={(collapsed) => handleCardCollapse('config-readme', collapsed)}
                    showCollapse={true}
                    showRemove={false}
                    showDropdown={false}
                    showRefresh={false}
                    showExport={false}
                  />
                </div>
              </div>
              {!collapsedCards['config-readme'] && (
                <div className="p-6">
                  <ConfigReadMe />
                </div>
              )}
            </div>
          )}

          {activeTab === 'scheduler' && (
            <div className={`bg-white shadow rounded-lg ${collapsedCards['scheduler-settings'] ? 'opacity-50' : ''}`}>
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Scheduler Settings</h3>
                  <button
                    onClick={() => handleCardCollapse('scheduler-settings', !collapsedCards['scheduler-settings'])}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {collapsedCards['scheduler-settings'] ? '▼' : '▲'}
                  </button>
                </div>
              </div>
              {!collapsedCards['scheduler-settings'] && (
                <div className="p-6">
                  <SchedulerSettings />
                </div>
              )}
            </div>
          )}

          {activeTab === 'onchain' && (
            <div className={`bg-white shadow rounded-lg ${collapsedCards['onchain-settings'] ? 'opacity-50' : ''}`}>
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">On-Chain Settings</h3>
                  <button
                    onClick={() => handleCardCollapse('onchain-settings', !collapsedCards['onchain-settings'])}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {collapsedCards['onchain-settings'] ? '▼' : '▲'}
                  </button>
                </div>
              </div>
              {!collapsedCards['onchain-settings'] && (
                <div className="p-6">
                  <OnChainSettings />
                </div>
              )}
            </div>
          )}

          {activeTab === 'realtime-websocket' && (
            <div className={`bg-white shadow rounded-lg ${collapsedCards['realtime-websocket'] ? 'opacity-50' : ''}`}>
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Realtime & WebSocket Settings</h3>
                  <button
                    onClick={() => handleCardCollapse('realtime-websocket', !collapsedCards['realtime-websocket'])}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {collapsedCards['realtime-websocket'] ? '▼' : '▲'}
                  </button>
                </div>
              </div>
              {!collapsedCards['realtime-websocket'] && (
                <div className="p-6">
                  <RealtimeWebSocketSettings />
                </div>
              )}
            </div>
          )}

          {activeTab === 'ticker' && (
            <div className={`bg-white shadow rounded-lg ${collapsedCards['ticker-management'] ? 'opacity-50' : ''}`}>
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">
                    📈 Ticker Management
                  </h3>
                  <button
                    onClick={() => handleCardCollapse('ticker-management', !collapsedCards['ticker-management'])}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {collapsedCards['ticker-management'] ? '▼' : '▲'}
                  </button>
                </div>
              </div>
              {!collapsedCards['ticker-management'] && (
                <div className="p-6">
                  <TickerTableAgGrid
                    assetType={tickerActiveTab}
                    onSettingChange={(assetId: number, setting: string, value: boolean) => {
                      console.log('Setting change:', assetId, setting, value)
                    }}
                    onExecute={(assetId: number) => {
                      console.log('Execute:', assetId)
                    }}
                    onDelete={(assetId: number) => {
                      console.log('Delete:', assetId)
                    }}
                    searchTerm={tickerSearchTerm}
                    onSearchChange={setTickerSearchTerm}
                    isExecuting={false}
                    executingTickers={[]}
                    onExecutePerAsset={(assetId: number) => {
                      console.log('Execute per asset:', assetId)
                    }}
                    onBulkSave={() => {
                      console.log('Bulk save')
                    }}
                    isBulkUpdatingSettings={false}
                    height={600}
                    onAssetTypeChange={setTickerActiveTab}
                    isTabActive={activeTab === 'ticker'}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div className={`bg-white shadow rounded-lg ${collapsedCards['logs'] ? 'opacity-50' : ''}`}>
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      📋 System Logs
                    </h3>
                    <button
                      onClick={() => handleCardCollapse('logs', !collapsedCards['logs'])}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {collapsedCards['logs'] ? '▼' : '▲'}
                    </button>
                  </div>
                </div>
                      {!collapsedCards['logs'] && (
                        <div className="p-6">
                          <LogsTable />
                        </div>
                      )}
              </div>
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Real-time Logs</h3>
                </div>
                <div className="p-6">
                  <RealTimeLogs />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}