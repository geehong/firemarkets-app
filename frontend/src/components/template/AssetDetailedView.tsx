'use client'

import React, { useState } from 'react'
import Link from 'next/link'
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
import BaseTemplateView from './BaseTemplateView'

interface AssetDetailedViewProps {
    asset: any
    locale: string
}

const AssetDetailedView: React.FC<AssetDetailedViewProps> = ({ asset, locale }) => {
    const { isAdmin } = useAuth()

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

    const headerActions = asset.current_price ? (
        <div className="flex flex-col items-end">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
                ${asset.current_price.toLocaleString()}
            </span>
            {(asset.price_change_percentage_24h !== undefined) && (
                <span className={`flex items-center text-sm font-medium ${asset.price_change_percentage_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {asset.price_change_percentage_24h >= 0 ? '▲' : '▼'} {Math.abs(asset.price_change_percentage_24h).toFixed(2)}%
                </span>
            )}
        </div>
    ) : undefined;


    // Filter out cover image if it is the same as the logo or looks like an icon
    const rawCoverImage = asset.cover_image || asset.image
    const hasValidCover = rawCoverImage && rawCoverImage !== asset.logo_url && !rawCoverImage.includes('/icons/')
    const finalCoverImage = hasValidCover ? rawCoverImage : undefined

    console.log('[AssetDetailedView Debug]', {
        name: assetName,
        logo_url: asset.logo_url,
        cover_image_prop: asset.cover_image,
        image_prop: asset.image,
        rawCoverImage,
        hasValidCover,
        finalCoverImage
    });

    return (
        <BaseTemplateView
            locale={locale}
            seo={{
                title: assetName,
                description: `Real-time price, charts, and financial data for ${assetName} (${identifier}).`,
                keywords: [identifier, assetName, typeName]
            }}
            header={{
                title: (
                    <div className="flex items-center gap-3">
                        {!finalCoverImage && asset.logo_url && (
                            <img
                                src={asset.logo_url}
                                alt={assetName}
                                className="w-8 h-8 md:w-10 md:h-10 object-contain bg-white rounded-full shadow-sm"
                            />
                        )}
                        <span>{assetName}</span>
                    </div>
                ),
                category: { name: typeName },
                author: { name: identifier }, // Reusing author field for Ticker
                coverImage: finalCoverImage,
                breadcrumbs: [
                    { label: 'Admin', href: `/${locale}/admin` },
                    { label: 'Assets', href: `/${locale}/admin/assets` },
                    { label: assetName, href: '#' }
                ],
                actions: headerActions
            }}
            tabs={tabs}
        />
    )
}

export default AssetDetailedView
