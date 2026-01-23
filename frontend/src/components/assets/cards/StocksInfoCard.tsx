
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

    const financials = asset?.stock_financials_data || {}

    // Helper to render a row only if the value exists
    const InfoRow = ({ label, value, colorClass = 'text-gray-900 dark:text-gray-100', isBold = false, prefix = '', suffix = '', isLink = false }: any) => {
        if (value === null || value === undefined || value === '-' || value === '') return null
        return (
            <div className="flex justify-between items-start gap-4">
                <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{label}:</span>
                {isLink ? (
                    <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all text-right text-[10px] leading-tight max-w-[150px]">
                        {String(value).replace(/^https?:\/\//, '')}
                    </a>
                ) : (
                    <span className={`text-right ${isBold ? 'font-bold' : 'font-medium'} ${colorClass}`}>
                        {prefix}{value}{suffix}
                    </span>
                )}
            </div>
        )
    }

    return (
        <ComponentCard title="Asset Information">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                {/* Section 1: Company Profile */}
                <div>
                    <h4 className="font-semibold mb-5 pb-2 border-b-2 border-blue-500/20 text-gray-900 dark:text-gray-100 uppercase tracking-widest text-[10px]">
                        Company Profile
                    </h4>
                    <div className="space-y-3.5 text-sm">
                        <InfoRow label="Company" value={asset?.company_name || asset?.ticker} isBold={true} />
                        <InfoRow label="Sector" value={asset?.sector} />
                        <InfoRow label="Industry" value={asset?.industry} />
                        <InfoRow label="Country" value={asset?.country} colorClass="font-mono opacity-70 uppercase" />
                        <InfoRow label="Employees" value={formatNumberWithLocale(asset?.employees_count)} />
                        <InfoRow label="IPO Date" value={formatIPODate(asset?.ipo_date)} />
                        <InfoRow label="Website" value={websiteUrl} isLink={true} />
                    </div>
                </div>

                {/* Section 2: Technicals & Growth */}
                <div>
                    <h4 className="font-semibold mb-5 pb-2 border-b-2 border-green-500/20 text-gray-900 dark:text-gray-100 uppercase tracking-widest text-[10px]">
                        Technicals & Growth
                    </h4>
                    <div className="space-y-3.5 text-sm">
                        <InfoRow label="Market Cap" value={formatBillionCurrency(financials?.market_cap)} isBold={true} />
                        <InfoRow label="Shares O/S" value={formatNumberWithLocale(financials?.shares_outstanding)} />
                        <InfoRow label="52W High" value={financials?.week_52_high?.toFixed(2)} prefix="$" colorClass="text-green-600 dark:text-green-400" />
                        <InfoRow label="52W Low" value={financials?.week_52_low?.toFixed(2)} prefix="$" colorClass="text-red-600 dark:text-red-400" />
                        
                        <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-800 space-y-3.5">
                            <InfoRow label="50D MA" value={financials?.day_50_moving_avg?.toFixed(2)} prefix="$" />
                            <InfoRow label="200D MA" value={financials?.day_200_moving_avg?.toFixed(2)} prefix="$" />
                            <InfoRow label="Revenue Growth (YoY)" value={financials?.quarterly_revenue_growth_yoy ? formatPercent(financials.quarterly_revenue_growth_yoy) : null} colorClass="text-blue-500" />
                            <InfoRow label="Earnings Growth (YoY)" value={financials?.quarterly_earnings_growth_yoy ? formatPercent(financials.quarterly_earnings_growth_yoy) : null} colorClass="text-blue-500" />
                        </div>

                        <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-800 space-y-3.5">
                            <InfoRow label="EV/Revenue" value={financials?.ev_to_revenue?.toFixed(2)} />
                            <InfoRow label="EV/EBITDA" value={financials?.ev_to_ebitda?.toFixed(2)} />
                            <InfoRow label="Analyst Target" value={financials?.analyst_target_price?.toFixed(2)} prefix="$" isBold={true} />
                        </div>
                    </div>
                </div>

                {/* Section 3: Financial Ratios */}
                <div>
                    <h4 className="font-semibold mb-5 pb-2 border-b-2 border-amber-500/20 text-gray-900 dark:text-gray-100 uppercase tracking-widest text-[10px]">
                        Financial Ratios
                    </h4>
                    <div className="space-y-3.5 text-sm">
                        <InfoRow label="P/E Ratio" value={financials?.pe_ratio?.toFixed(2)} />
                        <InfoRow label="PEG Ratio" value={financials?.peg_ratio?.toFixed(2)} />
                        <InfoRow label="Forward P/E" value={financials?.forward_pe?.toFixed(2)} />
                        <InfoRow label="P/S Ratio" value={financials?.price_to_sales_ratio_ttm?.toFixed(2)} />
                        <InfoRow label="EPS" value={financials?.eps?.toFixed(2)} prefix="$" />
                        
                        <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-800 space-y-3.5">
                            <InfoRow label="Profit Margin" value={formatPercent(financials?.profit_margin_ttm || stockFinancials?.profit_margin_ttm)} colorClass="text-blue-600 dark:text-blue-400" isBold={true} />
                            <InfoRow label="Operating Margin" value={formatPercent(financials?.operating_margin_ttm)} />
                            <InfoRow label="ROE (TTM)" value={formatPercent(financials?.return_on_equity_ttm || stockFinancials?.return_on_equity_ttm)} />
                            <InfoRow label="ROA (TTM)" value={formatPercent(financials?.return_on_assets_ttm || stockFinancials?.return_on_assets_ttm)} />
                        </div>

                        <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-800 space-y-3.5">
                            <InfoRow label="Dividend Yield" value={formatPercent(financials?.dividend_yield)} colorClass="text-amber-600" />
                            <InfoRow label="Div. Per Share" value={financials?.dividend_per_share?.toFixed(2)} prefix="$" />
                            <InfoRow label="Book Value" value={financials?.book_value?.toFixed(2)} prefix="$" />
                            <InfoRow label="P/B Ratio" value={financials?.price_to_book_ratio?.toFixed(2)} />
                        </div>
                    </div>
                </div>
            </div>
        </ComponentCard>
    )
}

export default StocksInfoCard
