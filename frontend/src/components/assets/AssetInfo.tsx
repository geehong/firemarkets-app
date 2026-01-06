import React from 'react'
import ComponentCard from '@/components/common/ComponentCard'
import { ArrowUpIcon, DollarLineIcon, PieChartIcon, UserIcon } from '@/icons'

interface AssetInfoProps {
    asset: any
    locale: string
}

const AssetInfo: React.FC<AssetInfoProps> = ({ asset, locale }) => {
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

    const ensureString = (value: any) => {
        if (value === null || value === undefined) return null
        if (typeof value === 'object') {
            // Check if it looks like a multilingual string
            if (value.en || value.ko) return getStringValue(value)
            return JSON.stringify(value)
        }
        return String(value)
    }

    const formatNumber = (num: number, suffix: string = '') => {
        if (!num) return '-'
        return num.toLocaleString('en-US') + suffix
    }

    const formatCurrency = (num: number) => {
        if (!num) return '-'
        if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
        if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
        return `$${num.toLocaleString('en-US')}`
    }

    const isStock = asset.type_name === 'Stocks'
    const isCrypto = asset.type_name === 'Crypto'
    const isETF = asset.type_name === 'ETFs' || asset.type_name === 'Funds'
    const isCommodity = asset.type_name === 'Commodity'

    // Filter out keys we don't want to show in the raw view (usually large objects or duplicates)
    const hiddenKeys = [
        'numeric_overview', 'post_overview', 'stock_financials_data',
        'income_json', 'balance_json', 'cash_flow_json', 'ratios_json',
        'content', 'content_ko', 'content_en',
        'excerpt', 'excerpt_ko', 'excerpt_en',
        'description', 'description_ko', 'description_en',
        'logo_url', 'icon_url', 'image_url', 'cover_image'
    ]
    const allKeys = Object.keys(asset).filter(k => !hiddenKeys.includes(k))

    // Prepare rich content
    const contentObj = {
        en: asset.content_en || asset.content,
        ko: asset.content_ko
    }
    const analysisContent = getStringValue(contentObj)

    // Prepare financials (Latest Ratios)
    const getLatestFinancials = (jsonData: any) => {
        if (!jsonData || typeof jsonData !== 'object') return null
        const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData
        const dates = Object.keys(data).sort().reverse()
        if (dates.length === 0) return null
        const latestDate = dates[0]
        return { date: latestDate, data: data[latestDate] }
    }

    const rawRatios = asset.ratios_json
    const latestRatios = isStock && rawRatios ? getLatestFinancials(rawRatios) : null

    return (
        <div className="space-y-6">
            <ComponentCard title="Asset Highlights">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Common Fields */}
                    {getStringValue(asset.country) && (
                        <InfoItem icon={<UserIcon />} label="Country" value={getStringValue(asset.country)} />
                    )}
                    {ensureString(asset.website) && (
                        <div className="flex items-center gap-2">
                            <ArrowUpIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Website:</span>
                            <a href={asset.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                Link
                            </a>
                        </div>
                    )}

                    {/* Stock Specific */}
                    {isStock && (
                        <>
                            <InfoItem icon={<UserIcon />} label="Company" value={getStringValue(asset.company_name)} />
                            <InfoItem icon={<PieChartIcon />} label="Sector" value={getStringValue(asset.sector)} />
                            <InfoItem icon={<UserIcon />} label="Industry" value={getStringValue(asset.industry)} />
                            <InfoItem icon={<UserIcon />} label="CEO" value={getStringValue(asset.ceo)} />
                            <InfoItem icon={<UserIcon />} label="Employees" value={formatNumber(asset.employees_count)} />
                        </>
                    )}

                    {/* Crypto Specific */}
                    {isCrypto && (
                        <>
                            <InfoItem icon={<DollarLineIcon />} label="Symbol" value={asset.crypto_symbol} />
                            <InfoItem icon={<PieChartIcon />} label="Market Cap" value={formatCurrency(asset.crypto_market_cap)} />
                            <InfoItem icon={<ArrowUpIcon />} label="Circulating Supply" value={formatNumber(asset.circulating_supply)} />
                            <InfoItem icon={<UserIcon />} label="Total Supply" value={formatNumber(asset.total_supply)} />
                            <InfoItem icon={<PieChartIcon />} label="Max Supply" value={formatNumber(asset.max_supply)} />
                            <InfoItem icon={<PieChartIcon />} label="CMC Rank" value={`#${asset.cmc_rank}`} />
                        </>
                    )}

                    {/* ETF Specific */}
                    {isETF && (
                        <>
                            <InfoItem icon={<PieChartIcon />} label="Net Assets" value={formatCurrency(asset.net_assets)} />
                            <InfoItem icon={<DollarLineIcon />} label="Expense Ratio" value={asset.net_expense_ratio ? `${(asset.net_expense_ratio * 100).toFixed(2)}%` : '-'} />
                            <InfoItem icon={<ArrowUpIcon />} label="Portfolio Turnover" value={asset.portfolio_turnover ? `${(asset.portfolio_turnover * 100).toFixed(1)}%` : '-'} />
                        </>
                    )}

                    {/* Commodity Specific */}
                    {isCommodity && (
                        <>
                            <InfoItem icon={<PieChartIcon />} label="Type" value={getStringValue(asset.commodity_type)} />
                            <InfoItem icon={<DollarLineIcon />} label="Unit" value={getStringValue(asset.unit)} />
                        </>
                    )}
                </div>
            </ComponentCard>

            {/* Analysis / Content Section */}
            {analysisContent && (
                <ComponentCard title="Analysis & Insights">
                    <div
                        className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: analysisContent }}
                    />
                </ComponentCard>
            )}

            {/* Financial Summary (Stocks Only) */}
            {latestRatios && (
                <ComponentCard title={`Financial Summary (Latest: ${latestRatios.date})`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <InfoItem icon={<DollarLineIcon />} label="EPS" value={latestRatios.data['Basic EPS'] || latestRatios.data['EPS - Earnings Per Share'] || '-'} />
                        <InfoItem icon={<PieChartIcon />} label="ROE" value={latestRatios.data['ROE - Return On Equity'] ? `${Number(latestRatios.data['ROE - Return On Equity']).toFixed(2)}%` : '-'} />
                        <InfoItem icon={<PieChartIcon />} label="Net Margin" value={latestRatios.data['Net Profit Margin'] ? `${Number(latestRatios.data['Net Profit Margin']).toFixed(2)}%` : '-'} />
                        <InfoItem icon={<ArrowUpIcon />} label="Debt/Equity" value={latestRatios.data['Debt/Equity Ratio'] || '-'} />
                        <InfoItem icon={<DollarLineIcon />} label="Operating Margin" value={latestRatios.data['Operating Margin'] ? `${Number(latestRatios.data['Operating Margin']).toFixed(2)}%` : '-'} />
                        <InfoItem icon={<PieChartIcon />} label="P/E Ratio" value={latestRatios.data['PE Ratio'] || '-'} />
                    </div>
                </ComponentCard>
            )}

            {/* Full Data View (Cleaned for Metadata ) */}
            <ComponentCard title="Additional Metadata">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Key</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Value</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                            {allKeys.map((key) => (
                                <tr key={key}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{key}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-mono break-all whitespace-pre-wrap">
                                        {ensureString(asset[key])}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </ComponentCard>
        </div>
    )
}

const InfoItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | null }) => {
    if (!value) return null
    return (
        <div className="flex items-center gap-2">
            <span className="h-4 w-4 text-gray-500 dark:text-gray-400 [&>svg]:w-full [&>svg]:h-full">
                {icon}
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}:</span>
            <span className="text-sm text-gray-900 dark:text-white">{value}</span>
        </div>
    )
}

export default AssetInfo
