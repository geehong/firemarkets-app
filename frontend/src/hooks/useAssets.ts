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

export interface TreemapLiveItem {
  asset_id: number
  ticker: string
  name: string
  asset_type: string
  market_cap: number | null
  logo_url?: string
  price_change_percentage_24h: number | null
  current_price: number | null
  market_status: string
  realtime_updated_at?: string
  daily_data_updated_at?: string
}

export interface TreemapLiveResponse {
  data: TreemapLiveItem[]
  total_count: number
}

// Treemap live data hook for tables
export const useTreemapLive = (
  queryOptions?: UseQueryOptions
) => {
  return useQuery({
    queryKey: ['treemap-live-table'],
    queryFn: () => apiClient.getTreemapLiveData(),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    ...queryOptions,
  })
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
      data_interval: options?.dataInterval,
      start_date: options?.startDate,
      end_date: options?.endDate,
      limit: options?.limit,
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

// TreeMap Live Data Hook
export const useTreemapLiveData = (
  queryOptions?: UseQueryOptions
) => {
  return useQuery({
    queryKey: ['treemap-live'],
    queryFn: () => apiClient.getTreemapLiveData(),
    staleTime: 5 * 60 * 1000, // 5분
    refetchInterval: 15 * 60 * 1000, // 15분마다 자동 새로고침
    ...queryOptions,
  })
}
