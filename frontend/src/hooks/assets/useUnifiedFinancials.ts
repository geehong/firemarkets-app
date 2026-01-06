import { useState, useEffect } from 'react'

export interface UnifiedFinancialsData {
  ticker: string
  asset_id: number
  stock_financials_data: {
    financial_id?: number
    asset_id?: number
    snapshot_date?: string
    currency?: string
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
    week_52_high?: number
    week_52_low?: number
    day_50_moving_avg?: number
    day_200_moving_avg?: number
    updated_at?: string
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
  } | null
  income_json: { [date: string]: { [field: string]: number } } | null
  balance_json: { [date: string]: { [field: string]: number } } | null
  cash_flow_json: { [date: string]: { [field: string]: number } } | null
  ratios_json: { [date: string]: { [field: string]: number } } | null
}

interface UseUnifiedFinancialsOptions {
  initialData?: UnifiedFinancialsData | null
}

interface UseUnifiedFinancialsReturn {
  data: UnifiedFinancialsData | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export const useUnifiedFinancials = (
  assetIdentifier: string,
  options: UseUnifiedFinancialsOptions = {}
): UseUnifiedFinancialsReturn => {
  const [data, setData] = useState<UnifiedFinancialsData | null>(options.initialData || null)
  const [loading, setLoading] = useState(!options.initialData)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!assetIdentifier || !assetIdentifier.trim()) {
        console.log('⚠️ useUnifiedFinancials - Empty assetIdentifier, skipping fetch')
        setLoading(false)
        return
      }

      const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.NEXT_PUBLIC_API_URL || 'https://backend.firemarkets.net/api/v1'

      let apiUrl = BACKEND_BASE
      if (apiUrl.startsWith('http://') && !apiUrl.includes('localhost') && !apiUrl.includes('127.0.0.1')) {
        apiUrl = apiUrl.replace('http://', 'https://')
      } else if (!apiUrl.startsWith('http')) {
        apiUrl = `https://${apiUrl}`
      }

      const fullUrl = `${apiUrl}/assets/overview_financials_unified/${assetIdentifier}`
      console.log('🔍 useUnifiedFinancials - Fetching URL:', fullUrl)

      const response = await fetch(fullUrl, {
        cache: 'no-store'
      })

      if (!response.ok) {
        // 404는 데이터가 없는 것으로 간주하고 조용히 처리 (에러로 표시하지 않음)
        if (response.status === 404) {
          console.log('ℹ️ useUnifiedFinancials - No financial data found (404), returning null')
          setData(null)
          setLoading(false)
          return
        }
        const errorText = await response.text()
        console.error('❌ useUnifiedFinancials - Response error:', errorText)
        throw new Error(`Failed to fetch unified financials: ${response.status} ${response.statusText}`)
      }

      const financialsData: UnifiedFinancialsData = await response.json()
      console.log('✅ useUnifiedFinancials - Data received:', financialsData)
      setData(financialsData)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred')
      setError(error)
      console.error('❌ useUnifiedFinancials - Error fetching unified financials:', error)
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
  }, [assetIdentifier])

  return {
    data,
    loading,
    error,
    refetch
  }
}

export default useUnifiedFinancials

