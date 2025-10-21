"use client";

import React, { useState } from 'react'
import BlogList from '@/components/blog/BlogList'

export default function BlogSearchPage() {
  const [q, setQ] = useState('')

  return (
    
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">블로그 검색</h1>
          <div className="mb-6">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="검색어를 입력하세요"
              className="w-full max-w-xl px-3 py-2 border rounded-md bg-white dark:bg-gray-800"
            />
          </div>
          <BlogList showFilters={false} showSearch={false} featuredOnly={false} />
        </div>
      </div>
    
  )
}


