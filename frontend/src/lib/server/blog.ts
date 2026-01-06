import { headers } from 'next/headers'

async function getOrigin() {
  const hdrs = await headers()
  const envOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN && process.env.NEXT_PUBLIC_SITE_ORIGIN.trim() !== ''
    ? process.env.NEXT_PUBLIC_SITE_ORIGIN.replace(/\/$/, '')
    : null
  const host = hdrs.get('x-forwarded-host') || hdrs.get('host') || ''
  const proto = hdrs.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http')
  const derived = host ? `${proto}://${host}` : ''
  return (envOrigin || derived || 'http://localhost:3000').replace(/\/$/, '')
}

export async function getBlogSSR(slug: string) {
  const origin = await getOrigin()
  const res = await fetch(`${origin}/api/v1/posts/slug/${encodeURIComponent(slug)}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to fetch blog: ${res.status}`)
  return res.json()
}

export async function getBlogsSSR(params?: Record<string, string | number | undefined>) {
  const origin = await getOrigin()
  const search = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) search.append(k, String(v))
    })
  }
  const url = `${origin}/api/v1/posts/${search.toString() ? `?${search.toString()}` : ''}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to fetch blogs: ${res.status}`)
  return res.json()
}
