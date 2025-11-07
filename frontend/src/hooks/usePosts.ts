'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// API 기본 URL
const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.NEXT_PUBLIC_API_URL || 'https://backend.firemarkets.net/api/v1'

// HTTPS 강제 적용 (Mixed Content 방지)
let API_BASE = BACKEND_BASE
if (API_BASE.startsWith('http://')) {
  API_BASE = API_BASE.replace('http://', 'https://')
} else if (!API_BASE.startsWith('https://')) {
  // 프로토콜이 없으면 https:// 추가
  API_BASE = `https://${API_BASE}`
}

// 인증 헤더를 가져오는 헬퍼 함수
const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('accessToken')
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
  status: 'draft' | 'published' | 'private' | 'scheduled'
  featured: boolean
  post_type: 'post' | 'page' | 'tutorial' | 'news' | 'assets' | 'onchain'
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
  status: 'draft' | 'published' | 'private' | 'scheduled'
  featured: boolean
  post_type: 'post' | 'page' | 'tutorial' | 'news' | 'assets' | 'onchain'
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

export interface PostUpdateData extends Partial<PostCreateData> {}

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
}) => {
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

      const url = `${API_BASE}/posts?${searchParams.toString()}`
      console.log('🔍 [usePosts] Fetching posts:', url)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch posts: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ [usePosts] Posts fetched successfully:', data)
      return data
    },
    staleTime: 5 * 60 * 1000, // 5분 캐싱
    retry: 1,
  })
}

// 단일 포스트 조회 훅
export const usePost = (postId: number | undefined) => {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: async (): Promise<Post | null> => {
      if (!postId) throw new Error('Post ID is required')

      const url = `${API_BASE}/posts/${postId}`
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
    queryFn: async (): Promise<Post> => {
      if (!slug) throw new Error('Slug is required')

      const url = `${API_BASE}/posts/slug/${slug}`
      console.log('🔍 [usePostBySlug] Fetching post by slug:', url)

      const response = await fetch(url)
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

      const url = `${API_BASE}/posts/asset/${assetId}`
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
      const url = `${API_BASE}/posts/popular/?limit=${limit}`
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
      const url = `${API_BASE}/posts/recent/?limit=${limit}`
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
      const url = `${API_BASE}/posts/`
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
      const url = `${API_BASE}/posts/${postId}`
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
      const url = `${API_BASE}/posts/${postId}`
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
      const url = `${API_BASE}/posts/sync`
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
      const url = `${API_BASE}/posts/stats/overview`
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
      const url = `${API_BASE}/posts/categories/`
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
      const url = `${API_BASE}/posts/tags/?limit=${limit}`
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

      const url = `${API_BASE}/posts/tags/search?q=${encodeURIComponent(query)}&limit=${limit}`
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

      const url = `${API_BASE}/posts/${postId}/comments`
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
      const url = `${API_BASE}/posts/${postId}/comments`
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