import { cache } from 'react';

export const getNavigationMenu = cache(async () => {
  console.log('🔍 [SSR DEBUG] getNavigationMenu called')
  console.log('🔍 [SSR DEBUG] NODE_ENV:', process.env.NODE_ENV)
  console.log('🔍 [SSR DEBUG] BACKEND_API_BASE:', process.env.BACKEND_API_BASE)
  
  const BACKEND_BASE = process.env.BACKEND_API_BASE || 'http://fire_markets_backend:8000/api/v1'
  console.log('🔍 [SSR DEBUG] Using BACKEND_BASE:', BACKEND_BASE)
  
  const url = `${BACKEND_BASE}/navigation/menu`
  console.log('🔍 [SSR DEBUG] Fetching URL:', url)
  
  try {
    const res = await fetch(url, {
      cache: 'no-store'
    })
    
    console.log('🔍 [SSR DEBUG] Response status:', res.status)
    console.log('🔍 [SSR DEBUG] Response ok:', res.ok)
    
    if (!res.ok) {
      console.error('❌ [SSR DEBUG] Navigation menu fetch failed:', res.status, res.statusText)
      return {
        menu: [
          { name: 'Home', href: '/' },
          { name: 'Assets', href: '/assets' },
          { name: 'Blog', href: '/blog' },
          { name: 'Onchain', href: '/onchain' }
        ]
      }
    }
    
    const data = await res.json()
    console.log('🔍 [SSR DEBUG] Navigation data received:', data)
    return data
  } catch (error) {
    console.error('❌ [SSR DEBUG] Error fetching navigation menu:', error)
    return {
      menu: [
        { name: 'Home', href: '/' },
        { name: 'Assets', href: '/assets' },
        { name: 'Blog', href: '/blog' },
        { name: 'Onchain', href: '/onchain' }
      ]
    }
  }
})
