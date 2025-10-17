"use client";

import React, { useEffect } from 'react'
import BlogList from '@/components/blog/BlogList'

interface PageProps {
  params: { category: string }
}

export default function BlogCategoryPage({ params }: PageProps) {
  useEffect(() => {
    console.log('[BlogCategoryPage] category:', params.category)
  }, [params.category])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">카테고리: {params.category}</h1>
        <BlogList showFilters={false} showSearch={true} featuredOnly={false} />
      </div>
    </div>
  )
}


