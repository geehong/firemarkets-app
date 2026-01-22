'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api'
import AssetInfo from '../assets/AssetInfo'
import LivePriceStocksEtfChart from '@/components/charts/live/LivePriceStocksEtfChart'
import LivePriceCryptoChart from '@/components/charts/live/LivePriceCryptoChart'
import LivePriceCommoditiesChart from '@/components/charts/live/LivePriceCommoditiesChart'
import OHLCVCustomGUIChart from '@/components/charts/ohlcvcharts/OHLCVCustomGUIChart'
import StocksInfoCard from '@/components/assets/cards/StocksInfoCard'
import CryptoInfoCard from '@/components/assets/cards/CryptoInfoCard'
import ETFInfoCard from '@/components/assets/cards/ETFInfoCard'
import FinancialsTab from '@/components/assets/FinancialsTab'
import AgGridHistoryTable from '@/components/tables/AgGridHistoryTable'
import { useAuth } from '@/hooks/auth/useAuthNew'
import { Activity, Zap, TrendingUp, TrendingDown } from 'lucide-react'
import { useRealtimePrices } from '@/hooks/data/useSocket'
import { useFearAndGreed } from '@/hooks/analysis/useFearAndGreed'
import { useAssetPriceV2 } from '@/hooks/assets/useAssetV2'
import BaseTemplateView from './BaseTemplateView'

interface AssetDetailedViewProps {
    asset: any
    locale: string
}

