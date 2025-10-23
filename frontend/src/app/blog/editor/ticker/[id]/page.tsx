'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import BlogEditor from '@/components/blog/editor/BlogEditor'

const TickerEditorPage = () => {
  const params = useParams()
  const tickerId = params.id ? parseInt(params.id as string, 10) : undefined

  if (!tickerId || isNaN(tickerId)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
        <h1 className="text-4xl font-bold mb-4">404 - Ticker Not Found</h1>
        <p className="text-lg mb-8">The ticker you are looking for does not exist or the ID is invalid.</p>
        <a href="/admin/appconfig" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Back to Admin Panel
        </a>
      </div>
    )
  }

  return <BlogEditor tickerId={tickerId} mode="ticker" />
}

export default TickerEditorPage
