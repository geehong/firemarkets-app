"use client"

import React, { useState } from 'react'
import MiniPriceChart from '@/components/charts/minicharts/MiniPriceChart'
import MiniPriceCryptoChart from '@/components/charts/minicharts/MiniPriceCryptoChart'
import MiniPriceStocksEtfChart from '@/components/charts/minicharts/MiniPriceStocksEtfChart'
import MiniPriceCommoditiesChart from '@/components/charts/minicharts/MiniPriceCommoditiesChart'

const MiniChartPage: React.FC = () => {
  const [selectedAsset, setSelectedAsset] = useState('BTCUSDT')
  const [selectedChartType, setSelectedChartType] = useState('crypto')
  const [useWebSocket, setUseWebSocket] = useState(true)

  const cryptoAssets = [
    'BTCUSDT',
    'ETHUSDT', 
    'ADAUSDT',
    'DOTUSDT',
    'XRPUSDT',
    'DOGEUSDT',
    'LTCUSDT',
    'BCHUSDT'
  ]

  const stockAssets = [
    'AAPL',
    'GOOG',
    'MSFT',
    'AMZN',
    'TSLA',
    'NVDA'
  ]

  const commodityAssets = [
    'GCUSD', // Gold
    'SIUSD'  // Silver
  ]

  // 선택된 차트 타입에 따른 자산 목록
  const getAssetsByType = (chartType: string) => {
    switch (chartType) {
      case 'crypto':
        return cryptoAssets
      case 'stocks':
        return stockAssets
      case 'commodities':
        return commodityAssets
      default:
        return cryptoAssets
    }
  }

  const assets = getAssetsByType(selectedChartType)

  const chartTypes = [
    { value: 'crypto', label: 'Crypto' },
    { value: 'stocks', label: 'Stocks' },
    { value: 'commodities', label: 'Commodities' }
  ]

  // 자산별 적절한 차트 컴포넌트 선택 함수
  const getChartComponent = (asset: string, chartType: string) => {
    if (chartType === 'crypto' || cryptoAssets.includes(asset)) {
      return MiniPriceCryptoChart
    } else if (chartType === 'stocks' || stockAssets.includes(asset)) {
      return MiniPriceStocksEtfChart
    } else if (chartType === 'commodities' || commodityAssets.includes(asset)) {
      return MiniPriceCommoditiesChart
    } else {
      return MiniPriceChart // 기본 차트
    }
  }

  // 자산 이름 매핑
  const getAssetName = (asset: string) => {
    const assetNames: { [key: string]: string } = {
      // Crypto
      'BTCUSDT': 'Bitcoin',
      'ETHUSDT': 'Ethereum',
      'ADAUSDT': 'Cardano',
      'DOTUSDT': 'Polkadot',
      'XRPUSDT': 'XRP',
      'DOGEUSDT': 'Dogecoin',
      'LTCUSDT': 'Litecoin',
      'BCHUSDT': 'Bitcoin Cash',
      // Stocks
      'AAPL': 'Apple',
      'GOOG': 'Google',
      'MSFT': 'Microsoft',
      'AMZN': 'Amazon',
      'TSLA': 'Tesla',
      'NVDA': 'NVIDIA',
      // Commodities
      'GCUSD': 'Gold',
      'SIUSD': 'Silver'
    }
    return assetNames[asset] || asset
  }

  // 차트 타입 변경 시 첫 번째 자산으로 자동 선택
  const handleChartTypeChange = (newChartType: string) => {
    setSelectedChartType(newChartType)
    const newAssets = getAssetsByType(newChartType)
    if (newAssets.length > 0) {
      setSelectedAsset(newAssets[0])
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Mini Price Charts</h1>
        <p className="text-gray-600">Real-time mini price charts with delayed quotes data</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Asset Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asset
            </label>
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {assets.map((asset) => (
                <option key={asset} value={asset}>
                  {asset}
                </option>
              ))}
            </select>
          </div>

          {/* Chart Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chart Type
            </label>
            <select
              value={selectedChartType}
              onChange={(e) => handleChartTypeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {chartTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* WebSocket Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WebSocket
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="useWebSocket"
                checked={useWebSocket}
                onChange={(e) => setUseWebSocket(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="useWebSocket" className="ml-2 text-sm text-gray-700">
                Enable real-time updates
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Display */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {selectedAsset} Price Chart
          </h2>
          <div className="text-sm text-gray-600">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
              {selectedChartType.toUpperCase()}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {useWebSocket ? 'REAL-TIME' : 'STATIC'}
            </span>
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-gray-50">
          {(() => {
            const ChartComponent = getChartComponent(selectedAsset, selectedChartType)
            const assetName = getAssetName(selectedAsset)
            
            return (
              <ChartComponent
                containerId={`mini-chart-${selectedAsset.toLowerCase()}`}
                assetIdentifier={selectedAsset}
                chartType={selectedChartType}
                useWebSocket={useWebSocket}
                apiInterval="15m"
                marketHours={selectedChartType === 'stocks' ? true : null}
                title={`${assetName}(${selectedAsset})`}
              />
            )
          })()}
        </div>
      </div>

      {/* Multiple Charts Demo */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Multiple Charts Demo</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {assets.slice(0, 6).map((asset) => {
            const assetName = getAssetName(asset)
            
            return (
              <div key={asset} className="bg-white rounded-lg p-4 shadow-sm border">
                <div className="h-48 relative overflow-hidden">
                  {(() => {
                    const ChartComponent = getChartComponent(asset, selectedChartType)
                    return (
                      <ChartComponent
                        containerId={`mini-chart-demo-${asset.toLowerCase()}`}
                        assetIdentifier={asset}
                        chartType={selectedChartType}
                        useWebSocket={useWebSocket}
                        apiInterval="15m"
                        title={`${assetName}(${asset})`}
                      />
                    )
                  })()}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default MiniChartPage
