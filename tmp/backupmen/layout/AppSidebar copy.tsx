"use client";
import React, { useEffect, useRef, useState,useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
} from "../icons/index";
import SidebarWidget from "./SidebarWidget";
import { useNavigation } from "../hooks/useNavigation";
import { getIconComponent } from "../utils/iconMapper";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { 
    name: string; 
    path: string; 
    pro?: boolean; 
    new?: boolean;
    subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
  }[];
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    subItems: [{ name: "Ecommerce", path: "/", pro: false }],
  },
  {
    icon: <PieChartIcon />,
    name: "Assets",
    subItems: [
      { name: "All Assets", path: "/assets", pro: false },
      { name: "Stocks", path: "/assets?type_name=Stocks", pro: false },
      { name: "Cryptocurrency", path: "/assets?type_name=Cryptocurrency", pro: false },
      { name: "ETFs", path: "/assets?type_name=ETF", pro: false },
      { name: "Commodities", path: "/assets?type_name=Commodity", pro: false },
    ],
  },
  {
    icon: <PlugInIcon />,
    name: "Onchain Analysis",
    subItems: [
      { name: "Overview", path: "/onchain", pro: false },
      { name: "MVRV Z-Score", path: "/onchain/mvrv_z_score", pro: false },
      { name: "NVT Ratio", path: "/onchain/nvt_ratio", pro: false },
      { name: "Realized Price", path: "/onchain/realized_price", pro: false },
      { name: "Halving Analysis", path: "/onchain/halving", pro: false },
    ],
  },
  {
    icon: <CalenderIcon />,
    name: "Calendar",
    path: "/calendar",
  },
  {
    icon: <UserCircleIcon />,
    name: "User Profile",
    path: "/profile",
  },

  {
    name: "Forms",
    icon: <ListIcon />,
    subItems: [{ name: "Form Elements", path: "/form-elements", pro: false }],
  },
  {
    name: "Tables",
    icon: <TableIcon />,
    subItems: [{ name: "Basic Tables", path: "/basic-tables", pro: false }],
  },
  {
    name: "Pages",
    icon: <PageIcon />,
    subItems: [
      { name: "Blank Page", path: "/blank", pro: false },
      { name: "404 Error", path: "/error-404", pro: false },
    ],
  },
  {
    name: "Test",
    icon: <PlugInIcon />,
    subItems: [
      { name: "WebSocket", path: "/test", pro: false },
    ],
  },
  {
    name: "3단계 테스트",
    icon: <BoxCubeIcon />,
    subItems: [
      { 
        name: "2단계 메뉴1", 
        path: "/test/level2-1", 
        pro: false,
        subItems: [
          { name: "3단계 메뉴1-1", path: "/test/level2-1/level3-1", pro: false },
          { name: "3단계 메뉴1-2", path: "/test/level2-1/level3-2", pro: false },
        ]
      },
      { 
        name: "2단계 메뉴2", 
        path: "/test/level2-2", 
        pro: false,
        subItems: [
          { name: "3단계 메뉴2-1", path: "/test/level2-2/level3-1", pro: false },
          { name: "3단계 메뉴2-2", path: "/test/level2-2/level3-2", pro: false },
          { name: "3단계 메뉴2-3", path: "/test/level2-2/level3-3", pro: false },
        ]
      },
      { name: "2단계 메뉴3 (서브없음)", path: "/test/level2-3", pro: false },
    ],
  },
];

