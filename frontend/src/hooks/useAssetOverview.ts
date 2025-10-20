'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api'

export interface AssetOverviewData {
  // 기본 자산 정보
  asset_id: number
  ticker: string
  name: string
  type_name: string
  exchange: string
  currency: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
  type_description?: string
  asset_category?: string
  
  // 주식 프로필 정보
  company_name?: string
  sector?: string
  industry?: string
  country?: string
  city?: string
  address?: string
  phone?: string
  website?: string
  ceo?: string
  employees_count?: number
  ipo_date?: string
  state?: string
  zip_code?: string
  exchange_full_name?: string
  cik?: string
  isin?: string
  cusip?: string
  description_en?: string
  description_ko?: string
  logo_image_url?: string
  
  // 재무 정보
  market_cap?: number
  ebitda?: number
  shares_outstanding?: number
  pe_ratio?: number
  peg_ratio?: number
  beta?: number
  eps?: number
  dividend_yield?: number
  dividend_per_share?: number
  profit_margin_ttm?: number
  return_on_equity_ttm?: number
  revenue_ttm?: number
  price_to_book_ratio?: number
  book_value?: number
  revenue_per_share_ttm?: number
  operating_margin_ttm?: number
  return_on_assets_ttm?: number
  gross_profit_ttm?: number
  quarterly_earnings_growth_yoy?: number
  quarterly_revenue_growth_yoy?: number
  analyst_target_price?: number
  trailing_pe?: number
  forward_pe?: number
  price_to_sales_ratio_ttm?: number
  ev_to_revenue?: number
  ev_to_ebitda?: number
  
  // 가격 정보
  week_52_high?: number
  week_52_low?: number
  day_50_avg?: number
  day_200_avg?: number
  
  // 암호화폐 관련
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
  tags?: string
  crypto_is_active?: boolean
  crypto_last_updated?: string
  
  // ETF 관련
  net_assets?: number
  net_expense_ratio?: number
  portfolio_turnover?: number
  etf_dividend_yield?: number
  inception_date?: string
  leveraged?: boolean
  sectors?: any
  holdings?: any
  
  // 상품 관련
  commodity_type?: string
  unit?: string

  // treemap_live_view에서 추가된 컬럼들
  current_price?: number
  price_change_percentage_24h?: number
  market_status?: string
  realtime_updated_at?: string
  daily_data_updated_at?: string
}

/**
 * 자산 개요 통합 데이터 훅
 * 새로운 /api/v1/assets/overview/{asset_identifier} 엔드포인트를 사용하여
 * 모든 자산 데이터를 단일 API 호출로 가져옵니다.
 */
export const useAssetOverview = (assetIdentifier?: string, options: { initialData?: AssetOverviewData | null } = {}) => {
  const { initialData = null } = options;
  const [data, setData] = useState<AssetOverviewData | null>(initialData)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    if (!assetIdentifier) {
      setData(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const response = await apiClient.getAssetOverview(assetIdentifier)
      
      // API 응답이 객체인지 확인하고 적절히 처리
      if (response && typeof response === 'object') {
        setData(response)
      } else {
        console.error('❌ useAssetOverview: Invalid response format:', response)
        setError(new Error('Invalid response format from API'))
      }
    } catch (err) {
      console.error('❌ useAssetOverview: API error:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch asset overview'))
    } finally {
      setLoading(false)
    }
  }, [assetIdentifier])

  useEffect(() => {
    if (!initialData) {
      fetchData()
    }
  }, [fetchData, initialData])

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchData 
  }
}

export default useAssetOverview
