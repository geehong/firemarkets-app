"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import AppFooter from "@/layout/AppFooter";
import React from "react";
import { Toaster } from "react-hot-toast";
import AdUnit from "@/components/ads/AdUnit";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import RightSidebar from "@/components/layout/RightSidebar";

export default function ServiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const pathname = usePathname();
  const locale = useLocale();

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "lg:ml-[290px]"
      : "lg:ml-[90px]";

  // Define routes that have their own sidebar (excluding global sidebar)
  // Check if pathname starts with any of these prefixes
  // We need to handle locale prefix in pathname
  const hasLocalSidebar = [
      `/${locale}/news/`,
      `/${locale}/blog/`, 
      `/${locale}/post/`,
      `/${locale}/assets/` // Asset detail view has sidebar? Let's check.
      // BriefNewsDetail is accessed via /news/briefnews/... which matches /news/
  ].some(prefix => pathname?.startsWith(prefix));

  // Asset detail views like /en/assets/BTC also have sidebar.
  // Actually, /assets page (list) does NOT have sidebar. 
  // /assets/[ticker] DOES have sidebar.
  // The logic needs to be precise.
  // /news -> List page, MIGHT NOT have sidebar? Let's assume list pages don't have sidebar, detail pages DO.
  // Start with explicit exclusion of logic.
  
  // Let's refine based on previous analysis:
  // PostDetailedView used in: /blog/[slug], /news/[slug], /post/[slug]
  // BriefNewsDetailView used in: /news/briefnews/[slug]
  // AssetDetailedView used in: /assets/[ticker]
  
  // So we want to hide global sidebar on:
  // /blog/[slug]
  // /news/[slug] (but NOT /news itself if checking recent news list)
  // /news/briefnews/[slug]
  // /assets/[ticker] (but NOT /assets itself)
  
  // A helper function to check if it's a detail page would be better, but regex is easier.
  // Regex to match detail pages:
  // ^/[a-z]{2}/blog/.+$
  // ^/[a-z]{2}/news/.+$
  // ^/[a-z]{2}/post/.+$
  // ^/[a-z]{2}/assets/.+$
  
  // BUT: /news/briefnews is a list? No, /news/briefnews is not a route I saw. 
  // The route for brief news list is likely /news?tab=brief or similar, or just /news. 
  // Let's look at PostSidebar usage again. It was used in PostDetailedView etc.

  // Robust check for detail pages by stripping locale
  const pathWithoutLocale = pathname?.replace(/^\/[a-z]{2}(\/|$)/, '/') || '/';

  const isDetailPage = [
      /^\/blog\/.+$/,
      /^\/news\/.+$/,
      /^\/post\/.+$/,
      /^\/assets\/.+$/, // Matches /assets/btc, but not /assets
      /^\/tag\/.+$/,
  ].some(regex => regex.test(pathWithoutLocale));

  // Special case: /admin routes should definitely NOT show this marketing sidebar?
  // The file is in (service) layout. Admin routes are under (service)/admin.
  const isAdminPage = pathWithoutLocale.startsWith('/admin');
  const isMapPage = pathWithoutLocale.startsWith('/map');
  const isOnchainPage = pathWithoutLocale.startsWith('/onchain');

  const showGlobalSidebar = !isDetailPage && !isAdminPage && !isMapPage && !isOnchainPage;

  return (
    <div className="min-h-screen xl:flex">
      {/* Sidebar and Backdrop */}
      <AppSidebar />
      <Backdrop />
      {/* Main Content Area */}
      <div
        className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out ${mainContentMargin}`}
      >
        {/* Header */}
        <AppHeader />
        
        {/* Top Ad Unit */}
        <div className="w-full px-4 md:px-6 pt-4">
            <AdUnit 
                slot="8962635926" 
                format="horizontal" 
                style={{ height: '90px', maxHeight: '100px' }}
                label="Advertisement"
            />
        </div>

        {/* Page Content & Global Sidebar Grid */}
        <div className="p-4 md:p-6 w-full flex-1">
            {showGlobalSidebar ? (
                <div className="flex gap-8">
                    <div className="flex-1 min-w-0">
                        {children}
                    </div>
                    <RightSidebar />
                </div>
            ) : (
                children
            )}
        </div>

        {/* Bottom Ad Unit */}
        <div className="w-full px-4 md:px-6 pb-4">
            <AdUnit 
                slot="4256742586" 
                format="horizontal" 
                style={{ height: '90px', maxHeight: '100px' }}
                label="Advertisement"
            />
        </div>

        <AppFooter />
      </div>
      <Toaster position="bottom-right" reverseOrder={false} />
    </div>
  );
}
