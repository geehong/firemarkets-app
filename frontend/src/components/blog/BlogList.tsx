'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAutoLocalization } from '@/contexts/AutoLocalizationContext'
import { useLanguage } from '@/contexts/LanguageContext'
// import { Edit, Eye } from 'lucide-react'

interface Blog {
  id: number
  title: string | { ko?: string; en?: string }
  slug: string
  content?: string  // 영문
  content_ko?: string  // 한글
  description?: string | { ko?: string; en?: string }
  excerpt?: string | { ko?: string; en?: string }
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

interface BlogListProps {
  initialBlogs?: Blog[]
}

const BlogList: React.FC<BlogListProps> = ({
  initialBlogs = []
}) => {
  const { localizeArray } = useAutoLocalization()
  const { language } = useLanguage()
  const router = useRouter()
  const [blogs, setBlogs] = useState<Blog[]>(initialBlogs)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalBlogs, setTotalBlogs] = useState(0)

  const fetchBlogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        page: '1',
        page_size: '20',
        post_type: 'post',
        status: 'published'
      })
      const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'https://backend.firemarkets.net/api/v1'
      const url = `${BACKEND_BASE}/posts/?${params}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to fetch blogs')
      }

      const data = await response.json()
      
      console.log('🔍 [BlogList] API 응답 데이터:', data)
      console.log('🔍 [BlogList] 포스트 개수:', data.posts?.length || 0)
      
      // 첫 번째 포스트의 상세 정보 확인
      if (data.posts && data.posts.length > 0) {
        console.log('🔍 [BlogList] 첫 번째 포스트 상세:', JSON.stringify(data.posts[0], null, 2))
      }
      
      // 자동으로 다국어 데이터 변환
      const localizedPosts = localizeArray(data.posts || [])
      console.log('🔄 [BlogList] 로컬라이제이션 후 포스트들:', localizedPosts)
      
      // 각 포스트의 메타데이터 확인
      localizedPosts.forEach((post: any, index: number) => {
        console.log(`📝 [BlogList] 포스트 ${index + 1}:`, {
          id: post.id,
          title: post.title,
          author: post.author,
          category: post.category,
          tags: post.tags,
          author_id: post.author_id,
          category_id: post.category_id
        })
      })
      
      setBlogs(localizedPosts)
      setTotalBlogs(data.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching blogs:', err)
    } finally {
      setLoading(false)
    }
  }, [localizeArray])

  // 제목 클릭 핸들러 (내용 보기)
  const handleTitleClick = (slug: string) => {
    router.push(`/blog/${slug}`)
  }


  // 컴포넌트 마운트 시 API 호출
  useEffect(() => {
    if (initialBlogs.length === 0) {
      fetchBlogs()
    }
  }, [fetchBlogs])

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">Error loading posts</p>
        <button
          onClick={fetchBlogs}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 간단한 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Blog Posts
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {totalBlogs} posts available
        </p>
      </div>

      {/* 로딩 상태 */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      )}

      {/* 간단한 블로그 목록 */}
      {!loading && (
        <>
          {blogs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No posts available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {blogs.map((blog) => {
                console.log('🎨 [BlogList] 렌더링 중인 포스트:', {
                  id: blog.id,
                  title: blog.title,
                  author: blog.author,
                  category: blog.category,
                  tags: blog.tags
                })
                
                return (
                <div key={blog.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h2 
                      className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      onClick={() => handleTitleClick(blog.slug)}
                    >
                      {typeof blog.title === 'string' ? blog.title : blog.title?.en || blog.title?.ko || 'Untitled'}
                    </h2>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      blog.status === 'published' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {blog.status}
                    </span>
                  </div>
                  
                  {blog.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                      {typeof blog.description === 'string' ? blog.description : blog.description?.en || blog.description?.ko || ''}
                    </p>
                  )}
                  
                  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-3">
                      <span>{new Date(blog.created_at).toLocaleDateString()}</span>
                      {(() => {
                        console.log('👤 [BlogList] 작가 정보 확인:', {
                          hasAuthor: !!blog.author,
                          author: blog.author,
                          authorId: blog.author_id
                        })
                        return blog.author && (
                          <span className="text-gray-600 dark:text-gray-300">
                            by {blog.author.username}
                          </span>
                        )
                      })()}
                      {(() => {
                        console.log('📂 [BlogList] 카테고리 정보 확인:', {
                          hasCategory: !!blog.category,
                          category: blog.category,
                          categoryId: blog.category_id
                        })
                        return blog.category && (
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                            {blog.category.name}
                          </span>
                        )
                      })()}
                      {(() => {
                        console.log('🏷️ [BlogList] 태그 정보 확인:', {
                          hasTags: !!(blog.tags && blog.tags.length > 0),
                          tags: blog.tags,
                          tagsLength: blog.tags?.length || 0
                        })
                        return blog.tags && blog.tags.length > 0 && (
                          <div className="flex gap-1">
                            {blog.tags.slice(0, 2).map((tag) => (
                              <span 
                                key={tag.id}
                                className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded"
                              >
                                #{tag.name}
                              </span>
                            ))}
                            {blog.tags.length > 2 && (
                              <span className="text-gray-400">
                                +{blog.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default BlogList