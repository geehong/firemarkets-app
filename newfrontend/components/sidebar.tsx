"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  BarChart2,
  Building2,
  Folder,
  Wallet,
  Receipt,
  CreditCard,
  Users2,
  Shield,
  MessagesSquare,
  Video,
  Settings,
  HelpCircle,
  Menu,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { 
  SidebarMenu, 
  SidebarMenuItem
} from "@/components/ui/sidebar"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { 
    name: "Analytics", 
    icon: BarChart2, 
    items: [
      { name: "Analytics", href: "/analytics", icon: BarChart2 },
      { name: "Components", href: "/components", icon: BarChart2 },
      { name: "Mini Chart Test", href: "/components/minichart-test", icon: BarChart2 },
    ]
  },
  { 
    name: "Organization", 
    icon: Building2, 
    items: [
      { name: "Organization", href: "/organization", icon: Building2 },
      { name: "Projects", href: "/projects", icon: Folder },
      { name: "Members", href: "/members", icon: Users2 },
      { name: "Permissions", href: "/permissions", icon: Shield },
    ]
  },
  { 
    name: "Finance", 
    icon: Wallet, 
    items: [
      { name: "Transactions", href: "/transactions", icon: Wallet },
      { name: "Invoices", href: "/invoices", icon: Receipt },
      { name: "Payments", href: "/payments", icon: CreditCard },
    ]
  },
  { 
    name: "Communication", 
    icon: MessagesSquare, 
    items: [
      { name: "Chat", href: "/chat", icon: MessagesSquare },
      { name: "Meetings", href: "/meetings", icon: Video },
    ]
  },
]

const bottomNavigation = [
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Help", href: "/help", icon: HelpCircle },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const NavItem = ({ item, isBottom = false }: { 
    item: { 
      name: string; 
      href?: string; 
      icon: React.ComponentType<{ className?: string }>; 
      items?: Array<{ name: string; href: string; icon: React.ComponentType<{ className?: string }> }> 
    }; 
    isBottom?: boolean 
  }) => {
    // 단일 아이템인 경우
    if (!item.items) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              href={item.href!}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",
                isCollapsed && "justify-center px-2",
              )}
            >
              <item.icon className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right" className="flex items-center gap-4">
              {item.name}
            </TooltipContent>
          )}
        </Tooltip>
      )
    }

    // Collapsible 그룹인 경우
    return (
      <div className="relative">
        <SidebarMenuItem>
          <div className="group">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start h-8 px-2 text-sm font-medium",
                "hover:bg-secondary hover:text-secondary-foreground",
                isCollapsed && "justify-center px-2"
              )}
            >
              <item.icon className="h-4 w-4" />
              {!isCollapsed && (
                <>
                  <span className="ml-3">{item.name}</span>
                  <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200" />
                </>
              )}
              {isCollapsed && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="sr-only">{item.name}</span>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              )}
            </Button>
            
            {/* 서브메뉴 */}
            {!isCollapsed ? (
              <div className="ml-6 space-y-1">
                {item.items.map((subItem) => (
                  <Link
                    key={subItem.name}
                    href={subItem.href}
                    className={cn(
                      "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      pathname === subItem.href
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                    )}
                  >
                    <subItem.icon className="h-4 w-4 mr-3" />
                    <span>{subItem.name}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="absolute left-full top-0 ml-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg p-2 min-w-[200px] z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
                <div className="space-y-1">
                  {item.items.map((subItem) => (
                    <Link
                      key={subItem.name}
                      href={subItem.href}
                      className={cn(
                        "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors w-full",
                        pathname === subItem.href
                          ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      )}
                    >
                      <subItem.icon className="h-4 w-4 mr-3" />
                      <span>{subItem.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SidebarMenuItem>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <>
        <button
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-background rounded-md shadow-md"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div
          className={cn(
            "fixed inset-y-0 z-20 flex flex-col bg-background transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen",
            isCollapsed ? "w-[72px]" : "w-72",
            isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
        >
          <div className="border-b border-border">
            <div className={cn("flex h-16 items-center gap-2 px-4", isCollapsed && "justify-center px-2")}>
              {!isCollapsed && (
                <Link href="/" className="flex items-center font-semibold">
                  <span className="text-lg">Flowers&Saints</span>
                </Link>
              )}
              <Button
                variant="ghost"
                size="sm"
                className={cn("ml-auto h-8 w-8", isCollapsed && "ml-0")}
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                <ChevronLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
                <span className="sr-only">{isCollapsed ? "Expand" : "Collapse"} Sidebar</span>
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <nav className="flex-1 space-y-1 px-2 py-4">
              <SidebarMenu>
                {navigation.map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </SidebarMenu>
            </nav>
          </div>
          <div className="border-t border-border p-2">
            <nav className="space-y-1">
              <SidebarMenu>
                {bottomNavigation.map((item) => (
                  <NavItem key={item.name} item={item} isBottom />
                ))}
              </SidebarMenu>
            </nav>
          </div>
        </div>
      </>
    </TooltipProvider>
  )
}
