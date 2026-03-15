'use client'

import React, { useMemo, useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import SessionLiveChart from '@/components/charts/live/SessionLiveChart';
import TradingViewWidget from '@/components/widgets/TradingViewWidget';
import FearAndGreedGauge from '@/components/analysis/speculative/FearAndGreedGauge';
import { useTheme } from 'next-themes';
import { useMacroData } from '@/hooks/analysis/useMacroData';
import SimpleAreaChart from '@/components/charts/SimpleAreaChart';
import { useFearAndGreed } from '@/hooks/analysis/useFearAndGreed';
import { Link } from '@/i18n/navigation';

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
            history: data.map((d: any) => ({ date: d.date, value: d.year10 }))
        };
    }, [macroData]);

    // Fear & Greed Data
    const { history: fngHistory, loading: fngLoading } = useFearAndGreed();
    const fngChartData = useMemo(() => {
        if (!fngHistory) return [];
        return fngHistory.map((item: any) => ({
            date: new Date(parseInt(item.timestamp) * 1000).toISOString(),
            value: parseInt(item.value)
        }));
    }, [fngHistory]);

    // Asset rows configuration
    const rows = [
        { items: [{ symbol: 'QQQ', title: 'Nasdaq 100 (QQQ)' }, { symbol: 'GCUSD', title: 'Gold (GCUSD)' }] },
        { items: [{ symbol: 'SPY', title: 'S&P 500 (SPY)' }, { symbol: 'SIUSD', title: 'Silver (SIUSD)' }] },
        { items: [{ symbol: 'FearAndGreed', title: 'Fear & Greed' }, { symbol: 'US10Y', title: 'US 10Y Yield' }] },
        { items: [{ symbol: 'NVDA', title: 'NVIDIA (NVDA)' }, { symbol: 'BTCUSDT', title: 'Bitcoin (BTC)' }] }
    ];

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

            {/* Chart Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {rows.map((row, rowIndex) => (
                    <React.Fragment key={rowIndex}>
                        {row.items.map((item, colIndex) => (
                            <div key={`${rowIndex}-${colIndex}`} className="relative group">
                                {item.symbol === 'FearAndGreed' ? (
                                    <Link href="/onchain/analysis/speculative" className="block cursor-pointer hover:opacity-95 transition-all">
                                        <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 h-[300px] flex flex-col relative shadow-lg group-hover:bg-slate-50 dark:group-hover:bg-slate-900/60 transition-all overflow-hidden">
                                            <div className="flex justify-between items-center mb-4 z-10">
                                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                                                    Fear & Greed Index
                                                </h3>
                                                <div className="w-12 h-12">
                                                    <FearAndGreedGauge height={48} hideTitle noBackground />
                                                </div>
                                            </div>
                                            
                                            <div className="flex-1 -mx-4 -mb-4">
                                                {fngLoading ? (
                                                    <div className="h-full w-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
                                                ) : (
                                                    <SimpleAreaChart data={fngChartData} height={220} color="#8b5cf6" />
                                                )}
                                            </div>
                                            
                                            <div className="absolute top-12 left-4 z-10 pointer-events-none">
                                                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                                    {fngHistory[0]?.value || '--'}
                                                </div>
                                                <div className="text-[10px] font-bold uppercase text-violet-500">
                                                    {fngHistory[0]?.value_classification || 'Loading...'}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ) : item.symbol === 'US10Y' ? (
                                    <Link href="/onchain/analysis/fundamental" className="block cursor-pointer hover:opacity-95 transition-all">
                                        <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 h-[300px] flex flex-col relative shadow-lg group-hover:bg-slate-50 dark:group-hover:bg-slate-900/60 transition-all overflow-hidden">
                                            <div className="flex justify-between items-start mb-2 z-10">
                                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                                    US 10Y Yield
                                                </h3>
                                                <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">FRED</span>
                                            </div>
                                            
                                            <div className="flex-1 -mx-4 -mb-4">
                                                {macroLoading ? (
                                                    <div className="h-full w-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
                                                ) : us10yValue?.history ? (
                                                    <SimpleAreaChart data={us10yValue.history} height={220} color="#6366f1" />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-slate-400 text-xs italic">Data Unavailable</div>
                                                )}
                                            </div>
                                            
                                            <div className="absolute top-12 right-6 text-right z-10 pointer-events-none">
                                                {us10yValue && (
                                                    <>
                                                        <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter -mb-1">
                                                            {us10yValue.value}%
                                                        </div>
                                                        <div className={`text-xs font-bold ${Number(us10yValue.change) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                            {Number(us10yValue.change) >= 0 ? '▲' : '▼'} {Math.abs(Number(us10yValue.change))} ({us10yValue.changePercent}%)
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ) : (
                                    <Link href={`/assets/${item.symbol}`} className="block cursor-pointer hover:opacity-95 transition-all">
                                        <SessionLiveChart
                                            assetIdentifier={item.symbol}
                                            title={item.title}
                                            height={300}
                                            dataInterval="15m"
                                        />
                                    </Link>
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
                        S&P 500 Market Heatmap
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Data</span>
                </div>
                <div className="w-full bg-slate-50 dark:bg-slate-900">
                    <TradingViewWidget isHeatmap height={500} theme={currentTheme as any} />
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
