import { NextResponse } from 'next/server'

const BACKEND_BASE = (process.env.BACKEND_API_BASE || 'http://localhost:8001/api/v1').replace(/\/$/, '')

export async function GET(req: Request) {
  const u = new URL(req.url)
  const qs = u.search
  const url = `${BACKEND_BASE}/posts${qs}`
  
  console.log('[Posts API] Request URL:', url)
  console.log('[Posts API] BACKEND_BASE:', BACKEND_BASE)
  
  try {
    const res = await fetch(url, { 
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    })
    
    console.log('[Posts API] Response status:', res.status)
    const text = await res.text()
    console.log('[Posts API] Response text length:', text.length)
    
    if (!res.ok) {
      console.error('[Posts API] Upstream error:', res.status, text)
      return new NextResponse(text || 'Upstream error', { status: res.status })
    }
    
    return new NextResponse(text, { 
      status: 200, 
      headers: { 
        'content-type': 'application/json',
        'Cache-Control': 'public, max-age=300' // 5분 캐싱
      } 
    })
  } catch (e: any) {
    console.error('Posts API proxy error:', e)
    return NextResponse.json({ error: e?.message || 'Proxy failed' }, { status: 500 })
  }
}