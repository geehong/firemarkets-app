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

import { AssetHeaderDetail, AssetHeaderIndicators } from './block/HeaderViews'

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

    // Helper to extract nested data reliably
    const getSafeJson = (data: any) => {
        if (!data) return {};
        if (typeof data === 'object') return data;
        try {
            return JSON.parse(data);
        } catch (e) {
            console.warn("[AssetDetailedView] Failed to parse JSON:", data);
            return {};
        }
    };

    // Helper to find value by multiple possible keys
    const findFuzzyValue = (obj: any, keys: string[]) => {
        if (!obj) return null;
        for (const k of keys) {
            if (obj[k] !== undefined && obj[k] !== null) return obj[k];
        }
        return null;
    };

    useEffect(() => {
        const fetchTechData = async () => {
            try {
                console.log(`[AssetDetailedView] Fetching Profile & Common data for: ${identifier}`);
                
                // Fetch both endpoints in parallel for completeness
                const [overviewRes, commonRes] = await Promise.all([
                    apiClient.v2GetOverview(identifier).catch((err) => {
                        console.error(`[AssetDetailedView] V2 Overview API Error:`, err);
                        return null;
                    }),
                    apiClient.v2GetCommonOverview(identifier).catch((err) => {
                        console.error(`[AssetDetailedView] V2 Common API Error:`, err);
                        return null;
                    })
                ]);
                
                if (overviewRes || commonRes) {
                    const profileData = getSafeJson(overviewRes);
                    const numericData = getSafeJson(overviewRes?.numeric_data);
                    const stockFinancials = getSafeJson(overviewRes?.stock_financials_data);
                    const marketData = getSafeJson(commonRes);
                    
                    // Merging Logic: Profile (Base) + Market (Common) + Financials
                    // We prioritize 'marketData' (Common API) for live values as it is more reliable
                    const merged = {
                        ...profileData,
                        ...numericData,
                        ...stockFinancials,
                        ...marketData, // Overwrite with fresh market data from /common
                        type_name: profileData.asset_type || typeName
                    };

                    // Fuzzy price keys backup (just in case)
                    const priceKeys = ['current_price', 'price', 'regular_market_price'];
                    const prevCloseKeys = ['prev_close', 'previous_close', 'regularMarketPreviousClose'];

                    const current_price = merged.current_price || findFuzzyValue(merged, priceKeys);
                    const prev_close = merged.prev_close || findFuzzyValue(merged, prevCloseKeys);

                    const finalData = {
                        ...merged,
                        current_price,
                        prev_close
                    };
                    
                    console.log(`[AssetDetailedView] Merged Data:`, {
                        price: finalData.current_price,
                        prev: finalData.prev_close,
                        ma50: finalData.day_50_moving_avg
                    });
                    
                    setTechData(finalData);
                }
            } catch (e) {
                console.error("[AssetDetailedView] Catch block error:", e);
            }
        };
        fetchTechData();
    }, [identifier, typeName]);

    // Derived Display values
    const isCryptoOrCommodity = isCrypto || isCommodity;
    const websocketPrice = latestPrice?.price;
    const apiPrice = Number(techData?.current_price);
    const apiPrevClose = Number(techData?.prev_close);

    // Heuristic for Market Open (simplified US hours)
    const now = new Date();
    const kstHour = now.getHours();
    const isMarketHours = (kstHour >= 23 || kstHour <= 6); 

    let displayPrice: number | null = null;
    if (isCryptoOrCommodity) {
        displayPrice = websocketPrice || apiPrice || apiPrevClose;
    } else {
        // For stocks, prefer websocket if available during market hours
        displayPrice = (isMarketHours && websocketPrice) ? websocketPrice : (apiPrice || apiPrevClose);
    }
    
    // Fallback order for change percentage
    const displayChange = latestPrice?.changePercent ?? 
        techData?.price_change_percentage_24h ?? 
        techData?.price_change_percent ?? 
        asset.price_change_percentage_24h;

    // Header Analysis Logic
    const analysis = useMemo(() => {
        const currentPriceNum = Number(displayPrice);
        const ma50 = Number(techData?.day_50_moving_avg);
        const ma200 = Number(techData?.day_200_moving_avg);

        // Security check: Never calculate if values are zero or NaN
        if (!techData || !currentPriceNum || isNaN(currentPriceNum) || currentPriceNum === 0 || isNaN(ma50) || isNaN(ma200) || ma50 === 0 || ma200 === 0) return null;
        
        const trend = (currentPriceNum > ma200) ? (currentPriceNum > ma50 ? 'bull' : 'neutral') : (currentPriceNum > ma50 ? 'neutral' : 'bear');
        
        const signals = [];
        if (ma50 > ma200) signals.push(locale === 'ko' ? '골든크로스' : 'Golden Cross');
        if (currentPriceNum > ma200) signals.push(locale === 'ko' ? '장기 추세 상방' : 'Long-term Uptrend');
        else signals.push(locale === 'ko' ? '장기 추세 하방' : 'Long-term Downtrend');
        
        return { trend, signals };
    }, [techData, displayPrice, locale]);

    const formatCurrency = (val: any) => {
        const n = Number(val);
        if (isNaN(n) || n === 0 || val === null || val === undefined) return '-';
        return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getPercentDiffValue = (target: any, base: any) => {
        const t = Number(target);
        const b = Number(base);
        // Ensure no division by zero or NaN, and ensure target value exists to avoid "-100%" display
        if (isNaN(t) || isNaN(b) || b === 0 || t === 0) return null;
        return ((t - b) / b * 100).toFixed(1);
    };

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
                    <AssetHeaderDetail 
                        asset={asset}
                        techData={techData}
                        latestPrice={latestPrice}
                        displayPrice={displayPrice}
                        displayChange={displayChange}
                        analysis={analysis}
                        fngData={fngData}
                        isCrypto={isCrypto}
                        locale={locale}
                        assetName={assetName}
                        formattedTitle={formattedTitle}
                        typeName={typeName}
                        identifier={identifier}
                        finalCoverImage={finalCoverImage}
                        formatCurrency={formatCurrency}
                    />
                ),
                category: { name: typeName },
                author: { name: identifier },
                coverImage: finalCoverImage,
                breadcrumbs: [
                    { label: 'Admin', href: `/${locale}/admin` },
                    { label: 'Assets', href: `/${locale}/admin/assets` },
                    { label: assetName, href: '#' }
                ],
                actions: (
                    <AssetHeaderIndicators 
                        items={[
                            { label: locale === 'ko' ? '전일 종가' : 'Prev Close', val: formatCurrency(techData?.prev_close || asset.prev_close) },
                            { label: locale === 'ko' ? '50일 평균' : '50D MA', val: formatCurrency(techData?.day_50_moving_avg), diff: getPercentDiffValue(displayPrice, techData?.day_50_moving_avg) },
                            { label: locale === 'ko' ? '200일 평균' : '200D MA', val: formatCurrency(techData?.day_200_moving_avg), diff: getPercentDiffValue(displayPrice, techData?.day_200_moving_avg) },
                            { label: locale === 'ko' ? '52주 최고' : '52W High', val: formatCurrency(techData?.week_52_high), diff: getPercentDiffValue(displayPrice, techData?.week_52_high) },
                        ]}
                    />
                )
            }}
            tabs={tabs}
        />
    )
}

export default AssetDetailedView
