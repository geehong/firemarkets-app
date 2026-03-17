// @ts-nocheck
'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { createChart, ColorType, LineStyle, IChartApi, ISeriesApi, Time, LineSeries } from 'lightweight-charts';
import { useFearAndGreed } from '@/hooks/analysis/useFearAndGreed';
import { useOnchain } from '@/hooks/useOnchain';
import { useTheme } from 'next-themes';

interface CombinedCryptoIndicatorChartProps {
    height?: number;
}

const CombinedCryptoIndicatorChart: React.FC<CombinedCryptoIndicatorChartProps> = ({ height = 350 }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    
    // Series refs
    const fngSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const mvrvSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const etfSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

    // 1. Fear & Greed Data
    const { history: fngHistory, loading: fngLoading } = useFearAndGreed();
    
    // 2. On-chain Data (MVRV Z-Score as a representative)
    const { data: onchainData, loading: onchainLoading } = useOnchain('mvrv_z_score', '1y');
    
    // 3. ETF Flow Data
    const { data: etfFlowData, loading: etfLoading } = useOnchain('etf_btc_flow', '1y');

    const isLoading = fngLoading || onchainLoading || etfLoading;

    // Process data for Lightweight Charts
    const processedData = useMemo(() => {
        if (isLoading || !onchainData?.data || !fngHistory || !etfFlowData?.data) return null;

        // F&G map: timestamp -> value
        const fngMap = new Map();
        fngHistory.forEach(h => {
            const dateStr = new Date(parseInt(h.timestamp) * 1000).toISOString().split('T')[0];
            fngMap.set(dateStr, parseInt(h.value));
        });

        // ETF map: timestamp -> value
        const etfMap = new Map();
        etfFlowData.data.forEach(d => {
            const dateStr = new Date(d.timestamp).toISOString().split('T')[0];
            etfMap.set(dateStr, d.value);
        });

        // Use on-chain timestamps as base
        const baseData = onchainData.data;
        
        const fngData: any[] = [];
        const mvrvData: any[] = [];
        const etfData: any[] = [];

        baseData.forEach(d => {
            const dateStr = new Date(d.timestamp).toISOString().split('T')[0];
            const time = (new Date(d.timestamp).getTime() / 1000) as Time;

            // MVRV
            mvrvData.push({ time, value: d.value });

            // F&G
            if (fngMap.has(dateStr)) {
                fngData.push({ time, value: fngMap.get(dateStr) });
            }

            // ETF
            if (etfMap.has(dateStr)) {
                etfData.push({ time, value: etfMap.get(dateStr) });
            }
        });

        // Lightweight charts requires data to be sorted by time
        const sortFn = (a: any, b: any) => (a.time as number) - (b.time as number);

        return {
            fng: fngData.sort(sortFn),
            mvrv: mvrvData.sort(sortFn),
            etf: etfData.sort(sortFn)
        };
    }, [isLoading, fngHistory, onchainData, etfFlowData]);

    // Initialize Chart
    useEffect(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: isDark ? '#94a3b8' : '#64748b',
            },
            grid: {
                vertLines: { color: isDark ? 'rgba(148, 163, 184, 0.05)' : 'rgba(148, 163, 184, 0.1)' },
                horzLines: { color: isDark ? 'rgba(148, 163, 184, 0.05)' : 'rgba(148, 163, 184, 0.1)' },
            },
            rightPriceScale: {
                borderVisible: false,
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            timeScale: {
                borderVisible: false,
                fixLeftEdge: true,
                fixRightEdge: true,
            },
            crosshair: {
                mode: 1,
                vertLine: {
                    labelBackgroundColor: '#6366f1',
                },
                horzLine: {
                    labelBackgroundColor: '#6366f1',
                },
            },
            handleScroll: false,
            handleScale: false,
        });

        // 3 separate panes (conceptually) or just overlaid with different scales?
        // LW charts overlaying series on a single scale can be confusing if units differ.
        // We'll use 3 series on the same scale but maybe normalize or just overlay them.
        // For simplicity in a small dashboard widget, overlay works if colors are distinct.
        // However, the scales are so different (0-100 vs -2-8 vs Millions) that we MUST use panes or normalization.
        // Panes are not directly supported in the 'createChart' without complex config.
        // Let's normalize 0-100 for all for comparison of "trends".
        
        const fngSeries = chart.addSeries(LineSeries, {
            color: '#8b5cf6',
            lineWidth: 2,
            title: 'Fear & Greed',
            priceFormat: { type: 'price', precision: 0, minMove: 1 },
        });

        const mvrvSeries = chart.addSeries(LineSeries, {
            color: '#3b82f6',
            lineWidth: 2,
            title: 'MVRV Z-Score',
            priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        });

        const etfSeries = chart.addSeries(LineSeries, {
            color: '#10b981',
            lineWidth: 2,
            title: 'ETF Flow',
            priceFormat: { type: 'price', precision: 0, minMove: 1 },
        });

        chartRef.current = chart;
        fngSeriesRef.current = fngSeries;
        mvrvSeriesRef.current = mvrvSeries;
        etfSeriesRef.current = etfSeries;

        const handleResize = () => {
            if (containerRef.current) {
                chart.applyOptions({ width: containerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [isDark]);

    // Update Data
    useEffect(() => {
        if (!processedData || !chartRef.current) return;

        if (fngSeriesRef.current && processedData.fng.length > 0) {
            fngSeriesRef.current.setData(processedData.fng);
        }
        if (mvrvSeriesRef.current && processedData.mvrv.length > 0) {
            mvrvSeriesRef.current.setData(processedData.mvrv);
        }
        if (etfSeriesRef.current && processedData.etf.length > 0) {
            etfSeriesRef.current.setData(processedData.etf);
        }

        chartRef.current.timeScale().fitContent();
    }, [processedData]);

    return (
        <div className="flex flex-col gap-1 h-full w-full bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 shadow-lg overflow-hidden transition-all">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        Crypto Market Indicators
                    </span>
                    <div className="flex gap-3 text-[10px] font-bold">
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-0.5 bg-[#8b5cf6]" />
                            <span className="text-slate-500 dark:text-slate-400">F&G</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-0.5 bg-[#3b82f6]" />
                            <span className="text-slate-500 dark:text-slate-400">MVRV</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-0.5 bg-[#10b981]" />
                            <span className="text-slate-500 dark:text-slate-400">ETF</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <span className="font-medium truncate uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px]">
                        Multi-Indicator
                    </span>
                </div>
            </div>
            
            <div className="flex-1 relative min-h-[250px]">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/10 dark:bg-black/10 backdrop-blur-[2px] rounded-md z-10">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
                <div 
                    ref={containerRef} 
                    className="w-full h-full rounded-md bg-white/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 overflow-hidden" 
                />
            </div>
            
            <div className="mt-2 text-[9px] text-slate-400 dark:text-slate-500 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30 px-2 py-1 rounded">
                <div className="flex items-center gap-2">
                    <span>1Y History</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <span>Daily Intervals</span>
                </div>
                <span>Lightweight Charts v5</span>
            </div>
        </div>
    );
};

export default CombinedCryptoIndicatorChart;
