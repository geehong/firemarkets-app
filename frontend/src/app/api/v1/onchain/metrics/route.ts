import { NextResponse } from 'next/server'

const BACKEND_BASE = (process.env.BACKEND_API_BASE || 'https://backend.firemarkets.net/api/v1').replace(/\/$/, '')

export async function GET(req: Request) {
  const u = new URL(req.url)
  const qs = u.search
  const url = `${BACKEND_BASE}/onchain/metrics${qs}`
  
  try {
    const res = await fetch(url, { 
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    })
    const text = await res.text()
    
    if (!res.ok) {
      return new NextResponse(text || 'Upstream error', { status: res.status })
    }
    
    return new NextResponse(text, { 
      status: 200, 
      headers: { 
        'content-type': 'application/json',
        'Cache-Control': 'public, max-age=1800' // 30분 캐싱 (온체인 메트릭 목록은 자주 변경되지 않음)
      } 
    })
  } catch (e: any) {
    console.error('Onchain metrics API proxy error:', e)
    return NextResponse.json({ error: e?.message || 'Proxy failed' }, { status: 500 })
  }
}
