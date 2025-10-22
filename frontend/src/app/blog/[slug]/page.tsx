import Link from 'next/link'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ClientRedirect from '@/components/ClientRedirect'

export const revalidate = 60
export const dynamic = 'force-dynamic'

// 동적 메타데이터 생성
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  
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
    
    return {
      title: `${data.title} | FireMarkets`,
      description: data.excerpt || data.content?.substring(0, 160) || 'A blog post from FireMarkets',
      keywords: data.tags?.join(', ') || 'blog, finance, market analysis',
      openGraph: {
        title: data.title,
        description: data.excerpt || data.content?.substring(0, 160),
        type: 'article',
        publishedTime: data.created_at,
        modifiedTime: data.updated_at,
        url: `/blog/${slug}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: data.title,
        description: data.excerpt || data.content?.substring(0, 160),
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

    // 포스트 타입에 따라 적절한 페이지로 리다이렉트
    if (data.post_type === 'assets') {
      // Asset 타입인 경우 /assets/[slug]로 리다이렉트
      return <ClientRedirect url={`/assets/${slug}`} />
    } else if (data.post_type === 'onchain') {
      // Onchain 타입인 경우 /onchain/[slug]로 리다이렉트
      return <ClientRedirect url={`/onchain/${slug}`} />
    }

    // 일반 블로그 포스트인 경우 기존 렌더링
    return (
      
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Link href="/blog" className="text-sm text-gray-600 hover:text-gray-900">← Back to Blog</Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{data.title}</h1>
          <div className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            {data.updated_at ? new Date(data.updated_at).toLocaleString() : ''}
          </div>
          <article className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: data.content }} />
        </div>
      
    )
  } catch (error) {
    console.error('Error fetching blog post:', error)
    notFound()
  }
}