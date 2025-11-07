import React from 'react'
import { formatDate, formatNumberWithLocale, toNumber } from '@/components/overviews/utils/formatters'

interface MarketDataSectionProps {
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

const MarketDataSection: React.FC<MarketDataSectionProps> = ({ asset, commonData }) => {
  const prevClose = toNumber(commonData?.prev_close ?? asset?.prev_close)
  const week52High = toNumber(commonData?.week_52_high ?? asset?.week_52_high)
  const week52Low = toNumber(commonData?.week_52_low ?? asset?.week_52_low)
  const volume = toNumber(commonData?.volume ?? asset?.volume)
  const averageVol3m = toNumber(commonData?.average_vol_3m ?? asset?.average_vol_3m)
  const day50MA = toNumber(commonData?.day_50_moving_avg ?? asset?.day_50_moving_avg)
  const day200MA = toNumber(commonData?.day_200_moving_avg ?? asset?.day_200_moving_avg)
  const lastUpdated = commonData?.last_updated ?? asset?.common_last_updated

  const hasData = [prevClose, week52High, week52Low, volume, averageVol3m, day50MA, day200MA, lastUpdated]
    .some((value) => value !== null && value !== undefined)

  if (!hasData) {
    return null
  }

  return (
    <div>
      <h4 className="font-medium mb-2">Market Data</h4>
      <div className="space-y-2 text-sm">
        {prevClose !== null && (
          <div className="flex justify-between">
            <span className="text-gray-500">Previous Close:</span>
            <span>{formatCurrency(prevClose)}</span>
          </div>
        )}
        {(week52High !== null || week52Low !== null) && (
          <>
            {week52High !== null && (
              <div className="flex justify-between">
                <span className="text-gray-500">52 Week High:</span>
                <span>{formatCurrency(week52High)}</span>
              </div>
            )}
            {week52Low !== null && (
              <div className="flex justify-between">
                <span className="text-gray-500">52 Week Low:</span>
                <span>{formatCurrency(week52Low)}</span>
              </div>
            )}
          </>
        )}
        {volume !== null && (
          <div className="flex justify-between">
            <span className="text-gray-500">Volume:</span>
            <span>{formatNumberWithLocale(volume)}</span>
          </div>
        )}
        {averageVol3m !== null && (
          <div className="flex justify-between">
            <span className="text-gray-500">Avg Volume (3M):</span>
            <span>{formatNumberWithLocale(averageVol3m)}</span>
          </div>
        )}
        {day50MA !== null && (
          <div className="flex justify-between">
            <span className="text-gray-500">50 Day MA:</span>
            <span>{formatCurrency(day50MA)}</span>
          </div>
        )}
        {day200MA !== null && (
          <div className="flex justify-between">
            <span className="text-gray-500">200 Day MA:</span>
            <span>{formatCurrency(day200MA)}</span>
          </div>
        )}
        {lastUpdated && (
          <div className="flex justify-between">
            <span className="text-gray-500">Last Updated:</span>
            <span>{formatDate(lastUpdated)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default MarketDataSection

