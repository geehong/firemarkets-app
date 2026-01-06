'use client'

import React, { useState } from 'react'

const SchedulerSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    dataCollectionInterval: 60,
    ohlcvInterval: '1d',
    enableHistoricalBackfill: true,
    apiRequestTimeout: 30,
    batchProcessingRetryAttempts: 3,
    enableImmediateExecution: false,
  })

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      // API 호출 로직 (나중에 구현)
      await new Promise(resolve => setTimeout(resolve, 1000)) // 임시 지연
      console.log('Settings saved:', settings)
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setSettings({
      dataCollectionInterval: 60,
      ohlcvInterval: '1d',
      enableHistoricalBackfill: true,
      apiRequestTimeout: 30,
      batchProcessingRetryAttempts: 3,
      enableImmediateExecution: false,
    })
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Basic Settings</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Collection Interval (minutes)
            </label>
            <input
              type="number"
              value={settings.dataCollectionInterval}
              onChange={(e) => setSettings(prev => ({ ...prev, dataCollectionInterval: parseInt(e.target.value) }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OHLCV Data Interval
            </label>
            <select
              value={settings.ohlcvInterval}
              onChange={(e) => setSettings(prev => ({ ...prev, ohlcvInterval: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1d">1 Day</option>
              <option value="1h">1 Hour</option>
              <option value="4h">4 Hours</option>
              <option value="1w">1 Week</option>
              <option value="1m">1 Month</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Request Timeout (seconds)
            </label>
            <input
              type="number"
              value={settings.apiRequestTimeout}
              onChange={(e) => setSettings(prev => ({ ...prev, apiRequestTimeout: parseInt(e.target.value) }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Batch Processing Retry Attempts
            </label>
            <input
              type="number"
              value={settings.batchProcessingRetryAttempts}
              onChange={(e) => setSettings(prev => ({ ...prev, batchProcessingRetryAttempts: parseInt(e.target.value) }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Advanced Settings</h4>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="enableHistoricalBackfill"
              checked={settings.enableHistoricalBackfill}
              onChange={(e) => setSettings(prev => ({ ...prev, enableHistoricalBackfill: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="enableHistoricalBackfill" className="ml-2 block text-sm text-gray-900">
              Enable Historical Data Backfill
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="enableImmediateExecution"
              checked={settings.enableImmediateExecution}
              onChange={(e) => setSettings(prev => ({ ...prev, enableImmediateExecution: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="enableImmediateExecution" className="ml-2 block text-sm text-gray-900">
              Enable Immediate Execution on Startup
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Actions</h4>
        
        <div className="flex space-x-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
                </svg>
                Save Settings
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
            Reset to Default
          </button>
        </div>
      </div>
    </div>
  )
}

export default SchedulerSettings
