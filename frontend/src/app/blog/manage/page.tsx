import React from 'react'
import BlogManage from '@/components/blog/admin/BlogManage'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '글관리 | FireMarkets',
  description: '내가 작성한 글을 관리하세요.',
}

export default function BlogManagePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <BlogManage />
      </div>
    </div>
  )
}








