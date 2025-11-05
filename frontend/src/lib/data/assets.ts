import { cache } from 'react';

export const getAssetOverview = cache(async (id: string) => {
  const BACKEND_BASE = process.env.BACKEND_API_BASE || 'https://backend.firemarkets.net/api/v1'
  
  const res = await fetch(`${BACKEND_BASE}/assets/overview/${encodeURIComponent(id)}`, {
    cache: 'no-store'
  })
  
  if (!res.ok) return null
  return res.json()
})

export const getAssetDetail = cache(async (id: string) => {
  const BACKEND_BASE = process.env.BACKEND_API_BASE || 'https://backend.firemarkets.net/api/v1'
  
  const res = await fetch(`${BACKEND_BASE}/assets/${encodeURIComponent(id)}`, {
    cache: 'no-store'
  })
  
  if (!res.ok) return null
  return res.json()
})
