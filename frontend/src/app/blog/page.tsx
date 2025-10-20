import React from 'react'
import BlogList from '@/components/blog/BlogList'
import { Metadata } from 'next'

// 동적 렌더링 강제 설정
export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: '블로그 | FireMarkets',
  description: '시장 분석, 투자 가이드, 최신 뉴스를 확인하세요. FireMarkets 블로그에서 전문적인 금융 인사이트를 만나보세요.',
  keywords: '블로그, 시장분석, 투자가이드, 암호화폐, 주식, 경제뉴스',
  openGraph: {
    title: '블로그 | FireMarkets',
    description: '시장 분석, 투자 가이드, 최신 뉴스를 확인하세요.',
    type: 'website',
  },
}

// SSR로 블로그 데이터 가져오기
async function getBlogs() {
  try {
    // 서버사이드에서는 백엔드 직접 호출
    const BACKEND_BASE = process.env.BACKEND_API_BASE || 'http://fire_markets_backend:8000/api/v1'
    const res = await fetch(`${BACKEND_BASE}/blogs?page=1&page_size=20&status=published`, {
      cache: 'no-store'
    })
    
    if (!res.ok) {
      throw new Error('Failed to fetch blogs')
    }
    
    return await res.json()
  } catch (error) {
    console.error('Error fetching blogs:', error)
    return { blogs: [], total: 0, page: 1, page_size: 20, total_pages: 0 }
  }
}

export default async function BlogPage() {
  const blogData = await getBlogs()
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <BlogList 
        showFilters={true}
        showSearch={true}
        featuredOnly={false}
        initialData={blogData}
      />
    </div>
  )
}