"use client"

import React, { useState } from 'react'
import OHLCVChart from '@/components/charts/ohlcvcharts/OHLCVChart'

const OHLCVChartPage: React.FC = () => {
  const [selectedAsset, setSelectedAsset] = useState('BTCUSDT')
  const [selectedInterval, setSelectedInterval] = useState('1d')
  const [useIntraday, setUseIntraday] = useState(false)

  const assets = [
    { value: 'BTCUSDT', label: 'Bitcoin (BTCUSDT)' },
    { value: 'ETHUSDT', label: 'Ethereum (ETHUSDT)' },
    { value: 'ADAUSDT', label: 'Cardano (ADAUSDT)' },
    { value: 'DOTUSDT', label: 'Polkadot (DOTUSDT)' },
    { value: 'LINKUSDT', label: 'Chainlink (LINKUSDT)' },
  ]

  const timeIntervals = [
    { value: '15m', label: '15 Minutes' },
    { value: '1h', label: '1 Hour' },
    { value: '4h', label: '4 Hours' },
  ]

  const dailyIntervals = [
    { value: '1d', label: '1 Day' },
    { value: '1w', label: '1 Week' },
    { value: '1m', label: '1 Month' },
  ]

  const currentIntervals = useIntraday ? timeIntervals : dailyIntervals

  // 데이터 소스 변경 시 간격 자동 조정
  const handleDataSourceChange = (isIntraday: boolean) => {
    setUseIntraday(isIntraday)
    // 현재 선택된 간격이 새로운 데이터 소스에 없으면 첫 번째 간격으로 변경
    const newIntervals = isIntraday ? timeIntervals : dailyIntervals
    if (!newIntervals.find(interval => interval.value === selectedInterval)) {
      setSelectedInterval(newIntervals[0].value)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">OHLCV Chart</h1>
        <p className="text-gray-600">실시간 가격 차트와 거래량 데이터를 확인하세요.</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              자산 선택
            </label>
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {assets.map((asset) => (
                <option key={asset.value} value={asset.value}>
                  {asset.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              시간 간격
            </label>
            <select
              value={selectedInterval}
              onChange={(e) => setSelectedInterval(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {currentIntervals.map((interval) => (
                <option key={interval.value} value={interval.value}>
                  {interval.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              데이터 소스
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="dataSource"
                  checked={!useIntraday}
                  onChange={() => handleDataSourceChange(false)}
                  className="mr-2"
                />
                <span className="text-sm">일간 데이터 (1d, 1w, 1m)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="dataSource"
                  checked={useIntraday}
                  onChange={() => handleDataSourceChange(true)}
                  className="mr-2"
                />
                <span className="text-sm">시간 데이터 (15m, 1h, 4h)</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <OHLCVChart
        assetIdentifier={selectedAsset}
        dataInterval={selectedInterval}
        height={600}
        showVolume={true}
        showRangeSelector={true}
        showExporting={true}
        title={`${selectedAsset} Price Chart`}
        subtitle={`${selectedInterval} interval - ${useIntraday ? 'Time' : 'Daily'} data`}
        useIntradayData={useIntraday}
        onDataLoad={(data) => {
          console.log('Chart data loaded:', data)
        }}
        onError={(error) => {
          console.error('Chart error:', error)
        }}
      />
    </div>
  )
}

export default OHLCVChartPage
