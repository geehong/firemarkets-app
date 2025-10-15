'use client'

import React, { useState } from 'react'

const RealtimeWebSocketSettings: React.FC = () => {
  const [realtimeSettings, setRealtimeSettings] = useState({
    processingIntervalSeconds: 1.0,
    batchSize: 100,
    quoteRetentionHours: 24,
    streamBlockMs: 1000,
    displayIntervalSeconds: 1.0,
    dataFreshnessThresholdSeconds: 30,
  })

  const [websocketSettings, setWebsocketSettings] = useState({
    timeWindowMinutes: 60,
    consumerGroupPrefix: 'ws_consumer',
    reconnectDelaySeconds: 5,
    healthCheckIntervalSeconds: 30,
    consumerIntervalSeconds: 1,
  })

  const [websocketConsumers, setWebsocketConsumers] = useState({
    finnhub: true,
    binance: true,
    alpaca: true,
    tiingo: true,
    twelvedata: true,
    swissquote: true,
    coinbase: true,
  })

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      // API 호출 로직 (나중에 구현)
      await new Promise(resolve => setTimeout(resolve, 1000)) // 임시 지연
      console.log('Realtime WebSocket settings saved:', { 
        realtimeSettings, 
        websocketSettings, 
        websocketConsumers 
      })
    } catch (error) {
      console.error('Failed to save realtime websocket settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setRealtimeSettings({
      processingIntervalSeconds: 1.0,
      batchSize: 100,
      quoteRetentionHours: 24,
      streamBlockMs: 1000,
      displayIntervalSeconds: 1.0,
      dataFreshnessThresholdSeconds: 30,
    })
    setWebsocketSettings({
      timeWindowMinutes: 60,
      consumerGroupPrefix: 'ws_consumer',
      reconnectDelaySeconds: 5,
      healthCheckIntervalSeconds: 30,
      consumerIntervalSeconds: 1,
    })
    setWebsocketConsumers({
      finnhub: true,
      binance: true,
      alpaca: true,
      tiingo: true,
      twelvedata: true,
      swissquote: true,
      coinbase: true,
    })
  }

  const toggleConsumer = (consumer: string) => {
    setWebsocketConsumers(prev => ({ ...prev, [consumer]: !prev[consumer] }))
  }

  return (
    <div className="space-y-6">
      {/* Realtime Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Realtime Data Processing</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Processing Interval (seconds)
            </label>
            <input
              type="number"
              step="0.1"
              value={realtimeSettings.processingIntervalSeconds}
              onChange={(e) => setRealtimeSettings(prev => ({ ...prev, processingIntervalSeconds: parseFloat(e.target.value) }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Batch Size
            </label>
            <input
              type="number"
              value={realtimeSettings.batchSize}
              onChange={(e) => setRealtimeSettings(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quote Retention (hours)
            </label>
            <input
              type="number"
              value={realtimeSettings.quoteRetentionHours}
              onChange={(e) => setRealtimeSettings(prev => ({ ...prev, quoteRetentionHours: parseInt(e.target.value) }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stream Block Time (ms)
            </label>
            <input
              type="number"
              value={realtimeSettings.streamBlockMs}
              onChange={(e) => setRealtimeSettings(prev => ({ ...prev, streamBlockMs: parseInt(e.target.value) }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Interval (seconds)
            </label>
            <input
              type="number"
              step="0.1"
              value={realtimeSettings.displayIntervalSeconds}
              onChange={(e) => setRealtimeSettings(prev => ({ ...prev, displayIntervalSeconds: parseFloat(e.target.value) }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Freshness Threshold (seconds)
            </label>
            <input
              type="number"
              value={realtimeSettings.dataFreshnessThresholdSeconds}
              onChange={(e) => setRealtimeSettings(prev => ({ ...prev, dataFreshnessThresholdSeconds: parseInt(e.target.value) }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* WebSocket Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">WebSocket Configuration</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Window (minutes)
            </label>
            <input
              type="number"
              value={websocketSettings.timeWindowMinutes}
              onChange={(e) => setWebsocketSettings(prev => ({ ...prev, timeWindowMinutes: parseInt(e.target.value) }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Consumer Group Prefix
            </label>
            <input
              type="text"
              value={websocketSettings.consumerGroupPrefix}
              onChange={(e) => setWebsocketSettings(prev => ({ ...prev, consumerGroupPrefix: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reconnect Delay (seconds)
            </label>
            <input
              type="number"
              value={websocketSettings.reconnectDelaySeconds}
              onChange={(e) => setWebsocketSettings(prev => ({ ...prev, reconnectDelaySeconds: parseInt(e.target.value) }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Health Check Interval (seconds)
            </label>
            <input
              type="number"
              value={websocketSettings.healthCheckIntervalSeconds}
              onChange={(e) => setWebsocketSettings(prev => ({ ...prev, healthCheckIntervalSeconds: parseInt(e.target.value) }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Consumer Interval (seconds)
            </label>
            <input
              type="number"
              value={websocketSettings.consumerIntervalSeconds}
              onChange={(e) => setWebsocketSettings(prev => ({ ...prev, consumerIntervalSeconds: parseInt(e.target.value) }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* WebSocket Consumers */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">WebSocket Consumers</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(websocketConsumers).map(([consumer, enabled]) => (
            <div key={consumer} className="flex items-center">
              <input
                type="checkbox"
                id={consumer}
                checked={enabled}
                onChange={() => toggleConsumer(consumer)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor={consumer} className="ml-2 block text-sm text-gray-900 capitalize">
                {consumer}
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

export default RealtimeWebSocketSettings
