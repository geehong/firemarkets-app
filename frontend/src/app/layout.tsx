"use client"

import { Inter } from 'next/font/google'
import './globals.css'

import { SidebarProvider } from '@/context/SidebarContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { LocalizedDataProvider } from '@/contexts/LocalizedDataContext'
import { AutoLocalizationProvider } from '@/contexts/AutoLocalizationContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppHeader from '@/layout/AppHeader'
import AppSidebar from '@/layout/AppSidebarShadcn'
import Backdrop from '@/layout/Backdrop'
import { useSidebar } from '@/context/SidebarContext'

const inter = Inter({ subsets: ['latin'] })

// QueryClient 생성
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분
      gcTime: 10 * 60 * 1000, // 10분 (cacheTime -> gcTime)
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
})

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar()

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]"

  return (
    <div className="min-h-screen xl:flex">
      <AppSidebar />
      <Backdrop />
      <div className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}>
        <AppHeader />
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={`${inter.className} dark:bg-gray-900`}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <LanguageProvider>
              <LocalizedDataProvider>
                <AutoLocalizationProvider>
                  <SidebarProvider>
                    <LayoutContent>{children}</LayoutContent>
                  </SidebarProvider>
                </AutoLocalizationProvider>
              </LocalizedDataProvider>
            </LanguageProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}
