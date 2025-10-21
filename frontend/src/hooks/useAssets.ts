import { useState, useEffect } from 'react'
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
  params?: { 
    asset_type_id?: number
    type_name?: string
    sort_by?: string
    sort_order?: 'asc' | 'desc'
  },
  queryOptions?: UseQueryOptions
) => {
  return useQuery({
    queryKey: ['treemap-live-table', params],
    queryFn: () => apiClient.getTreemapLiveData(params),
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
        const result = await apiClient.getAssetTypes(options)
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

// Assets List Hook
export const useAssets = (
  options?: {
    assetTypeId?: number
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
        const result = await apiClient.getAssets(options)
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

// Asset Detail Hook
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
        const result = await apiClient.getAssetDetail(assetIdentifier)
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
        const result = await apiClient.getAssetPrice(assetIdentifier)
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

// Market Caps Hook
export const useMarketCaps = (
  options?: {
    assetTypeId?: number
    limit?: number
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
        const result = await apiClient.getMarketCaps(options)
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

// TreeMap Live Data Hook
export const useTreemapLiveData = (
  params?: { asset_type_id?: number; type_name?: string }
) => {
  const [data, setData] = useState<any>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiClient.getTreemapLiveData(params)
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

// Assets List with Filters Hook (for overviews migration)
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
        const result = await apiClient.getAssetsList(options)
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

// Performance TreeMap Hook (for AssetsList component)
export const usePerformanceTreeMap = () => {
  const [data, setData] = useState<any>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiClient.getPerformanceTreeMap()
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
  }, [])

  return { data, loading, error }
}
