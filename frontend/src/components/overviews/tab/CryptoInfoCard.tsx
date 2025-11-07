import React from 'react'
import ComponentCard from '@/components/common/ComponentCard'
import MarketDataSection from '@/components/overviews/tab/MarketDataSection'
import { formatDate, formatNumberWithLocale, toNumber, getStringValue } from '@/components/overviews/utils/formatters'
import { ArrowUpIcon, DollarLineIcon, PieChartIcon, UserIcon } from '@/icons'

interface CryptoInfoCardProps {
  asset: any
  commonData?: any
}

const formatCurrency = (value: any, fractionDigits = 2) => {
  const num = toNumber(value)
  if (num === null) return null
  return `$${num.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`
}

const formatPercent = (value: any, fractionDigits = 2) => {
  const num = toNumber(value)
  if (num === null) return null
  return `${num >= 0 ? '+' : ''}${num.toFixed(fractionDigits)}%`
}

const getPercentClass = (value: any) => {
  const num = toNumber(value)
  if (num === null) return 'text-gray-600'
  return num >= 0 ? 'text-green-600' : 'text-red-600'
}

const CryptoInfoCard: React.FC<CryptoInfoCardProps> = ({ asset, commonData }) => {
  const marketCap = toNumber(commonData?.market_cap ?? asset?.market_cap)
  const websiteUrl = typeof asset?.website_url === 'string' ? asset.website_url : undefined
  const explorerUrl = typeof asset?.explorer === 'string' ? asset.explorer : undefined

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
              <span className="text-gray-500">Symbol:</span>
              <span>{getStringValue(asset?.crypto_symbol ?? asset?.symbol)}</span>
            </div>
            {asset?.currency && (
              <div className="flex justify-between">
                <span className="text-gray-500">Currency:</span>
                <span>{getStringValue(asset.currency)}</span>
              </div>
            )}
            {marketCap !== null && (
              <div className="flex justify-between">
                <span className="text-gray-500">Market Cap:</span>
                <span>{`$${(marketCap / 1e9).toFixed(2)}B`}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Crypto Metrics</h4>
          <div className="space-y-2 text-sm">
            {(asset?.crypto_current_price ?? asset?.current_price) && (
              <div className="flex justify-between">
                <span className="text-gray-500">Current Price:</span>
                <span>{formatCurrency(asset?.crypto_current_price ?? asset?.current_price)}</span>
              </div>
            )}
            {asset?.volume_24h && (
              <div className="flex justify-between">
                <span className="text-gray-500">24h Volume:</span>
                <span>{formatCurrency(asset.volume_24h, 0)}</span>
              </div>
            )}
            {formatPercent(asset?.percent_change_24h) && (
              <div className="flex justify-between">
                <span className="text-gray-500">24h Change:</span>
                {(() => {
                  const formatted = formatPercent(asset?.percent_change_24h)
                  if (!formatted) return null
                  return <span className={getPercentClass(asset?.percent_change_24h)}>{formatted}</span>
                })()}
              </div>
            )}
            {formatPercent(asset?.percent_change_7d) && (
              <div className="flex justify-between">
                <span className="text-gray-500">7d Change:</span>
                {(() => {
                  const formatted = formatPercent(asset?.percent_change_7d)
                  if (!formatted) return null
                  return <span className={getPercentClass(asset?.percent_change_7d)}>{formatted}</span>
                })()}
              </div>
            )}
            {formatPercent(asset?.percent_change_30d) && (
              <div className="flex justify-between">
                <span className="text-gray-500">30d Change:</span>
                {(() => {
                  const formatted = formatPercent(asset?.percent_change_30d)
                  if (!formatted) return null
                  return <span className={getPercentClass(asset?.percent_change_30d)}>{formatted}</span>
                })()}
              </div>
            )}
            {asset?.circulating_supply && (
              <div className="flex justify-between">
                <span className="text-gray-500">Circulating Supply:</span>
                <span>{formatNumberWithLocale(asset.circulating_supply)}</span>
              </div>
            )}
            {asset?.total_supply && (
              <div className="flex justify-between">
                <span className="text-gray-500">Total Supply:</span>
                <span>{formatNumberWithLocale(asset.total_supply)}</span>
              </div>
            )}
            {asset?.max_supply && (
              <div className="flex justify-between">
                <span className="text-gray-500">Max Supply:</span>
                <span>{formatNumberWithLocale(asset.max_supply)}</span>
              </div>
            )}
            {asset?.cmc_rank && (
              <div className="flex justify-between">
                <span className="text-gray-500">CMC Rank:</span>
                <span>#{asset.cmc_rank}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Project Details</h4>
          <div className="space-y-2 text-sm">
            {asset?.category && (
              <div className="flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Category:</span>
                <span className="text-sm capitalize">{getStringValue(asset.category)}</span>
              </div>
            )}
            {asset?.tags && Array.isArray(asset.tags) && asset.tags.length > 0 && (
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Tags:</span>
                <span className="text-sm">
                  {asset.tags
                    .slice(0, 5)
                    .map((tag: any) => getStringValue(tag))
                    .join(', ')}
                </span>
              </div>
            )}
            {websiteUrl && (
              <div className="flex items-center gap-2">
                <ArrowUpIcon className="h-4 w-4 text-gray-500" />
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
            {explorerUrl && (
              <div className="flex items-center gap-2">
                <ArrowUpIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Explorer:</span>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {getStringValue(explorerUrl)}
                </a>
              </div>
            )}
            {asset?.description && (
              <div>
                <span className="text-sm font-medium">Description:</span>
                <p className="text-sm text-gray-600 mt-1 line-clamp-3">{getStringValue(asset.description)}</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Timestamps</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Date Added:</span>
              <span>{formatDate(asset?.date_added)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Created:</span>
              <span>{formatDate(asset?.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Updated:</span>
              <span>{formatDate(asset?.updated_at)}</span>
            </div>
          </div>
        </div>

        <MarketDataSection asset={asset} commonData={commonData} />
      </div>
    </ComponentCard>
  )
}

export default CryptoInfoCard

