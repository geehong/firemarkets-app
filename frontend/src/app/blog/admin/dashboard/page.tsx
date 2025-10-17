import React from 'react'
import Link from 'next/link'

export default function BlogAdminDashboard() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">블로그 관리 대시보드</h1>
        <p className="text-gray-600 dark:text-gray-400">블로그 콘텐츠 관리 및 통계</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">빠른 작업</h2>
          <Link href="/blog/admin/create" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">새 글 작성</Link>
        </div>
      </div>
    </div>
  )
}


