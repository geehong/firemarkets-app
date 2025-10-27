"use client";

import dynamic from 'next/dynamic';

// 클라이언트 사이드에서만 렌더링
const PerformanceTreeMapToday = dynamic(() => import('../../components/charts/treemap/PerformanceTreeMapToday'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 bg-gray-900">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <div className="mt-3 text-white">Loading TreeMap...</div>
      </div>
    </div>
  )
});

export default function MapPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Asset Performance TreeMap</h1>
          <p className="text-gray-300">
            Interactive visualization of today's asset performance by market cap and daily change
          </p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
          <PerformanceTreeMapToday 
            height={700}
            autoRefresh={true}
            refreshInterval={900000} // 15분
          />
        </div>
        
        <div className="mt-6 text-sm text-gray-400">
          <p>• Click on categories to drill down into individual assets</p>
          <p>• Color indicates daily performance: Red (loss) → Gray (neutral) → Green (gain)</p>
          <p>• Size represents market capitalization</p>
          <p>• Click the title to toggle auto-refresh</p>
        </div>
      </div>
    </div>
  );
}