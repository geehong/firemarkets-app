import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'

// Types
export interface AssetType {
  asset_type_id: number
  name: string
  description?: string
}

export interface Asset {
  asset_id: number
  asset_identifier: string
  name: string
  asset_type_id: number
  market_cap?: number
}

export interface OHLCVData {
  timestamp_utc: string
  open_price: string | number
  high_price: string | number
  low_price: string | number
  close_price: string | number
  volume: string | number
}

// Asset Types Hook
export const useAssetTypes = (
  options?: {
    hasData?: boolean
    includeDescription?: boolean
  },
  queryOptions?: UseQueryOptions
) => {
  return useQuery({
    queryKey: ['asset-types', options],
    queryFn: () => apiClient.getAssetTypes(options),
    ...queryOptions,
  })
}

// Assets List Hook
export const useAssets = (
  options?: {
    assetTypeId?: number
    limit?: number
    offset?: number
    search?: string
  },
  queryOptions?: UseQueryOptions
) => {
  return useQuery({
    queryKey: ['assets', options],
    queryFn: () => apiClient.getAssets(options),
    ...queryOptions,
  })
}

// Asset Detail Hook
export const useAssetDetail = (
  assetIdentifier: string,
  queryOptions?: UseQueryOptions
) => {
  return useQuery({
    queryKey: ['asset-detail', assetIdentifier],
    queryFn: () => apiClient.getAssetDetail(assetIdentifier),
    enabled: !!assetIdentifier,
    ...queryOptions,
  })
}

// OHLCV Data Hook
export const useOhlcvData = (
  assetIdentifier: string,
  options?: {
    dataInterval?: string
    limit?: number
    startDate?: string
    endDate?: string
  },
  queryOptions?: UseQueryOptions
) => {
  return useQuery({
    queryKey: ['ohlcv', assetIdentifier, options],
    queryFn: () => apiClient.getAssetsOhlcv({
      asset_identifier: assetIdentifier,
      ...options
    }),
    enabled: !!assetIdentifier,
    staleTime: 1 * 60 * 1000, // 1분
    ...queryOptions,
  })
}

// Asset Price Hook
export const useAssetPrice = (
  assetIdentifier: string,
  queryOptions?: UseQueryOptions
) => {
  return useQuery({
    queryKey: ['asset-price', assetIdentifier],
    queryFn: () => apiClient.getAssetPrice(assetIdentifier),
    enabled: !!assetIdentifier,
    staleTime: 30 * 1000, // 30초
    ...queryOptions,
  })
}

// Market Caps Hook
export const useMarketCaps = (
  options?: {
    assetTypeId?: number
    limit?: number
  },
  queryOptions?: UseQueryOptions
) => {
  return useQuery({
    queryKey: ['market-caps', options],
    queryFn: () => apiClient.getMarketCaps(options),
    ...queryOptions,
  })
}
