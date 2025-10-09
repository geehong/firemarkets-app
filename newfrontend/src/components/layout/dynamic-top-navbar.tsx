"use client"

import dynamic from "next/dynamic"

const TopNavbar = dynamic(() => import("@/components/layout/client-top-navbar").then(mod => ({ default: mod.ClientTopNavbar })), {
  ssr: false,
  loading: () => (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <div className="h-4 w-4 bg-current rounded animate-pulse" />
          </div>
          <span className="text-xl font-bold">FireMarkets</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
    </header>
  )
})

export default TopNavbar
