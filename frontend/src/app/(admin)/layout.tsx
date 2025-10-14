"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// SSR 비활성화된 컴포넌트들
const NoSSRSidebar = dynamic(() => import("@/layout/AppSidebar"), { ssr: false });
const NoSSRHeader = dynamic(() => import("@/layout/AppHeader"), { ssr: false });
const NoSSRBackdrop = dynamic(() => import("@/layout/Backdrop"), { ssr: false });

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center" suppressHydrationWarning>
        <div className="flex flex-col items-center" suppressHydrationWarning>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" suppressHydrationWarning></div>
          <div className="mt-3 text-sm text-gray-600" suppressHydrationWarning>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen xl:flex" suppressHydrationWarning>
      {/* Sidebar and Backdrop */}
      <NoSSRSidebar />
      <NoSSRBackdrop />
      {/* Main Content Area */}
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
        suppressHydrationWarning
      >
        {/* Header */}
        <NoSSRHeader />
        {/* Page Content */}
        <div className="p-1 mx-auto max-w-(--breakpoint-2xl) md:p-1" suppressHydrationWarning>
          {children}
        </div>
      </div>
    </div>
  );
}
