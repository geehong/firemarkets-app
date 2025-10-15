"use client";
import React, { useEffect, useState, useCallback, Fragment } from "react";
import Link from "next/link";
// @ts-ignore
import { Disclosure, Transition } from "@headlessui/react";
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
  // Removed static Assets and Onchain menus (provided dynamically)
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
  }
];

const othersItems: NavItem[] = [
  // Removed static Charts (provided dynamically)
  {
    icon: <TableIcon />,
    name: "Tables",
    subItems: [
      { name: "Basic Tables", path: "/basic-tables", pro: false },
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
  }
  // {
  //   icon: <PlugInIcon />,
  //   name: "Authentication",
  //   subItems: [
  //     { name: "Sign In", path: "/signin", pro: false },
  //     { name: "Sign Up", path: "/signup", pro: false },
  //     { name: "Auth Test", path: "/auth-test", pro: false },
  //   ],
  // },
  // Removed static Admin Management (provided dynamically)
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  const [submenuResetKey, setSubmenuResetKey] = useState(0);
  
  // 동적 메뉴 훅 사용
  const { menuItems: dynamicMenuItems, loading: dynamicMenuLoading, error: dynamicMenuError } = useNavigation();
  
  
  // 재귀 함수로 다단계 계층 구조를 정적 메뉴 형식으로 변환
  const convertDynamicMenuToStatic = (dynamicItems: any[]): NavItem[] => {
    const convertItem = (item: any): NavItem => {
      // OnChain 메트릭 링크 처리
      let processedPath = item.path;
      
      // OnChain 메트릭인 경우 특별 처리
      if (item.path && item.path.includes('/onchain/')) {
        // /onchain/overviews?metric=mvrv_z_score 형태를 /onchain/mvrv_z_score로 변환
        if (item.path.includes('?metric=')) {
          const metricMatch = item.path.match(/metric=([^&]+)/);
          if (metricMatch) {
            processedPath = `/onchain/${metricMatch[1]}`;
          }
        }
        // /onchain/overviews 형태를 /onchain으로 변환
        else if (item.path === '/onchain/overviews') {
          processedPath = '/onchain';
        }
      }
      
      return {
        name: item.name,
        icon: typeof item.icon === 'string' ? getIconComponent(item.icon) : <PlugInIcon />,
        path: processedPath,
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

  // 사이드바가 접힌 상태로 전환될 때 모든 서브메뉴를 닫기 위해 리셋 키 증가
  const isCollapsed = !isExpanded && !isHovered && !isMobileOpen;
  useEffect(() => {
    if (isCollapsed) {
      setSubmenuResetKey((k) => k + 1);
    }
  }, [isCollapsed]);

  // 선언 순서 경고 방지를 위해 isSubmenuActive 아래로 이동할 수 없어 콜백 내에서 직접 검사
  const getDefaultOpen = (subItems: any[] | undefined) => {
    if (!subItems || subItems.length === 0) return false;
    if (isCollapsed) return false;
    // isSubmenuActive는 아래에서 선언되지만, 이 함수는 렌더 중 호출되지 않고 값만 캡처하므로 안전
    return isSubmenuActive(subItems as any);
  };

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: string
  ) => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav, index) => (
        <li key={`${menuType}-${index}-${nav.name}`}>
          {nav.subItems ? (
            <Disclosure as="div" key={`${menuType}-disc-${index}-${submenuResetKey}`} defaultOpen={getDefaultOpen(nav.subItems)}>
              {({ open }: { open: boolean }) => (
                <>
                  <div
                    className={`menu-item group ${
                      open ? "menu-item-active" : "menu-item-inactive"
                    } ${
                      !isExpanded && !isHovered
                        ? "lg:justify-center"
                        : "lg:justify-start"
                    }`}
                  >
                    {/* Label/icon click navigates to section (parent path or first child) */}
                    <Link
                      href={nav.path || nav.subItems?.[0]?.path || '#'}
                      className={`${(isExpanded || isHovered || isMobileOpen) ? 'flex items-center gap-3 flex-1 min-w-0' : 'flex items-center justify-center'}`}
                    >
                      <span
                        className={
                          open
                            ? "menu-item-icon-active"
                            : "menu-item-icon-inactive"
                        }
                      >
                        {nav.icon || getIconComponent(nav.icon as string)}
                      </span>
                      {(isExpanded || isHovered || isMobileOpen) && (
                        <span className="menu-item-text truncate" title={nav.name}>
                          {nav.name}
                        </span>
                      )}
                    </Link>
                    {(isExpanded || isHovered || isMobileOpen) && (
                    <Disclosure.Button
                        className={`ml-auto w-5 h-5 flex items-center justify-center transition-transform duration-300 ${
                          open ? "rotate-180 text-brand-500" : ""
                        }`}
                        aria-label="Toggle submenu"
                      >
                        <ChevronDownIcon />
                      </Disclosure.Button>
                    )}
                  </div>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-300"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-300"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Disclosure.Panel as="ul" className="mt-2 space-y-1 ml-9">
                      {nav.subItems?.map((subItem, subIndex) => (
                        <li key={`${menuType}-${index}-sub-${subIndex}-${subItem.name}`}>
                          {subItem.subItems ? (
                  <Disclosure as="div" key={`${menuType}-subdisc-${index}-${subIndex}-${submenuResetKey}`} defaultOpen={getDefaultOpen(subItem.subItems)}>
                    {({ open: subOpen }: { open: boolean }) => (
                                <>
                                  <Disclosure.Button
                                    className={`menu-dropdown-item ${
                                      subOpen
                                        ? "menu-dropdown-item-active"
                                        : "menu-dropdown-item-inactive"
                                    } cursor-pointer`}
                                  >
                                    <span className="truncate" title={subItem.name}>
                                      {subItem.name}
                                    </span>
                                    <div
                                      className={`ml-auto w-4 h-4 transition-transform duration-300 ${
                                        subOpen ? "rotate-180 text-brand-500" : ""
                                      }`}
                                    >
                                      <ChevronDownIcon />
                                    </div>
                                  </Disclosure.Button>
                                  <Transition
                                    as={Fragment}
                                    enter="transition ease-out duration-300"
                                    enterFrom="transform opacity-0 scale-95"
                                    enterTo="transform opacity-100 scale-100"
                                    leave="transition ease-in duration-300"
                                    leaveFrom="transform opacity-100 scale-100"
                                    leaveTo="transform opacity-0 scale-95"
                                  >
                                    <Disclosure.Panel as="ul" className="mt-1 space-y-1 ml-6">
                                      {subItem.subItems?.map((grandChild, grandIndex) => (
                                        <li key={`${menuType}-${index}-sub-${subIndex}-grand-${grandIndex}-${grandChild.name}`}>
                                          <Link
                                            href={grandChild.path || '#'}
                                            className={`menu-dropdown-item ${
                                              isActive(grandChild.path || '')
                                                ? "menu-dropdown-item-active"
                                                : "menu-dropdown-item-inactive"
                                            }`}
                                          >
                                            <span className="truncate" title={grandChild.name}>
                                              {grandChild.name}
                                            </span>
                                          </Link>
                                        </li>
                                      ))}
                                    </Disclosure.Panel>
                                  </Transition>
                                </>
                              )}
                            </Disclosure>
                          ) : (
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
                    </Disclosure.Panel>
                  </Transition>
                </>
              )}
            </Disclosure>
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
        </li>
      ))}
    </ul>
  );

  // const isActive = (path: string) => path === pathname;
  const isActive = useCallback((path: string) => {
    // OnChain 메트릭에 대한 특별 처리
    if (path && path.includes('/onchain/')) {
      // /onchain/mvrv_z_score와 /onchain/overviews?metric=mvrv_z_score 매칭
      if (pathname.includes('/onchain/')) {
        const pathMetric = path.split('/onchain/')[1];
        const currentMetric = pathname.split('/onchain/')[1];
        
        // 메트릭 ID가 같은 경우 (쿼리 파라미터 제거)
        if (pathMetric && currentMetric) {
          const cleanPathMetric = pathMetric.split('?')[0];
          const cleanCurrentMetric = currentMetric.split('?')[0];
          return cleanPathMetric === cleanCurrentMetric;
        }
      }
    }
    
    return path === pathname;
  }, [pathname]);

  const isSubmenuActive = useCallback((subItems: any[]): boolean => {
    return subItems.some(item => {
      if (item.path && isActive(item.path)) {
        return true;
      }
      if (item.subItems) {
        return isSubmenuActive(item.subItems);
      }
      return false;
    });
  }, [isActive]);

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
            <>
              <Image
                className="dark:hidden h-8 w-auto"
                src="/images/logo/logo.svg"
                alt="Logo"
                width={150}
                height={32}
              />
              <Image
                className="hidden dark:block h-8 w-auto"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={150}
                height={32}
              />
            </>
          ) : (
            <Image
              className="h-8 w-8"
              src="/images/logo/logo-icon.svg"
              alt="Logo"
              width={32}
              height={32}
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
