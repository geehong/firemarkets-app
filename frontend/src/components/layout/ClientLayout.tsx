"use client";

import { useSidebar, SidebarProvider } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// QueryClient 인스턴스 생성
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분
      retry: 1,
    },
  },
});

// 내부 레이아웃 컴포넌트 (SidebarProvider 내부에서 사용)
function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    console.log('🔍 [CLIENT DEBUG] AdminLayoutContent useEffect called')
    console.log('🔍 [CLIENT DEBUG] isClient:', isClient)
    setIsClient(true);
    
    // 파비콘 설정
    const setFavicon = () => {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
      link.type = 'image/png';
      link.rel = 'shortcut icon';
      link.href = '/favicon.png';
      document.getElementsByTagName('head')[0].appendChild(link);
    };
    
    setFavicon();
  }, []);

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";
  
  // Mobile top menu padding
  const mobileTopPadding = "pt-16 lg:pt-0";

  // 로딩 상태 제거 - 즉시 콘텐츠 렌더링
  // if (!isClient) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center" suppressHydrationWarning>
  //       <div className="flex flex-col items-center" suppressHydrationWarning>
  //         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" suppressHydrationWarning></div>
  //         <div className="mt-3 text-sm text-gray-600" suppressHydrationWarning>Loading...</div>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen xl:flex" suppressHydrationWarning>
      {/* Sidebar and Backdrop */}
      {isClient && <AppSidebar />}
      {isClient && <Backdrop />}
      {/* Main Content Area */}
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin} ${mobileTopPadding}`}
        suppressHydrationWarning
      >
        {/* Header */}
        {isClient && <AppHeader />}
        {/* Page Content */}
        <div className="p-1 mx-auto max-w-(--breakpoint-2xl) md:p-1" suppressHydrationWarning>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <AdminLayoutContent>
          {children}
        </AdminLayoutContent>
      </SidebarProvider>
    </QueryClientProvider>
  );
}
