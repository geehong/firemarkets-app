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
    const res = await fetch(`${BACKEND_BASE}/posts/slug/${encodeURIComponent(slug)}`, {
      cache: 'no-store'
    })
    
    if (!res.ok) {
      return {
        title: 'Blog Post | FireMarkets',
        description: 'A blog post from FireMarkets',
      }
    }
    
    const data = await res.json()
    
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
    const res = await fetch(`${BACKEND_BASE}/posts/slug/${encodeURIComponent(slug)}`, {
      cache: 'no-store'
    })

    if (!res.ok) {
      notFound()
    }

    const data = await res.json()

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