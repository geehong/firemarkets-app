// frontend/src/app/test-session/page.tsx
'use client'

import dynamic from 'next/dynamic'

// 클라이언트 사이드에서만 로드
const SessionTest = dynamic(() => import('@/components/test/SessionTest'), {
  ssr: false,
  loading: () => <div className="p-6">Loading session test...</div>
})

export default function TestSessionPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <SessionTest />
    </div>
  )
}
