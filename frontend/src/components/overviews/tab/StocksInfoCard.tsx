import React from 'react'
import ComponentCard from '@/components/common/ComponentCard'
import MarketDataSection from '@/components/overviews/tab/MarketDataSection'
import { formatDate, formatIPODate, formatNumberWithLocale, toNumber, getStringValue } from '@/components/overviews/utils/formatters'
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
          <h4 className="font-medium mb-2">Basic Information</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Asset ID:</span>
              <span>{asset?.asset_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Type:</span>
              <span>{getStringValue(asset?.type_name)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Exchange:</span>
              <span>{getStringValue(asset?.exchange)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Currency:</span>
              <span>{getStringValue(asset?.currency)}</span>
            </div>
            {marketCap && (
              <div className="flex justify-between">
                <span className="text-gray-500">Market Cap:</span>
                <span>{marketCap}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Financial Metrics</h4>
          <div className="space-y-2 text-sm">
            {(stockFinancials?.pe_ratio ?? asset?.pe_ratio) && (
              <div className="flex justify-between">
                <span className="text-gray-500">P/E Ratio:</span>
                <span>{(stockFinancials?.pe_ratio ?? asset?.pe_ratio)?.toFixed?.(2) ?? stockFinancials?.pe_ratio ?? asset?.pe_ratio}</span>
              </div>
            )}
            {(stockFinancials?.eps ?? asset?.eps) && (
              <div className="flex justify-between">
                <span className="text-gray-500">EPS:</span>
                <span>
                  {typeof (stockFinancials?.eps ?? asset?.eps) === 'number'
                    ? `$${(stockFinancials?.eps ?? asset?.eps).toFixed(2)}`
                    : stockFinancials?.eps ?? asset?.eps}
                </span>
              </div>
            )}
            {(stockFinancials?.beta ?? asset?.beta) && (
              <div className="flex justify-between">
                <span className="text-gray-500">Beta:</span>
                <span>
                  {typeof (stockFinancials?.beta ?? asset?.beta) === 'number'
                    ? (stockFinancials?.beta ?? asset?.beta).toFixed(3)
                    : stockFinancials?.beta ?? asset?.beta}
                </span>
              </div>
            )}
            {(stockFinancials?.dividend_yield ?? asset?.dividend_yield) && (
              <div className="flex justify-between">
                <span className="text-gray-500">Dividend Yield:</span>
                <span>{formatPercentFromFraction(stockFinancials?.dividend_yield ?? asset?.dividend_yield)}</span>
              </div>
            )}
            {(stockFinancials?.shares_outstanding ?? asset?.shares_outstanding) && (
              <div className="flex justify-between">
                <span className="text-gray-500">Shares Outstanding:</span>
                <span>{formatNumberWithLocale(stockFinancials?.shares_outstanding ?? asset?.shares_outstanding)}</span>
              </div>
            )}
            {stockFinancials?.revenue_ttm && (
              <div className="flex justify-between">
                <span className="text-gray-500">Revenue (TTM):</span>
                <span>{formatBillionCurrency(stockFinancials?.revenue_ttm)}</span>
              </div>
            )}
            {stockFinancials?.ebitda && (
              <div className="flex justify-between">
                <span className="text-gray-500">EBITDA:</span>
                <span>{formatBillionCurrency(stockFinancials?.ebitda)}</span>
              </div>
            )}
            {stockFinancials?.profit_margin_ttm && (
              <div className="flex justify-between">
                <span className="text-gray-500">Profit Margin (TTM):</span>
                <span>{formatPercentFromFraction(stockFinancials?.profit_margin_ttm)}</span>
              </div>
            )}
            {stockFinancials?.return_on_equity_ttm && (
              <div className="flex justify-between">
                <span className="text-gray-500">ROE (TTM):</span>
                <span>{formatPercentFromFraction(stockFinancials?.return_on_equity_ttm)}</span>
              </div>
            )}
            {stockFinancials?.return_on_assets_ttm && (
              <div className="flex justify-between">
                <span className="text-gray-500">ROA (TTM):</span>
                <span>{formatPercentFromFraction(stockFinancials?.return_on_assets_ttm)}</span>
              </div>
            )}
            {stockFinancials?.price_to_book_ratio && (
              <div className="flex justify-between">
                <span className="text-gray-500">P/B Ratio:</span>
                <span>{stockFinancials?.price_to_book_ratio?.toFixed?.(2) ?? stockFinancials?.price_to_book_ratio}</span>
              </div>
            )}
            {stockFinancials?.dividend_per_share && (
              <div className="flex justify-between">
                <span className="text-gray-500">Dividend Per Share:</span>
                <span>
                  {typeof stockFinancials?.dividend_per_share === 'number'
                    ? `$${stockFinancials.dividend_per_share.toFixed(2)}`
                    : stockFinancials?.dividend_per_share}
                </span>
              </div>
            )}
            {stockFinancials?.book_value && (
              <div className="flex justify-between">
                <span className="text-gray-500">Book Value:</span>
                <span>
                  {typeof stockFinancials?.book_value === 'number'
                    ? `$${stockFinancials.book_value.toFixed(2)}`
                    : stockFinancials?.book_value}
                </span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Company Details</h4>
          <div className="space-y-2 text-sm">
            {asset?.company_name && (
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Company:</span>
                <span className="text-sm">{getStringValue(asset.company_name)}</span>
              </div>
            )}
            {asset?.sector && (
              <div className="flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Sector:</span>
                <span className="text-sm">{getStringValue(asset.sector)}</span>
              </div>
            )}
            {asset?.industry && (
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Industry:</span>
                <span className="text-sm">{getStringValue(asset.industry)}</span>
              </div>
            )}
            {asset?.country && (
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Country:</span>
                <span className="text-sm">{getStringValue(asset.country)}</span>
              </div>
            )}
            {asset?.employees_count && (
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Employees:</span>
                <span className="text-sm">{formatNumberWithLocale(asset.employees_count)}</span>
              </div>
            )}
            {asset?.ceo && (
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">CEO:</span>
                <span className="text-sm">{getStringValue(asset.ceo)}</span>
              </div>
            )}
            {asset?.ipo_date && (
              <div className="flex items-center gap-2">
                <DollarLineIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">IPO Date:</span>
                <span className="text-sm">{formatIPODate(asset.ipo_date)}</span>
              </div>
            )}
            {websiteUrl && (
              <div className="flex items-center gap-2">
                <DollarLineIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Website:</span>
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {getStringValue(websiteUrl)}
                </a>
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Timestamps</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Created:</span>
              <span>{formatDate(asset?.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Updated:</span>
              <span>{formatDate(asset?.updated_at)}</span>
            </div>
            {asset?.ipo_date && (
              <div className="flex justify-between">
                <span className="text-gray-500">IPO Date:</span>
                <span>{formatDate(asset?.ipo_date)}</span>
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

