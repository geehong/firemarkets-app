"use client";

import * as React from "react";
import { ChevronRight, ChevronDown, Menu } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useNavigation } from "../hooks/useNavigation";
import { useLanguage } from "../contexts/LanguageContext";
import SidebarWidget from "./SidebarWidget";
import { cn } from "@/lib/utils";

// shadcn/ui sidebar 컴포넌트들
// 참고: 다음 패키지들이 필요합니다: @radix-ui/react-slot, class-variance-authority, clsx
// 설치: yarn add @radix-ui/react-slot class-variance-authority clsx

type NavItem = {
  name: string;
  icon?: React.ReactNode;
  path?: string;
  subItems?: {
    name: string;
    path?: string;
    pro?: boolean;
    new?: boolean;
    subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
  }[];
};

const Sidebar = React.forwardRef<
  HTMLAsideElement,
  React.HTMLAttributes<HTMLAsideElement> & {
    variant?: "default" | "collapsed";
  }
>(({ className, variant = "default", ...props }, ref) => {
  const { isExpanded, isMobileOpen, isHovered } = useSidebar();
  const isCollapsed = !isExpanded && !isHovered && !isMobileOpen;

  return (
    <aside
      ref={ref}
      className={cn(
        "fixed top-0 left-0 z-50 h-screen border-r border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800 transition-all duration-300 ease-in-out",
        isMobileOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0",
        isCollapsed ? "w-[90px]" : "w-[290px]",
        className
      )}
      {...props}
    />
  );
});
Sidebar.displayName = "Sidebar";

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { isExpanded, isMobileOpen, isHovered } = useSidebar();
  const isCollapsed = !isExpanded && !isHovered && !isMobileOpen;

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center px-5 py-8",
        isCollapsed ? "justify-center" : "justify-start",
        className
      )}
      {...props}
    />
  );
});
SidebarHeader.displayName = "SidebarHeader";

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar",
        className
      )}
      {...props}
    />
  );
});
SidebarContent.displayName = "SidebarContent";

const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex flex-col gap-4 px-5", className)}
      {...props}
    />
  );
});
SidebarGroup.displayName = "SidebarGroup";

const SidebarGroupLabel = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  const { isExpanded, isMobileOpen, isHovered } = useSidebar();
  const isCollapsed = !isExpanded && !isHovered && !isMobileOpen;

  return (
    <h2
      ref={ref}
      className={cn(
        "mb-4 text-xs uppercase leading-[20px] text-gray-400",
        isCollapsed ? "flex justify-center" : "flex justify-start",
        className
      )}
      {...props}
    />
  );
});
SidebarGroupLabel.displayName = "SidebarGroupLabel";

const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => {
  return (
    <ul ref={ref} className={cn("flex flex-col gap-4", className)} {...props} />
  );
});
SidebarMenu.displayName = "SidebarMenu";

const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => {
  return <li ref={ref} className={cn("", className)} {...props} />;
});
SidebarMenuItem.displayName = "SidebarMenuItem";

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isActive?: boolean;
    variant?: "default" | "ghost";
  }
>(({ className, isActive, variant = "default", ...props }, ref) => {
  const { isExpanded, isMobileOpen, isHovered } = useSidebar();
  const isCollapsed = !isExpanded && !isHovered && !isMobileOpen;

  return (
    <button
      ref={ref}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        isActive && "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white",
        !isActive && "text-gray-600 dark:text-gray-400",
        isCollapsed && "justify-center",
        variant === "ghost" && "hover:bg-transparent",
        className
      )}
      {...props}
    />
  );
});
SidebarMenuButton.displayName = "SidebarMenuButton";

const SidebarMenuSub = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement> & {
    isOpen?: boolean;
  }
>(({ className, isOpen, ...props }, ref) => {
  return (
    <ul
      ref={ref}
      className={cn(
        "mt-2 space-y-1 ml-9 overflow-hidden transition-all duration-300",
        isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0",
        className
      )}
      {...props}
    />
  );
});
SidebarMenuSub.displayName = "SidebarMenuSub";

const SidebarMenuSubItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => {
  return <li ref={ref} className={cn("", className)} {...props} />;
});
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";

const SidebarMenuSubButton = React.forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> &
    React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      isActive?: boolean;
      asChild?: boolean;
    }
>(({ className, isActive, asChild, ...props }, ref) => {
  const Comp = asChild ? Link : "button";
  return (
    <Comp
      ref={ref as any}
      className={cn(
        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        isActive && "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white",
        !isActive && "text-gray-600 dark:text-gray-400",
        className
      )}
      {...props}
    />
  );
});
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";

// 메인 컴포넌트
const AppSidebarShadcn: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const { language } = useLanguage();
  const { menuItems, loading, error } = useNavigation(language);

  const [openSubmenu, setOpenSubmenu] = React.useState<{
    type: "main";
    index: number;
  } | null>(null);
  const [openSubSubmenu, setOpenSubSubmenu] = React.useState<string | null>(
    null
  );

  // Convert dynamic menu items to NavItem type
  const convertDynamicMenuToNavItems = (dynamicItems: any[]): NavItem[] => {
    return dynamicItems
      .filter((item) => item.is_active)
      .sort((a: any, b: any) => a.order - b.order)
      .map((item) => {
        return {
          name: item.name,
          path: item.path,
          icon: <Menu className="w-5 h-5" />,
          subItems:
            item.children && item.children.length > 0
              ? item.children
                  .filter((child: any) => child.is_active)
                  .sort((a: any, b: any) => a.order - b.order)
                  .map((child: any) => {
                    return {
                      name: child.name,
                      path: child.path,
                      pro: false,
                      new: false,
                      subItems:
                        child.children && child.children.length > 0
                          ? child.children
                              .filter((grandChild: any) => grandChild.is_active)
                              .sort(
                                (a: any, b: any) => a.order - b.order
                              )
                              .map((grandChild: any) => ({
                                name: grandChild.name,
                                path: grandChild.path,
                                pro: false,
                                new: false,
                              }))
                          : undefined,
                    };
                  })
              : undefined,
        };
      });
  };

  const finalNavItems = convertDynamicMenuToNavItems(menuItems);

  const isActive = React.useCallback(
    (path: string) => path === pathname,
    [pathname]
  );

  // Auto-open submenu based on current path
  React.useEffect(() => {
    let submenuMatched = false;
    let subSubmenuMatched = false;

    finalNavItems.forEach((nav, index) => {
      if (nav.subItems) {
        nav.subItems.forEach((subItem, subIndex) => {
          if (subItem.path && isActive(subItem.path)) {
            setOpenSubmenu({
              type: "main",
              index,
            });
            submenuMatched = true;
          }

          if (subItem.subItems) {
            subItem.subItems.forEach((subSubItem) => {
              if (subSubItem.path && isActive(subSubItem.path)) {
                setOpenSubmenu({
                  type: "main",
                  index,
                });
                setOpenSubSubmenu(`${index}-${subIndex}`);
                submenuMatched = true;
                subSubmenuMatched = true;
              }
            });
          }
        });
      }
    });
  }, [pathname, isActive, finalNavItems]);

  const handleSubmenuToggle = (index: number, menuType: "main") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const handleSubSubmenuToggle = (mainIndex: number, subIndex: number) => {
    const key = `${mainIndex}-${subIndex}`;
    setOpenSubSubmenu((prevOpenSubSubmenu) => {
      if (prevOpenSubSubmenu === key) {
        return null;
      }
      return key;
    });
  };

  const isCollapsed = !isExpanded && !isHovered && !isMobileOpen;

  return (
    <Sidebar
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <SidebarHeader>
        <Link href="/">
          {isCollapsed ? (
            <Image
              src="/images/logo/logo-icon.svg"
              alt="Logo"
              width={32}
              height={32}
            />
          ) : (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="Logo"
                width={150}
                height={40}
                style={{ height: "auto" }}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={150}
                height={40}
                style={{ height: "auto" }}
              />
            </>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <nav className="mb-6">
          <SidebarGroup>
            <SidebarGroupLabel>
              {isCollapsed ? "•" : "Menu"}
            </SidebarGroupLabel>

            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="text-sm text-gray-500">Loading...</div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-4">
                <div className="text-sm text-red-500">Error loading menu</div>
              </div>
            ) : (
              <SidebarMenu>
                {finalNavItems.map((nav, index) => (
                  <SidebarMenuItem key={nav.name}>
                    {nav.subItems ? (
                      <>
                        <SidebarMenuButton
                          onClick={() => handleSubmenuToggle(index, "main")}
                          isActive={
                            openSubmenu?.type === "main" &&
                            openSubmenu?.index === index
                          }
                        >
                          {nav.icon}
                          {!isCollapsed && (
                            <>
                              <span className="flex-1 text-left">
                                {nav.name}
                              </span>
                              {openSubmenu?.type === "main" &&
                              openSubmenu?.index === index ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </>
                          )}
                        </SidebarMenuButton>

                        {!isCollapsed && (
                          <SidebarMenuSub
                            isOpen={
                              openSubmenu?.type === "main" &&
                              openSubmenu?.index === index
                            }
                          >
                            {nav.subItems.map((subItem, subIndex) => (
                              <SidebarMenuSubItem key={subItem.name}>
                                {subItem.subItems &&
                                subItem.subItems.length > 0 ? (
                                  <>
                                    <SidebarMenuSubButton
                                      onClick={() =>
                                        handleSubSubmenuToggle(index, subIndex)
                                      }
                                      isActive={
                                        openSubSubmenu === `${index}-${subIndex}`
                                      }
                                    >
                                      <span>{subItem.name}</span>
                                      {openSubSubmenu ===
                                      `${index}-${subIndex}` ? (
                                        <ChevronDown className="w-4 h-4" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4" />
                                      )}
                                    </SidebarMenuSubButton>

                                    <SidebarMenuSub
                                      isOpen={
                                        openSubSubmenu === `${index}-${subIndex}`
                                      }
                                    >
                                      {subItem.subItems.map((subSubItem) => (
                                        <SidebarMenuSubItem
                                          key={subSubItem.name}
                                        >
                                          {subSubItem.path ? (
                                            <SidebarMenuSubButton
                                              asChild
                                              isActive={isActive(
                                                subSubItem.path
                                              )}
                                            >
                                              <Link href={subSubItem.path}>
                                                {subSubItem.name}
                                                {subSubItem.new && (
                                                  <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                                    new
                                                  </span>
                                                )}
                                                {subSubItem.pro && (
                                                  <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                                    pro
                                                  </span>
                                                )}
                                              </Link>
                                            </SidebarMenuSubButton>
                                          ) : (
                                            <SidebarMenuSubButton>
                                              {subSubItem.name}
                                            </SidebarMenuSubButton>
                                          )}
                                        </SidebarMenuSubItem>
                                      ))}
                                    </SidebarMenuSub>
                                  </>
                                ) : subItem.path ? (
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={
                                      subItem.path ? isActive(subItem.path) : false
                                    }
                                  >
                                    <Link href={subItem.path}>
                                      {subItem.name}
                                      {subItem.new && (
                                        <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                          new
                                        </span>
                                      )}
                                      {subItem.pro && (
                                        <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                          pro
                                        </span>
                                      )}
                                    </Link>
                                  </SidebarMenuSubButton>
                                ) : (
                                  <SidebarMenuSubButton>
                                    {subItem.name}
                                  </SidebarMenuSubButton>
                                )}
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        )}
                      </>
                    ) : nav.path ? (
                      <SidebarMenuButton
                        asChild
                        isActive={nav.path ? isActive(nav.path) : false}
                      >
                        <Link href={nav.path}>
                          {nav.icon}
                          {!isCollapsed && <span>{nav.name}</span>}
                        </Link>
                      </SidebarMenuButton>
                    ) : null}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroup>
        </nav>

        {!isCollapsed && <SidebarWidget />}
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebarShadcn;

