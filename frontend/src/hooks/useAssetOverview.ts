'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api'

export interface AssetOverviewData {
  asset_id: string
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
  // 자산 타입별 추가 정보
  company_name?: string
  sector?: string
  industry?: string
  country?: string
  market_cap?: number
  // 암호화폐 관련
  symbol?: string
  logo_url?: string
  // ETF 관련
  etf_name?: string
  expense_ratio?: number
  // 상품 관련
  commodity_type?: string
  unit?: string
}

/**
 * 자산 개요 통합 데이터 훅
 * 새로운 /api/v1/assets/overview/{asset_identifier} 엔드포인트를 사용하여
 * 모든 자산 데이터를 단일 API 호출로 가져옵니다.
 */
export const useAssetOverview = (assetIdentifier?: string) => {
  const [data, setData] = useState<AssetOverviewData | null>(null)
  const [loading, setLoading] = useState(true)
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
      console.log('🔍 useAssetOverview: Fetching overview data for:', assetIdentifier)
      const response = await apiClient.getAssetOverview(assetIdentifier)
      console.log('✅ useAssetOverview: API response:', response)
      
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
    fetchData()
  }, [fetchData])

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchData 
  }
}

export default useAssetOverview
