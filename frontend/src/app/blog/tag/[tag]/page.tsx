"use client";

import React, { useEffect } from 'react'
import BlogList from '@/components/blog/BlogList'

interface PageProps {
  params: { tag: string }
}

export default function BlogTagPage({ params }: PageProps) {
  useEffect(() => {
    console.log('[BlogTagPage] tag:', params.tag)
  }, [params.tag])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">태그: {params.tag}</h1>
        <BlogList showFilters={false} showSearch={true} featuredOnly={false} />
      </div>
    </div>
  )
}


