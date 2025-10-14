"use client"

import React from 'react'
import HalvingChart from '@/components/charts/onchaincharts/HalvingChart'

const HalvingChartPage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Bitcoin Halving Chart</h1>
        <p className="text-gray-600">비트코인 반감기 차트를 확인하세요.</p>
      </div>

      {/* Chart */}
      <HalvingChart
        title="Bitcoin Halving Events"
        height={600}
        showRangeSelector={true}
      />
    </div>
  )
}

export default HalvingChartPage
