"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  BarChart3,
  Building2,
  ChevronRight,
  CreditCard,
  DollarSign,
  Home,
  LineChart,
  Menu,
  PieChart,
  Settings,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const data = {
  user: {
    name: "FireMarkets",
    email: "admin@firemarkets.app",
    avatar: "/avatars/01.png",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: true,
    },
    {
      title: "Assets",
      url: "/assets",
      icon: Building2,
      items: [
        {
          title: "Stocks",
          url: "/assets?type=stocks",
        },
        {
          title: "Crypto",
          url: "/assets?type=crypto",
        },
        {
          title: "ETFs",
          url: "/assets?type=etfs",
        },
      ],
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: BarChart3,
      items: [
        {
          title: "On-chain Data",
          url: "/analytics/onchain",
        },
        {
          title: "Market Analysis",
          url: "/analytics/market",
        },
        {
          title: "Performance",
          url: "/analytics/performance",
        },
      ],
    },
    {
      title: "Charts",
      url: "/charts",
      icon: LineChart,
      items: [
        {
          title: "Price Charts",
          url: "/charts/price",
        },
        {
          title: "Volume Analysis",
          url: "/charts/volume",
        },
        {
          title: "Technical Indicators",
          url: "/charts/indicators",
        },
      ],
    },
    {
      title: "Portfolio",
      url: "/portfolio",
      icon: Wallet,
      items: [
        {
          title: "Overview",
          url: "/portfolio/overview",
        },
        {
          title: "Performance",
          url: "/portfolio/performance",
        },
        {
          title: "Transactions",
          url: "/portfolio/transactions",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
  ],
}

export function Sidebar({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className={cn("pb-12", className)}>
        <div className="space-y-4 py-4">
          <div className="px-3 py-2">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <TrendingUp className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-semibold">FireMarkets</h2>
            </div>
          </div>
          <div className="px-3 py-2">
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-semibold">FireMarkets</h2>
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="space-y-1">
            {data.navMain.map((item) => (
              <div key={item.title}>
                <Button
                  variant={pathname === item.url ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  asChild
                >
                  <Link href={item.url}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </Link>
                </Button>
                {item.items && (
                  <div className="ml-6 mt-1 space-y-1">
                    {item.items.map((subItem) => (
                      <Button
                        key={subItem.title}
                        variant={pathname === subItem.url ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start"
                        asChild
                      >
                        <Link href={subItem.url}>
                          {subItem.title}
                        </Link>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="space-y-1">
            {data.navSecondary.map((item) => (
              <Button
                key={item.title}
                variant="ghost"
                className="w-full justify-start"
                asChild
              >
                <Link href={item.url}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function SidebarInset({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      {children}
    </div>
  )
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full">
      <div className="flex-1 flex flex-col">
        <SidebarInset>{children}</SidebarInset>
      </div>
    </div>
  )
}
