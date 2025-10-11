"use client"

import ClientOnlyOnChainChart from "@/components/charts/onchaincharts/ClientOnlyOnChainChart"

export default function OnChainChartPage() {
  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">On-Chain Charts</h1>
        <p className="text-gray-600">비트코인 온체인 메트릭 분석 차트</p>
      </div>
      
      <div className="space-y-8">
        {/* MVRV Z-Score 상관관계 차트 */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">📊 Bitcoin Price vs MVRV Z-Score</h2>
          <ClientOnlyOnChainChart 
            type="onchain"
            assetId="BTCUSDT"
            title="Bitcoin Price vs MVRV Z-Score Correlation"
            height={600}
            showRangeSelector={true}
            showStockTools={false}
            showExporting={true}
            metricId="mvrv_z_score"
          />
        </div>

        {/* 다양한 온체인 메트릭 테스트 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">SOPR (Spent Output Profit Ratio)</h3>
            <ClientOnlyOnChainChart 
              type="onchain"
              assetId="BTCUSDT"
              title="Bitcoin Price vs SOPR"
              height={400}
              showRangeSelector={false}
              showStockTools={false}
              showExporting={false}
              metricId="sopr"
            />
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">Realized Price</h3>
            <ClientOnlyOnChainChart 
              type="onchain"
              assetId="BTCUSDT"
              title="Bitcoin Price vs Realized Price"
              height={400}
              showRangeSelector={false}
              showStockTools={false}
              showExporting={false}
              metricId="realized_price"
            />
          </div>
        </div>

        {/* 하빙 차트 */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">🪓 Bitcoin Halving Analysis</h2>
          <ClientOnlyOnChainChart 
            type="halving"
            title="Bitcoin Halving Price Analysis"
            height={800}
            showRangeSelector={false}
            showExporting={true}
          />
        </div>

        {/* 하빙 차트 - 간단한 버전 */}
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-3">Halving Chart (Compact)</h3>
          <ClientOnlyOnChainChart 
            type="halving"
            title="Bitcoin Halving Events"
            height={500}
            showRangeSelector={false}
            showExporting={false}
          />
        </div>
      </div>
    </div>
  )
}
