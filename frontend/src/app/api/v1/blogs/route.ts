import { NextResponse } from 'next/server'

const BACKEND_BASE = (process.env.BACKEND_API_BASE || 'https://backend.firemarkets.net/api/v1').replace(/\/$/, '')

export async function GET(req: Request) {
  const u = new URL(req.url)
  const qs = u.search
  const url = `${BACKEND_BASE}/blogs/${qs}`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    const text = await res.text()
    if (!res.ok) {
      return new NextResponse(text || 'Upstream error', { status: res.status })
    }
    return new NextResponse(text, { status: 200, headers: { 'content-type': 'application/json' } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Proxy failed' }, { status: 500 })
  }
}


