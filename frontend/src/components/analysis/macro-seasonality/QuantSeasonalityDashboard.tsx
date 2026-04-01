"use client"

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchQuantSeasonality } from '@/api/quantSeasonality';
import TimeframeWinRateMatrix from './TimeframeWinRateMatrix';
import SeasonalityHeatmapChart from './SeasonalityHeatmapChart';
import CrossAssetCorrelationChart from './CrossAssetCorrelationChart';
import IntradayEffectBarChart from './IntradayEffectBarChart';

interface QuantSeasonalityDashboardProps {
  locale?: string;
}

const QuantSeasonalityDashboard: React.FC<QuantSeasonalityDashboardProps> = ({ locale = 'en' }) => {
  const [rateRegime, setRateRegime] = useState<'all' | 'hiking' | 'cutting'>('all');
  const [compareTickers, setCompareTickers] = useState<string>('SPY,QQQ,GLD');

  const { data, isLoading, error } = useQuery({
    queryKey: ['quant-seasonality', rateRegime, compareTickers],
    queryFn: () => fetchQuantSeasonality({ rateRegime, compare: compareTickers }),
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500">{locale === 'ko' ? '퀀트 데이터 분석 중...' : 'Analyzing quant data...'}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-xl border border-red-100">
        <p className="text-red-600 font-medium">
          {locale === 'ko' ? '데이터를 불러오는데 실패했습니다.' : 'Failed to load quant seasonality data.'}
        </p>
        <p className="text-red-400 text-sm mt-1">{(error as any)?.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header & Global Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {locale === 'ko' ? '크로스 에셋 퀀트 분석' : 'Cross-Asset Quant Analysis'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {locale === 'ko' ? '비트코인 계절성, 상관관계 및 장중 효과 통계' : 'Bitcoin Seasonality, Correlation & Intraday Stats'}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200">
            {(['all', 'hiking', 'cutting'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRateRegime(r)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  rateRegime === r 
                    ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {r === 'all' ? (locale === 'ko' ? '전체' : 'All') : 
                 r === 'hiking' ? (locale === 'ko' ? '금리 인상기' : 'Hiking') : 
                 (locale === 'ko' ? '금리 인하기' : 'Cutting')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* A. Timeframe Win Rate Matrix */}
        <div className="col-span-1">
          <TimeframeWinRateMatrix 
            data={data.timeframe_winrate} 
            locale={locale} 
          />
        </div>

        {/* B. Intraday Effect (Hour/Weekday) */}
        <div className="col-span-1">
          <IntradayEffectBarChart 
            data={data.intraday_effect} 
            locale={locale} 
          />
        </div>

        {/* C. Seasonality Heatmap (Wide) */}
        <div className="col-span-1 lg:col-span-2">
          <SeasonalityHeatmapChart 
            monthlyData={data.monthly_seasonality[rateRegime]} 
            quarterlyData={data.quarterly_seasonality[rateRegime]}
            locale={locale} 
          />
        </div>

        {/* D. Cross-Asset Correlation (Wide) */}
        <div className="col-span-1 lg:col-span-2">
          <CrossAssetCorrelationChart 
            correlationData={data.rolling_correlation} 
            locale={locale} 
          />
        </div>
      </div>
      
      <div className="text-xs text-gray-400 text-center py-4 border-t border-gray-100 italic">
        {locale === 'ko' 
          ? `데이터 생성 시점: ${new Date(data.generated_at).toLocaleString('ko-KR')} | 분석 소스: ohlcv_intraday_data (1h)` 
          : `Data generated at: ${new Date(data.generated_at).toLocaleString()} | Source: ohlcv_intraday_data (1h)`}
      </div>
    </div>
  );
};

export default QuantSeasonalityDashboard;
