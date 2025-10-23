'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CalenderIcon, EyeIcon, UserIcon, ListIcon } from '@/icons/index'

interface BlogCardProps {
  blog: {
    id: number
    title: string  // 이미 로컬라이즈된 문자열
    slug: string
    content?: string  // 이미 로컬라이즈된 문자열
    description?: string  // 이미 로컬라이즈된 문자열
    excerpt?: string  // 이미 로컬라이즈된 문자열
    status: string
    created_at: string
    updated_at: string
    view_count?: number
    author?: {
      id: number
      username: string
      email: string
    }
    category?: {
      id: number
      name: string
      slug: string
    }
    asset?: {
      asset_id: number
      ticker: string
      name: string
    }
    tags?: Array<{
      id: number
      name: string
      slug: string
    }>
  }
  featured?: boolean
}

const BlogCard: React.FC<BlogCardProps> = React.memo(({ blog, featured = false }) => {
  console.log('🎯 [BlogCard] Rendering blog:', {
    id: blog.id,
    title: blog.title,
    content: blog.content?.substring(0, 30) + '...'
  })
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getExcerpt = (maxLength: number = 150) => {
    const cleanText = blog.content?.replace(/<[^>]*>/g, '') || '' // HTML 태그 제거
    return cleanText.length > maxLength 
      ? cleanText.substring(0, maxLength) + '...'
      : cleanText
  }

  return (
    <article className={`bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 ${
      featured ? 'border-l-4 border-blue-500' : ''
    }`}>
      <Link href={`/blog/${blog.slug}`} className="block">
        <div className="p-6">
          {/* 헤더 */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className={`font-bold text-gray-900 dark:text-white mb-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${
                featured ? 'text-xl' : 'text-lg'
              }`}>
                {blog.title}
              </h2>
              
              {/* 메타 정보 */}
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                <div className="flex items-center">
                  <CalenderIcon className="w-4 h-4 mr-1" />
                  {formatDate(blog.created_at)}
                </div>
                {blog.view_count && (
                  <div className="flex items-center">
                    <EyeIcon className="w-4 h-4 mr-1" />
                    {blog.view_count.toLocaleString('en-US')}
                  </div>
                )}
                {blog.author && (
                  <div className="flex items-center">
                    <UserIcon className="w-4 h-4 mr-1" />
                    {blog.author.username}
                  </div>
                )}
              </div>
            </div>
            
            {/* Asset 정보 */}
            {blog.asset && (
              <div className="ml-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {blog.asset.ticker}
                </div>
                <div className="text-xs text-blue-500 dark:text-blue-300">
                  {blog.asset.name}
                </div>
              </div>
            )}
          </div>

          {/* 카테고리 */}
          {blog.category && (
            <div className="mb-3">
              <Link
                href={`/blog/category/${blog.category.slug}`}
                className="inline-block px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {blog.category.name}
              </Link>
            </div>
          )}

          {/* 내용 미리보기 */}
          <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
            {getExcerpt()}
          </p>

          {/* 태그 */}
          {blog.tags && blog.tags.length > 0 && (
            <div className="flex items-center flex-wrap gap-2">
              <ListIcon className="w-4 h-4 text-gray-400" />
              {blog.tags.slice(0, 3).map((tag) => (
                <Link
                  key={tag.id}
                  href={`/blog/tag/${tag.slug}`}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                >
                  #{tag.name}
                </Link>
              ))}
              {blog.tags.length > 3 && (
                <span className="text-xs text-gray-400">
                  +{blog.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* 상태 표시 */}
          {blog.status === 'published' && (
            <div className="mt-4 flex items-center justify-between">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                발행됨
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                읽기 시간: 5분
              </span>
            </div>
          )}

          {/* 명시적 링크 표시 */}
          <div className="mt-6">
            <span className="text-blue-600 dark:text-blue-400 hover:underline">
              자세히 보기 →
            </span>
          </div>
        </div>
      </Link>
    </article>
  )
})

export default BlogCard
