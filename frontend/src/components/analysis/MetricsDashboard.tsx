import React from 'react';

interface MetricsDashboardProps {
  correlation: number;
  agreementRate: number;
  currentDrawdown: number;
  fractalDrawdown: number;
}

export default function MetricsDashboard({
  correlation,
  agreementRate,
  currentDrawdown,
  fractalDrawdown,
}: MetricsDashboardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">상관계수 (Correlation)</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {(correlation * 100).toFixed(2)}%
        </p>
        <p className="text-xs text-gray-400 mt-2">두 사이클의 전반적 유사도</p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">방향성 일치율</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {agreementRate.toFixed(2)}%
        </p>
        <p className="text-xs text-gray-400 mt-2">일일 등락 방향(Up/Down) 일치율</p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">현재 최대 낙폭 (MDD)</h3>
        <p className="text-2xl font-bold text-red-500">
          -{Math.abs(currentDrawdown).toFixed(2)}%
        </p>
        <p className="text-xs text-gray-400 mt-2">최근 고점 대비 하락률</p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">과거 프랙탈 낙폭 (MDD)</h3>
        <p className="text-2xl font-bold text-orange-500">
          -{Math.abs(fractalDrawdown).toFixed(2)}%
        </p>
        <p className="text-xs text-gray-400 mt-2">비교 구간의 과거 최대 낙폭</p>
      </div>
    </div>
  );
}
