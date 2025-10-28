'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import BlogContent from './BlogContent'
import { useAutoLocalization } from '@/contexts/AutoLocalizationContext'
import { useDynamicMetadata } from '@/hooks/useDynamicMetadata'

interface BlogDetailClientProps {
  data: {
    id: number
    title: string | { ko?: string; en?: string } | { ko: { en: string; ko: string } }
    slug: string
    content?: string
    content_ko?: string
    description?: string | { ko?: string; en?: string } | { ko: { en: string; ko: string } }
    excerpt?: string | { ko?: string; en?: string } | { ko: { en: string; ko: string } }
    updated_at: string
    tags?: Array<{
      id: number
      name: string
      slug: string
    }>
  }
  slug: string
}

const BlogDetailClient: React.FC<BlogDetailClientProps> = ({ data, slug }) => {
  const { localizeData } = useAutoLocalization()
  const [formattedDate, setFormattedDate] = useState<string>('')
  
  // 자동으로 다국어 데이터 변환
  const localizedData = localizeData(data)
  
  // 클라이언트에서만 날짜 포맷팅 (hydration 오류 방지)
  useEffect(() => {
    if (localizedData.updated_at) {
      setFormattedDate(new Date(localizedData.updated_at).toLocaleString())
    }
  }, [localizedData.updated_at])
  
  console.log('📄 [BlogDetailClient] Rendering with localized data:', {
    id: localizedData.id,
    title: localizedData.title,
    content: localizedData.content?.substring(0, 50) + '...'
  })

  // 동적 메타 태그 업데이트
  useDynamicMetadata({
    title: `${localizedData.title} | FireMarkets`,
    description: localizedData.description || localizedData.excerpt || localizedData.content?.substring(0, 160),
    keywords: localizedData.tags?.map(tag => tag.name).join(', ') || 'blog, finance, market analysis',
    ogTitle: localizedData.title,
    ogDescription: localizedData.description || localizedData.excerpt || localizedData.content?.substring(0, 160),
    twitterTitle: localizedData.title,
    twitterDescription: localizedData.description || localizedData.excerpt || localizedData.content?.substring(0, 160)
  })

  console.log('🔄 [BlogDetailClient] Metadata update:', {
    title: localizedData.title,
    description: localizedData.description,
    language: 'current language from context'
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/blog" className="text-sm text-gray-600 hover:text-gray-900">← Back to Blog</Link>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        {localizedData.title}
      </h1>
      <div className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        {formattedDate}
      </div>
      <BlogContent content={localizedData.content} content_ko={localizedData.content_ko} />
    </div>
  )
}

export default BlogDetailClient
