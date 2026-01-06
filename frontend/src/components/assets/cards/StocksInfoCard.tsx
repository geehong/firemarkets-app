
import React from 'react'
import ComponentCard from '@/components/common/ComponentCard'
import MarketDataSection from './MarketDataSection'
import { formatDate, formatIPODate, formatNumberWithLocale, toNumber, getStringValue, formatPercent } from '@/utils/formatters'
import { DollarLineIcon, PieChartIcon, UserIcon } from '@/icons'

interface StocksInfoCardProps {
    asset: any
    stockFinancials?: any
    commonData?: any
}

const formatBillionCurrency = (value: any) => {
    const num = toNumber(value)
    if (num === null) return null
    return `$${(num / 1e9).toFixed(2)}B`
}

const formatPercentFromFraction = (value: any, fractionDigits = 2) => {
    const num = toNumber(value)
    if (num === null) return null
    return `${(num * 100).toFixed(fractionDigits)}%`
}

const StocksInfoCard: React.FC<StocksInfoCardProps> = ({ asset, stockFinancials, commonData }) => {
    const marketCap = formatBillionCurrency(commonData?.market_cap ?? stockFinancials?.market_cap ?? asset?.market_cap)
    const websiteUrl = typeof asset?.website === 'string' ? asset.website : undefined

    return (
        <ComponentCard title="Asset Information">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                    <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Basic Information</h4>
                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Asset ID:</span>
                            <span className="font-medium">{asset?.asset_id}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Type:</span>
                            <span className="font-medium">{getStringValue(asset?.type_name)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Exchange:</span>
                            <span className="font-medium">{getStringValue(asset?.exchange)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Currency:</span>
                            <span className="font-medium">{getStringValue(asset?.currency)}</span>
                        </div>
                        {marketCap && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Market Cap:</span>
                                <span className="font-medium">{marketCap}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Financial Metrics</h4>
                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        {(stockFinancials?.pe_ratio ?? asset?.pe_ratio) && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">P/E Ratio:</span>
                                <span className="font-medium">{(stockFinancials?.pe_ratio ?? asset?.pe_ratio)?.toFixed?.(2) ?? stockFinancials?.pe_ratio ?? asset?.pe_ratio}</span>
                            </div>
                        )}
                        {(stockFinancials?.eps ?? asset?.eps) && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">EPS:</span>
                                <span className="font-medium">
                                    {typeof (stockFinancials?.eps ?? asset?.eps) === 'number'
                                        ? `$${(stockFinancials?.eps ?? asset?.eps).toFixed(2)}`
                                        : stockFinancials?.eps ?? asset?.eps}
                                </span>
                            </div>
                        )}
                        {(stockFinancials?.beta ?? asset?.beta) && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Beta:</span>
                                <span className="font-medium">
                                    {typeof (stockFinancials?.beta ?? asset?.beta) === 'number'
                                        ? (stockFinancials?.beta ?? asset?.beta).toFixed(3)
                                        : stockFinancials?.beta ?? asset?.beta}
                                </span>
                            </div>
                        )}
                        {(stockFinancials?.dividend_yield ?? asset?.dividend_yield) && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Dividend Yield:</span>
                                <span className="font-medium">{formatPercentFromFraction(stockFinancials?.dividend_yield ?? asset?.dividend_yield)}</span>
                            </div>
                        )}
                        {(stockFinancials?.shares_outstanding ?? asset?.shares_outstanding) && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Shares Outstanding:</span>
                                <span className="font-medium">{formatNumberWithLocale(stockFinancials?.shares_outstanding ?? asset?.shares_outstanding)}</span>
                            </div>
                        )}
                        {stockFinancials?.revenue_ttm && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Revenue (TTM):</span>
                                <span className="font-medium">{formatBillionCurrency(stockFinancials?.revenue_ttm)}</span>
                            </div>
                        )}
                        {stockFinancials?.ebitda && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">EBITDA:</span>
                                <span className="font-medium">{formatBillionCurrency(stockFinancials?.ebitda)}</span>
                            </div>
                        )}
                        {stockFinancials?.profit_margin_ttm && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Profit Margin (TTM):</span>
                                <span className="font-medium">{formatPercentFromFraction(stockFinancials?.profit_margin_ttm)}</span>
                            </div>
                        )}
                        {stockFinancials?.return_on_equity_ttm && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">ROE (TTM):</span>
                                <span className="font-medium">{formatPercentFromFraction(stockFinancials?.return_on_equity_ttm)}</span>
                            </div>
                        )}
                        {stockFinancials?.return_on_assets_ttm && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">ROA (TTM):</span>
                                <span className="font-medium">{formatPercentFromFraction(stockFinancials?.return_on_assets_ttm)}</span>
                            </div>
                        )}
                        {stockFinancials?.price_to_book_ratio && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">P/B Ratio:</span>
                                <span className="font-medium">{stockFinancials?.price_to_book_ratio?.toFixed?.(2) ?? stockFinancials?.price_to_book_ratio}</span>
                            </div>
                        )}
                        {stockFinancials?.dividend_per_share && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Dividend Per Share:</span>
                                <span className="font-medium">
                                    {typeof stockFinancials?.dividend_per_share === 'number'
                                        ? `$${stockFinancials.dividend_per_share.toFixed(2)}`
                                        : stockFinancials?.dividend_per_share}
                                </span>
                            </div>
                        )}
                        {stockFinancials?.book_value && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Book Value:</span>
                                <span className="font-medium">
                                    {typeof stockFinancials?.book_value === 'number'
                                        ? `$${stockFinancials.book_value.toFixed(2)}`
                                        : stockFinancials?.book_value}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Company Details</h4>
                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        {asset?.company_name && (
                            <div className="flex items-center gap-2">
                                <UserIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Company:</span>
                                <span className="text-sm font-medium">{getStringValue(asset.company_name)}</span>
                            </div>
                        )}
                        {asset?.sector && (
                            <div className="flex items-center gap-2">
                                <PieChartIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Sector:</span>
                                <span className="text-sm font-medium">{getStringValue(asset.sector)}</span>
                            </div>
                        )}
                        {asset?.industry && (
                            <div className="flex items-center gap-2">
                                <UserIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Industry:</span>
                                <span className="text-sm font-medium">{getStringValue(asset.industry)}</span>
                            </div>
                        )}
                        {asset?.country && (
                            <div className="flex items-center gap-2">
                                <UserIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Country:</span>
                                <span className="text-sm font-medium">{getStringValue(asset.country)}</span>
                            </div>
                        )}
                        {asset?.employees_count && (
                            <div className="flex items-center gap-2">
                                <UserIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Employees:</span>
                                <span className="text-sm font-medium">{formatNumberWithLocale(asset.employees_count)}</span>
                            </div>
                        )}
                        {asset?.ceo && (
                            <div className="flex items-center gap-2">
                                <UserIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">CEO:</span>
                                <span className="text-sm font-medium">{getStringValue(asset.ceo)}</span>
                            </div>
                        )}
                        {asset?.ipo_date && (
                            <div className="flex items-center gap-2">
                                <DollarLineIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">IPO Date:</span>
                                <span className="text-sm font-medium">{formatIPODate(asset.ipo_date)}</span>
                            </div>
                        )}
                        {websiteUrl && (
                            <div className="flex items-center gap-2">
                                <DollarLineIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Website:</span>
                                <a
                                    href={websiteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                                >
                                    {getStringValue(websiteUrl)}
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Timestamps</h4>
                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Created:</span>
                            <span className="font-medium">{formatDate(asset?.created_at)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Updated:</span>
                            <span className="font-medium">{formatDate(asset?.updated_at)}</span>
                        </div>
                        {asset?.ipo_date && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">IPO Date:</span>
                                <span className="font-medium">{formatDate(asset?.ipo_date)}</span>
                            </div>
                        )}
                    </div>
                </div>

                <MarketDataSection asset={asset} commonData={commonData} />
            </div>
        </ComponentCard>
    )
}

export default StocksInfoCard
