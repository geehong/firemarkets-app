import { cache } from 'react';

export const getNavigationMenu = cache(async () => {
  const BACKEND_BASE = process.env.BACKEND_API_BASE || 'http://fire_markets_backend:8000/api/v1'
  const url = `${BACKEND_BASE}/navigation/menu`
  
  try {
    const res = await fetch(url, {
      cache: 'no-store'
    })
    
    if (!res.ok) {
      console.error('❌ Navigation menu fetch failed:', res.status, res.statusText)
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
    return data
  } catch (error) {
    console.error('❌ Error fetching navigation menu:', error)
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
