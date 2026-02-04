'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api'

interface TickerData {
  asset_id: number
  ticker: string
  asset_type_id: number
  name: string
  exchange?: string
  currency?: string
  is_active: boolean
  description?: string
  data_source?: string
  created_at: string
  updated_at: string
  type_name: string
  collect_price: boolean
  collect_assets_info: boolean
  collect_financials: boolean
  collect_estimates: boolean
  collect_onchain: boolean
  collect_technical_indicators: boolean
  collection_settings: any
}

interface UseAssetsOptions {
  type_name?: string
  has_ohlcv_data?: boolean
  limit?: number
  offset?: number
  enabled?: boolean
}

interface UseAssetsReturn {
  data: TickerData[]
  total_count: number
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export const useAssets = ({
  type_name,
  has_ohlcv_data = false,
  limit = 1000,
  offset = 0,
  enabled = true
}: UseAssetsOptions = {}): UseAssetsReturn => {
  const [data, setData] = useState<TickerData[]>([])
  const [total_count, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    if (!enabled) return

    setLoading(true)
    setError(null)

    try {
      const result = await apiClient.v2GetAssets({
        type_name,
        has_ohlcv_data,
        limit,
        offset
      })

      // V2 response adaptive mapping
      const items = result.data || result.items || result || []
      const total = result.total_count || result.total || (Array.isArray(items) ? items.length : 0)

      setData(items)
      setTotalCount(total)
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [enabled, type_name, has_ohlcv_data, limit, offset])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, total_count, loading, error, refetch: fetchData }
}

// 자산 타입별 필터링을 위한 훅
export const useAssetTypes = () => {
  const [assetTypes, setAssetTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchAssetTypes = async () => {
      try {
        const result = await apiClient.v2GetAssetTypes({ has_data: false })
        if (Array.isArray(result)) {
           // If result is object array (AssetType[]), map to names
           const types = result.map((t: any) => t.name || t.type_name || t)
           // Remove duplicates just in case
           setAssetTypes(Array.from(new Set(types)))
        } else if (result && Array.isArray(result.data)) {
           const types = result.data.map((t: any) => t.name || t.type_name || t)
           setAssetTypes(Array.from(new Set(types)))
        } else {
           setAssetTypes([])
        }
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Unknown error'))
      } finally {
        setLoading(false)
      }
    }

    fetchAssetTypes()
  }, [])

  return { assetTypes, loading, error }
}

// 티커 설정 업데이트를 위한 훅
export const useUpdateTickerSettings = () => {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const updateSettings = useCallback(async (assetId: number, settings: Record<string, any>) => {
    setUpdating(true)
    setError(null)

    try {
      const response = await fetch(`https://backend.firemarkets.net/api/v1/tickers/${assetId}/collection-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'))
      throw e
    } finally {
      setUpdating(false)
    }
  }, [])

  return { updateSettings, updating, error }
}

// 일괄 업데이트를 위한 훅
export const useBulkUpdateTickerSettings = () => {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const bulkUpdate = useCallback(async (updates: Array<{ assetId: number; settings: Record<string, any> }>) => {
    setUpdating(true)
    setError(null)

    try {
      // 백엔드 API 형식에 맞게 데이터 변환
      const requestData = updates.map(({ assetId, settings }) => ({
        asset_id: assetId,
        ...settings
      }))

      const response = await fetch(`https://backend.firemarkets.net/api/v1/tickers/bulk-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          updates: requestData
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'))
      throw e
    } finally {
      setUpdating(false)
    }
  }, [])

  return { bulkUpdate, updating, error }
}
