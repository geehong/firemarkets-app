/**
 * useAssets - v2 API 기반 Asset 관련 훅
 * 
 * All hooks now use v2 API endpoints for better performance and unified responses
 */

import { useState, useEffect, useCallback } from 'react'
import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { filterExcludedAssets } from '@/constants/excludedAssets'

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

// Treemap live data hook for tables (V2 API)
export const useTreemapLive = (
  params?: {
    asset_type_id?: number
    type_name?: string
    sort_by?: string
    sort_order?: 'asc' | 'desc'
    limit?: number
  },
  queryOptions?: UseQueryOptions
) => {
  return useQuery({
    queryKey: ['treemap-live-table', params],
    queryFn: () => apiClient.v2GetTreemap(params),
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

// Asset Types Hook (V2 API)
export const useAssetTypes = (
  options?: {
    hasData?: boolean
    includeDescription?: boolean
  }
) => {
  const [data, setData] = useState<any>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiClient.v2GetAssetTypes({
          has_data: options?.hasData,
          include_description: options?.includeDescription
        })
        setData(result)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [JSON.stringify(options)])

  return { data, loading, error }
}

// Assets List Hook (V2 API)
export const useAssets = (
  options?: {
    assetTypeId?: number
    type_name?: string
    limit?: number
    offset?: number
    search?: string
  }
) => {
  const [data, setData] = useState<any>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiClient.v2GetAssets({
          type_name: options?.type_name,
          limit: options?.limit,
          offset: options?.offset,
          search: options?.search,
        })
        setData(result)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [JSON.stringify(options)])

  return { data, loading, error }
}

// Asset Detail Hook (V2 API - uses overview)
export const useAssetDetail = (
  assetIdentifier: string
) => {
  const [data, setData] = useState<any>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    if (!assetIdentifier) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiClient.v2GetOverview(assetIdentifier)
        setData(result)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [assetIdentifier])

  return { data, loading, error }
}

// OHLCV Data Hook (V2 API)
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
    queryFn: () => apiClient.v2GetOhlcv(assetIdentifier, {
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

// Asset Price Hook with date range (V2 API)
export const useAssetPriceWithRange = (
  assetIdentifier: string,
  options?: {
    dataInterval?: string
    startDate?: string
    endDate?: string
    limit?: number
  },
  queryOptions?: UseQueryOptions
) => {
  return useQuery({
    queryKey: ['asset-price', assetIdentifier, options],
    queryFn: () => apiClient.v2GetOhlcv(assetIdentifier, {
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

// Asset Price Hook (V2 API)
export const useAssetPrice = (
  assetIdentifier: string
) => {
  const [data, setData] = useState<any>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    if (!assetIdentifier) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiClient.v2GetPrice(assetIdentifier)
        setData(result)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [assetIdentifier])

  return { data, loading, error }
}

// Market Caps Hook (V2 API)
export const useMarketCaps = (
  options?: {
    type_name?: string
    limit?: number
    offset?: number
  }
) => {
  const [data, setData] = useState<any>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiClient.v2GetMarketCaps(options)
        setData(result)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [JSON.stringify(options)])

  return { data, loading, error }
}

// TreeMap Live Data Hook (V2 API)
export const useTreemapLiveData = (
  params?: { asset_type_id?: number; type_name?: string; limit?: number }
) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['treemap-live-view', params],
    queryFn: () => apiClient.v2GetTreemap(params),
    staleTime: 5 * 60 * 1000, // 5분 캐시
    refetchInterval: 15 * 60 * 1000, // 15분마다 자동 갱신
  })

  return { data, loading: isLoading, error, refetch }
}

// Assets List with Filters Hook (V2 API)
export const useAssetsList = (
  options?: {
    type_name?: string
    has_ohlcv_data?: boolean
    limit?: number
    offset?: number
    search?: string
  }
) => {
  const [data, setData] = useState<any>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiClient.v2GetAssets(options)
        setData(result)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [JSON.stringify(options)])

  return { data, loading, error }
}

// Performance TreeMap Hook (V2 API)
export const usePerformanceTreeMap = (
  params?: { type_name?: string; limit?: number }
) => {
  const [data, setData] = useState<any>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiClient.v2GetTreemap(params)
        setData(result)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // 15분마다 자동 새로고침
    const interval = setInterval(fetchData, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [JSON.stringify(params)])

  return { data, loading, error }
}
