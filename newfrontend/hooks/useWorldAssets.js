"use client"

import { useState, useEffect, useCallback } from 'react'
import { paramSpecs } from '@/lib/paramSpecs'
import { apiFetch } from '@/lib/api'

export const useWorldAssets = (page = 1, limit = 20, filters = {}) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const spec = (paramSpecs as any).assets.world.topAssetsByCategory
      const payload = { limit, ...filters }
      const res = await apiFetch<any>(spec.path, { query: payload })
      setData(res)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [limit, filters])

  useEffect(() => { fetchData() }, [fetchData])
  return { data, loading, error, refetch: fetchData }
}
