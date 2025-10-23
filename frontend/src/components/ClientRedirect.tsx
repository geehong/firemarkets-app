'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ClientRedirectProps {
  url: string
}

export default function ClientRedirect({ url }: ClientRedirectProps) {
  const router = useRouter()

  useEffect(() => {
    // 즉시 리다이렉트
    router.replace(url)
  }, [router, url])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">리다이렉트 중...</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">잠시만 기다려주세요.</p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    </div>
  )
}

