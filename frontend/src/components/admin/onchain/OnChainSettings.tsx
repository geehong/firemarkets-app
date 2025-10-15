'use client'

import React, { useState } from 'react'

const OnChainSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    apiBaseUrl: 'https://api.onchaindata.com',
    apiDelaySeconds: 1,
    semaphoreLimit: 10,
    collectionIntervalHours: 24,
    apiPriority: 'primary,secondary',
  })

  const [metrics, setMetrics] = useState({
    mvrvZScore: true,
    sopr: true,
    nupl: true,
    realizedPrice: true,
    hashrate: true,
    difficultyBtc: true,
    minerReserves: true,
    etfBtcTotal: true,
    openInterestFutures: true,
    capRealUsd: true,
    cdd90dma: true,
    trueMarketMean: true,
    nrplBtc: true,
    aviv: true,
    thermoCap: true,
    hodlWavesSupply: true,
    etfBtcFlow: true,
  })

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      // API 호출 로직 (나중에 구현)
      await new Promise(resolve => setTimeout(resolve, 1000)) // 임시 지연
      console.log('OnChain settings saved:', { settings, metrics })
    } catch (error) {
      console.error('Failed to save onchain settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setSettings({
      apiBaseUrl: 'https://api.onchaindata.com',
      apiDelaySeconds: 1,
      semaphoreLimit: 10,
      collectionIntervalHours: 24,
      apiPriority: 'primary,secondary',
    })
    setMetrics({
      mvrvZScore: true,
      sopr: true,
      nupl: true,
      realizedPrice: true,
      hashrate: true,
      difficultyBtc: true,
      minerReserves: true,
      etfBtcTotal: true,
      openInterestFutures: true,
      capRealUsd: true,
      cdd90dma: true,
      trueMarketMean: true,
      nrplBtc: true,
      aviv: true,
      thermoCap: true,
      hodlWavesSupply: true,
      etfBtcFlow: true,
    })
  }

  const toggleMetric = (metric: string) => {
    setMetrics(prev => ({ ...prev, [metric]: !prev[metric] }))
  }

  return (
    <div className="space-y-6">
      {/* API Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">API Settings</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Base URL
            </label>
            <input
              type="url"
              value={settings.apiBaseUrl}
              onChange={(e) => setSettings(prev => ({ ...prev, apiBaseUrl: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Delay (seconds)
            </label>
            <input
              type="number"
              value={settings.apiDelaySeconds}
              onChange={(e) => setSettings(prev => ({ ...prev, apiDelaySeconds: parseInt(e.target.value) }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Semaphore Limit
            </label>
            <input
              type="number"
              value={settings.semaphoreLimit}
              onChange={(e) => setSettings(prev => ({ ...prev, semaphoreLimit: parseInt(e.target.value) }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Collection Interval (hours)
            </label>
            <input
              type="number"
              value={settings.collectionIntervalHours}
              onChange={(e) => setSettings(prev => ({ ...prev, collectionIntervalHours: parseInt(e.target.value) }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Priority Order
          </label>
          <input
            type="text"
            value={settings.apiPriority}
            onChange={(e) => setSettings(prev => ({ ...prev, apiPriority: e.target.value }))}
            placeholder="primary,secondary,tertiary"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Metrics Toggles */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">On-chain Metrics Collection</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(metrics).map(([key, enabled]) => (
            <div key={key} className="flex items-center">
              <input
                type="checkbox"
                id={key}
                checked={enabled}
                onChange={() => toggleMetric(key)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor={key} className="ml-2 block text-sm text-gray-900">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
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

export default OnChainSettings
