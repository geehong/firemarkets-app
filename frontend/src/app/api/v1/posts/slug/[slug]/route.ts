import { NextResponse } from 'next/server'

const BACKEND_BASE = (process.env.BACKEND_API_BASE || 'https://backend.firemarkets.net/api/v1').replace(/\/$/, '')

export async function GET(_req: Request, context: { params: { slug: string } }) {
  const slug = context.params.slug
  const url = `${BACKEND_BASE}/posts/slug/${encodeURIComponent(slug)}`
  
  try {
    const res = await fetch(url, { cache: 'no-store' })
    
    if (!res.ok) {
      // Log the error for debugging
      console.error(`[API] Backend error for slug "${slug}": ${res.status} ${res.statusText}`)
      
      // Try to get error text, but handle cases where it might not be JSON
      let errorText = 'Upstream error'
      try {
        const text = await res.text()
        if (text) {
          // Try to parse as JSON, if it fails, use the raw text
          try {
            const errorData = JSON.parse(text)
            errorText = errorData.message || errorData.error || text
          } catch {
            errorText = text
          }
        }
      } catch {
        errorText = `Backend returned ${res.status} ${res.statusText}`
      }
      
      return new NextResponse(JSON.stringify({ error: errorText }), { 
        status: res.status,
        headers: { 'content-type': 'application/json' }
      })
    }
    
    const text = await res.text()
    
    // Validate that the response is valid JSON
    try {
      JSON.parse(text)
    } catch (parseError) {
      console.error(`[API] Invalid JSON response for slug "${slug}":`, parseError)
      return new NextResponse(JSON.stringify({ error: 'Invalid response format' }), { 
        status: 500,
        headers: { 'content-type': 'application/json' }
      })
    }
    
    return new NextResponse(text, { 
      status: 200, 
      headers: { 'content-type': 'application/json' } 
    })
  } catch (e: any) {
    console.error(`[API] Network error for slug "${slug}":`, e)
    return NextResponse.json({ 
      error: e?.message || 'Network error - unable to reach backend' 
    }, { status: 500 })
  }
}


