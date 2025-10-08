import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API = '/api/v1'

/**
 * 자산 개요 통합 데이터 훅
 * 새로운 /api/v1/assets/overview/{asset_identifier} 엔드포인트를 사용하여
 * 모든 자산 데이터를 단일 API 호출로 가져옵니다.
 */
export const useAssetOverview = (assetIdentifier) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
      const response = await axios.get(`${API}/assets/overview/${assetIdentifier}`)
      console.log('✅ useAssetOverview: API response:', response.data)
      setData(response.data)
    } catch (err) {
      console.error('❌ useAssetOverview: API error:', err)
      setError(err)
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
