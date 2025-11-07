import React from 'react'
import ComponentCard from '@/components/common/ComponentCard'
import MarketDataSection from '@/components/overviews/tab/MarketDataSection'
import { formatDate, formatIPODate, toNumber, getStringValue } from '@/components/overviews/utils/formatters'
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

const formatPercent = (value: any, fractionDigits = 2) => {
  const num = toNumber(value)
  if (num === null) return null
  return `${num.toFixed(fractionDigits)}%`
}

const ETFInfoCard: React.FC<ETFInfoCardProps> = ({ asset, commonData }) => {
  const marketCap = formatCurrencyBillion(commonData?.market_cap ?? asset?.market_cap ?? asset?.net_assets)

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
                <span className="text-gray-500">Net Assets:</span>
                <span>{marketCap}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">ETF Metrics</h4>
          <div className="space-y-2 text-sm">
            {asset?.net_expense_ratio && (
              <div className="flex justify-between">
                <span className="text-gray-500">Expense Ratio:</span>
                <span>{formatPercent(asset.net_expense_ratio * 100)}</span>
              </div>
            )}
            {asset?.portfolio_turnover && (
              <div className="flex justify-between">
                <span className="text-gray-500">Portfolio Turnover:</span>
                <span>{formatPercent(asset.portfolio_turnover * 100, 1)}</span>
              </div>
            )}
            {asset?.etf_dividend_yield && (
              <div className="flex justify-between">
                <span className="text-gray-500">Dividend Yield:</span>
                <span>{formatPercent(asset.etf_dividend_yield * 100)}</span>
              </div>
            )}
            {asset?.leveraged !== null && asset?.leveraged !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-500">Leveraged:</span>
                <span>{asset.leveraged ? 'Yes' : 'No'}</span>
              </div>
            )}
            {asset?.holdings && Array.isArray(asset.holdings) && asset.holdings.length > 0 && (
              <div>
                <span className="text-sm font-medium">Top Holdings:</span>
                <div className="text-sm text-gray-600 mt-1 space-y-1">
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
                <span className="text-sm font-medium">Top Sectors:</span>
                <div className="text-sm text-gray-600 mt-1">
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
          <h4 className="font-medium mb-2">Fund Details</h4>
          <div className="space-y-2 text-sm">
            {asset?.inception_date && (
              <div className="flex items-center gap-2">
                <DollarLineIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Inception Date:</span>
                <span className="text-sm">{formatIPODate(asset.inception_date)}</span>
              </div>
            )}
            {asset?.category && (
              <div className="flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Category:</span>
                <span className="text-sm">{getStringValue(asset.category)}</span>
              </div>
            )}
            {asset?.region && (
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Region:</span>
                <span className="text-sm">{getStringValue(asset.region)}</span>
              </div>
            )}
            {asset?.issuer && (
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Issuer:</span>
                <span className="text-sm">{getStringValue(asset.issuer)}</span>
              </div>
            )}
            {typeof asset?.website === 'string' && (
              <div className="flex items-center gap-2">
                <DollarLineIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Website:</span>
                <a
                  href={asset.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {getStringValue(asset.website)}
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
            {asset?.inception_date && (
              <div className="flex justify-between">
                <span className="text-gray-500">Inception Date:</span>
                <span>{formatDate(asset?.inception_date)}</span>
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

