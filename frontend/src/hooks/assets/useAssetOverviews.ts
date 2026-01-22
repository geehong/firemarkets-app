/**
 * useAssetOverviews - v2 API 기반 Asset Overview 훅
 * 
 * All methods now use v2 API for unified asset data
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { apiClient } from '@/lib/api'

// 응답 타입 정의
export interface StockInfoData {
  asset_id: number
  post_overview?: {
    post_id?: number
    title?: any
    slug?: string
    description?: any
    excerpt?: any
    content?: string
    content_ko?: string
    cover_image?: string
    cover_image_alt?: string
    keywords?: string
    canonical_url?: string
    meta_title?: any
    meta_description?: any
    status?: string
    published_at?: string
    updated_at?: string
    company_name?: string
    sector?: string
    industry?: string
    country?: string
    ceo?: string
    employees_count?: number
    ipo_date?: string
    logo_image_url?: string
    description_en?: string
    description_ko?: string
    website?: string
    exchange?: string
    exchange_full_name?: string
  }
  numeric_overview?: {
    ticker?: string
    stock_financials_data?: any
    income_json?: any
    balance_json?: any
    cash_flow_json?: any
    ratios_json?: any
  }
  estimates_overview?: {
    fiscal_date?: string
    name?: string
    revenue_avg?: number
    revenue_low?: number
    revenue_high?: number
    revenue_analysts_count?: number
    eps_avg?: number
    eps_low?: number
    eps_high?: number
    eps_analysts_count?: number
    ebitda_avg?: number
    ebitda_low?: number
    ebitda_high?: number
    ebit_avg?: number
    ebit_low?: number
    ebit_high?: number
    net_income_avg?: number
    net_income_low?: number
    net_income_high?: number
    sga_expense_avg?: number
    sga_expense_low?: number
    sga_expense_high?: number
  }
}

export interface CryptoInfoData {
  asset_id: number
  post_overview?: {
    post_id?: number
    title?: any
    slug?: string
    description?: any
    excerpt?: any
    content?: string
    content_ko?: string
    cover_image?: string
    cover_image_alt?: string
    keywords?: string
    canonical_url?: string
    meta_title?: any
    meta_description?: any
    status?: string
    published_at?: string
    updated_at?: string
    logo_url?: string
    website_url?: string
    explorer?: any
    tags?: any
    cmc_rank?: number
    category?: string
    crypto_description?: string
  }
  numeric_overview?: {
    market_cap?: number
    circulating_supply?: number
    total_supply?: number
    max_supply?: number
    current_price?: number
    volume_24h?: number
    percent_change_1h?: number
    percent_change_24h?: number
    percent_change_7d?: number
    percent_change_30d?: number
    symbol?: string
    name?: string
    last_updated?: string
  }
}

export interface ETFInfoData {
  asset_id: number
  post_overview?: {
    post_id?: number
    title?: any
    slug?: string
    description?: any
    excerpt?: any
    content?: string
    content_ko?: string
    cover_image?: string
    cover_image_alt?: string
    keywords?: string
    canonical_url?: string
    meta_title?: any
    meta_description?: any
    status?: string
    published_at?: string
    updated_at?: string
  }
  numeric_overview?: {
    etf_info_id?: number
    snapshot_date?: string
    net_assets?: number
    net_expense_ratio?: number
    portfolio_turnover?: number
    dividend_yield?: number
    inception_date?: string
    leveraged?: boolean
    sectors?: any
    holdings?: any
    updated_at?: string
  }
}

export interface AssetInfoData {
  asset_id: number
  prev_close?: number
  week_52_high?: number
  week_52_low?: number
  volume?: number
  average_vol_3m?: number
  market_cap?: number
  day_50_moving_avg?: number
  day_200_moving_avg?: number
  last_updated?: string
}

export interface AssetOverviewsData {
  stock?: StockInfoData
  crypto?: CryptoInfoData
  etf?: ETFInfoData
  common?: AssetInfoData
  // v2 unified data
  v2Data?: any
}

interface UseAssetOverviewsOptions {
  initialData?: AssetOverviewsData | null
  assetType?: 'Stocks' | 'Crypto' | 'ETFs' | 'Funds' | string
}

interface UseAssetOverviewsReturn {
  data: AssetOverviewsData | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * V2 API 기반 asset-overviews 훅
 * 단일 v2GetOverview 호출로 모든 데이터를 가져옵니다.
 */
export const useAssetOverviews = (
  assetIdentifier: string,
  options: UseAssetOverviewsOptions = {}
): UseAssetOverviewsReturn => {
  const { initialData = null } = options
  const [data, setData] = useState<AssetOverviewsData | null>(initialData)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    if (!assetIdentifier || !assetIdentifier.trim()) {
      setData(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // V2 API unified call
      const v2Overview = await apiClient.v2GetOverview(assetIdentifier)
      
      if (!v2Overview) {
        throw new Error(`No data found for asset: ${assetIdentifier}`)
      }
      
      const assetType = v2Overview.asset_type
      const numericData = v2Overview.numeric_data || {}
      
      // Build results object matching old structure for compatibility
      const results: AssetOverviewsData = {
        v2Data: v2Overview,
        common: {
          asset_id: v2Overview.asset_id,
          prev_close: numericData.prev_close,
          week_52_high: numericData.week_52_high,
          week_52_low: numericData.week_52_low,
          volume: numericData.volume,
          average_vol_3m: numericData.average_vol_3m,
          market_cap: numericData.market_cap,
          day_50_moving_avg: numericData.day_50_moving_avg,
          day_200_moving_avg: numericData.day_200_moving_avg,
          last_updated: v2Overview.last_updated,
        }
      }
      
      // Map to type-specific data based on asset_type
      if (assetType === 'Stocks') {
        results.stock = {
          asset_id: v2Overview.asset_id,
          post_overview: v2Overview.post_overview || {},
          numeric_overview: numericData,
        }
      } else if (assetType === 'Crypto') {
        results.crypto = {
          asset_id: v2Overview.asset_id,
          post_overview: v2Overview.post_overview || {},
          numeric_overview: numericData,
        }
      } else if (assetType === 'ETFs' || assetType === 'Funds') {
        results.etf = {
          asset_id: v2Overview.asset_id,
          post_overview: v2Overview.post_overview || {},
          numeric_overview: numericData,
        }
      }
      
      setData(results)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred')
      setError(error)
      console.error('❌ useAssetOverviews - Error fetching asset overviews:', error)
    } finally {
      setLoading(false)
    }
  }, [assetIdentifier])

  useEffect(() => {
    if (!initialData && assetIdentifier && assetIdentifier.trim()) {
      fetchData()
    }
  }, [fetchData, initialData, assetIdentifier])

  return {
    data,
    loading,
    error,
    refetch: fetchData
  }
}

export default useAssetOverviews