const othersItems: NavItem[] = [
  {
    icon: <PieChartIcon />,
    name: "Charts",
    subItems: [
      { name: "Line Chart", path: "/line-chart", pro: false },
      { name: "Bar Chart", path: "/bar-chart", pro: false },
      { name: "OHLCV Chart", path: "/ohlcv-chart", pro: false },
      { name: "Halving Chart", path: "/halving-chart", pro: false },
      { name: "On-Chain Chart", path: "/onchain-chart", pro: false },
      { name: "Mini Chart", path: "/minichart", pro: false },
      { name: "TreeMap Chart", path: "/treemap-chart", pro: false },
    ],
  },
  {
    icon: <TableIcon />,
    name: "Tables",
    subItems: [
      { name: "Assets List", path: "/assets-list", pro: false },
      { name: "History Table", path: "/history-table", pro: false },
      
    ],
  },
  {
    icon: <BoxCubeIcon />,
    name: "UI Elements",
    subItems: [
      { name: "Alerts", path: "/alerts", pro: false },
      { name: "Avatar", path: "/avatars", pro: false },
      { name: "Badge", path: "/badge", pro: false },
      { name: "Buttons", path: "/buttons", pro: false },
      { name: "Images", path: "/images", pro: false },
      { name: "Videos", path: "/videos", pro: false },
    ],
  },
  {
    icon: <PlugInIcon />,
    name: "Authentication",
    subItems: [
      { name: "Sign In", path: "/signin", pro: false },
      { name: "Sign Up", path: "/signup", pro: false },
      { name: "Auth Test", path: "/auth-test", pro: false },
    ],
  },
  {
    icon: <UserCircleIcon />,
    name: "Admin Management",
    subItems: [
      { name: "App Config", path: "/admin", pro: false },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  
  // 동적 메뉴 훅 사용
  const { menuItems: dynamicMenuItems, loading: dynamicMenuLoading, error: dynamicMenuError } = useNavigation();
  
  
  // 재귀 함수로 다단계 계층 구조를 정적 메뉴 형식으로 변환
  const convertDynamicMenuToStatic = (dynamicItems: any[]): NavItem[] => {
    const convertItem = (item: any): NavItem => {
      return {
        name: item.name,
        icon: typeof item.icon === 'string' ? getIconComponent(item.icon) : <PlugInIcon />,
        path: item.path,
        subItems: item.children && item.children.length > 0 
          ? item.children.map((child: any) => convertItem(child))
          : undefined
      };
    };
    
    return dynamicItems.map(convertItem);
  };

  // 모든 메뉴 통합 (동적 메뉴 + 정적 메뉴)
  const convertedDynamicMenus = convertDynamicMenuToStatic(dynamicMenuItems || []);
  const allMenuItems = [
    ...convertedDynamicMenus,  // 동적 메뉴를 정적 형식으로 변환
    ...navItems,               // 기존 정적 메뉴
    ...othersItems             // 기존 Others 메뉴
  ];
  

  useEffect(() => {
    setIsClient(true);
  }, []);

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: string
  ) => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav, index) => (
          <li key={`${menuType}-${index}-${nav.name}`}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group  ${
                openSubmenus.has(`${menuType}-${index}`)
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={` ${
                  openSubmenus.has(`${menuType}-${index}`)
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon || getIconComponent(nav.icon)}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className={`menu-item-text truncate`} title={nav.name}>{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <div
                  className={`ml-auto w-5 h-5 transition-transform duration-200  ${
                    openSubmenus.has(`${menuType}-${index}`)
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                >
                  <ChevronDownIcon />
                </div>
              )}
            </button>
          ) : (
            (nav.path || nav.path === '') && (
              <Link
                href={nav.path || '#'}
                className={`menu-item group ${
                  isActive(nav.path || '') ? "menu-item-active" : "menu-item-inactive"
                } ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "lg:justify-start"
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path || '')
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className={`menu-item-text`}>{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenus.has(`${menuType}-${index}`)
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem, subIndex) => (
                    <li key={`${menuType}-${index}-sub-${subIndex}-${subItem.name}`}>
                    {subItem.subItems ? (
                      // 3단계 이상의 서브메뉴가 있는 경우
                      <div>
                        <button
                          onClick={() => handleSubmenuToggle(subIndex, `${menuType}-sub-${index}`)}
                          className={`menu-dropdown-item ${
                            openSubmenus.has(`${menuType}-sub-${index}-${subIndex}`)
                              ? "menu-dropdown-item-active"
                              : "menu-dropdown-item-inactive"
                          } cursor-pointer`}
                        >
                          <span className="truncate" title={subItem.name}>{subItem.name}</span>
                          <div className={`ml-auto w-4 h-4 transition-transform duration-200 ${
                            openSubmenus.has(`${menuType}-sub-${index}-${subIndex}`)
                              ? "rotate-180 text-brand-500"
                              : ""
                          }`}>
                            <ChevronDownIcon />
                          </div>
                        </button>
                        <div
                          ref={(el) => {
                            const refKey = `${menuType}-sub-${index}-${subIndex}`;
                            subMenuRefs.current[refKey] = el;
                          }}
                          className="overflow-hidden transition-all duration-300"
                          style={{
                            height:
                              openSubmenus.has(`${menuType}-sub-${index}-${subIndex}`)
                                ? `${subMenuHeight[`${menuType}-sub-${index}-${subIndex}`] || 0}px`
                                : "0px",
                          }}
                        >
                          <ul className="mt-1 space-y-1 ml-6">
                            {subItem.subItems.map((grandChild, grandIndex) => (
                              <li key={`${menuType}-${index}-sub-${subIndex}-grand-${grandIndex}-${grandChild.name}`}>
                                <Link
                                  href={grandChild.path || '#'}
                                  className={`menu-dropdown-item ${
                                    isActive(grandChild.path || '')
                                      ? "menu-dropdown-item-active"
                                      : "menu-dropdown-item-inactive"
                                  }`}
                                >
                                  <span className="truncate" title={grandChild.name}>{grandChild.name}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      // 일반 서브메뉴
                      <Link
                        href={subItem.path || '#'}
                        className={`menu-dropdown-item ${
                          isActive(subItem.path || '')
                            ? "menu-dropdown-item-active"
                            : "menu-dropdown-item-inactive"
                        } flex items-center w-full`}
                      >
                        <span className="truncate" title={subItem.name}>{subItem.name}</span>
                        <span className="flex items-center gap-1 ml-auto flex-shrink-0">
                          {subItem.new && (
                            <span
                              className={`ml-auto ${
                                isActive(subItem.path || '')
                                  ? "menu-dropdown-badge-active"
                                  : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge `}
                            >
                              new
                            </span>
                          )}
                          {subItem.pro && (
                            <span
                              className={`ml-auto ${
                                isActive(subItem.path || '')
                                  ? "menu-dropdown-badge-active"
                                  : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge `}
                            >
                              pro
                            </span>
                          )}
                        </span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(new Set());
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = (path: string) => path === pathname;
   const isActive = useCallback((path: string) => path === pathname, [pathname]);

  useEffect(() => {
    // Check if the current path matches any submenu item
    const newOpenSubmenus = new Set<string>();
    
    // Check static menus
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              newOpenSubmenus.add(`${menuType}-${index}`);
            }
          });
        }
      });
    });

    // Check dynamic menus
    if (dynamicMenuItems.length > 0) {
      dynamicMenuItems.forEach((item, index) => {
        if (item.children && item.children.length > 0) {
          item.children.forEach((subItem) => {
            if (subItem.path && isActive(subItem.path)) {
              newOpenSubmenus.add(`all-${index}`);
            }
          });
        }
      });
    }

    setOpenSubmenus(newOpenSubmenus);
  }, [pathname, isActive, dynamicMenuItems]);

  useEffect(() => {
    // Set the height of the submenu items when submenus are opened
    openSubmenus.forEach(key => {
      const subMenuElement = subMenuRefs.current[key];
      if (subMenuElement) {
        const height = subMenuElement.scrollHeight;
        setSubMenuHeight(prev => ({
          ...prev,
          [key]: height,
        }));
      } else {
        // 3단계 서브메뉴의 경우 ref가 없을 수 있으므로 기본 height 설정
        setSubMenuHeight(prev => ({
          ...prev,
          [key]: 200 // 기본 높이
        }));
      }
    });
  }, [openSubmenus]);

  const handleSubmenuToggle = (index: number, menuType: string) => {
    const key = `${menuType}-${index}`;
    setOpenSubmenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });

    // 높이 계산은 useEffect에서 처리되지만, 닫힐 때 즉시 0으로 설정
    const isOpening = !openSubmenus.has(key);
    if (!isOpening) {
      setSubMenuHeight(prev => ({
        ...prev,
        [key]: 0
      }));
    }
  };

  if (!isClient) {
    return null;
  }

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-1 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[70px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      suppressHydrationWarning
    >
      <div
        className={`py-8 flex items-center h-16 ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <Image
              className="h-12 w-auto max-w-full"
              src="/images/logo/logo.svg"
              alt="FireMarkets Logo"
              width={200}
              height={48}
              priority
            />
          ) : (
            <Image
              className="h-10 w-10"
              src="/images/logo/logo-icon.svg"
              alt="FireMarkets Icon"
              width={40}
              height={40}
              priority
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            {/* 통합된 메뉴 섹션 */}
            {!dynamicMenuLoading && !dynamicMenuError && (
              <div>
                <h2
                  className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    "Menu"
                  ) : (
                    <HorizontaLDots />
                  )}
                </h2>
                {renderMenuItems(allMenuItems, "all")}
              </div>
            )}

            {/* 로딩 상태 */}
            {dynamicMenuLoading && (
              <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            )}

            {/* 에러 상태 */}
            {dynamicMenuError && (
              <div className="text-red-500 text-sm p-2">
                메뉴 로드 실패: {dynamicMenuError}
              </div>
            )}
          </div>
        </nav>
        {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null}
      </div>
    </aside>
  );
};

export default AppSidebar;
