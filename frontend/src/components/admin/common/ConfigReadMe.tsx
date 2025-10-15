'use client'

import React, { useState } from 'react'

interface ConfigItem {
  key: string
  type: string
  description: string
  sensitive: boolean
}

interface ConfigGroup {
  id: string
  title: string
  icon: string
  color: string
  description: string
  configs: ConfigItem[]
}

const ConfigReadMe: React.FC = () => {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])

  const configGroups: ConfigGroup[] = [
    {
      id: 'api_keys',
      title: 'API Keys',
      icon: '🔑',
      color: 'red',
      description: 'Third-party API keys for data collection services',
      configs: [
        {
          key: 'ALPHA_VANTAGE_API_KEY_1',
          type: 'string',
          description: 'Alpha Vantage API Key (Primary)',
          sensitive: true,
        },
        {
          key: 'ALPHA_VANTAGE_API_KEY_2',
          type: 'string',
          description: 'Alpha Vantage API Key (Secondary)',
          sensitive: true,
        },
        {
          key: 'FMP_API_KEY',
          type: 'string',
          description: 'Financial Modeling Prep API Key',
          sensitive: true,
        },
        {
          key: 'COINMARKETCAP_API_KEY',
          type: 'string',
          description: 'CoinMarketCap API Key',
          sensitive: true,
        },
      ],
    },
    {
      id: 'scheduler_settings',
      title: 'Scheduler Settings',
      icon: '⏰',
      color: 'blue',
      description: 'Data collection scheduler and execution settings',
      configs: [
        {
          key: 'DATA_COLLECTION_INTERVAL_MINUTES',
          type: 'int',
          description: 'Data collection scheduler execution interval (minutes)',
          sensitive: false,
        },
        {
          key: 'OHLCV_DATA_INTERVAL',
          type: 'string',
          description: 'OHLCV data collection interval (1d, 1h, 4h, 1w, 1m)',
          sensitive: false,
        },
        {
          key: 'ENABLE_HISTORICAL_BACKFILL',
          type: 'boolean',
          description: 'Enable historical data backfill (fetch missing historical data)',
          sensitive: false,
        },
        {
          key: 'API_REQUEST_TIMEOUT_SECONDS',
          type: 'int',
          description: 'API request timeout (seconds)',
          sensitive: false,
        },
      ],
    },
    {
      id: 'onchain_metrics_toggles',
      title: 'On-chain Metrics Toggles',
      icon: '⛓️',
      color: 'green',
      description: 'Enable/disable collection of specific on-chain metrics',
      configs: [
        {
          key: 'ONCHAIN_COLLECT_MVRV_ZSCORE',
          type: 'boolean',
          description: 'Collect MVRV Z-Score',
          sensitive: false,
        },
        {
          key: 'ONCHAIN_COLLECT_SOPR',
          type: 'boolean',
          description: 'Collect SOPR',
          sensitive: false,
        },
        {
          key: 'ONCHAIN_COLLECT_HASHRATE',
          type: 'boolean',
          description: 'Collect Hashrate',
          sensitive: false,
        },
        {
          key: 'ONCHAIN_COLLECT_DIFFICULTY_BTC',
          type: 'boolean',
          description: 'Collect Difficulty (BTC)',
          sensitive: false,
        },
      ],
    },
    {
      id: 'realtime_settings',
      title: 'Realtime Settings',
      icon: '🔄',
      color: 'yellow',
      description: 'Real-time data processing and Redis streams settings',
      configs: [
        {
          key: 'REALTIME_PROCESSING_INTERVAL_SECONDS',
          type: 'float',
          description: '실시간 데이터 처리 주기 (초)',
          sensitive: false,
        },
        {
          key: 'REALTIME_BATCH_SIZE',
          type: 'int',
          description: '실시간 데이터 배치 처리 크기',
          sensitive: false,
        },
        {
          key: 'REALTIME_QUOTE_RETENTION_HOURS',
          type: 'int',
          description: '실시간 인용 데이터 보관 시간 (시간)',
          sensitive: false,
        },
      ],
    },
    {
      id: 'websocket_config',
      title: 'WebSocket Configuration',
      icon: '🌐',
      color: 'gray',
      description: 'WebSocket consumers and their behavior settings',
      configs: [
        {
          key: 'WEBSOCKET_TIME_WINDOW_MINUTES',
          type: 'int',
          description: '웹소켓 누적 저장 시간 윈도우 (분)',
          sensitive: false,
        },
        {
          key: 'WEBSOCKET_FINNHUB_ENABLED',
          type: 'boolean',
          description: 'Finnhub WebSocket Consumer 활성화 여부',
          sensitive: false,
        },
        {
          key: 'WEBSOCKET_BINANCE_ENABLED',
          type: 'boolean',
          description: 'Binance WebSocket Consumer 활성화 여부',
          sensitive: false,
        },
      ],
    },
  ]

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'string':
        return 'bg-blue-100 text-blue-800'
      case 'int':
        return 'bg-green-100 text-green-800'
      case 'float':
        return 'bg-cyan-100 text-cyan-800'
      case 'boolean':
        return 'bg-yellow-100 text-yellow-800'
      case 'json':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }

  return (
    <div>
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-400">ℹ️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Configuration Overview
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                This system uses grouped JSON configurations to organize related settings. 
                Each group contains multiple configuration items with their values, types, and metadata.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {configGroups.map((group) => (
          <div key={group.id} className="bg-white border border-gray-200 rounded-lg">
            <button
              className="w-full px-6 py-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
              onClick={() => toggleGroup(group.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{group.icon}</span>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{group.title}</h3>
                    <p className="text-sm text-gray-500">{group.description}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${group.color}-100 text-${group.color}-800 mr-3`}>
                    {group.configs.length} items
                  </span>
                  <span className="text-gray-400">
                    {expandedGroups.includes(group.id) ? '▼' : '▶'}
                  </span>
                </div>
              </div>
            </button>
            
            {expandedGroups.includes(group.id) && (
              <div className="px-6 pb-4 border-t border-gray-200">
                <div className="pt-4 space-y-3">
                  {group.configs.map((config) => (
                    <div key={config.key} className="flex items-start justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <span className="mr-2">
                            {config.sensitive ? '⚠️' : '✅'}
                          </span>
                          <code className="text-sm font-mono bg-gray-200 px-2 py-1 rounded mr-2">
                            {config.key}
                          </code>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(config.type)}`}>
                            {config.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{config.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          ⚙️ Configuration Structure
        </h3>
        
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">JSON Structure Example:</h4>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`{
  "config_key": "api_keys",
  "config_value": {
    "ALPHA_VANTAGE_API_KEY_1": {
      "value": "your_api_key_here",
      "type": "string",
      "description": "Alpha Vantage API Key (Primary)",
      "is_sensitive": true,
      "is_active": true
    }
  },
  "data_type": "json",
  "category": "grouped_configs"
}`}
          </pre>
        </div>
        
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Data Types:</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">string</span>
              Text values
            </div>
            <div className="flex items-center">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">int</span>
              Integer numbers
            </div>
            <div className="flex items-center">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800 mr-2">float</span>
              Decimal numbers
            </div>
            <div className="flex items-center">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mr-2">boolean</span>
              True/False values
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Security Notes:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li className="flex items-center">
              <span className="mr-2">⚠️</span>
              Sensitive configurations are marked and should be handled with care
            </li>
            <li className="flex items-center">
              <span className="mr-2">✅</span>
              Non-sensitive configurations can be safely modified
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default ConfigReadMe
