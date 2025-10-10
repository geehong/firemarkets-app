"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 5분 동안 데이터를 fresh로 간주
            staleTime: 5 * 60 * 1000,
            // 10분 후 가비지 컬렉션
            gcTime: 10 * 60 * 1000,
            // 네트워크 오류 시 3번 재시도
            retry: 3,
            // 재시도 간격 (지수 백오프)
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // 윈도우 포커스 시 자동 리페치 비활성화
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
