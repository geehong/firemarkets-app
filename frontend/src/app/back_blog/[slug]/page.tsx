'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  CalenderIcon, 
  EyeIcon, 
  UserIcon, 
  ListIcon,
  PaperPlaneIcon,
  BookIcon,
  ChevronLeftIcon
} from '@/icons/index'
import { useBlog } from '@/hooks'

interface BlogPost {
  id: number
  title: string
  slug: string
  content: string
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

export default function BlogPostPage() {
  const params = useParams()
  const slug = params.slug as string
  const [isBookmarked, setIsBookmarked] = useState(false)

  // 훅 사용
  const { blog: blogPost, loading, error } = useBlog(slug)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleShare = async () => {
    if (navigator.share && blogPost) {
      try {
        await navigator.share({
          title: blogPost.title,
          text: blogPost.content.substring(0, 100) + '...',
          url: window.location.href,
        })
      } catch (err) {
        console.log('Error sharing:', err)
      }
    } else {
      // 폴백: URL 복사
      navigator.clipboard.writeText(window.location.href)
      // 토스트 메시지 표시 (추후 구현)
    }
  }

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked)
    // 북마크 API 호출 (추후 구현)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !blogPost) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              글을 찾을 수 없습니다
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error || '요청하신 블로그 글을 찾을 수 없습니다.'}
            </p>
            <Link
              href="/blog"
              className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4 mr-2" />
              블로그 목록으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 뒤로가기 버튼 */}
        <div className="mb-6">
          <Link
            href="/blog"
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4 mr-2" />
            블로그 목록
          </Link>
        </div>

        {/* 헤더 */}
        <header className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                {blogPost.title}
              </h1>
              
              {/* 메타 정보 */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <div className="flex items-center">
                  <CalenderIcon className="w-4 h-4 mr-1" />
                  {formatDate(blogPost.created_at)}
                </div>
                {blogPost.view_count && (
                  <div className="flex items-center">
                    <EyeIcon className="w-4 h-4 mr-1" />
                    {blogPost.view_count.toLocaleString()} 조회
                  </div>
                )}
                {blogPost.author && (
                  <div className="flex items-center">
                    <UserIcon className="w-4 h-4 mr-1" />
                    {blogPost.author.username}
                  </div>
                )}
              </div>

              {/* 카테고리 */}
              {blogPost.category && (
                <div className="mb-4">
                  <Link
                    href={`/blog/category/${blogPost.category.slug}`}
                    className="inline-block px-3 py-1 text-sm font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    {blogPost.category.name}
                  </Link>
                </div>
              )}
            </div>

            {/* 액션 버튼들 */}
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={handleBookmark}
                className="p-2 text-gray-400 hover:text-yellow-500 transition-colors"
                title="북마크"
              >
                <BookIcon className={`w-5 h-5 ${isBookmarked ? 'text-yellow-500' : ''}`} />
              </button>
              <button
                onClick={handleShare}
                className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                title="공유"
              >
                <PaperPlaneIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Asset 정보 */}
          {blogPost.asset && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                    {blogPost.asset.name}
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    심볼: {blogPost.asset.ticker}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    $0.00
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">
                    +0.00%
                  </div>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* 본문 */}
        <article className="prose prose-lg max-w-none dark:prose-invert">
          <div 
            className="text-gray-800 dark:text-gray-200 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: blogPost.content }}
          />
        </article>

        {/* 태그 */}
        {blogPost.tags && blogPost.tags.length > 0 && (
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <ListIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                태그
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {blogPost.tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/blog/tag/${tag.slug}`}
                  className="inline-block px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 관련 글 추천 (추후 구현) */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            관련 글
          </h2>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            관련 글 기능은 추후 구현 예정입니다.
          </div>
        </div>
      </div>
    </div>
  )
}
