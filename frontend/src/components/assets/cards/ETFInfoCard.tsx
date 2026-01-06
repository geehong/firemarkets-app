
import React from 'react'
import ComponentCard from '@/components/common/ComponentCard'
import MarketDataSection from './MarketDataSection'
import { formatDate, formatIPODate, toNumber, getStringValue, formatPercent } from '@/utils/formatters'
import { DollarLineIcon, PieChartIcon, UserIcon } from '@/icons'

interface ETFInfoCardProps {
    asset: any
    commonData?: any
}

const formatCurrencyBillion = (value: any) => {
    const num = toNumber(value)
    if (num === null) return null
    return `$${(num / 1e9).toFixed(2)}B`
}

const ETFInfoCard: React.FC<ETFInfoCardProps> = ({ asset, commonData }) => {
    const marketCap = formatCurrencyBillion(commonData?.market_cap ?? asset?.market_cap ?? asset?.net_assets)

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
                                <span className="text-gray-500 dark:text-gray-400">Net Assets:</span>
                                <span className="font-medium">{marketCap}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">ETF Metrics</h4>
                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        {asset?.net_expense_ratio && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Expense Ratio:</span>
                                <span className="font-medium">{formatPercent(asset.net_expense_ratio * 100)}</span>
                            </div>
                        )}
                        {asset?.portfolio_turnover && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Portfolio Turnover:</span>
                                <span className="font-medium">{formatPercent(asset.portfolio_turnover * 100, 1)}</span>
                            </div>
                        )}
                        {asset?.etf_dividend_yield && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Dividend Yield:</span>
                                <span className="font-medium">{formatPercent(asset.etf_dividend_yield * 100)}</span>
                            </div>
                        )}
                        {asset?.leveraged !== null && asset?.leveraged !== undefined && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Leveraged:</span>
                                <span className="font-medium">{asset.leveraged ? 'Yes' : 'No'}</span>
                            </div>
                        )}
                        {asset?.holdings && Array.isArray(asset.holdings) && asset.holdings.length > 0 && (
                            <div>
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Top Holdings:</span>
                                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 space-y-1">
                                    {asset.holdings.slice(0, 5).map((holding: any, index: number) => (
                                        <div key={index} className="flex justify-between">
                                            <span>{holding.symbol}</span>
                                            <span>{formatPercent(holding.weight * 100, 1)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {asset?.sectors && Array.isArray(asset.sectors) && asset.sectors.length > 0 && (
                            <div>
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Top Sectors:</span>
                                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                    {asset.sectors.slice(0, 5).map((sector: any, index: number) => (
                                        <div key={index} className="flex justify-between">
                                            <span>{sector.sector}</span>
                                            <span>{formatPercent(sector.weight * 100, 1)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Fund Details</h4>
                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        {asset?.inception_date && (
                            <div className="flex items-center gap-2">
                                <DollarLineIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Inception Date:</span>
                                <span className="text-sm font-medium">{formatIPODate(asset.inception_date)}</span>
                            </div>
                        )}
                        {asset?.category && (
                            <div className="flex items-center gap-2">
                                <PieChartIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Category:</span>
                                <span className="text-sm font-medium">{getStringValue(asset.category)}</span>
                            </div>
                        )}
                        {asset?.region && (
                            <div className="flex items-center gap-2">
                                <UserIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Region:</span>
                                <span className="text-sm font-medium">{getStringValue(asset.region)}</span>
                            </div>
                        )}
                        {asset?.issuer && (
                            <div className="flex items-center gap-2">
                                <UserIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Issuer:</span>
                                <span className="text-sm font-medium">{getStringValue(asset.issuer)}</span>
                            </div>
                        )}
                        {typeof asset?.website === 'string' && (
                            <div className="flex items-center gap-2">
                                <DollarLineIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Website:</span>
                                <a
                                    href={asset.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                                >
                                    {getStringValue(asset.website)}
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
                        {asset?.inception_date && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Inception Date:</span>
                                <span className="font-medium">{formatDate(asset?.inception_date)}</span>
                            </div>
                        )}
                    </div>
                </div>

                <MarketDataSection asset={asset} commonData={commonData} />
            </div>
        </ComponentCard>
    )
}

export default ETFInfoCard
