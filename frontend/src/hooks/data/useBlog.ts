'use client'

import { useState, useEffect } from 'react'
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
      const data = await apiClient.getPost(slug)
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
    refetch: fetchBlog,
  }
}