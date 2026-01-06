import { useState, useEffect, useCallback, useMemo } from 'react'
import { apiClient } from '@/lib/api'
import { useAssetDetail } from './useAssets'

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
 * 새로운 asset-overviews 엔드포인트를 사용하는 훅
 * 자산 타입에 따라 적절한 엔드포인트를 호출합니다.
 */
export const useAssetOverviews = (
  assetIdentifier: string,
  options: UseAssetOverviewsOptions = {}
): UseAssetOverviewsReturn => {
  const { initialData = null, assetType: providedAssetType } = options
  const [data, setData] = useState<AssetOverviewsData | null>(initialData)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<Error | null>(null)

  // 자산 타입 확인 (제공되지 않았으면 useAssetDetail로 확인)
  const { data: assetDetail } = useAssetDetail(assetIdentifier || '')
  const assetType = providedAssetType || assetDetail?.type_name

  const assetDetailKey = useMemo(() => {
    if (!assetDetail) return null
    const id = assetDetail.asset_id ?? ''
    const updated = (assetDetail as any)?.updated_at ?? ''
    return `${id}-${updated}`
  }, [assetDetail])

  const fetchData = useCallback(async () => {
    if (!assetIdentifier || !assetIdentifier.trim()) {
      setData(null)
      setLoading(false)
      return
    }

    // assetType이 아직 로드되지 않았으면 대기
    if (!assetType && !assetDetail) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const results: AssetOverviewsData = {}

      // 지원되는 자산 타입 목록
      const supportedTypes = ['Stocks', 'Crypto', 'ETFs', 'Funds']
      const isSupportedType = assetType && supportedTypes.includes(assetType)

      // 자산 타입에 따라 해당하는 엔드포인트만 호출
      if (assetType === 'Stocks') {
        try {
          const stockData = await apiClient.getStockInfo(assetIdentifier)
          results.stock = stockData as StockInfoData
        } catch (err) {
          console.error('❌ useAssetOverviews - Stock info fetch failed:', err)
          throw err
        }
      } else if (assetType === 'Crypto') {
        try {
          const cryptoData = await apiClient.getCryptoInfo(assetIdentifier)
          results.crypto = cryptoData as CryptoInfoData
        } catch (err) {
          console.error('❌ useAssetOverviews - Crypto info fetch failed:', err)
          throw err
        }
      } else if (assetType === 'ETFs' || assetType === 'Funds') {
        try {
          const etfData = await apiClient.getETFInfo(assetIdentifier)
          results.etf = etfData as ETFInfoData
        } catch (err) {
          console.error('❌ useAssetOverviews - ETF info fetch failed:', err)
          throw err
        }
      } else if (isSupportedType === false && assetType) {
        // 지원되지 않는 자산 타입 (Commodities, Currencies, Indices, Bonds 등)
        // post 정보와 common 정보만 사용 (별도 엔드포인트 호출 없음)
        console.log(`ℹ️ useAssetOverviews - Unsupported asset type: ${assetType}, using basic info only`)
        // post 정보는 assetDetail에서 가져올 수 있으므로 여기서는 common만 호출
        // common 정보는 아래에서 항상 호출되므로 여기서는 아무것도 하지 않음
      } else {
        // 타입이 없거나 알 수 없는 경우, 모든 타입을 시도 (fallback)
        console.warn(`⚠️ useAssetOverviews - Unknown asset type: ${assetType}, trying all types`)

        // Stocks 시도
        try {
          const stockData = await apiClient.getStockInfo(assetIdentifier)
          results.stock = stockData as StockInfoData
        } catch (err) {
          // 무시
        }

        // Crypto 시도
        try {
          const cryptoData = await apiClient.getCryptoInfo(assetIdentifier)
          results.crypto = cryptoData as CryptoInfoData
        } catch (err) {
          // 무시
        }

        // ETF 시도
        try {
          const etfData = await apiClient.getETFInfo(assetIdentifier)
          results.etf = etfData as ETFInfoData
        } catch (err) {
          // 무시
        }
      }

      // 공통 정보는 항상 호출
      try {
        const commonData = await apiClient.getAssetInfo(assetIdentifier)
        results.common = commonData as AssetInfoData
        console.log(`✅ useAssetOverviews - Common info loaded for ${assetIdentifier}:`, {
          hasPrevClose: !!commonData?.prev_close,
          hasWeek52High: !!commonData?.week_52_high,
          hasWeek52Low: !!commonData?.week_52_low,
          hasVolume: !!commonData?.volume,
          hasDay50MA: !!commonData?.day_50_moving_avg,
          hasDay200MA: !!commonData?.day_200_moving_avg,
        })
      } catch (err) {
        console.log(`ℹ️ useAssetOverviews - Common info not found for ${assetIdentifier}:`, err)
        // 지원되지 않는 타입의 경우 common 정보가 없어도 계속 진행
        if (isSupportedType === false && assetType) {
          // common 정보가 없어도 assetDetail 정보는 있으므로 계속 진행
        }
      }

      // 최소한 하나의 데이터라도 있으면 성공으로 간주
      // 지원되지 않는 타입의 경우 common 정보가 없어도 assetDetail 정보가 있으면 성공으로 간주
      if (Object.keys(results).length > 0 || (isSupportedType === false && assetType && assetDetail)) {
        setData(results)
      } else {
        throw new Error(`No data found for asset type: ${assetType || 'unknown'}`)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred')
      setError(error)
      console.error('❌ useAssetOverviews - Error fetching asset overviews:', error)
    } finally {
      setLoading(false)
    }
  }, [assetIdentifier, assetType, assetDetail, assetDetailKey])

  useEffect(() => {
    if (!initialData && assetIdentifier && assetIdentifier.trim() && (assetType || assetDetail)) {
      fetchData()
    }
  }, [fetchData, initialData, assetIdentifier, assetType, assetDetail, assetDetailKey])

  return {
    data,
    loading,
    error,
    refetch: fetchData
  }
}

export default useAssetOverviews

