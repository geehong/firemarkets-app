import { useState, useEffect } from 'react'

interface NumericOverview {
  asset_id: number
  ticker: string
  name: string
  description?: string
  exchange?: string
  currency?: string
  is_active: boolean
  type_name: string
  type_description?: string
  asset_category: string
  logo_image_url?: string
  current_price?: number
  price_change_percentage_24h?: number
  market_status?: string
  created_at: string
  updated_at: string
  realtime_updated_at?: string
  daily_data_updated_at?: string
  // Stocks
  company_name?: string
  sector?: string
  industry?: string
  country?: string
  employees_count?: number
  ceo?: string
  ipo_date?: string
  website?: string
  market_cap?: number
  pe_ratio?: number
  eps?: number
  beta?: number
  dividend_yield?: number
  shares_outstanding?: number
  // Crypto
  crypto_symbol?: string
  crypto_name?: string
  crypto_market_cap?: number
  circulating_supply?: number
  total_supply?: number
  max_supply?: number
  crypto_current_price?: number
  volume_24h?: number
  percent_change_1h?: number
  percent_change_24h?: number
  percent_change_7d?: number
  percent_change_30d?: number
  cmc_rank?: number
  category?: string
  crypto_description?: string
  logo_url?: string
  website_url?: string
  slug?: string
  date_added?: string
  platform?: string
  explorer?: string
  source_code?: string
  tags?: string[]
  crypto_is_active?: boolean
  crypto_last_updated?: string
  // ETFs
  net_assets?: number
  net_expense_ratio?: number
  portfolio_turnover?: number
  etf_dividend_yield?: number
  inception_date?: string
  leveraged?: boolean
  sectors?: Array<{ sector: string; weight: number }>
  holdings?: Array<{ symbol: string; description: string; weight: number }>
  // 기타
  from?: string
}

interface PostOverview {
  id: number
  title: string
  slug: string
  description?: string
  excerpt?: string
  content?: string
  cover_image?: string
  cover_image_alt?: string
  meta_title?: string
  meta_description?: string
  keywords?: string[]
  canonical_url?: string
  status: string
  created_at: string
  updated_at: string
  published_at?: string
}

interface AssetOverviewBundle {
  asset_id: number
  asset_identifier: string
  numeric_overview: NumericOverview | null
  post_overview: PostOverview | null
  has_numeric_data: boolean
  has_post_data: boolean
  timestamp: string
}

interface UseAssetOverviewBundleOptions {
  initialData?: AssetOverviewBundle
}

interface UseAssetOverviewBundleReturn {
  data: AssetOverviewBundle | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export const useAssetOverviewBundle = (
  assetIdentifier: string,
  options: UseAssetOverviewBundleOptions = {},
  activeLanguage: 'ko' | 'en' = 'ko'
): UseAssetOverviewBundleReturn => {
  const [data, setData] = useState<AssetOverviewBundle | null>(options.initialData || null)
  const [loading, setLoading] = useState(!options.initialData)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // assetIdentifier가 비어있으면 호출하지 않음
      if (!assetIdentifier || !assetIdentifier.trim()) {
        console.log('⚠️ useAssetOverviewBundle - Empty assetIdentifier, skipping fetch')
        setLoading(false)
        return
      }

      const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.NEXT_PUBLIC_API_URL || 'https://backend.firemarkets.net/api/v1'
      
      // HTTPS 강제 적용 (Mixed Content 방지)
      let apiUrl = BACKEND_BASE
      if (apiUrl.startsWith('http://')) {
        apiUrl = apiUrl.replace('http://', 'https://')
      } else if (!apiUrl.startsWith('https://')) {
        // 프로토콜이 없으면 https:// 추가
        apiUrl = `https://${apiUrl}`
      }
      
      console.log('🔍 useAssetOverviewBundle - BACKEND_BASE:', BACKEND_BASE)
      console.log('🔍 useAssetOverviewBundle - apiUrl:', apiUrl)
      
      const fullUrl = `${apiUrl}/assets/overview-bundle/${assetIdentifier}?lang=${activeLanguage}`
      console.log('🔍 useAssetOverviewBundle - Fetching URL:', fullUrl)
      console.log('🔍 useAssetOverviewBundle - activeLanguage:', activeLanguage)
      
      console.log('🚀 useAssetOverviewBundle - Starting fetch...')
      const response = await fetch(fullUrl, {
        cache: 'no-store'
      })

      console.log('📡 useAssetOverviewBundle - Response status:', response.status)
      console.log('📡 useAssetOverviewBundle - Response ok:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ useAssetOverviewBundle - Response error:', errorText)
        throw new Error(`Failed to fetch asset overview bundle: ${response.status} ${response.statusText}`)
      }

      const bundleData: AssetOverviewBundle = await response.json()
      console.log('✅ useAssetOverviewBundle - Data received:', bundleData)
      console.log('📝 useAssetOverviewBundle - post_overview:', bundleData.post_overview)
      console.log('📝 useAssetOverviewBundle - title:', bundleData.post_overview?.title)
      console.log('📝 useAssetOverviewBundle - content:', bundleData.post_overview?.content)
      console.log('📝 useAssetOverviewBundle - description:', bundleData.post_overview?.description)
      setData(bundleData)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred')
      setError(error)
      console.error('❌ useAssetOverviewBundle - Error fetching asset overview bundle:', error)
    } finally {
      setLoading(false)
    }
  }

  const refetch = async () => {
    await fetchData()
  }

  useEffect(() => {
    if (!options.initialData && assetIdentifier && assetIdentifier.trim()) {
      fetchData()
    }
  }, [assetIdentifier, activeLanguage])

  return {
    data,
    loading,
    error,
    refetch
  }
}

export type { NumericOverview, PostOverview, AssetOverviewBundle }

