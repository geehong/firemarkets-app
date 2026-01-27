'use client'

import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import { apiClient } from '@/lib/api'
import { useFearAndGreed } from '@/hooks/analysis/useFearAndGreed'
import { useRealtimePrices } from '@/hooks/data/useSocket'
import { TrendingUp, TrendingDown, Minus, Info, Activity, ShieldCheck, Zap, Plus } from 'lucide-react'
import FearAndGreedGauge from '@/components/analysis/speculative/FearAndGreedGauge'

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// --- Formatting Utilities ---
const formatCurrency = (value: any) => {
    const n = Number(value);
    if (isNaN(n) || n === 0 || value === undefined || value === null) return '-';
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const formatNumber = (value: any) => {
    const n = Number(value);
    if (isNaN(n) || value === undefined || value === null) return '-';
    return n.toLocaleString();
}

const getPercentDiff = (targetValue: any, baseValue: any) => {
    const t = Number(targetValue);
    const b = Number(baseValue);
    if (isNaN(t) || isNaN(b) || b === 0) return null;
    return ((t - b) / b) * 100;
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
                console.log(`[FireMarketsAnalysis] Fetching Profile & Common data for: ${ticker}`);
                
                // Fetch both endpoints in parallel
                const [v2Data, commonRes] = await Promise.all([
                    apiClient.v2GetOverview(ticker, locale, { silentStatusCodes: [404] }).catch((err) => {
                        if (err && err.status !== 404 && !err.message?.includes('404')) {
                             console.error(`[FireMarketsAnalysis] V2 Overview Error:`, err);
                        }
                        return null;
                    }),
                    apiClient.v2GetCommonOverview(ticker, { silentStatusCodes: [404] }).catch((err) => {
                        if (err && err.status !== 404 && !err.message?.includes('404')) {
                             console.error(`[FireMarketsAnalysis] V2 Common Error:`, err);
                        }
                        return null;
                    })
                ]);
                
                if (v2Data || commonRes) {
                    const getSafeJson = (d: any) => {
                        if (!d) return {};
                        if (typeof d === 'object') return d;
                        try { return JSON.parse(d); } catch { return {}; }
                    };

                    const findFuzzyValue = (obj: any, keys: string[]) => {
                        if (!obj) return null;
                        for (const k of keys) {
                            if (obj[k] !== undefined && obj[k] !== null) return obj[k];
                        }
                        return null;
                    };

                    const profileData = getSafeJson(v2Data);
                    const numericData = getSafeJson(v2Data?.numeric_data);
                    const stockFinancials = getSafeJson(v2Data?.stock_financials_data);
                    const marketData = getSafeJson(commonRes);
                    
                    // Merge: Profile + Market (Common priority)
                    const merged = {
                        ...profileData,
                        ...numericData,
                        ...stockFinancials,
                        ...marketData
                    };

                    const assetType = (merged.asset_type || '').toLowerCase();
                    const isCryptoOrCommodity = assetType.includes('crypto') || assetType.includes('commodit');
                    
                    // Fuzzy search for prices
                    const priceKeys = ['current_price', 'price', 'regular_market_price'];
                    const prevCloseKeys = ['prev_close', 'previous_close', 'regularMarketPreviousClose'];

                    const foundPrice = merged.current_price || findFuzzyValue(merged, priceKeys);
                    const foundPrevClose = merged.prev_close || findFuzzyValue(merged, prevCloseKeys);
                    
                    // Simple market hour heuristic (KST)
                    const now = new Date();
                    const kstHour = now.getHours();
                    const isMarketHours = (kstHour >= 23 || kstHour <= 6);

                    // Initial Price Logic
                    let displayPriceInit = Number(foundPrice) || Number(foundPrevClose);
                    if (isCryptoOrCommodity) {
                        displayPriceInit = Number(latestPrice?.price) || displayPriceInit;
                    } else if (isMarketHours && latestPrice?.price) {
                        displayPriceInit = Number(latestPrice.price);
                    }

                    setData({
                        ...merged,
                        current_price: displayPriceInit,
                        prev_close: foundPrevClose,
                        is_crypto_or_commodity: isCryptoOrCommodity,
                        company_name: profileData.name || numericData.company_name || ticker,
                        price_change_percentage_24h: latestPrice?.changePercent ?? merged.price_change_percent ?? merged.price_change_percentage_24h,
                    });
                }
            } catch (error) {
                console.error(`[FireMarketsAnalysis] Catch block for ${ticker}:`, error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [ticker, locale]);

    // Update price when socket pushes new data (already handled by displayPriceInit but keep for socket updates)
    useEffect(() => {
        if (latestPrice && data) {
            const now = new Date();
            const kstHour = now.getHours();
            const isMarketHours = (kstHour >= 23 || kstHour <= 6);
            
            if (data.is_crypto_or_commodity || isMarketHours) {
                setData((prev: any) => prev ? ({
                    ...prev,
                    current_price: latestPrice.price,
                    price_change_percentage_24h: latestPrice.changePercent ?? prev.price_change_percentage_24h
                }) : prev);
            }
        }
    }, [latestPrice]);

    const analysis = useMemo(() => {
        const price = Number(data?.current_price);
        const ma50 = Number(data?.day_50_moving_avg);
        const ma200 = Number(data?.day_200_moving_avg);

        // Security check for zero/NaN to avoid -100% or incorrect analysis
        if (!data || isNaN(price) || price === 0 || isNaN(ma50) || isNaN(ma200) || ma50 === 0 || ma200 === 0) return null;

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
                    {data.price_change_percentage_24h !== undefined && data.price_change_percentage_24h !== null && (
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
                            {(item.diff !== null && item.diff !== undefined && !isNaN(item.diff)) && (
                                <span className={`text-[10px] font-medium ${item.diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {item.diff > 0 ? '+' : ''}{item.diff.toFixed(1)}%
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            
            {/* SEO Analysis (sr-only) */}
            <div className="sr-only">
                <p>
                    Technical Analysis for {ticker}: 
                    Current Price is {formatCurrency(data.current_price)}. 
                    Trend is {analysis?.trend} ({analysis?.signals?.join(', ')}). 
                    50-Day MA: {formatCurrency(data.day_50_moving_avg)}, 200-Day MA: {formatCurrency(data.day_200_moving_avg)}.
                    {analysis?.trend === 'bull' ? 'Long-term uptrend confirmed.' : ''}
                    {analysis?.trend === 'bear' ? 'Long-term downtrend active.' : ''}
                </p>
            </div>
        </div>
    );
};

// --- Main Components ---

// --- Post Sentiment Gauge Component ---
const SentimentRadialGauge = ({ sentiment, title = "News Sentiment" }: { sentiment: any, title?: string }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    
    // Sentiment Data
    const score = sentiment.score * 100; // 0-100
    const label = sentiment.label.toUpperCase();
    
    // Colors based on Label (+/-)
    let color = '#9ca3af'; // Neutral
    if(sentiment.label.toLowerCase() === 'positive') color = '#22c55e'; // Green
    if(sentiment.label.toLowerCase() === 'negative') color = '#ef4444'; // Red

    const chartOptions: any = {
        chart: { type: 'radialBar', background: 'transparent' },
        plotOptions: {
            radialBar: {
                startAngle: -135, endAngle: 135, hollow: { size: '60%' },
                track: { background: isDark ? '#374151' : '#e5e7eb' },
                dataLabels: {
                    name: { offsetY: -5, show: true, color: isDark ? '#9CA3AF' : '#888', fontSize: '13px' },
                    value: { offsetY: 5, color: isDark ? '#fff' : '#111', fontSize: '26px', show: true, formatter: (val: number) => val.toFixed(0) }
                }
            }
        },
        fill: { type: 'solid', colors: [color] },
        stroke: { lineCap: 'round' },
        labels: [label],
        colors: [color]
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center h-full min-h-[300px]">
             <h3 className="text-lg font-bold mb-2 text-gray-800 dark:text-gray-100 flex items-center gap-2">
                 <Zap className="w-5 h-5 text-blue-500" />
                 {title}
             </h3>
             <div className="relative">
                 <ReactApexChart options={chartOptions} series={[score]} type="radialBar" height={260} />
             </div>
             <p className="text-sm text-gray-500 mt-[-10px] pb-2 text-center max-w-[200px]">
                Analysis Result: <strong>{label}</strong><br/>
                <span className="text-xs opacity-70">Confidence {score.toFixed(1)}%</span>
             </p>
        </div>
    );
}

const GlobalWeeklyGauge = () => {
    const [sentiment, setSentiment] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWeekly = async () => {
            try {
                // Fetch last 7 days daily data
                const res = await fetch('/api/v1/analysis/sentiment/history?period=7d&interval=1d');
                if(!res.ok) return;
                const json = await res.json();
                if(Array.isArray(json) && json.length > 0) {
                     // Aggregate
                     let pos = 0, neg = 0, count = 0, scoreSum = 0;
                     json.forEach(row => {
                         pos += row.sentiment_counts?.positive || 0;
                         neg += row.sentiment_counts?.negative || 0;
                         count += row.total_count || 0;
                         scoreSum += (row.avg_score || 0.5) * (row.total_count || 0);
                     });
                     
                     if (count > 0) {
                         // Net Sentiment Score (0-100)
                         // Formula: ((pos - neg) / count + 1) * 50
                         const net = (pos - neg) / count;
                         const finalScore = ((net + 1) * 50) / 100; // normalize to 0-1 for RadialGauge component which expects 0-1 input for internal *100
                         // Actually RadialGauge expects 0-1 input for 'score' prop?
                         // "const score = sentiment.score * 100;" -> Yes.
                         // So I need to pass 0.0 to 1.0. 
                         // My formula returns 0 to 100 (50 is neutral). So divide by 100.
                         const normalizedScore = ((net + 1) * 50) / 100;

                         let label = 'Neutral';
                         if (normalizedScore > 0.6) label = 'Positive';
                         if (normalizedScore < 0.4) label = 'Negative';
                         
                         // Avg Confidence (just the average score of raw predictions)
                         const avgConf = scoreSum / count; 
                         // But for Display, we usually want the "Strength" of the sentiment (the Gauge Value).
                         // Let's use normalizedScore as the 'score' passed to Gauge.
                         
                         setSentiment({ score: normalizedScore, label });
                     }
                }
            } catch(e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchWeekly();
    }, []);

    if(loading) return <div className="animate-pulse bg-gray-100 dark:bg-gray-800 h-[300px] rounded-xl" />;
    if(!sentiment) return null;

    return <SentimentRadialGauge sentiment={sentiment} title="Global Weekly Trend" />;
}

// --- Main Component ---

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

    // If no tickers AND no sentiment, nothing to show
    if (tickers.length === 0 && !postInfo?.sentiment) return null;

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
                                ? (tickers.length > 0
                                    ? `${tickers.join(', ')} 관련 실시간 기술 분석 및 AI 감성 분석 결과입니다.`
                                    : `AI가 분석한 이 뉴스의 시장 감성 및 글로벌 트렌드 분석 결과입니다.`)
                                : (tickers.length > 0
                                    ? `Real-time technical analysis and AI sentiment for ${tickers.join(', ')}.`
                                    : `AI-driven market sentiment analysis and global trends for this news.`)
                            }
                        </p>
                    </div>

             {/* Sentiment & Crypto Mood */}
            <div className="flex flex-col md:flex-row gap-4 absolute top-0 right-0 p-6 z-20">
                 {/* 1. Individual News Sentiment (Stored) */}
                 {postInfo?.sentiment && (
                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 flex flex-col items-center min-w-[120px]">
                        <span className="text-[10px] font-bold text-blue-200 uppercase tracking-tighter mb-1">AI Sentiment</span>
                        <div className={`text-xl font-black 
                            ${postInfo.sentiment.label === 'positive' ? 'text-green-400' : 
                              postInfo.sentiment.label === 'negative' ? 'text-red-400' : 'text-gray-300'}`}>
                            {postInfo.sentiment.label.toUpperCase()}
                        </div>
                        <span className="text-[10px] font-medium opacity-80">
                            Conf: {(postInfo.sentiment.score * 100).toFixed(0)}%
                        </span>
                    </div>
                 )}

                 {/* 2. Global Crypto Fear & Greed */}
                 {isCryptoPost && (
                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 flex flex-col items-center min-w-[120px]">
                        <span className="text-[10px] font-bold text-amber-200 uppercase tracking-tighter mb-1">Crypto Mood</span>
                        {fngLoading ? (
                            <div className="h-8 w-12 bg-white/10 animate-pulse rounded mt-1" />
                        ) : fngData ? (
                            <>
                                <div className={`text-xl font-black ${parseInt(fngData.value) > 60 ? 'text-green-400' : (parseInt(fngData.value) < 40 ? 'text-red-400' : 'text-amber-400')}`}>
                                    {fngData.value}
                                </div>
                                <span className="text-[10px] font-medium opacity-80">{fngData.value_classification}</span>
                            </>
                        ) : (
                            <span className="text-xs text-slate-500 mt-1 italic">N/A</span>
                        )}
                    </div>
                )}
            </div>
                </div>
            </div>
            {/* 분석결과 */}
            {/* 분석결과 (Toggleable) */}
            <div className="px-6 pt-6">
                <details className="group">
                    <summary className="flex items-center cursor-pointer list-none gap-2 text-sm font-bold text-slate-500 hover:text-blue-500 transition-colors">
                        <span className="group-open:hidden p-1 bg-slate-100 dark:bg-slate-800 rounded"><Plus className="w-4 h-4"/></span>
                        <span className="hidden group-open:block p-1 bg-slate-100 dark:bg-slate-800 rounded"><Minus className="w-4 h-4"/></span>
                        <span>{locale === 'ko' ? 'AI 분석 요약 보기' : 'View AI Analysis Summary'}</span>
                    </summary>
                    <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
                        <p>
                            <strong>{locale === 'ko' ? 'Firemarkets.net AI 분석 결과 요약:' : 'Firemarkets.net AI Analysis Result:'}</strong><br/>
                            {isCryptoPost && fngData ? 
                                (locale === 'ko' 
                                    ? ` • 암호화폐 공포/탐욕 지수는 ${fngData.value}점 (${fngData.value_classification}) 입니다.` 
                                    : ` • Crypto Fear & Greed Index is ${fngData.value} (${fngData.value_classification}).`) 
                                : ''}
                            {postInfo?.sentiment ? 
                                (locale === 'ko' 
                                    ? ` • 뉴스 감성 분석 결과는 '${postInfo.sentiment.label}' (신뢰도 ${(postInfo.sentiment.score * 100).toFixed(0)}%) 입니다.` 
                                    : ` • News Sentiment is ${postInfo.sentiment.label} with ${(postInfo.sentiment.score * 100).toFixed(0)}% confidence.`) 
                                : ''}
                            {isCryptoPost && parseInt(fngData?.value || '50') < 25 ? 
                                (locale === 'ko' 
                                    ? ' • 극단적 공포 단계로, 잠재적 매수 기회일 수 있습니다.' 
                                    : ' • Suggests extreme fear, potential buying opportunity.') 
                                : ''}
                            {postInfo?.sentiment?.label === 'positive' ? 
                                (locale === 'ko' 
                                    ? ' • 시장의 긍정적인 모멘텀을 시사합니다.' 
                                    : ' • Indicates positive market momentum.') 
                                : ''}
                        </p>
                    </div>
                </details>
            </div>

            {/* Analysis Grid */}
            <div className="p-6 md:p-8 space-y-8">
                {tickers.length > 0 && (
                    <div className="grid grid-cols-1 gap-4">
                        {tickers.map((ticker) => (
                            <AssetAnalysisCard key={ticker} ticker={ticker} locale={locale} />
                        ))}
                    </div>
                )}

                {/* Market & News Sentiment Context */}
                {/* Market & News Sentiment Context */}
                <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-gray-800">
                    {/* 1. Fear & Greed (Only if Crypto) - Row 1 */}
                    {isCryptoPost && (
                        <div className="w-full">
                             <FearAndGreedGauge />
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Global Weekly Trend */}
                        <div className="h-full">
                             <GlobalWeeklyGauge />
                        </div>
                        
                        {/* Specific Post Sentiment Gauge */}
                        {postInfo?.sentiment && (
                            <div className="h-full">
                                <SentimentRadialGauge sentiment={postInfo.sentiment} />
                            </div>
                        )}
                    </div>
                </div>

                {/* SEO Text (sr-only) */}
                <div className="sr-only">
                    {/* Main Analysis Summary */}
                    <p>
                        Firemarkets.net AI Analysis Result: 
                        {isCryptoPost && fngData ? ` Crypto Fear & Greed Index is ${fngData.value} (${fngData.value_classification}).` : ''}
                        {postInfo?.sentiment ? ` News Sentiment is ${postInfo.sentiment.label} with ${(postInfo.sentiment.score * 100).toFixed(0)}% confidence.` : ''}
                        {isCryptoPost && parseInt(fngData?.value || '50') < 25 ? ' Suggests extreme fear, potential buying opportunity.' : ''}
                        {postInfo?.sentiment?.label === 'positive' ? ' Indicates positive market momentum.' : ''}
                    </p>
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
