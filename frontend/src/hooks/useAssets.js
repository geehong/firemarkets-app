import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

/**
 * useAssets
 * 목록/검색 파라미터는 `useAPI.specs.assets.list.params` 참고
 */

const API = '/api/v1'

export const useAssets = (page = 1, limit = 20, filters = {}) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // paramSpecs에 맞게 파라미터 구성
      const params = {
        type_name: filters.type_name,
        has_ohlcv_data: filters.has_ohlcv_data || false,
        limit: limit
      }
      const res = await axios.get(`${API}/assets`, { params })
      setData(res.data)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [page, limit, filters])

  useEffect(() => { fetchData() }, [fetchData])
  return { data, loading, error, refetch: fetchData }
}

// OHLCV 데이터 전용 훅
export const useAssetsOHLCV = (assetIdentifier, dataInterval = '1d', startDate = null, endDate = null, limit = 50000) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!assetIdentifier) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const params = {
        data_interval: dataInterval,
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
        limit
      }
      const res = await axios.get(`${API}/assets/ohlcv/${assetIdentifier}`, { params })
      setData(res.data)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [assetIdentifier, dataInterval, startDate, endDate, limit])

  useEffect(() => { fetchData() }, [fetchData])
  return { data, loading, error, refetch: fetchData }
}
