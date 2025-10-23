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
  const [currentUser, setCurrentUser] = useState<{ id: number; username: string } | null>(null)

  // JWT 토큰에서 사용자 정보 추출
  const getCurrentUser = useCallback(() => {
    try {
      // JWT 토큰이 쿠키에 있는지 확인
      const cookies = document.cookie.split(';')
      let token = null
      
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=')
        if (name === 'access_token' || name === 'token') {
          token = value
          break
        }
      }
      
      if (token) {
        // JWT 토큰 디코딩 (간단한 방법)
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          setCurrentUser({
            id: payload.user_id || payload.id || 1, // 임시로 기본값 설정
            username: payload.username || payload.sub || 'admin'
          })
          console.log('👤 Current user from JWT:', payload)
          return payload
        } catch (jwtError) {
          console.error('Error decoding JWT:', jwtError)
        }
      }
      
      // JWT 토큰이 없으면 로컬 스토리지에서 확인
      const userData = localStorage.getItem('currentUser')
      if (userData) {
        const user = JSON.parse(userData)
        setCurrentUser({
          id: user.id,
          username: user.username
        })
        console.log('👤 Current user from localStorage:', user)
        return user
      }
    } catch (error) {
      console.error('Error getting current user:', error)
    }
    
    // 임시로 기본 사용자 설정 (개발용)
    setCurrentUser({
      id: 1,
      username: 'admin'
    })
    console.log('👤 Using default user for development')
    return null
  }, [])

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
      
      // 자동으로 다국어 데이터 변환
      const localizedPosts = localizeArray(data.posts || [])
      setBlogs(localizedPosts)
      setTotalBlogs(data.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching blogs:', err)
    } finally {
      setLoading(false)
    }
  }, [localizeArray])

  // Edit 버튼 클릭 핸들러
  const handleEdit = (blogId: number) => {
    router.push(`/blog/editor/${blogId}`)
  }

  // View 버튼 클릭 핸들러
  const handleView = (slug: string) => {
    router.push(`/blog/${slug}`)
  }

  // 작성자 권한 확인 함수
  const canEdit = (blog: Blog): boolean => {
    // 임시로 모든 사용자에게 Edit 권한 부여 (개발용)
    const allowAllEdit = true // 이 값을 false로 변경하면 정상적인 권한 확인
    
    if (allowAllEdit) {
      console.log('🔒 Development mode: All users can edit')
      return true
    }
    
    if (!currentUser) {
      console.log('🔒 No current user, cannot edit')
      return false
    }
    
    const isAuthor = blog.author?.id === currentUser.id
    console.log('🔒 Edit permission check:', {
      currentUserId: currentUser.id,
      blogAuthorId: blog.author?.id,
      canEdit: isAuthor,
      blogTitle: typeof blog.title === 'string' ? blog.title : blog.title?.en || blog.title?.ko
    })
    return isAuthor
  }

  // 컴포넌트 마운트 시 API 호출 및 사용자 정보 가져오기
  useEffect(() => {
    if (initialBlogs.length === 0) {
      fetchBlogs()
    }
    getCurrentUser()
  }, [fetchBlogs, getCurrentUser])

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
              {blogs.map((blog) => (
                <div key={blog.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
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
                    <span>{new Date(blog.created_at).toLocaleDateString()}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleView(blog.slug)}
                        className="flex items-center gap-1 px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      >
                        👁️ View
                      </button>
                      {canEdit(blog) && (
                        <button
                          onClick={() => handleEdit(blog.id)}
                          className="flex items-center gap-1 px-2 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          ✏️ Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default BlogList