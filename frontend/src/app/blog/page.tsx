import React from 'react'
import BlogList from '@/components/blog/BlogList'
import { Metadata } from 'next'

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

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <BlogList 
        showFilters={true}
        showSearch={true}
        featuredOnly={false}
      />
    </div>
  )
}
