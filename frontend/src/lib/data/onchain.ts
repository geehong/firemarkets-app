import { cache } from 'react';

export const getOnchainMetrics = cache(async () => {
  const BACKEND_BASE = process.env.BACKEND_API_BASE || 'http://fire_markets_backend:8000/api/v1'
  
  const res = await fetch(`${BACKEND_BASE}/onchain/metrics`, {
    cache: 'no-store'
  })
  
  if (!res.ok) return []
  return res.json()
})

export const getOnchainMetricData = cache(async (metric: string, timeRange: string = '1y') => {
  const BACKEND_BASE = process.env.BACKEND_API_BASE || 'http://fire_markets_backend:8000/api/v1'
  
  const res = await fetch(`${BACKEND_BASE}/onchain/metrics/${metric}/data?time_range=${timeRange}`, {
    cache: 'no-store'
  })
  
  if (!res.ok) return null
  return res.json()
})
