'use client'

import { SessionProvider } from '@/contexts/SessionContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/context/ThemeContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { LocalizedDataProvider } from '@/contexts/LocalizedDataContext'
import { AutoLocalizationProvider } from '@/contexts/AutoLocalizationContext'

// QueryClient 생성
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분
      gcTime: 10 * 60 * 1000, // 10분
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
})

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  console.log('🔐 [AuthLayout] 로그인 페이지 레이아웃 로드됨')
  console.log('🔐 [AuthLayout] 독립적인 로그인 레이아웃 적용')
  
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <ThemeProvider>
              <LanguageProvider>
                <LocalizedDataProvider>
                  <AutoLocalizationProvider>
                    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                      {children}
                    </div>
                  </AutoLocalizationProvider>
                </LocalizedDataProvider>
              </LanguageProvider>
            </ThemeProvider>
          </SessionProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}