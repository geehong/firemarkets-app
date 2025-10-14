"use client"

import React, { useState } from 'react'
import PerformanceTreeMapToday from '@/components/charts/treemap/PerformanceTreeMapToday'

const TreeMapChartPage: React.FC = () => {
  const [height, setHeight] = useState(650)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(900000) // 15분

  const heightOptions = [
    { value: 500, label: 'Small (500px)' },
    { value: 650, label: 'Medium (650px)' },
    { value: 800, label: 'Large (800px)' },
  ]

  const intervalOptions = [
    { value: 300000, label: '5 minutes' },
    { value: 600000, label: '10 minutes' },
    { value: 900000, label: '15 minutes' },
    { value: 1800000, label: '30 minutes' },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Performance TreeMap Chart</h1>
        <p className="text-gray-600">자산 성과를 시각화한 트리맵 차트를 확인하세요.</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              차트 높이
            </label>
            <select
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {heightOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              자동 새로고침 간격
            </label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {intervalOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              자동 새로고침
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="autoRefresh" className="ml-2 block text-sm text-gray-700">
                {autoRefresh ? '활성화' : '비활성화'}
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <PerformanceTreeMapToday
          height={height}
          autoRefresh={autoRefresh}
          refreshInterval={refreshInterval}
        />
      </div>

      {/* Information */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">TreeMap 차트 정보</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>색상:</strong> 빨간색(손실) → 회색(중립) → 초록색(이익)</li>
          <li>• <strong>크기:</strong> 시가총액에 비례 (커머디티 70%, 크립토 130% 조정)</li>
          <li>• <strong>데이터 소스:</strong> /api/v1/assets/treemap/live (treemap_live_view)</li>
          <li>• <strong>상호작용:</strong> 클릭하여 드릴다운, 제목 클릭으로 자동 새로고침 토글</li>
          <li>• <strong>자산 유형:</strong> 주식, ETF, 암호화폐, 커머디티</li>
        </ul>
      </div>
    </div>
  )
}

export default TreeMapChartPage
