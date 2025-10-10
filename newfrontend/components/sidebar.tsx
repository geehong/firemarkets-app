"use client"

import * as React from "react"
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
  Check,
  ChevronsUpDown,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const navigation = [
  { 
    name: "Dashboard", 
    value: "dashboard",
    icon: Home,
    items: [
      { name: "Dashboard", href: "/", icon: Home },
    ]
  },
  { 
    name: "Analytics", 
    value: "analytics",
    icon: BarChart2,
    items: [
      { name: "Analytics", href: "/analytics", icon: BarChart2 },
    ]
  },
  { 
    name: "Components", 
    value: "components",
    icon: BarChart2,
    items: [
      { name: "Components", href: "/components", icon: BarChart2 },
      { name: "Mini Chart Test", href: "/components/minichart-test", icon: BarChart2 },
      { name: "Realtime Test", href: "/components/realtime-test", icon: BarChart2 },
      { name: "Socket Test", href: "/components/socket-test", icon: BarChart2 },
    ]
  },
  { 
    name: "Organization", 
    value: "organization",
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
    value: "finance",
    icon: Wallet,
    items: [
      { name: "Transactions", href: "/transactions", icon: Wallet },
      { name: "Invoices", href: "/invoices", icon: Receipt },
      { name: "Payments", href: "/payments", icon: CreditCard },
    ]
  },
  { 
    name: "Communication", 
    value: "communication",
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
  const [openComboboxes, setOpenComboboxes] = useState<Record<string, boolean>>({})
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({})
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({})

  const NavItem = ({ item, isBottom = false }: { 
    item: { 
      name: string; 
      value: string;
      icon: React.ComponentType<{ className?: string }>; 
      items: Array<{ name: string; href: string; icon: React.ComponentType<{ className?: string }> }>;
    }; 
    isBottom?: boolean 
  }) => {
    const isOpen = openComboboxes[item.value] || false
    const selectedValue = selectedValues[item.value] || ""
    
    // 현재 경로에 해당하는 서브메뉴 찾기
    const currentSubItem = item.items.find(subItem => pathname === subItem.href)
    const displayValue = currentSubItem ? currentSubItem.name : item.name

    // 축소된 상태일 때만 콤보박스로 작동
    if (isCollapsed) {
      return (
        <Popover 
          open={isOpen} 
          onOpenChange={(open) => setOpenComboboxes(prev => ({ ...prev, [item.value]: open }))}
        >
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              role="combobox"
              aria-expanded={isOpen}
              className="w-full justify-center h-8 px-2 text-sm font-medium hover:bg-secondary hover:text-secondary-foreground"
            >
              <item.icon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-1 bg-background border" align="end" side="right">
            <div className="space-y-1">
              {item.items.map((subItem) => (
                <Link
                  key={subItem.href}
                  href={subItem.href}
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors w-full",
                    pathname === subItem.href
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                  )}
                  onClick={() => {
                    setSelectedValues(prev => ({ ...prev, [item.value]: subItem.name }))
                    setOpenComboboxes(prev => ({ ...prev, [item.value]: false }))
                  }}
                >
                  <subItem.icon className="mr-2 h-4 w-4" />
                  {subItem.name}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      pathname === subItem.href ? "opacity-100" : "opacity-0"
                    )}
                  />
                </Link>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )
    }

    // 확장된 상태일 때는 일반적인 드롭다운 메뉴
    const isExpanded = expandedMenus[item.value] || false
    
    return (
      <div className="relative group">
        <Button
          variant="ghost"
          className="w-full justify-start h-8 px-2 text-sm font-medium hover:bg-secondary hover:text-secondary-foreground"
          onClick={() => setExpandedMenus(prev => ({ ...prev, [item.value]: !prev[item.value] }))}
        >
          <item.icon className="h-4 w-4 mr-3" />
          <span className="truncate">{item.name}</span>
          <ChevronDown className={cn("ml-auto h-4 w-4 shrink-0 opacity-50 transition-transform", isExpanded && "rotate-180")} />
        </Button>
        
        {/* 서브메뉴 */}
        {isExpanded && (
          <div className="ml-6 space-y-1">
            {item.items.map((subItem) => (
              <Link
                key={subItem.href}
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
        )}
      </div>
    )
  }

  const SimpleNavItem = ({ item, isBottom = false }: { 
    item: { 
      name: string; 
      href: string; 
      icon: React.ComponentType<{ className?: string }>; 
    }; 
    isBottom?: boolean 
  }) => (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Link
          href={item.href}
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
              {navigation.map((item) => (
                <NavItem key={item.value} item={item} />
              ))}
            </nav>
          </div>
          <div className="border-t border-border p-2">
            <nav className="space-y-1">
              {bottomNavigation.map((item) => (
                <SimpleNavItem key={item.name} item={item} isBottom />
              ))}
            </nav>
          </div>
        </div>
      </>
    </TooltipProvider>
  )
}