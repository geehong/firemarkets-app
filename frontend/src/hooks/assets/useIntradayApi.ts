"use client"

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'

interface UseIntradayApiParams {
  assetIdentifier: string
  dataInterval?: string
  ohlcv?: boolean
  days?: number
  limit?: number
}

export const useIntradayApi = ({
  assetIdentifier,
  dataInterval = '4h',
  ohlcv = true,
  days = 1,
  limit = 1000
}: UseIntradayApiParams) => {
  return useQuery({
    queryKey: ['intraday-ohlcv', assetIdentifier, dataInterval, ohlcv, days, limit],
    queryFn: () => apiClient.getIntradayOhlcv({
      asset_identifier: assetIdentifier,
      data_interval: dataInterval,
      ohlcv,
      days,
      limit
    }),
    enabled: !!assetIdentifier,
    staleTime: 1 * 60 * 1000, // 1분
    retry: 3,
  })
}

export default useIntradayApi
