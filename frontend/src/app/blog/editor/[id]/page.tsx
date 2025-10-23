'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import BlogEdit from '@/components/edit/BlogEdit'
import BlogEditor from '@/components/blog/editor/BlogEditor'

export default function BlogEditPage() {
  const params = useParams()
  const blogId = params?.id ? parseInt(params.id as string, 10) : undefined

  if (!blogId || isNaN(blogId)) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                잘못된 블로그 ID
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                유효하지 않은 블로그 ID입니다.
              </p>
              <Link
                href="/blog"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                블로그 목록으로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <BlogEdit postId={blogId} mode="edit" />
}
