'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api'

interface AssetAnalysisCardProps {
    ticker: string
    locale: string
}

const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '-';
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const formatNumber = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '-';
    return value.toLocaleString();
}

const AssetAnalysisCard: React.FC<AssetAnalysisCardProps> = ({ ticker, locale }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch common info first to get asset ID and basic details
                // Fetch common info first to get asset ID, basic details, AND price
                const commonData = await apiClient.getAssetInfo(ticker);
                let specificData: any = {};
                let stockRes: any = null;

                try {
                    stockRes = await apiClient.getStockInfo(ticker);
                    if (stockRes) {
                         const numeric = stockRes.numeric_overview || {};
                         const post = stockRes.post_overview || {};
                         const financials = numeric.stock_financials_data || {};

                        specificData = {
                            ...numeric,
                            ...post,
                            ...financials // Flatten financials to top level for easier access
                        };
                    }
                } catch (e) {
                    console.log(`Failed to fetch stock info for ${ticker}`, e);
                }

                const finalData = {
                    ...commonData,
                    ...specificData,
                    // Prioritize commonData (which uses /asset-overviews/common) for financial metrics
                    // as it seems to have the most accurate/complete recent market data (prev_close, MAs etc.)
                    // specificData (from /asset-overviews/stock) is used for basic financial overview but might be missing live/daily stats
                    
                    price: commonData?.price || specificData.price,
                    current_price: commonData?.price || specificData.price || commonData?.current_price,
                    
                    // Allow multiple sources for name
                    company_name: specificData.company_name || specificData.title?.en || specificData.name || commonData?.name,
                    name: specificData.company_name || specificData.title?.en || specificData.name || commonData?.name,

                    // Prioritize commonData for technicals/market stats
                    prev_close: commonData?.prev_close || specificData.prev_close || specificData.previous_close, 
                    week_52_high: commonData?.week_52_high || specificData.week_52_high,
                    week_52_low: commonData?.week_52_low || specificData.week_52_low,
                    volume: commonData?.volume || specificData.volume,
                    average_vol_3m: commonData?.average_vol_3m || specificData.average_vol_3m,
                    day_50_moving_avg: commonData?.day_50_moving_avg || specificData.day_50_moving_avg,
                    day_200_moving_avg: commonData?.day_200_moving_avg || specificData.day_200_moving_avg,
                };

                // console.log(`[AssetAnalysisCard Debug] Mapped Data for ${ticker}:`, finalData);
                setData(finalData);
            } catch (error) {
                console.error(`Error fetching data for ${ticker}:`, error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [ticker]);

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 h-[280px] animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const t = {
        prevClose: locale === 'ko' ? '전일 종가' : 'Previous Close',
        volume: locale === 'ko' ? '거래량' : 'Volume',
        high52: locale === 'ko' ? '52주 최고가' : '52 Week High',
        low52: locale === 'ko' ? '52주 최저가' : '52 Week Low',
        avgVol3m: locale === 'ko' ? '평균 거래량 (3M)' : 'Avg Volume (3M)',
        ma50: locale === 'ko' ? '50일 이동평균' : '50 Day MA',
        ma200: locale === 'ko' ? '200일 이동평균' : '200 Day MA',
        techTrend: locale === 'ko' ? '기술적 트렌드' : 'Technical Trend',
        momentum: locale === 'ko' ? '모멘텀' : 'Momentum',
        bullish: locale === 'ko' ? '상승세' : 'Bullish',
        bearish: locale === 'ko' ? '하락세' : 'Bearish',
        neutral: locale === 'ko' ? '중립' : 'Neutral',
        strong: locale === 'ko' ? '강함' : 'Strong',
        weak: locale === 'ko' ? '약함' : 'Weak',
        goldenCross: locale === 'ko' ? '골든 크로스 (장기 상승 추세)' : 'Golden Cross Pattern (Long-term Uptrend)',
        priceAbove200: locale === 'ko' ? '200일 이평선 상회 (긍정적)' : 'Price above 200MA (Positive)',
        deathCross: locale === 'ko' ? '데스 크로스 (장기 하락 추세)' : 'Death Cross Pattern (Long-term Downtrend)',
        priceBelow200: locale === 'ko' ? '200일 이평선 하회 (부정적)' : 'Price below 200MA (Negative)',
    };

    const getTrendAnalysis = () => {
        if (!data || !data.current_price || !data.day_50_moving_avg || !data.day_200_moving_avg) return null;
        
        const price = data.current_price;
        const ma50 = data.day_50_moving_avg;
        const ma200 = data.day_200_moving_avg;

        let trend = t.neutral;
        let trendColor = 'text-gray-600 dark:text-gray-400';
        let signal = '';

        if (price > ma200) {
            trend = t.bullish;
            trendColor = 'text-green-600 dark:text-green-400';
            if (ma50 > ma200) {
                signal = t.goldenCross;
            } else {
                signal = t.priceAbove200;
            }
        } else {
            trend = t.bearish;
            trendColor = 'text-red-600 dark:text-red-400';
            if (ma50 < ma200) {
                 signal = t.deathCross;
            } else {
                 signal = t.priceBelow200;
            }
        }

        // Short term momentum
        let momentum = t.neutral;
        if (price > ma50) momentum = t.strong;
        else momentum = t.weak;

        return { trend, trendColor, signal, momentum };
    };

    const analysis = getTrendAnalysis();

    const getPercentDiff = (targetValue: number | undefined | null, baseValue: number | undefined | null) => {
        if (!targetValue || !baseValue) return null;
        const diff = ((targetValue - baseValue) / baseValue) * 100;
        return diff;
    };

    const renderMetric = (label: string, value: number | undefined | null, isCurrency: boolean = true, compareBase?: number) => {
        const percent = compareBase ? getPercentDiff(value, compareBase) : null;
        const formattedValue = isCurrency ? formatCurrency(value) : formatNumber(value);
        
        return (
            <div className="flex flex-col">
                <span className="text-gray-500 dark:text-gray-400 text-xs text-nowrap">{label}</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                    {formattedValue}
                    {percent !== null && (
                        <span className={`ml-1 text-xs ${percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ({percent > 0 ? '+' : ''}{percent.toFixed(2)}%)
                        </span>
                    )}
                </span>
            </div>
        );
    };

    const getDisplayName = () => {
        const name = data.company_name || data.name;
        // console.log(`[AssetAnalysisCard Debug] ${ticker} Name Check:`, { company_name: data.company_name, name: data.name, resolved: name });
        if (!name) return ticker;
        if (name.toUpperCase() === ticker.toUpperCase()) return ticker;
        return `${name} (${ticker})`;
    };
    
    // Debug logging
    console.log(`[AssetAnalysisCard Final Data] ${ticker}:`, data);
    console.log(`[AssetAnalysisCard Analysis] ${ticker}:`, analysis);

    return (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow w-full">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                <div className="flex flex-wrap items-center gap-3">
                    <Link href={`/${locale}/assets/${ticker}`} className="group flex items-center gap-2">
                        <span className="font-bold text-xl text-blue-600 dark:text-blue-400 group-hover:underline">
                            {getDisplayName()}
                        </span>
                        <span className="text-gray-400 dark:text-gray-500 text-sm group-hover:text-blue-500">&rarr;</span>
                    </Link>

                    {analysis && (
                        <div className="flex items-center gap-2 text-sm">
                            <span className={`px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-bold ${analysis.trendColor}`}>
                                {analysis.trend}
                            </span>
                             <span className={`px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 ${analysis.momentum === t.strong ? 'text-green-600' : 'text-orange-500'}`}>
                                {t.momentum}: {analysis.momentum}
                            </span>
                        </div>
                    )}
                </div>

                {data.current_price && (
                     <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatCurrency(data.current_price)}
                        </span>
                        {data.price_change_percentage_24h !== undefined && (
                            <span className={`text-sm font-medium ${data.price_change_percentage_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {data.price_change_percentage_24h >= 0 ? '▲' : '▼'} {Math.abs(data.price_change_percentage_24h).toFixed(2)}%
                            </span>
                        )}
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
                {renderMetric(t.prevClose, data.prev_close, true)}
                {renderMetric(t.high52, data.week_52_high, true, data.prev_close)}
                {renderMetric(t.low52, data.week_52_low, true, data.prev_close)}
                {renderMetric(t.volume, data.volume, false)}
                {renderMetric(t.avgVol3m, data.average_vol_3m, false)}
                {renderMetric(t.ma50, data.day_50_moving_avg, true, data.prev_close)}
                {renderMetric(t.ma200, data.day_200_moving_avg, true, data.prev_close)}
            </div>
        </div>
    );
}

interface FireMarketsAnalysisProps {
    postInfo: any
    locale: string
}

const FireMarketsAnalysis: React.FC<FireMarketsAnalysisProps> = ({ postInfo, locale }) => {
    // In the future, this data will come from real-time API or post metadata
    // For now, we show a placeholder structure to satisfy AdSense content requirements
    
    // Check if we have any tickers to analyze
    const tickers: string[] = postInfo.tickers || [];
    
    if (tickers.length === 0) return null;

    return (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800 my-8">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                FireMarkets Analysis
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
                {locale === 'ko' 
                    ? `FireMarkets의 데이터 분석 시스템이 감지한 ${tickers.join(', ')} 관련 시장 데이터입니다. 이 자산의 최근 변동성과 기술적 지표를 참고하세요.`
                    : `Market data analysis for ${tickers.join(', ')} detected by FireMarkets system. Please refer to the recent volatility and technical indicators of this asset.`
                }
            </p>

            <div className="grid grid-cols-1 gap-4">
                {tickers.map((ticker) => (
                    <AssetAnalysisCard key={ticker} ticker={ticker} locale={locale} />
                ))}
            </div>
            
            <p className="text-xs text-gray-400 mt-4 text-center">
                * This data is automatically generated based on real-time market conditions.
            </p>
        </div>
    )
}

export default FireMarketsAnalysis
