import React from 'react'
import Link from 'next/link'

export default function BlogAdminIndex() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">블로그 관리자</h1>
      <div className="space-y-3">
        <Link href="/blog/admin/create" className="text-blue-600 hover:text-blue-800">새 글 작성</Link>
        <div>
          <Link href="/blog/admin/dashboard" className="text-blue-600 hover:text-blue-800">대시보드</Link>
        </div>
      </div>
    </div>
  )
}


