'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import BlogCard from './BlogCard'
import BlogPagination from './BlogPagination'
import BlogSearch from './BlogSearch'
import BlogCategories from './BlogCategories'
// Removed heroicons dependency to avoid build errors

interface Blog {
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

interface BlogListProps {
  initialBlogs?: Blog[]
  showFilters?: boolean
  showSearch?: boolean
  categoryFilter?: string
  tagFilter?: string
  featuredOnly?: boolean
}

const BlogList: React.FC<BlogListProps> = ({
  initialBlogs = [],
  showFilters = true,
  showSearch = true,
  categoryFilter,
  tagFilter,
  featuredOnly = false
}) => {
  const [blogs, setBlogs] = useState<Blog[]>(initialBlogs)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalBlogs, setTotalBlogs] = useState(0)
  const [filters, setFilters] = useState({
    search: '',
    category: categoryFilter || '',
    tag: tagFilter || '',
    status: 'published'
  })
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  const fetchBlogs = useCallback(async (page: number = 1) => {
    console.log('[BlogList] fetchBlogs called', { page, filters })
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '12',
        ...(filters.search && { search: filters.search }),
        ...(filters.category && { category: filters.category }),
        ...(filters.tag && { tag: filters.tag }),
        ...(filters.status && { status: filters.status })
      })
      const url = `/api/v1/blogs/?${params}`
      console.log('[BlogList] requesting URL:', url)
      const response = await fetch(url)
      
      if (!response.ok) {
        console.error('[BlogList] response not ok', { status: response.status })
        throw new Error('Failed to fetch blogs')
      }

      const data = await response.json()
      console.log('[BlogList] response data summary', {
        count: data?.blogs?.length,
        total: data?.total,
        page: data?.page,
        total_pages: data?.total_pages
      })
      setBlogs(data.blogs || [])
      setTotalPages(data.total_pages || 1)
      setTotalBlogs(data.total || 0)
      setCurrentPage(prev => {
        const next = prev === page ? prev : page
        if (prev !== next) console.log('[BlogList] currentPage updated', { prev, next })
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching blogs:', err)
    } finally {
      console.log('[BlogList] fetchBlogs finished', { page })
      setLoading(false)
    }
  }, [filters.search, filters.category, filters.tag, filters.status])

  const firstRunRef = useRef(true)
  useEffect(() => {
    console.log('[BlogList] useEffect triggered by filters primitives', {
      search: filters.search, category: filters.category, tag: filters.tag, status: filters.status
    })
    // Avoid StrictMode initial double-invoke
    if (firstRunRef.current) {
      firstRunRef.current = false
      return
    }
    fetchBlogs(1)
  }, [filters.search, filters.category, filters.tag, filters.status, fetchBlogs])

  const handleSearch = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, search: searchTerm }))
    setCurrentPage(1)
  }

  const handleCategoryFilter = (category: string) => {
    setFilters(prev => ({ ...prev, category }))
    setCurrentPage(1)
  }

  const handleTagFilter = (tag: string) => {
    setFilters(prev => ({ ...prev, tag }))
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    fetchBlogs(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      tag: '',
      status: 'published'
    })
    setCurrentPage(1)
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          오류가 발생했습니다
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
        <button
          onClick={() => fetchBlogs(currentPage)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          블로그
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          시장 분석, 투자 가이드, 최신 뉴스를 확인하세요
        </p>
      </div>

      {/* 필터 및 검색 */}
      {(showFilters || showSearch) && (
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            {/* 검색 */}
            {showSearch && (
              <div className="mb-6">
                <BlogSearch onSearch={handleSearch} />
              </div>
            )}

            {/* 필터 */}
            {showFilters && (
              <>
                {/* 데스크톱 필터 */}
                <div className="hidden md:block">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      필터
                    </h3>
                    <button
                      onClick={clearFilters}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      필터 초기화
                    </button>
                  </div>
                  <div className="flex gap-4">
                    <BlogCategories
                      activeCategorySlug={filters.category}
                      onCategorySelect={handleCategoryFilter}
                    />
                    {/* 태그 필터는 추후 구현 */}
                  </div>
                </div>

                {/* 모바일 필터 토글 */}
                <div className="md:hidden">
                  <button
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 5h18M6 12h12M10 19h4" />
                    </svg>
                    필터
                  </button>
                  
                  {showMobileFilters && (
                    <div className="mt-4 space-y-4">
                      <BlogCategories
                        activeCategorySlug={filters.category}
                        onCategorySelect={handleCategoryFilter}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 결과 통계 */}
      <div className="mb-6">
        <p className="text-gray-600 dark:text-gray-400">
          총 <span className="font-semibold text-gray-900 dark:text-white">{totalBlogs}</span>개의 글
          {filters.search && ` (검색어: "${filters.search}")`}
          {filters.category && ` (카테고리: "${filters.category}")`}
        </p>
      </div>

      {/* 로딩 상태 */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">글을 불러오는 중...</p>
        </div>
      )}

      {/* 블로그 목록 */}
      {!loading && (
        <>
          {blogs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                글이 없습니다
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {filters.search || filters.category || filters.tag
                  ? '검색 조건에 맞는 글이 없습니다.'
                  : '아직 작성된 글이 없습니다.'}
              </p>
            </div>
          ) : (
            <>
              {/* 그리드 레이아웃 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {blogs.map((blog, index) => (
                  <BlogCard
                    key={blog.id}
                    blog={blog}
                    featured={index === 0 && featuredOnly}
                  />
                ))}
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <BlogPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

export default BlogList