"use client"

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchQuantSeasonality } from '@/api/quantSeasonality';
import TimeframeWinRateMatrix from './TimeframeWinRateMatrix';
import SeasonalityHeatmapChart from './SeasonalityHeatmapChart';
import CrossAssetCorrelationChart from './CrossAssetCorrelationChart';
import IntradayEffectBarChart from './IntradayEffectBarChart';
import RsiBacktestMatrix from './RsiBacktestMatrix';

interface QuantSeasonalityDashboardProps {
  locale?: string;
}

const QuantSeasonalityDashboard: React.FC<QuantSeasonalityDashboardProps> = ({ locale: propLocale = 'en' }) => {
  const searchParams = useSearchParams();
  const locale = searchParams.get('locale') || propLocale;

  const [rateRegime, setRateRegime] = useState<'all' | 'hiking' | 'cutting'>('all');
  const [compareTickers, setCompareTickers] = useState<string>('SPY,QQQ,GLD');
  const [compareInput, setCompareInput] = useState<string>('SPY,QQQ,GLD');
  const [lookbackDays, setLookbackDays] = useState<number | undefined>(undefined);
  const [tzOffset, setTzOffset] = useState<number>(0);
  const [rsiBuy, setRsiBuy] = useState<number>(15);
  const [rsiSell, setRsiSell] = useState<number>(50);

  const { data, isLoading, error, isPlaceholderData } = useQuery({
    queryKey: ['quant-seasonality', rateRegime, compareTickers, lookbackDays, tzOffset, rsiBuy, rsiSell],
    queryFn: () => fetchQuantSeasonality({ 
        rateRegime, 
        compare: compareTickers, 
        days: lookbackDays, 
        tz_offset: tzOffset,
        rsi_buy: rsiBuy,
        rsi_sell: rsiSell
    }),
    staleTime: 60 * 60 * 1000, 
  });

  const handleApplyTickers = () => {
      // Clean up input: remove spaces, convert to upper case
      const cleaned = compareInput.split(',').map(t => t.trim().toUpperCase()).filter(Boolean).join(',');
      if (cleaned) {
          setCompareTickers(cleaned);
      }
  };

  const presets = [
      { name: 'Macro Mix', value: 'SPY,QQQ,GLD' },
      { name: 'Tech Core', value: 'AAPL,MSFT,NVDA' },
      { name: 'Currencies', value: 'UUP,FXE,FXY' },
      { name: 'Altcoins', value: 'ETH,SOL,BNB' }
  ];

  if (!data && (isLoading || error)) {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">{locale === 'ko' ? '퀀트 데이터 분석 중...' : 'Analyzing quant data...'}</p>
        </div>
      );
    }
    return (
      <div className="p-8 text-center bg-red-50 rounded-xl border border-red-100">
        <p className="text-red-600 font-bold uppercase tracking-widest text-[10px] mb-2 font-medium">
          {locale === 'ko' ? '데이터를 불러오는데 실패했습니다.' : 'Failed to load quant seasonality data.'}
        </p>
        <p className="text-red-400 text-sm mt-1">{(error as any)?.message}</p>
      </div>
    );
  }

  // At this point, data is guaranteed to exist for the rest of the component
  const dashboardData = data as NonNullable<typeof data>;

  return (
    <div className={`space-y-8 animate-in fade-in duration-700 transition-opacity ${isLoading ? 'opacity-70' : 'opacity-100'}`}>
      {/* Header & Global Filters */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
              <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
              {locale === 'ko' ? '크로스-에셋 퀀트 계절성 분석' : 'Cross-Asset Quant Seasonality'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 font-medium">
              {locale === 'ko' ? 'BTC 계절성 매트릭스 및 매크로 자산간 실시간 상관 추세' : 'Bitcoin seasonality matrix and real-time correlation trends among macro assets.'}
            </p>
            
            {/* Input / Progressive Controls */}
            <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-full sm:w-auto">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1.5 ml-1">Asset Comparison (Ticker CSV)</p>
                    <div className="flex gap-2">
                        <input 
                            type="text"
                            value={compareInput}
                            onChange={(e) => setCompareInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleApplyTickers()}
                            className="bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all w-64 shadow-inner"
                            placeholder="e.g. SPY,NVDA,BTC"
                        />
                        <button 
                            onClick={handleApplyTickers}
                            disabled={isLoading}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2.5 rounded-xl text-sm font-black transition-all shadow-lg shadow-blue-500/10 active:scale-95 flex items-center gap-2"
                        >
                            {isLoading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                            {locale === 'ko' ? '적용' : 'APPLY'}
                        </button>
                    </div>
                </div>
                
                <div className="hidden md:block">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1.5 ml-1">Presets</p>
                    <div className="flex gap-2">
                        {presets.map(p => (
                            <button
                                key={p.name}
                                onClick={() => { setCompareInput(p.value); setCompareTickers(p.value); }}
                                className="px-3 py-2 text-[10px] font-black uppercase border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 rounded-lg hover:text-blue-500 hover:border-blue-500/30 transition-all"
                            >
                                {p.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-end gap-6">
            {/* Period Selector */}
            <div className="flex flex-col items-start gap-1.5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Analysis Period</p>
                <select 
                    value={lookbackDays === undefined ? 'all' : lookbackDays.toString()}
                    onChange={(e) => setLookbackDays(e.target.value === 'all' ? undefined : parseInt(e.target.value))}
                    className="bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner"
                >
                    <option value="all">{locale === 'ko' ? '전체 (2015~)' : 'ALL TIME'}</option>
                    <option value={365 * 5}>{locale === 'ko' ? '최근 5년' : '5 YEARS'}</option>
                    <option value={365 * 3}>{locale === 'ko' ? '최근 3년' : '3 YEARS'}</option>
                    <option value={365 * 1}>{locale === 'ko' ? '최근 1년' : '1 YEAR'}</option>
                </select>
            </div>

            {/* Timezone Selector */}
            <div className="flex flex-col items-start gap-1.5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Reference Zone</p>
                <select 
                    value={tzOffset}
                    onChange={(e) => setTzOffset(parseInt(e.target.value))}
                    className="bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-inner"
                >
                    <option value={0}>UTC (Global)</option>
                    <option value={9}>KST Korea (UTC+9)</option>
                </select>
            </div>

            {/* RSI Backtest Settings */}
            <div className="flex items-end gap-3 bg-blue-50/50 dark:bg-blue-900/20 p-2 rounded-2xl border border-blue-100 dark:border-blue-800 shadow-inner">
                <div className="flex flex-col items-start gap-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/60 ml-1">RSI Buy</p>
                    <input 
                        type="number" 
                        value={rsiBuy} 
                        onChange={(e) => setRsiBuy(Number(e.target.value))}
                        className="w-16 bg-white dark:bg-gray-800 border-none rounded-lg px-2 py-1.5 text-xs font-black text-blue-600 shadow-sm focus:ring-2 focus:ring-blue-500/10"
                    />
                </div>
                <div className="flex flex-col items-start gap-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400/60 ml-1">RSI Sell</p>
                    <input 
                        type="number" 
                        value={rsiSell} 
                        onChange={(e) => setRsiSell(Number(e.target.value))}
                        className="w-16 bg-white dark:bg-gray-800 border-none rounded-lg px-2 py-1.5 text-xs font-black text-rose-500 shadow-sm focus:ring-2 focus:ring-rose-500/10"
                    />
                </div>
            </div>

            {/* Regime Filter */}
            <div className="flex flex-col items-start gap-1.5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Economic Regime</p>
                <div className="flex bg-gray-50 dark:bg-gray-900/50 rounded-xl p-1 border border-gray-100 dark:border-gray-700 shadow-inner">
                    {(['all', 'hiking', 'cutting'] as const).map((r) => (
                    <button
                        key={r}
                        onClick={() => setRateRegime(r)}
                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                        rateRegime === r 
                            ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-md ring-1 ring-black/5' 
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                        }`}
                    >
                        {r === 'all' ? (locale === 'ko' ? '전체' : 'All') : 
                        r === 'hiking' ? (locale === 'ko' ? '인상' : 'Hiking') : 
                        (locale === 'ko' ? '인하' : 'Cutting')}
                    </button>
                    ))}
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* A. Timeframe Win Rate Matrix */}
        <div className="col-span-1">
          <TimeframeWinRateMatrix 
            data={dashboardData.timeframe_winrate} 
          />
        </div>

        {/* B. RSI Backtest Matrix (NEW) */}
        <div className="col-span-1">
          <RsiBacktestMatrix 
            data={dashboardData.rsi_backtest}
            rsiBuy={rsiBuy}
            rsiSell={rsiSell}
          />
        </div>

        {/* C. Intraday Effect (Hour/Weekday) */}
        <div className="col-span-1 lg:col-span-2">
          <IntradayEffectBarChart 
            data={dashboardData.intraday_effect} 
          />
        </div>

        {/* D. Seasonality Heatmap (Wide) */}
        <div className="col-span-1 lg:col-span-2">
          <SeasonalityHeatmapChart 
            monthlyData={dashboardData.monthly_seasonality[rateRegime]} 
            quarterlyData={dashboardData.quarterly_seasonality[rateRegime]}
          />
        </div>

        {/* E. Cross-Asset Correlation (Wide) */}
        <div className="col-span-1 lg:col-span-2">
          <CrossAssetCorrelationChart 
            correlationData={dashboardData.rolling_correlation} 
          />
        </div>
      </div>
      
      <div className="text-xs text-gray-400 text-center py-4 border-t border-gray-100 italic">
        {locale === 'ko' 
          ? `데이터 생성 시점: ${new Date(dashboardData.generated_at).toLocaleString('ko-KR')} | 분석 소스: ohlcv_intraday_data (1h)` 
          : `Data generated at: ${new Date(dashboardData.generated_at).toLocaleString()} | Source: ohlcv_intraday_data (1h)`}
      </div>
    </div>
  );
};

export default QuantSeasonalityDashboard;
