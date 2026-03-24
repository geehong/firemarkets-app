'use client'

import React, { useMemo, useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import RollingLiveChart from '@/components/charts/live/RollingLiveChart';
import TradingViewWidget from '@/components/widgets/TradingViewWidget';
import FearAndGreedGauge from '@/components/analysis/speculative/FearAndGreedGauge';
import { useTheme } from 'next-themes';
import { useMacroData } from '@/hooks/analysis/useMacroData';
import SimpleAreaChart from '@/components/charts/SimpleAreaChart';
import { useFearAndGreed } from '@/hooks/analysis/useFearAndGreed';
import { Link } from '@/i18n/navigation';
import CombinedCryptoIndicatorChart from '@/components/charts/CombinedCryptoIndicatorChart';
import PerformanceTreeMapToday from '@/components/charts/treemap/PerformanceTreeMapToday';
import OHLCVVolumeChart from '@/components/charts/ohlcvcharts/OHLCVVolumeChart';
import LightWeightChart from '@/components/charts/minicharts/LightWeightChart';
import { useOnchainMetrics } from '@/hooks/useOnchain';
import { Time } from 'lightweight-charts';
import dynamic from 'next/dynamic';

const OnChainChart = dynamic(() => import('@/components/charts/onchaincharts/OnChainChart'), {
    ssr: false,
    loading: () => <div className="flex-1 w-full bg-slate-50 dark:bg-slate-900/50 animate-pulse rounded-lg mt-2" />
});

// Helper to check if US Market is open
const isUSMarketOpen = () => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour12: false,
        hour: 'numeric',
        minute: 'numeric',
        weekday: 'short'
    });
    const parts = formatter.formatToParts(now);
    const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));

    const day = partMap.weekday;
    const hour = parseInt(partMap.hour);
    const minute = parseInt(partMap.minute);

    if (day === 'Sat' || day === 'Sun') return false;

    const timeNum = hour * 100 + minute;
    // Standard market hours: 09:30 - 16:00
    return timeNum >= 930 && timeNum < 1600;
};