const AssetDetailedView: React.FC<AssetDetailedViewProps> = ({ asset, locale }) => {
    const { isAdmin } = useAuth()
    const { fngData, loading: fngLoading } = useFearAndGreed();

    const typeName = asset.type_name
    const isStock = typeName === 'Stocks'
    const isCrypto = typeName === 'Crypto'
    const isETF = typeName === 'ETFs' || typeName === 'Funds'
    const isCommodity = typeName === 'Commodity' || typeName === 'Commodities'

    const getStringValue = (value: any): string => {
        if (!value) return ''
        if (typeof value === 'string') return value
        if (typeof value === 'object') {
            if (value[locale]) return value[locale]
            if (value.en) return value.en
            if (value.ko) return value.ko
            const firstKey = Object.keys(value)[0]
            if (firstKey) return String(value[firstKey])
        }
        return String(value)
    }

    const identifier = asset.ticker || asset.symbol || asset.slug
    const assetName = getStringValue(asset.name)
    
    // 1. WebSocket Live Prices
    const { latestPrice } = useRealtimePrices(identifier);

    // 2. Technical Data Fetching using V2 API
    const [techData, setTechData] = useState<any>(null);

    useEffect(() => {
        const fetchTechData = async () => {
            try {
                const overviewRes = await apiClient.v2GetOverview(identifier).catch(() => null);
                if (overviewRes) {
                    // Extract numeric data from v2 overview
                    const numericData = overviewRes.numeric_data || overviewRes;
                    setTechData({ 
                        ...overviewRes, 
                        ...numericData,
                        type_name: overviewRes.asset_type || typeName
                    });
                }
            } catch (e) {
                console.error("Technical data fetch failed", e);
            }
        };
        fetchTechData();
    }, [identifier, typeName]);

    // Derived Display values
    // For Stocks and ETFs, if no real-time price is available (market closed), fall back to previous close as requested
    const isMarketClosedSensitive = isStock || isETF;
    const displayPrice = latestPrice?.price || 
        (isMarketClosedSensitive ? (techData?.prev_close || asset.prev_close) : (techData?.current_price || asset.current_price || techData?.prev_close));
    
    // Fallback order: WebSocket -> TechData(Specific % or Common %) -> Asset DB
    const displayChange = latestPrice?.changePercent ?? 
        techData?.price_change_percentage_24h ?? 
        techData?.price_change_percent ?? 
        asset.price_change_percentage_24h;

    // Header Analysis Logic
    const analysis = useMemo(() => {
        if (!techData || !displayPrice || !techData.day_50_moving_avg || !techData.day_200_moving_avg) return null;
        const { day_50_moving_avg: ma50, day_200_moving_avg: ma200 } = techData;
        
        const trend = (displayPrice > ma200) ? (displayPrice > ma50 ? 'bull' : 'neutral') : (displayPrice > ma50 ? 'neutral' : 'bear');
        
        const signals = [];
        if (ma50 > ma200) signals.push(locale === 'ko' ? '골든크로스' : 'Golden Cross');
        if (displayPrice > ma200) signals.push(locale === 'ko' ? '장기 추세 상방' : 'Long-term Uptrend');
        else signals.push(locale === 'ko' ? '장기 추세 하방' : 'Long-term Downtrend');
        
        return { trend, signals };
    }, [techData, displayPrice, locale]);

    const formatCurrency = (val: any) => val ? `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';
    const getPercentDiffValue = (target: number, base: number) => base ? ((target - base) / base * 100).toFixed(1) : null;

    const contentObj = {
        en: asset.content_en || asset.content,
        ko: asset.content_ko
    }
    const description = getStringValue(contentObj) || getStringValue(asset.description)

    // Chart Wrapper
    const renderLiveChart = () => {
        if (isStock || isETF) return <LivePriceStocksEtfChart assetIdentifier={identifier} height={400} />
        if (isCrypto) return <LivePriceCryptoChart assetIdentifier={identifier} height={400} />
        if (isCommodity) return <LivePriceCommoditiesChart assetIdentifier={identifier} height={400} />
        return <LivePriceStocksEtfChart assetIdentifier={identifier} height={400} />
    }

    // Helper to get latest financial data
    const getLatestFinancials = (jsonData: any) => {
        if (!jsonData || typeof jsonData !== 'object') return null
        const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData
        const dates = Object.keys(data).sort().reverse()
        if (dates.length === 0) return null
        const latestDate = dates[0]
        return data[latestDate]
    }

    // Extract financials for StocksInfoCard
    let stockFinancials = null
    if (isStock) {
        const ratios = getLatestFinancials(asset.ratios_json)
        if (ratios) {
            stockFinancials = {
                pe_ratio: ratios['PE Ratio'],
                eps: ratios['Basic EPS'] || ratios['EPS - Earnings Per Share'],
                beta: ratios['Beta'],
                dividend_yield: ratios['Dividend Yield'],
                profit_margin_ttm: ratios['Net Profit Margin'],
                return_on_equity_ttm: ratios['ROE - Return On Equity'],
                return_on_assets_ttm: ratios['ROA - Return On Assets'],
                price_to_book_ratio: ratios['Price to Book Ratio'] || ratios['Price/Book Ratio'],
                debt_to_equity: ratios['Debt/Equity Ratio'],
            }
        }
    }

    // Info Card Wrapper
    const renderInfoCard = () => {
        if (isStock) return <StocksInfoCard asset={asset} stockFinancials={stockFinancials} />
        if (isCrypto) return <CryptoInfoCard asset={asset} />
        if (isETF) return <ETFInfoCard asset={asset} />
        return <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow"><p>No specific info card for this asset type.</p></div>
    }

    // Prepare Tabs
    const tabs = [
        {
            id: 'overview',
            label: 'Overview',
            content: (
                <div className="space-y-6">
                    {/* 1. Live Price Chart */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 overflow-hidden">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Live Price</h2>
                        {renderLiveChart()}
                    </div>

                    {/* 2. Asset Information / Market Data */}
                    {renderInfoCard()}

                    {/* 3. Analysis/Description */}
                    {description && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{assetName}</h2>
                            <div
                                className="prose dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: description }}
                            />
                        </div>
                    )}
                </div>
            )
        },
        {
            id: 'chart',
            label: 'Chart',
            content: (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                    <OHLCVCustomGUIChart
                        assetIdentifier={identifier}
                        seriesName={assetName}
                        height={700}
                        useIntradayData={!isCommodity}
                    />
                </div>
            )
        },
        ...(isStock ? [{
            id: 'financials',
            label: 'Financials',
            content: (
                <div>
                    <FinancialsTab
                        incomeData={typeof asset.income_json === 'string' ? JSON.parse(asset.income_json) : asset.income_json}
                        balanceData={typeof asset.balance_json === 'string' ? JSON.parse(asset.balance_json) : asset.balance_json}
                        cashFlowData={typeof asset.cash_flow_json === 'string' ? JSON.parse(asset.cash_flow_json) : asset.cash_flow_json}
                        ratiosData={typeof asset.ratios_json === 'string' ? JSON.parse(asset.ratios_json) : asset.ratios_json}
                    />
                </div>
            )
        }] : []),
        {
            id: 'history',
            label: 'Historical Data',
            content: (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Historical Data</h2>
                    <AgGridHistoryTable assetIdentifier={identifier} />
                </div>
            )
        },
        ...(isAdmin ? [{
            id: 'details',
            label: 'Details',
            content: (
                <div>
                    {/* Edit Asset Button */}
                    <div className="mb-4">
                        {asset.post_id ? (
                            <Link
                                href={`/${locale}/admin/page/edit/${asset.post_id}`}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit Asset
                            </Link>
                        ) : (
                            <div className="text-sm text-gray-500 italic">No associated post found for editing.</div>
                        )}
                    </div>
                    <AssetInfo asset={asset} locale={locale} />
                </div>
            )
        }] : [])
    ]

    // Header Indicators Grid (Analysis Summary View)
    const headerIndicators = (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full max-w-[500px]">
            {[
                { label: locale === 'ko' ? '전일 종가' : 'Prev Close', val: formatCurrency(techData?.prev_close || asset.prev_close) },
                { label: locale === 'ko' ? '50일 평균' : '50D MA', val: formatCurrency(techData?.day_50_moving_avg), diff: getPercentDiffValue(displayPrice, techData?.day_50_moving_avg) },
                { label: locale === 'ko' ? '200일 평균' : '200D MA', val: formatCurrency(techData?.day_200_moving_avg), diff: getPercentDiffValue(displayPrice, techData?.day_200_moving_avg) },
                { label: locale === 'ko' ? '52주 최고' : '52W High', val: formatCurrency(techData?.week_52_high), diff: getPercentDiffValue(displayPrice, techData?.week_52_high) },
            ].map((item, i) => (
                <div key={i} className="flex flex-col bg-white/5 p-2 rounded-lg border border-white/10 backdrop-blur-sm">
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-tighter mb-0.5">{item.label}</span>
                    <span className="text-xs font-bold text-white leading-none whitespace-nowrap">{item.val}</span>
                    {item.diff && (
                        <span className={`text-[10px] font-medium mt-0.5 ${Number(item.diff) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {Number(item.diff) > 0 ? '+' : ''}{item.diff}%
                        </span>
                    )}
                </div>
            ))}
        </div>
    )

    const rawCoverImage = asset.cover_image || asset.image
    const finalCoverImage = (rawCoverImage && rawCoverImage !== asset.logo_url && !rawCoverImage.includes('/icons/')) ? rawCoverImage : undefined
    const formattedTitle = identifier.toUpperCase() === assetName.toUpperCase() ? identifier : `${assetName} (${identifier})`;

    return (
        <BaseTemplateView
            locale={locale}
            seo={{
                title: assetName,
                description: `Real-time price, charts, and financial data for ${assetName} (${identifier}).`,
                keywords: [identifier, assetName, typeName]
            }}
            header={{
                headerClassName: 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white relative',
                title: (
                    <div className="flex flex-col gap-4">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                            <Activity className="w-24 h-24" />
                        </div>
                        
                        <div className="flex items-center gap-4">
                            {!finalCoverImage && asset.logo_url && (
                                <div className="p-1 bg-white rounded-xl shadow-lg shrink-0">
                                    <img src={asset.logo_url} alt={assetName} className="w-10 h-10 md:w-12 md:h-12 object-contain" />
                                </div>
                            )}
                            <div className="flex flex-col overflow-hidden">
                                <div className="flex items-center gap-2 mb-1">
                                    <Zap className="w-3 h-3 text-blue-400 fill-blue-400/20" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">Intelligent Outlook</span>
                                </div>
                                <span className="text-2xl md:text-3xl font-black truncate">{formattedTitle}</span>
                                
                                {/* Price Display in Title Area */}
                                <div className="flex items-baseline gap-3 mt-3">
                                    <span className="text-3xl md:text-4xl font-black text-white drop-shadow-md">
                                        {formatCurrency(displayPrice)}
                                    </span>
                                    {displayChange !== undefined && (
                                        <span className={`flex items-center text-base md:text-lg font-bold px-2.5 py-1 rounded-xl bg-white/10 backdrop-blur-md ${displayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {displayChange >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />} 
                                            {Math.abs(displayChange).toFixed(2)}%
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mt-4">
                                    {analysis && (
                                        <>
                                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${analysis.trend === 'bull' ? 'bg-green-500/20 text-green-400 border-green-500/30' : (analysis.trend === 'bear' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30')}`}>
                                                {analysis.trend === 'bull' ? (locale === 'ko' ? '상승' : 'Bullish') : (analysis.trend === 'bear' ? (locale === 'ko' ? '하락' : 'Bearish') : (locale === 'ko' ? '중립' : 'Neutral'))}
                                            </span>
                                            {analysis.signals.map((s, idx) => (
                                                <span key={idx} className="bg-white/5 border border-white/10 px-2.5 py-0.5 rounded text-[10px] font-medium text-white/70 whitespace-nowrap">{s}</span>
                                            ))}
                                        </>
                                    )}
                                    {isCrypto && fngData && (
                                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/20">
                                            <span className="text-[9px] font-bold text-white/50 uppercase tracking-tighter">Mood</span>
                                            <span className={`text-[11px] font-black ${parseInt(fngData.value) > 60 ? 'text-green-400' : (parseInt(fngData.value) < 40 ? 'text-red-400' : 'text-amber-400')}`}>
                                                {fngData.value}
                                            </span>
                                            <span className="text-[10px] text-white/70 opacity-80 whitespace-nowrap">{fngData.value_classification}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ),
                category: { name: typeName },
                author: { name: identifier },
                coverImage: finalCoverImage,
                breadcrumbs: [
                    { label: 'Admin', href: `/${locale}/admin` },
                    { label: 'Assets', href: `/${locale}/admin/assets` },
                    { label: assetName, href: '#' }
                ],
                actions: headerIndicators
            }}
            tabs={tabs}
        />
    )
}

export default AssetDetailedView
