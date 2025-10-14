"use client"

import React, { useState } from 'react'
import OnChainChart from '@/components/charts/onchaincharts/OnChainChart'

const OnChainChartPage: React.FC = () => {
  const [selectedAssetId, setSelectedAssetId] = useState('1') // Default to Bitcoin

  const assets = [
    { value: '1', label: 'Bitcoin (BTC)' },
    { value: '2', label: 'Ethereum (ETH)' },
    { value: '3', label: 'Cardano (ADA)' },
    { value: '4', label: 'Polkadot (DOT)' },
    { value: '5', label: 'Chainlink (LINK)' },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">On-Chain Chart</h1>
        <p className="text-gray-600">온체인 데이터 차트를 확인하세요.</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              자산 선택
            </label>
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {assets.map((asset) => (
                <option key={asset.value} value={asset.value}>
                  {asset.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Chart */}
      <OnChainChart
        assetId={selectedAssetId}
        title={`On-Chain Data - ${assets.find(a => a.value === selectedAssetId)?.label}`}
        height={600}
        showRangeSelector={true}
      />
    </div>
  )
}

export default OnChainChartPage