const DashBoardLiveMarketView = () => {
    const t = useTranslations('Dashboard');
    const locale = useLocale();
    const { theme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [selectedOnchainMetric, setSelectedOnchainMetric] = useState('mvrv_z_score');
    const [onchainLogScale, setOnchainLogScale] = useState(false);
    const { metrics: onchainMetrics } = useOnchainMetrics();

    useEffect(() => {
        setMounted(true);
        setIsOpen(isUSMarketOpen());
        const interval = setInterval(() => {
            setIsOpen(isUSMarketOpen());
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const isDark = theme === 'dark';
    const currentTheme = mounted ? (isDark ? 'dark' : 'light') : 'light';

    // FRED Macro Data
    const { data: macroData, loading: macroLoading } = useMacroData();
    const us10yValue = useMemo(() => {
        if (!macroData || !macroData.treasury || !macroData.treasury.data || !Array.isArray(macroData.treasury.data)) return null;
        
        const data = macroData.treasury.data;
        if (data.length === 0) return null;
        
        // Backend sorts by date DESC (latest first)
        const latest = data[0];
        const prev = data[1] || latest;
        
        const currentVal = latest.year10;
        const prevVal = prev.year10;
        
        if (currentVal === undefined) return null;
        
        const change = (currentVal - prevVal).toFixed(3);
        const changePercent = prevVal !== 0 ? ((currentVal - prevVal) / prevVal * 100).toFixed(2) : "0.00";
        
        return {
            value: currentVal.toFixed(2),
            change: change,
            changePercent: changePercent,
            lastUpdate: latest.date,
            history: data.map((d: any) => ({ date: d.date, value: d.year10 })),
            historyLW: data.map((d: any) => ({ 
                time: (new Date(d.date).getTime() / 1000) as Time, 
                value: d.year10 
            })).sort((a: any, b: any) => a.time - b.time)
        };
    }, [macroData]);

    // Fear & Greed Data
    const { history: fngHistory, loading: fngLoading } = useFearAndGreed();
    const fngChartDataLW = useMemo(() => {
        if (!fngHistory) return [];
        return fngHistory.map((item: any) => ({
            time: parseInt(item.timestamp) as Time,
            value: parseInt(item.value)
        })).sort((a: any, b: any) => a.time - b.time);
    }, [fngHistory]);


    // US Market Open Rows (Current Style)
    const openRows = [
        { items: [{ symbol: 'QQQ', title: 'Nasdaq 100 (QQQ)' }, { symbol: 'GCUSD', title: 'Gold (GCUSD)' }] },
        { items: [{ symbol: 'SPY', title: 'S&P 500 (SPY)' }, { symbol: 'SIUSD', title: 'Silver (SIUSD)' }] },
        { items: [{ symbol: 'FearAndGreed', title: 'Fear & Greed' }, { symbol: 'US10Y', title: 'US 10Y Yield' }] },
        { items: [{ symbol: 'NVDA', title: 'NVIDIA (NVDA)' }, { symbol: 'BTCUSDT', title: 'Bitcoin (BTC)' }] }
    ];

    // US Market Closed Rows (Requested Layout)
    const closedRows = [
        { items: [{ symbol: 'BTCUSDT', title: 'Bitcoin (BTC)' }, { symbol: 'GCUSD', title: 'Gold (GCUSD)' }] },
        { items: [{ symbol: 'ETHUSDT', title: 'Ethereum (ETH)' }, { symbol: 'SIUSD', title: 'Silver (SIUSD)' }] },
        { items: [{ symbol: 'OnChain', title: 'On-chain: MVRV Z-Score' }] },
        { items: [{ symbol: 'SOLUSDT', title: 'Solana (SOL)' }, { symbol: 'BNBUSDT', title: 'BNB' }] }
    ];

    const currentRows = isOpen ? openRows : closedRows;

    if (!mounted) {
        return (
            <div className="space-y-6 bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden min-h-[600px] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-colors duration-300">
            {/* Header info */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {isOpen ? 'US Market LIVE Sessions' : 'US Market Closed (Showing Last Session)'}
                    </h2>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
                    {new Date().toLocaleTimeString(locale === 'ko' ? 'ko-KR' : 'en-US', { timeZone: 'America/New_York' })} NY Time
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {currentRows.map((row, rowIndex) => (
                    <React.Fragment key={rowIndex}>
                        {row.items.map((item: any, colIndex) => (
                            <div key={`${rowIndex}-${colIndex}`} className={`${(item.symbol === 'CombinedIndicators' || item.symbol === 'OnChain') ? 'lg:col-span-2' : ''} relative group`}>
                                {item.symbol === 'CombinedIndicators' ? (
                                    <CombinedCryptoIndicatorChart height={320} />
                                ) : item.symbol === 'OnChain' ? (
                                    <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 h-[480px] flex flex-col relative shadow-lg group-hover:bg-slate-50 dark:group-hover:bg-slate-900/60 transition-all overflow-hidden">
                                        <div className="flex justify-between items-center mb-4 z-10">
                                            <div className="flex items-center gap-4">
                                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                                    On-chain Analysis
                                                </h3>
                                                <select
                                                    value={selectedOnchainMetric}
                                                    onChange={(e) => setSelectedOnchainMetric(e.target.value)}
                                                    className="text-[11px] font-bold bg-slate-100 dark:bg-slate-800 border-none rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-300 cursor-pointer"
                                                >
                                                    {onchainMetrics.length > 0 ? (
                                                        onchainMetrics.map(m => (
                                                            <option key={m.id} value={m.id}>{m.name.replace(/\s*\([^)]*\)/g, '')}</option>
                                                        ))
                                                    ) : (
                                                        <option value="mvrv_z_score">MVRV Z-Score</option>
                                                    )}
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setOnchainLogScale(!onchainLogScale)}
                                                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider transition-colors ${onchainLogScale ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                                >
                                                    Log
                                                </button>
                                                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Glassnode Style</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 -mx-4 -mb-4">
                                            <OnChainChart 
                                                assetId="BTCUSDT"
                                                metricId={selectedOnchainMetric}
                                                height={420}
                                                showRangeSelector={false}
                                                showExporting={false}
                                                showControls={false}
                                                transparent={true}
                                                useLogScale={onchainLogScale}
                                                title=""
                                            />
                                        </div>
                                    </div>
                                ) : item.symbol === 'FearAndGreed' ? (
                                    <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 h-[320px] flex flex-col relative shadow-lg hover:bg-slate-50 dark:group-hover:bg-slate-900/60 transition-all overflow-hidden text-center">
                                        <div className="flex justify-between items-center mb-2 z-10">
                                            <Link href="/onchain/analysis/speculative" className="hover:opacity-80 transition-opacity">
                                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                                                    Fear & Greed Index
                                                </h3>
                                            </Link>
                                            <span className="bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">LIVE</span>
                                        </div>
                                        
                                        <div className="flex-1 flex flex-col items-center justify-center -mt-4">
                                            {/* FearAndGreedGauge already includes a gauge and a trend line */}
                                            <FearAndGreedGauge height={200} hideTitle noBackground />
                                        </div>
                                    </div>
                                ) : item.symbol === 'US10Y' ? (
                                    <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 h-[320px] flex flex-col relative shadow-lg hover:bg-slate-50 dark:group-hover:bg-slate-900/60 transition-all overflow-hidden">
                                        <div className="flex justify-between items-start mb-2 z-10">
                                            <Link href="/onchain/analysis/fundamental" className="hover:opacity-80 transition-opacity">
                                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                                    US 10Y Yield
                                                </h3>
                                            </Link>
                                            <div className="text-right">
                                                <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider block mb-1">FRED DATA</span>
                                                {us10yValue && (
                                                    <div className={`text-xs font-bold ${Number(us10yValue.change) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        {Number(us10yValue.change) >= 0 ? '▲' : '▼'} {Math.abs(Number(us10yValue.change))} ({us10yValue.changePercent}%)
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex-1 relative -mx-2 -mb-2">
                                            {macroLoading ? (
                                                <div className="h-full w-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
                                            ) : us10yValue?.historyLW ? (
                                                <LightWeightChart 
                                                    assetIdentifier="US10Y" 
                                                    data={us10yValue.historyLW} 
                                                    title=""
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-slate-400 text-xs italic">Data Unavailable</div>
                                            )}
                                            
                                            {us10yValue && (
                                                <div className="absolute top-2 left-4 pointer-events-none z-10">
                                                    <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                                                        {us10yValue.value}%
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : item.type === 'volume' ? (
                                    <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 h-[320px] overflow-hidden shadow-lg">
                                    <OHLCVVolumeChart 
                                        assetIdentifier={item.symbol} 
                                        title={item.title} 
                                        height={280} 
                                        dataInterval="1h"
                                    />
                                </div>
                                ) : (
                                    <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 h-fit shadow-lg transition-all overflow-hidden hover:shadow-xl">
                                        <RollingLiveChart
                                            assetIdentifier={item.symbol}
                                            title={item.title}
                                            height={300}
                                            dataInterval="15m"
                                            lookbackHours={72}
                                            href={`/assets/${item.symbol}`}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </React.Fragment>
                ))}
            </div>

            {/* Heatmap Section */}
            <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/50 rounded-2xl overflow-hidden shadow-xl mt-8 transition-colors">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        {isOpen ? 'Global Asset Performance Treemap (Market Open)' : 'Global Asset Performance Treemap'}
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Data</span>
                </div>
                <div className="w-full bg-slate-50 dark:bg-slate-900">
                    <PerformanceTreeMapToday height={600} />
                </div>
            </div>

            {/* Ticker Tape */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
                <TradingViewWidget isTickerTape height={46} theme={currentTheme as any} />
            </div>
        </div>
    );
};

export default DashBoardLiveMarketView;
export { DashBoardLiveMarketView as DashBoardLiveMarketViewContent };
