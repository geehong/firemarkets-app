import Link from 'next/link'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ClientRedirect from '@/components/ClientRedirect'
import BlogContent from '@/components/blog/BlogContent'
import BlogDetailClient from '@/components/blog/BlogDetailClient'

export const revalidate = 60
export const dynamic = 'force-dynamic'

// 동적 메타데이터 생성
export async function generateMetadata({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}): Promise<Metadata> {
  const { slug } = await params
  const search = await searchParams
  
  // URL 파라미터에서 언어 감지 (기본값: 한국어)
  const language = (search.lang as string) || 'ko'
  
  console.log('🔍 [generateMetadata] Language detected:', language, 'for slug:', slug)
  
  // JSONB 필드 처리 헬퍼 함수
  const getLocalizedText = (field: string | { ko?: string; en?: string } | undefined, fallback: string = ''): string => {
    if (typeof field === 'string') {
      return field
    }
    if (typeof field === 'object' && field !== null) {
      // 감지된 언어에 따라 반환
      return language === 'ko' 
        ? (field.ko || field.en || fallback)
        : (field.en || field.ko || fallback)
    }
    return fallback
  }
  
  try {
    // 서버사이드에서는 백엔드 직접 호출
    const BACKEND_BASE = process.env.BACKEND_API_BASE || 'https://backend.firemarkets.net/api/v1'
    const url = `${BACKEND_BASE}/posts/slug/${encodeURIComponent(slug)}`
    
    console.log(`[generateMetadata] Fetching blog post from: ${url}`)
    
    const res = await fetch(url, {
      cache: 'no-store'
    })
    
    console.log(`[generateMetadata] Response status: ${res.status} ${res.statusText}`)
    
    if (!res.ok) {
      console.error(`[generateMetadata] Backend error: ${res.status} ${res.statusText}`)
      
      // For server errors, return a generic error page metadata
      if (res.status >= 500) {
        return {
          title: 'Server Error | FireMarkets',
          description: 'We are experiencing technical difficulties. Please try again later.',
        }
      }
      
      // For 404, return generic blog post metadata
      return {
        title: 'Blog Post | FireMarkets',
        description: 'A blog post from FireMarkets',
      }
    }

    // Check if response is JSON before parsing
    const contentType = res.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      console.error('[generateMetadata] Invalid response content type:', contentType)
      return {
        title: 'Blog Post | FireMarkets',
        description: 'A blog post from FireMarkets',
      }
    }
    
    let data
    try {
      data = await res.json()
    } catch (jsonError) {
      console.error('[generateMetadata] Failed to parse JSON response:', jsonError)
      return {
        title: 'Blog Post | FireMarkets',
        description: 'A blog post from FireMarkets',
      }
    }
    
    // JSONB 필드들을 처리하여 문자열로 변환
    const title = getLocalizedText(data.title, 'Untitled')
    const excerpt = getLocalizedText(data.excerpt)
    const content = getLocalizedText(data.content, '')
    
    return {
      title: `${title} | FireMarkets`,
      description: excerpt || content?.substring(0, 160) || 'A blog post from FireMarkets',
      keywords: data.tags?.join(', ') || 'blog, finance, market analysis',
      openGraph: {
        title: title,
        description: excerpt || content?.substring(0, 160),
        type: 'article',
        publishedTime: data.created_at,
        modifiedTime: data.updated_at,
        url: `/blog/${slug}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: title,
        description: excerpt || content?.substring(0, 160),
      },
      alternates: {
        canonical: `/blog/${slug}`,
      },
    }
  } catch (error) {
    console.error('Failed to generate metadata:', error)
    return {
      title: 'Blog Post | FireMarkets',
      description: 'A blog post from FireMarkets',
    }
  }
}

export default async function BlogDetailPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params
  
  // JSONB 필드 처리 헬퍼 함수
  const getLocalizedText = (field: string | { ko?: string; en?: string } | undefined, fallback: string = ''): string => {
    if (typeof field === 'string') {
      return field
    }
    if (typeof field === 'object' && field !== null) {
      // 현재 언어 설정에 따라 반환 (기본값: 한국어)
      return field.ko || field.en || fallback
    }
    return fallback
  }
  
  try {
    // 서버사이드에서는 백엔드 직접 호출
    const BACKEND_BASE = process.env.BACKEND_API_BASE || 'https://backend.firemarkets.net/api/v1'
    const url = `${BACKEND_BASE}/posts/slug/${encodeURIComponent(slug)}`
    
    console.log(`[BlogDetailPage] Fetching blog post from: ${url}`)
    console.log(`[BlogDetailPage] Backend base URL: ${BACKEND_BASE}`)
    
    const res = await fetch(url, {
      cache: 'no-store'
    })

    console.log(`[BlogDetailPage] Response status: ${res.status} ${res.statusText}`)

    if (!res.ok) {
      console.error(`Backend error: ${res.status} ${res.statusText}`)
      
      // Only call notFound() for 404 errors, not server errors
      if (res.status === 404) {
        notFound()
      } else {
        // For server errors (500, 502, 503, etc.), throw an error to trigger error boundary
        throw new Error(`Backend server error: ${res.status} ${res.statusText}`)
      }
    }

    // Check if response is JSON before parsing
    const contentType = res.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Invalid response content type:', contentType)
      notFound()
    }

    let data
    try {
      data = await res.json()
    } catch (jsonError) {
      console.error('Failed to parse JSON response:', jsonError)
      notFound()
    }

    // 원본 JSONB 데이터를 그대로 전달 (클라이언트에서 변환)
    const processedData = {
      ...data,
      // content와 content_ko는 이미 문자열이므로 그대로 사용
      content: data.content,
      content_ko: data.content_ko
    }

    // 포스트 타입에 따라 적절한 페이지로 리다이렉트
    if (processedData.post_type === 'assets') {
      // Asset 타입인 경우 /assets/[slug]로 리다이렉트
      return <ClientRedirect url={`/assets/${slug}`} />
    } else if (processedData.post_type === 'onchain') {
      // Onchain 타입인 경우 /onchain/[slug]로 리다이렉트
      return <ClientRedirect url={`/onchain/${slug}`} />
    }

    // 일반 블로그 포스트인 경우 클라이언트 컴포넌트로 렌더링
    return (
      <BlogDetailClient 
        data={processedData}
        slug={slug}
      />
    )
  } catch (error) {
    console.error('Error fetching blog post:', error)
    notFound()
  }
}