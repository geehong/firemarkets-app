'use client'

import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api'
import { useFearAndGreed } from '@/hooks/analysis/useFearAndGreed'
import { useRealtimePrices } from '@/hooks/data/useSocket'
import { TrendingUp, TrendingDown, Minus, Info, Activity, ShieldCheck, Zap } from 'lucide-react'

// --- Formatting Utilities ---
const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '-';
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const formatNumber = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '-';
    return value.toLocaleString();
}

const getPercentDiff = (targetValue: number | undefined | null, baseValue: number | undefined | null) => {
    if (!targetValue || !baseValue) return null;
    return ((targetValue - baseValue) / baseValue) * 100;
};

// --- Sub-components ---

const TechnicalBadge = ({ label, type }: { label: string, type: 'bull' | 'bear' | 'neutral' }) => {
    const colors = {
        bull: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
        bear: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
        neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700'
    };
    const Icons = {
        bull: <TrendingUp className="w-3 h-3" />,
        bear: <TrendingDown className="w-3 h-3" />,
        neutral: <Minus className="w-3 h-3" />
    };

    return (
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${colors[type]}`}>
            {Icons[type]}
            {label.toUpperCase()}
        </span>
    );
};

interface AssetAnalysisCardProps {
    ticker: string
    locale: string
}

const AssetAnalysisCard: React.FC<AssetAnalysisCardProps> = ({ ticker, locale }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    // 1. Get WebSocket Prices
    const { latestPrice } = useRealtimePrices(ticker);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // V2 API - single unified call
                const v2Data = await apiClient.v2GetOverview(ticker).catch(() => null);
                
                if (v2Data) {
                    const numericData = v2Data.numeric_data || v2Data;
                    const initialPrice = numericData.current_price || numericData.price || numericData.prev_close;
                    
                    setData({
                        ...numericData,
                        asset_type: v2Data.asset_type,
                        type_name: v2Data.asset_type,
                        current_price: latestPrice?.price || initialPrice,
                        prev_close: numericData.prev_close || numericData.previous_close,
                        company_name: numericData.company_name || v2Data.name || ticker,
                        price_change_percentage_24h: latestPrice?.changePercent ?? numericData.price_change_percentage_24h ?? numericData.daily_change_percent,
                        day_50_moving_avg: numericData.day_50_moving_avg,
                        day_200_moving_avg: numericData.day_200_moving_avg,
                        week_52_high: numericData.week_52_high,
                        week_52_low: numericData.week_52_low,
                    });
                }
            } catch (error) {
                console.error(`Error for ${ticker}:`, error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [ticker, locale]);

    // Update price when socket pushes new data
    useEffect(() => {
        if (latestPrice && data) {
            setData((prev: any) => prev ? ({
                ...prev,
                current_price: latestPrice.price,
                price_change_percentage_24h: latestPrice.changePercent ?? prev.price_change_percentage_24h
            }) : prev);
        }
    }, [latestPrice]);

    const analysis = useMemo(() => {
        if (!data || !data.current_price || !data.day_50_moving_avg || !data.day_200_moving_avg) return null;
        const { current_price: price, day_50_moving_avg: ma50, day_200_moving_avg: ma200 } = data;

        const isAbove200 = price > ma200;
        const isAbove50 = price > ma50;
        const isGoldenCross = ma50 > ma200;

        let trend: 'bull' | 'bear' | 'neutral' = 'neutral';
        if (isAbove200) trend = isAbove50 ? 'bull' : 'neutral';
        else trend = isAbove50 ? 'neutral' : 'bear';

        const signals = [];
        if (isGoldenCross) signals.push(locale === 'ko' ? '골든크로스 발생' : 'Golden Cross Detected');
        if (isAbove200) signals.push(locale === 'ko' ? '장기 추세 상방' : 'Long-term Uptrend');
        else signals.push(locale === 'ko' ? '장기 추세 하방' : 'Long-term Downtrend');

        return { trend, signals: signals.slice(0, 2) };
    }, [data, locale]);

    if (loading) return <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl h-32 animate-pulse border border-gray-100 dark:border-gray-800" />;
    if (!data) return null;

    const name = data.company_name || data.name || ticker;
    const displayName = name.toUpperCase() === ticker.toUpperCase() ? ticker : `${name} (${ticker})`;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-slate-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all group">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                <div className="flex flex-col gap-1.5">
                    <Link href={`/${locale}/assets/${ticker}`} className="inline-flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                        <span className="font-bold text-lg text-slate-800 dark:text-slate-100">{displayName}</span>
                        <Zap className="w-4 h-4 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                    {analysis && (
                        <div className="flex flex-wrap gap-2">
                            <TechnicalBadge 
                                type={analysis.trend} 
                                label={analysis.trend === 'bull' ? (locale === 'ko' ? '상승' : 'Bullish') : (analysis.trend === 'bear' ? (locale === 'ko' ? '하락' : 'Bearish') : (locale === 'ko' ? '중립' : 'Neutral'))} 
                            />
                            {analysis.signals.map((s, idx) => (
                                <span key={idx} className="text-[10px] text-slate-400 dark:text-gray-500 flex items-center gap-1 bg-slate-50 dark:bg-gray-900 px-2 py-0.5 rounded border border-slate-100 dark:border-gray-800">
                                    <Info className="w-3 h-3" /> {s}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-baseline gap-3 bg-slate-50 dark:bg-gray-900/50 p-3 rounded-xl border border-slate-100 dark:border-gray-800">
                    <span className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(data.current_price)}</span>
                    {data.price_change_percentage_24h !== undefined && (
                        <span className={`text-sm font-bold flex items-center gap-0.5 ${data.price_change_percentage_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {data.price_change_percentage_24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {Math.abs(data.price_change_percentage_24h).toFixed(2)}%
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 p-1">
                {[
                    { label: locale === 'ko' ? '전일 종가' : 'Prev Close', val: formatCurrency(data.prev_close) },
                    { label: locale === 'ko' ? '50일 평균' : '50D MA', val: formatCurrency(data.day_50_moving_avg), diff: getPercentDiff(data.current_price, data.day_50_moving_avg) },
                    { label: locale === 'ko' ? '200일 평균' : '200D MA', val: formatCurrency(data.day_200_moving_avg), diff: getPercentDiff(data.current_price, data.day_200_moving_avg) },
                    { label: locale === 'ko' ? '52주 최고' : '52W High', val: formatCurrency(data.week_52_high), diff: getPercentDiff(data.current_price, data.week_52_high) },
                ].map((item, i) => (
                    <div key={i} className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider">{item.label}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.val}</span>
                            {item.diff !== null && item.diff !== undefined && (
                                <span className={`text-[10px] font-medium ${item.diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {item.diff > 0 ? '+' : ''}{item.diff.toFixed(1)}%
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Main Components ---

interface FireMarketsAnalysisProps {
    postInfo: any
    locale: string
}

const FireMarketsAnalysis: React.FC<FireMarketsAnalysisProps> = ({ postInfo, locale }) => {
    const { fngData, loading: fngLoading } = useFearAndGreed();
    const tickers: string[] = postInfo.tickers || [];
    
    // Improved crypto detection: check if any ticker contains crypto keywords or category matches
    const cryptoKeywords = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'TRX', 'LINK', 'PEPE', 'SHIB', 'AVAX'];
    const isCryptoPost = useMemo(() => {
        const hasCryptoTicker = tickers.some(t => 
            cryptoKeywords.some(key => t.toUpperCase().includes(key))
        );
        const hasCryptoCategory = (postInfo.category || '').toLowerCase().includes('crypto');
        return hasCryptoTicker || hasCryptoCategory;
    }, [tickers, postInfo.category]);

    if (tickers.length === 0) return null;

    return (
        <section className="my-10 overflow-hidden rounded-3xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-2xl shadow-slate-200/50 dark:shadow-none">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Activity className="w-24 h-24" />
                </div>
                
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-blue-500 rounded-lg">
                                <Zap className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-bold tracking-widest uppercase text-blue-400">Deep Analysis</span>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black mb-3">FireMarkets Intelligent Outlook</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            {locale === 'ko' 
                                ? `${tickers.join(', ')} 관련 실시간 기술 분석 결과입니다. 현재 가격과 주요 이동평균선의 이격도를 기반으로 시장의 힘을 측정합니다.`
                                : `Real-time technical analysis for ${tickers.join(', ')}. Measures market strength based on price deviation from key moving averages.`
                            }
                        </p>
                    </div>

                    {isCryptoPost && (
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex flex-col items-center min-w-[140px]">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Crypto Mood</span>
                            {fngLoading ? (
                                <div className="h-8 w-12 bg-white/10 animate-pulse rounded mt-1" />
                            ) : fngData ? (
                                <>
                                    <div className={`text-2xl font-black ${parseInt(fngData.value) > 60 ? 'text-green-400' : (parseInt(fngData.value) < 40 ? 'text-red-400' : 'text-amber-400')}`}>
                                        {fngData.value}
                                    </div>
                                    <span className="text-[11px] font-medium opacity-80">{fngData.value_classification}</span>
                                </>
                            ) : (
                                <span className="text-xs text-slate-500 mt-1 italic">N/A</span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Analysis Grid */}
            <div className="p-6 md:p-8 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                    {tickers.map((ticker) => (
                        <AssetAnalysisCard key={ticker} ticker={ticker} locale={locale} />
                    ))}
                </div>
            </div>

            {/* Footer / Disclaimer */}
            <div className="bg-slate-50 dark:bg-gray-900/50 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-gray-800">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    <span>Calculated by FireMarkets Algorithmic Engine</span>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                    * Not financial advice. Data for informational purposes only.
                </p>
            </div>
        </section>
    )
}

export default FireMarketsAnalysis
