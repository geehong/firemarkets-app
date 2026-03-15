'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { resolveApiBaseUrl } from '@/lib/api'

// API 기본 URL - 공통 로직 사용
const getApiBase = (): string => {
  return resolveApiBaseUrl();
}

import { tokenService } from '@/services/tokenService'

// 인증 헤더를 가져오는 헬퍼 함수
const getAuthHeaders = (): Record<string, string> => {
  const token = tokenService.getAccessToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

// 포스트 타입 정의
export interface Post {
  id: number
  title: { ko: string; en: string }
  content: string
  content_ko: string
  description: { ko: string; en: string }
  excerpt: { ko: string; en: string }
  slug: string
  status: 'draft' | 'published' | 'private' | 'scheduled' | 'archived'
  featured: boolean
  post_type: 'post' | 'page' | 'tutorial' | 'news' | 'assets' | 'onchain' | 'raw_news' | 'ai_draft_news' | 'brief_news'
  view_count: number
  created_at: string
  updated_at: string
  published_at?: string
  scheduled_at?: string
  author_id: number | null
  category_id: number | null
  cover_image: string | null
  cover_image_alt: string | null
  keywords: string[] | null
  canonical_url: string | null
  meta_title: { ko: string; en: string }
  meta_description: { ko: string; en: string }
  read_time_minutes: number | null
  sync_with_asset: boolean
  auto_sync_content: boolean
  asset_id: number | null
  post_parent: number | null
  menu_order: number
  comment_count: number
  post_password: string | null
  ping_status: string
  last_sync_at: string | null
  sync_status: 'pending' | 'synced' | 'failed'
  // API에서 반환되는 추가 정보
  author: {
    id: number
    username: string
    email: string
  } | null
  category: {
    id: number
    name: string
    slug: string
  } | null
  tags: Array<{
    id: number
    name: string
    slug: string
  }>
  post_info?: any
}

export interface PostListResponse {
  posts: Post[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface PostCreateData {
  title: { ko: string; en: string }
  content: string
  content_ko: string
  description: { ko: string; en: string }
  excerpt: { ko: string; en: string }
  slug: string
  status: 'draft' | 'published' | 'private' | 'scheduled' | 'archived'
  featured: boolean
  post_type: 'post' | 'page' | 'tutorial' | 'news' | 'assets' | 'onchain' | 'brief_news' | 'raw_news' | 'ai_draft_news'
  author_id: number | null
  category_id: number | null
  cover_image: string | null
  cover_image_alt: string | null
  keywords: string[] | null
  canonical_url: string | null
  meta_title: { ko: string; en: string }
  meta_description: { ko: string; en: string }
  read_time_minutes: number | null
  sync_with_asset: boolean
  auto_sync_content: boolean
  asset_id: number | null
  post_parent: number | null
  menu_order: number
  post_password: string | null
  ping_status: string
}

export interface PostUpdateData extends Partial<PostCreateData> { }

// 포스트 목록 조회 훅
export const usePosts = (params?: {
  page?: number
  page_size?: number
  post_type?: string
  status?: string
  search?: string
  category?: string
  tag?: string
  author_id?: number
  ticker?: string
  sort_by?: string
  order?: 'asc' | 'desc'
}, options?: any) => {
  return useQuery({
    queryKey: ['posts', params],
    queryFn: async (): Promise<PostListResponse> => {
      const searchParams = new URLSearchParams()

      if (params?.page) searchParams.append('page', params.page.toString())
      if (params?.page_size) searchParams.append('page_size', params.page_size.toString())
      if (params?.post_type) searchParams.append('post_type', params.post_type)
      if (params?.status) searchParams.append('status', params.status)
      if (params?.search) searchParams.append('search', params.search)
      if (params?.category) searchParams.append('category', params.category)
      if (params?.tag) searchParams.append('tag', params.tag)
      if (params?.author_id) searchParams.append('author_id', params.author_id.toString())
      if (params?.ticker) searchParams.append('ticker', params.ticker)
      if (params?.sort_by) searchParams.append('sort_by', params.sort_by)
      if (params?.order) searchParams.append('order', params.order)

      const url = `${getApiBase()}/posts/?${searchParams.toString()}`
      console.log('🔍 [usePosts] Fetching posts:', url)

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) {
        throw new Error(`Failed to fetch posts: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ [usePosts] Posts fetched successfully:', data)
      return data
    },
    staleTime: 5 * 60 * 1000, // 5분 캐싱
    retry: 1,
    ...options
  })
}

// 단일 포스트 조회 훅
export const usePost = (postId: number | undefined) => {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: async (): Promise<Post | null> => {
      if (!postId) throw new Error('Post ID is required')

      const url = `${getApiBase()}/posts/${postId}`
      console.log('🔍 [usePost] Fetching post:', url)

      const response = await fetch(url)
      if (response.status === 404) {
        console.warn(`ℹ️ [usePost] Post not found (404) for ID: ${postId}. Returning null.`)
        return null
      }
      if (!response.ok) {
        throw new Error(`Failed to fetch post: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ [usePost] Post fetched successfully:', data)
      return data
    },
    enabled: !!postId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

// 슬러그로 포스트 조회 훅
export const usePostBySlug = (slug: string | undefined) => {
  return useQuery({
    queryKey: ['post', 'slug', slug],
    queryFn: async (): Promise<Post | null> => {
      if (!slug) throw new Error('Slug is required')

      const url = `${getApiBase()}/posts/slug/${slug}`
      console.log('🔍 [usePostBySlug] Fetching post by slug:', url)

      const response = await fetch(url)
      if (response.status === 404) {
        console.warn(`ℹ️ [usePostBySlug] Post not found (404) for slug: ${slug}. Returning null.`)
        return null
      }
      if (!response.ok) {
        throw new Error(`Failed to fetch post by slug: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ [usePostBySlug] Post fetched successfully:', data)
      return data
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

// 자산별 포스트 조회 훅
export const usePostsByAsset = (assetId: number | undefined) => {
  return useQuery({
    queryKey: ['posts', 'asset', assetId],
    queryFn: async (): Promise<Post[]> => {
      if (!assetId) throw new Error('Asset ID is required')

      const url = `${getApiBase()}/posts/asset/${assetId}`
      console.log('🔍 [usePostsByAsset] Fetching posts by asset:', url)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch posts by asset: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ [usePostsByAsset] Posts fetched successfully:', data)
      return data
    },
    enabled: !!assetId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

// 인기 포스트 조회 훅
export const usePopularPosts = (limit: number = 10) => {
  return useQuery({
    queryKey: ['posts', 'popular', limit],
    queryFn: async (): Promise<Post[]> => {
      const url = `${getApiBase()}/posts/popular/?limit=${limit}`
      console.log('🔍 [usePopularPosts] Fetching popular posts:', url)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch popular posts: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ [usePopularPosts] Popular posts fetched successfully:', data)
      return data
    },
    staleTime: 10 * 60 * 1000, // 10분 캐싱
    retry: 1,
  })
}

// 최근 포스트 조회 훅
export const useRecentPosts = (limit: number = 10) => {
  return useQuery({
    queryKey: ['posts', 'recent', limit],
    queryFn: async (): Promise<Post[]> => {
      const url = `${getApiBase()}/posts/recent/?limit=${limit}`
      console.log('🔍 [useRecentPosts] Fetching recent posts:', url)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch recent posts: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ [useRecentPosts] Recent posts fetched successfully:', data)
      return data
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

// 포스트 생성 훅
export const useCreatePost = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (postData: PostCreateData): Promise<Post> => {
      const url = `${getApiBase()}/posts/`
      console.log('🔍 [useCreatePost] Creating post:', url, postData)

      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(postData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to create post: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ [useCreatePost] Post created successfully:', data)
      return data
    },
    onSuccess: () => {
      // 포스트 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

// 포스트 수정 훅
export const useUpdatePost = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, postData }: { postId: number; postData: PostUpdateData }): Promise<Post> => {
      const url = `${getApiBase()}/posts/${postId}`
      console.log('🔍 [useUpdatePost] Updating post:', url, postData)

      const response = await fetch(url, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(postData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to update post: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ [useUpdatePost] Post updated successfully:', data)
      return data
    },
    onSuccess: (data) => {
      // 관련 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['post', data.id] })
    },
  })
}

// 포스트 삭제 훅
export const useDeletePost = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (postId: number): Promise<{ message: string }> => {
      const url = `${getApiBase()}/posts/${postId}`
      console.log('🔍 [useDeletePost] Deleting post:', url)

      const response = await fetch(url, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to delete post: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ [useDeletePost] Post deleted successfully:', data)
      return data
    },
    onSuccess: () => {
      // 포스트 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

// 포스트 동기화 훅
export const useSyncPost = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, syncDirection }: { postId: number; syncDirection: 'to_asset' | 'from_asset' }): Promise<{ success: boolean; message: string; sync_status: string; last_sync_at: string | null }> => {
      const url = `${getApiBase()}/posts/sync`
      console.log('🔍 [useSyncPost] Syncing post:', url, { postId, syncDirection })

      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          post_id: postId,
          sync_direction: syncDirection
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to sync post: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ [useSyncPost] Post synced successfully:', data)
      return data
    },
    onSuccess: (data, variables) => {
      // 관련 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['post', variables.postId] })
    },
  })
}

// 포스트 통계 조회 훅
export const usePostStats = () => {
  return useQuery({
    queryKey: ['posts', 'stats'],
    queryFn: async () => {
      const url = `${getApiBase()}/posts/stats/overview`
      console.log('🔍 [usePostStats] Fetching post stats:', url)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch post stats: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ [usePostStats] Post stats fetched successfully:', data)
      return data
    },
    staleTime: 15 * 60 * 1000, // 15분 캐싱
    retry: 1,
  })
}

// 카테고리 목록 조회 훅
export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const url = `${getApiBase()}/posts/categories/`
      console.log('🔍 [useCategories] Fetching categories:', url)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ [useCategories] Categories fetched successfully:', data)
      return data
    },
    staleTime: 30 * 60 * 1000, // 30분 캐싱
    retry: 1,
  })
}

// 태그 목록 조회 훅
export const useTags = (limit: number = 20) => {
  return useQuery({
    queryKey: ['tags', limit],
    queryFn: async () => {
      const url = `${getApiBase()}/posts/tags/?limit=${limit}`
      console.log('🔍 [useTags] Fetching tags:', url)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch tags: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ [useTags] Tags fetched successfully:', data)
      return data
    },
    staleTime: 30 * 60 * 1000, // 30분 캐싱
    retry: 1,
  })
}

// 태그 검색 훅
export const useSearchTags = (query: string, limit: number = 10) => {
  return useQuery({
    queryKey: ['tags', 'search', query, limit],
    queryFn: async () => {
      if (!query.trim()) return []

      const url = `${getApiBase()}/posts/tags/search?q=${encodeURIComponent(query)}&limit=${limit}`
      console.log('🔍 [useSearchTags] Searching tags:', url)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to search tags: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ [useSearchTags] Tags search completed:', data)
      return data
    },
    enabled: !!query.trim(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

// 포스트 댓글 조회 훅
export const usePostComments = (postId: number | undefined) => {
  return useQuery({
    queryKey: ['posts', postId, 'comments'],
    queryFn: async () => {
      if (!postId) throw new Error('Post ID is required')

      const url = `${getApiBase()}/posts/${postId}/comments`
      console.log('🔍 [usePostComments] Fetching post comments:', url)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch post comments: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ [usePostComments] Post comments fetched successfully:', data)
      return data
    },
    enabled: !!postId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

// 댓글 생성 훅
export const useCreateComment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, commentData }: { postId: number; commentData: any }): Promise<any> => {
      const url = `${getApiBase()}/posts/${postId}/comments`
      console.log('🔍 [useCreateComment] Creating comment:', url, commentData)

      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(commentData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to create comment: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ [useCreateComment] Comment created successfully:', data)
      return data
    },
    onSuccess: (data, variables) => {
      // 댓글 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['posts', variables.postId, 'comments'] })
    },
  })
}

// 포스트 병합 (AI) 훅
export const useMergePosts = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (postIds: number[]): Promise<Post> => {
      const url = `${getApiBase()}/posts/merge`
      console.log('🔍 [useMergePosts] Merging posts:', url, postIds)

      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ post_ids: postIds }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to merge posts: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ [useMergePosts] Posts merged successfully:', data)
      return data
    },
    onSuccess: () => {
      // 포스트 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

// AI 재생성 훅
export const useRegeneratePost = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (postId: number): Promise<Post> => {
      const url = `${getApiBase()}/posts/${postId}/ai-regenerate`
      console.log('🔍 [useRegeneratePost] Regenerating post:', url)

      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to regenerate post: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ [useRegeneratePost] Post regenerated successfully:', data)
      return data
    },
    onSuccess: (data) => {
      // 캐시 무효화 -> 에디터 페이지에서 데이터 자동 갱신
      queryClient.invalidateQueries({ queryKey: ['post', data.id] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

// 뉴스 정리 훅
export const useCleanupPosts = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<{ message: string; count: number }> => {
      const url = `${getApiBase()}/posts/cleanup`
      console.log('🔍 [useCleanupPosts] Cleaning up posts:', url)

      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to cleanup posts: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ [useCleanupPosts] Cleanup completed:', data)
      return data
    },
    onSuccess: () => {
      // 목록 갱신
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

// 드래프트 키워드 조회 훅
export const useDraftKeywords = (limit: number = 20) => {
  return useQuery({
    queryKey: ['draft-keywords', limit],
    queryFn: async (): Promise<{ keywords: { keyword: string; count: number }[] }> => {
      const url = `${getApiBase()}/dashboard/draft-keywords?limit=${limit}`
      console.log('🔍 [useDraftKeywords] Fetching draft keywords:', url)

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch draft keywords: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ [useDraftKeywords] Draft keywords fetched successfully:', data)
      return data
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}