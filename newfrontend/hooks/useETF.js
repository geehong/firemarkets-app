"use client"

import { useState, useEffect, useCallback } from 'react'
import { paramSpecs } from '@/lib/paramSpecs'
import { apiFetch } from '@/lib/api'

export const useETF = (etfId) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!etfId) return
    setLoading(true)
    setError(null)
    try {
      const spec = (paramSpecs as any).assets.etf
      const res = await apiFetch<any>(spec.path, { query: { symbol: etfId } })
      setData(res)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [etfId])

  useEffect(() => { 
    fetchData() 
  }, [fetchData])
  
  return { data, loading, error, refetch: fetchData }
}
