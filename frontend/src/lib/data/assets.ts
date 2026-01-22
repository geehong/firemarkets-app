import { cache } from 'react';

// V2 API base URL
const getBackendBase = () => {
  const v1Base = process.env.BACKEND_API_BASE || 'https://backend.firemarkets.net/api/v1'
  return v1Base.replace('/api/v1', '/api/v2')
}

export const getAssetOverview = cache(async (id: string) => {
  const BACKEND_BASE = getBackendBase()
  
  const res = await fetch(`${BACKEND_BASE}/assets/overview/${encodeURIComponent(id)}`, {
    cache: 'no-store'
  })
  
  if (!res.ok) return null
  return res.json()
})

export const getAssetDetail = cache(async (id: string) => {
  const BACKEND_BASE = getBackendBase()
  
  // Use v2 overview endpoint for asset detail
  const res = await fetch(`${BACKEND_BASE}/assets/overview/${encodeURIComponent(id)}`, {
    cache: 'no-store'
  })
  
  if (!res.ok) return null
  return res.json()
})
