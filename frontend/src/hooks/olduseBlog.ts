// frontend/src/hooks/useBlog.ts

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api'

export interface Blog {
  id: number
  title: string
  slug: string
  content: string
  excerpt?: string
  cover_image?: string
  status: 'draft' | 'published' | 'archived'
  view_count: number
  created_at: string
  updated_at: string
  published_at?: string
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
  tags?: Array<{
    id: number
    name: string
    slug: string
  }>
  asset?: {
    id: number
    ticker: string
    name: string
  }
}

export interface BlogFilters {
  page?: number
  page_size?: number
  status?: string
  search?: string
  category?: string
  tag?: string
}

export interface BlogListResponse {
  blogs: Blog[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface BlogCategory {
  id: number
  name: string
  slug: string
  description?: string
  blog_count?: number
}

export interface BlogTag {
  id: number
  name: string
  slug: string
  blog_count?: number
}

/**
 * 블로그 목록을 가져오는 훅
 */
export const useBlogs = (filters: BlogFilters = {}) => {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [totalBlogs, setTotalBlogs] = useState(0)
  const [currentPage, setCurrentPage] = useState(filters.page || 1)
  const [isClient, setIsClient] = useState(false)

  const fetchBlogs = useCallback(async (page: number = 1, searchFilters: BlogFilters = {}) => {
    try {
      setLoading(true)
      setError(null)

      const params = {
        page,
        page_size: searchFilters.page_size || 12,
        status: searchFilters.status || 'published',
        ...(searchFilters.search && { search: searchFilters.search }),
        ...(searchFilters.category && { category: searchFilters.category }),
        ...(searchFilters.tag && { tag: searchFilters.tag })
      }

      const data: BlogListResponse = await apiClient.getBlogs(params)
      
      setBlogs(data.blogs || [])
      setTotalPages(data.total_pages || 1)
      setTotalBlogs(data.total || 0)
      setCurrentPage(page)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch blogs'
      setError(errorMessage)
      console.error('Error fetching blogs:', {
        error: err,
        message: errorMessage,
        params: searchFilters,
        url: `API call with params: ${JSON.stringify(searchFilters)}`
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient) {
      // Construct searchFilters from stable dependencies to avoid infinite loop
      const searchFilters = {
        page_size: filters.page_size,
        status: filters.status,
        search: filters.search,
        category: filters.category,
        tag: filters.tag,
      };
      fetchBlogs(filters.page || 1, searchFilters);
    }
  }, [isClient, filters.page, filters.page_size, filters.status, filters.search, filters.category, filters.tag, fetchBlogs]);

  return {
    blogs,
    loading,
    error,
    totalPages,
    totalBlogs,
    currentPage,
    fetchBlogs,
    refetch: () => fetchBlogs(currentPage, filters)
  }
}

/**
 * 단일 블로그 포스트를 가져오는 훅
 */
export const useBlog = (slug: string) => {
  const [blog, setBlog] = useState<Blog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  const fetchBlog = async () => {
    if (!slug) return

    try {
      setLoading(true)
      setError(null)
      
      const data = await apiClient.getBlog(slug)
      setBlog(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch blog')
      console.error('Error fetching blog:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient && slug) {
      fetchBlog()
    }
  }, [isClient, slug])

  return {
    blog,
    loading,
    error,
    refetch: fetchBlog
  }
}

/**
 * 블로그 카테고리를 가져오는 훅
 */
export const useBlogCategories = () => {
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  const fetchCategories = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await apiClient.getBlogCategories()
      setCategories(data.categories || [])
    } catch (err) {
      console.error('Failed to fetch categories:', err)
      // 임시 데이터 (API가 준비되지 않은 경우)
      setCategories([
        { id: 1, name: '시장 분석', slug: 'market-analysis', blog_count: 12 },
        { id: 2, name: '투자 가이드', slug: 'investment-guide', blog_count: 8 },
        { id: 3, name: '암호화폐', slug: 'cryptocurrency', blog_count: 15 },
        { id: 4, name: '주식', slug: 'stocks', blog_count: 6 },
        { id: 5, name: '경제 뉴스', slug: 'economic-news', blog_count: 10 },
        { id: 6, name: '기술 분석', slug: 'technical-analysis', blog_count: 7 }
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient) {
      fetchCategories()
    }
  }, [isClient])

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories
  }
}

/**
 * 블로그 태그를 가져오는 훅
 */
export const useBlogTags = () => {
  const [tags, setTags] = useState<BlogTag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  const fetchTags = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await apiClient.getBlogTags()
      setTags(data.tags || [])
    } catch (err) {
      console.error('Failed to fetch tags:', err)
      // 임시 데이터
      setTags([
        { id: 1, name: '비트코인', slug: 'bitcoin', blog_count: 8 },
        { id: 2, name: '이더리움', slug: 'ethereum', blog_count: 6 },
        { id: 3, name: 'DeFi', slug: 'defi', blog_count: 4 },
        { id: 4, name: 'NFT', slug: 'nft', blog_count: 3 },
        { id: 5, name: '주식', slug: 'stocks', blog_count: 5 }
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient) {
      fetchTags()
    }
  }, [isClient])

  return {
    tags,
    loading,
    error,
    refetch: fetchTags
  }
}
