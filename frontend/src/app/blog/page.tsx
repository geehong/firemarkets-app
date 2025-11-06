"use client";

import React from 'react'
import BlogList from '@/components/blog/BlogList'
import BlogManageButton from '@/components/blog/BlogManageButton'
import BlogDashboardContent from '@/components/dashboard/BlogDashboardContent'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function BlogPageContent() {
  const searchParams = useSearchParams()
  const hasTypeName = searchParams?.has('type_name') || searchParams?.has('category') || searchParams?.has('tag') || searchParams?.has('search')
  
  // 쿼리 파라미터가 있으면 BlogList 표시 (필터링/검색)
  if (hasTypeName) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <BlogManageButton />
          <BlogList 
            showFilters={true}
            showSearch={true}
            featuredOnly={false}
          />
        </div>
      </div>
    )
  }

  // 쿼리 파라미터가 없으면 대시보드 표시
  return (
    <main className="container mx-auto px-4 py-8">
      <BlogDashboardContent />
    </main>
  )
}

export default function BlogPage() {
  return (
    <Suspense fallback={
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg text-gray-500">Loading...</div>
        </div>
      </main>
    }>
      <BlogPageContent />
    </Suspense>
  )
}