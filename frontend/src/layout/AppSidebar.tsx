"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/auth/useAuthNew";
import { Link, usePathname } from "@/i18n/navigation";
import Image from "next/image";
import { useSidebar } from "../context/SidebarContext";
import { Sidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import {
  BoxCubeIcon,
  BoxIcon,
  CalenderIcon,
  DollarLineIcon,
  BoltIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  MapIcon,
  DashboardIcon,
  AssetsIcon,
  OnChainIcon,
  BlogIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
} from "../icons/index";
import SidebarWidget from "./SidebarWidget";
import { useTranslations } from "next-intl";

type NavItem = {
  name: string;
  icon?: React.ReactNode;
  path?: string;
  subItems?: NavItem[];
  pro?: boolean;

  new?: boolean;
  roles?: string[]; // Allowed roles
};

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const t = useTranslations('Sidebar');
  const [broken, setBroken] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Get User Role from Auth Context
  const { user, isAuthenticated } = useAuth();
  const userRole = isAuthenticated && user ? user.role : 'guest';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // console.log("AppSidebar User Role:", userRole);
  }, [userRole]);

  // Common icon for 3rd level items
  const dotIcon = (
    <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor" className="text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg">
      <circle cx="3" cy="3" r="3" />
    </svg>
  );

  // Navigation Data
  const navItems: NavItem[] = [
    {
      icon: <DashboardIcon />,
      name: t('dashboard'),
      path: "/dashboard",
      //subItems: [{ name: "Ecommerce", path: "/", pro: false }],
    },
    {
      icon: <MapIcon />,
      name: "Map",
      path: "/map",
    },
    {
      icon: <OnChainIcon />,
      name: t('onChain'),
      subItems: [
        {
          name: t('halving'),
          icon: <BoxCubeIcon />,
          subItems: [
            { name: t('cycleComparison'), path: "/onchain/halving/cycle-comparison", icon: dotIcon },
            { name: t('halvingBull'), path: "/onchain/halving/halving-bull-chart", icon: dotIcon },
          ],
        },
        {
          name: t('marketCycle'),
          icon: <PieChartIcon />,
          subItems: [
            { name: t('mvrvZScore'), path: "/onchain/mvrv_z_score", icon: dotIcon },
            { name: t('nupl'), path: "/onchain/nupl", icon: dotIcon },
            { name: t('realizedCap'), path: "/onchain/realized_cap", icon: dotIcon },
            { name: t('thermoCap'), path: "/onchain/thermo_cap", icon: dotIcon },
            { name: t('realizedPrice'), path: "/onchain/realized_price", icon: dotIcon },
            { name: t('trueMarketMean'), path: "/onchain/true_market_mean", icon: dotIcon },
            { name: t('aviv'), path: "/onchain/aviv", icon: dotIcon },
          ],
        },
        {
          name: t('holderBehavior'),
          icon: <UserCircleIcon />,
          subItems: [
            { name: t('sopr'), path: "/onchain/sopr", icon: dotIcon },
            { name: t('cdd90dma'), path: "/onchain/cdd_90dma", icon: dotIcon },
            { name: t('hodlWavesSupply'), path: "/onchain/hodl_waves_supply", icon: dotIcon },
            { name: t('nrplBtc'), path: "/onchain/nrpl_btc", icon: dotIcon },
          ],
        },
        {
          name: t('networkHealth'),
          icon: <BoltIcon />,
          subItems: [
            { name: t('hashRate'), path: "/onchain/hashrate", icon: dotIcon },
            { name: t('difficulty'), path: "/onchain/difficulty", icon: dotIcon },
            { name: t('minerReserves'), path: "/onchain/miner_reserves", icon: dotIcon },
          ],
        },
        {
          name: t('derivatives'),
          icon: <DollarLineIcon />,
          subItems: [
            { name: t('openInterestFutures'), path: "/onchain/open_interest_futures", icon: dotIcon },
          ],
        },
        {
          name: t('institutional'),
          icon: <GridIcon />,
          subItems: [
            { name: t('etfBtcTotal'), path: "/onchain/etf_btc_total", icon: dotIcon },
          ],
        },
      ],
    },
    {
      name: t('assets'), // "Assets"
      icon: <AssetsIcon />,
      subItems: [
        { name: "All List", path: "/assets", icon: <GridIcon /> },
        { name: "Stocks", path: "/assets?type_name=Stocks", icon: <BoxCubeIcon /> },
        { name: "Commodities", path: "/assets?type_name=Commodities", icon: <BoxIcon /> },
        { name: "ETFs", path: "/assets?type_name=ETFs", icon: <PieChartIcon /> },
        { name: "Funds", path: "/assets?type_name=Funds", icon: <DollarLineIcon /> },
        { name: "Crypto", path: "/assets?type_name=Crypto", icon: <BoltIcon /> },
      ],
    },
    {
      name: t('blog'), // "Blog"
      icon: <BlogIcon />,
      path: "/blog",
    },
    {
      name: "News",
      icon: <PageIcon />, // Using PageIcon until dedicated NewsIcon
      path: "/news"
    },
    {
      icon: <PieChartIcon />,
      name: t('charts'),
      path: "/chart",
    },
    {
      name: t('tables'),
      icon: <TableIcon />,
      path: "/tables",
    },
    {
      name: "Widgets",
      icon: <GridIcon />,
      path: "/widgets",
    },
    {
      name: "Admin", // Translation key needed later
      icon: <UserCircleIcon />, // Using UserCircleIcon until a specific Admin icon is available
      roles: ['admin', 'super_admin'],
      subItems: [
        {
          name: "Post",
          path: "/admin/post", // Base path for expanding if needed, or just header
          icon: <PageIcon />,
          subItems: [
            { name: "Add Post", path: "/admin/post/create", icon: dotIcon },
            { name: "List Posts", path: "/admin/post/list", icon: dotIcon },
            { name: "Categories", path: "/admin/post/category", icon: dotIcon },
            { name: "Comments", path: "/admin/post/comments", icon: dotIcon },
            { name: "Tags", path: "/admin/post/tag", icon: dotIcon },
          ]
        },
        {
          name: "Page",
          path: "/admin/page",
          icon: <PageIcon />,
          subItems: [
            { name: "Add Page", path: "/admin/page/create", icon: dotIcon },
            { name: "List Pages", path: "/admin/page/list", icon: dotIcon },
          ]
        },
        {
          name: "Config",
          path: "/admin/config",
          icon: <BoltIcon />,
          subItems: [
            { name: "App", path: "/admin/config/app", icon: dotIcon },
            { name: "UI", path: "/admin/config/ui", icon: dotIcon },
            { name: "User", path: "/admin/config/user", icon: dotIcon },
          ]
        }
      ]
    },
  ];

  const othersItems: NavItem[] = [
    {
      icon: <UserCircleIcon />,
      name: t('profile'), // Previously in navItems
      path: "/profile",
    },
    {
      icon: <CalenderIcon />,
      name: t('calendar'), // Previously in navItems
      path: "/calendar",
    },
    {
      name: t('pages'), // Previously in navItems
      icon: <PageIcon />,
      subItems: [
        { name: "Blank Page", path: "/blank", pro: false },
        { name: "404 Error", path: "/error-404", pro: false },
        {
          name: "Design Concepts",
          icon: <GridIcon />,
          subItems: [
            {
              name: "Dashboard",
              icon: <DashboardIcon />,
              subItems: [
                { name: "Command Center", path: "/design-concepts/dashboard/command-center", icon: dotIcon },
                { name: "Market Pulse", path: "/design-concepts/dashboard/market-pulse", icon: dotIcon },
                { name: "Focus Mode", path: "/design-concepts/dashboard/focus-mode", icon: dotIcon },
                { name: "On-Chain Insight", path: "/design-concepts/dashboard/on-chain-insight", icon: dotIcon },
                { name: "Personalized Feed", path: "/design-concepts/dashboard/personalized-feed", icon: dotIcon },
                { name: "Quantum Grid", path: "/design-concepts/dashboard/quantum-grid", icon: dotIcon, new: true },
                { name: "Aurora Analytics", path: "/design-concepts/dashboard/aurora-analytics", icon: dotIcon, new: true },
                { name: "Matrix Flow", path: "/design-concepts/dashboard/matrix-flow", icon: dotIcon, new: true },
                { name: "Nebula Station", path: "/design-concepts/dashboard/nebula-station", icon: dotIcon, new: true },
                { name: "Prism Hub", path: "/design-concepts/dashboard/prism-hub", icon: dotIcon, new: true },
              ]
            },
            {
              name: "Home Page",
              icon: <PageIcon />,
              subItems: [
                { name: "Live Earth", path: "/design-concepts/home/live-earth", icon: dotIcon },
                { name: "Neo-Terminal", path: "/design-concepts/home/neo-terminal", icon: dotIcon },
                { name: "Institutional Trust", path: "/design-concepts/home/institutional-trust", icon: dotIcon },
                { name: "Interactive Demo", path: "/design-concepts/home/interactive-demo", icon: dotIcon },
                { name: "Community Driven", path: "/design-concepts/home/community-driven", icon: dotIcon },
              ]
            }
          ]
        },
        {
          name: "Level 1",
          icon: <GridIcon />,
          subItems: [
            {
              name: "Level 2",
              path: "/level-2",
              icon: <TableIcon />,
              subItems: [
                { name: "Level 3", path: "/level-3", icon: <PageIcon /> }
              ]
            }
          ]
        }
      ],
    },
    {
      name: t('forms'), // Previously in navItems
      icon: <ListIcon />,
      subItems: [{ name: "Form Elements", path: "/form-elements", pro: false }],
    },
    {
      icon: <BoxCubeIcon />,
      name: t('uiElements'),
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
      name: t('auth'),
      subItems: [
        { name: "Sign In", path: "/signin", pro: false },
        { name: "Sign Up", path: "/signup", pro: false },
      ],
    },
  ];

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  const hasActiveChild = useCallback((item: NavItem): boolean => {
    if (item.path && isActive(item.path)) return true;
    if (item.subItems) {
      return item.subItems.some(subItem => hasActiveChild(subItem));
    }
    return false;
  }, [isActive]);


  const filterMenuByRole = (items: NavItem[], role: string): NavItem[] => {
    return items
      .filter((item) => !item.roles || item.roles.includes(role))
      .map((item) => ({
        ...item,
        subItems: item.subItems ? filterMenuByRole(item.subItems, role) : undefined,
      }));
  };

  const renderMenuItems = (items: NavItem[]) => {
    return items.map((item, index) => {
      if (item.subItems) {
        return (
          <SubMenu
            key={`${item.name}-${index}`}
            label={item.name}
            icon={item.icon}
            defaultOpen={hasActiveChild(item)}
            className={hasActiveChild(item) ? "active-submenu" : ""}
          >
            {renderMenuItems(item.subItems)}
          </SubMenu>
        );
      }

      return (
        <MenuItem
          key={`${item.name}-${index}`}
          component={item.path ? <Link href={item.path} /> : undefined}
          active={item.path ? isActive(item.path) : false}
          icon={item.icon}
        >
          {item.name}
          {item.new && (
            <span className="ml-auto px-1.5 py-0.5 text-[10px] font-medium text-white bg-brand-500 rounded-full">
              new
            </span>
          )}
          {item.pro && (
            <span className="ml-auto px-1.5 py-0.5 text-[10px] font-medium text-white bg-brand-500 rounded-full">
              pro
            </span>
          )}
        </MenuItem>
      );
    });
  };

  // Styles configuration
  const themes = {
    light: {
      sidebar: {
        backgroundColor: '#ffffff',
        color: '#607489',
      },
      menu: {
        menuContent: '#fbfcfd',
        icon: '#0098e5',
        hover: {
          backgroundColor: '#c5e4ff',
          color: '#44596e',
        },
        disabled: {
          color: '#9fb6cf',
        },
      },
    },
    dark: {
      sidebar: {
        backgroundColor: '#111827', // Gray 900
        color: '#9ca3af', // Gray 400
      },
      menu: {
        menuContent: '#1f2937', // Gray 800
        icon: '#3b82f6', // Blue 500
        hover: {
          backgroundColor: '#1f2937',
          color: '#f3f4f6', // Gray 100
        },
        active: {
          backgroundColor: '#1f2937',
          color: '#3b82f6',
        }
      },
    },
  };

  // We can determine theme mode here if we have a theme context, for now assuming responsive to class 'dark' on html/body is tricky in JS config.
  // react-pro-sidebar uses inline styles mostly.
  // But we can leave 'backgroundColor' transparent and use Tailwind classes on the wrapper?
  // Yes, set backgroundColor to transparent.

  return (
    <aside
      className={`fixed top-0 left-0 z-50 h-screen transition-all duration-300 ease-in-out ${isExpanded || isMobileOpen || isHovered ? "w-[290px]" : "w-[90px]"
        } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Sidebar
        width={isExpanded || isMobileOpen || isHovered ? "290px" : "90px"}
        collapsed={!isExpanded && !isHovered && !isMobileOpen}
        toggled={isMobileOpen}
        breakPoint={mounted ? "lg" : undefined}
        onBreakPoint={mounted ? setBroken : undefined}
        backgroundColor="transparent"
        rootStyles={{
          height: '100%',
          borderRight: 'none',
        }}
        className="h-full bg-white border-r border-gray-200 dark:bg-gray-900 dark:border-gray-800 text-gray-600 dark:text-gray-400 [&_.ps-sidebar-container]:no-scrollbar"
      >
        <div className={`py-8 flex justify-center`}>
          <Link href="/">
            {isExpanded || isHovered || isMobileOpen ? (
              <>
                <Image className="dark:hidden" src="/images/logo/logo.svg" alt="Logo" width={200} height={40} />
                <Image className="hidden dark:block" src="/images/logo/logo-dark.svg" alt="Logo" width={200} height={40} />
              </>
            ) : (
              <Image src="/images/logo/logo-icon.svg" alt="Logo" width={32} height={32} />
            )}
          </Link>
        </div>

        <div className="flex flex-col flex-1">
          <div className="mb-6 px-4">
            {(!isExpanded && !isHovered && !isMobileOpen) ? (
              <div className="flex justify-center mb-4"><HorizontaLDots /></div>
            ) : (
              <h2 className="mb-4 text-xs font-semibold text-gray-400 uppercase">Menu</h2>
            )}
            <Menu
              menuItemStyles={{
                button: ({ level, active, disabled }) => {
                  return {
                    color: disabled ? '#9ca3af' : active ? '#3b82f6' : 'inherit',
                    backgroundColor: active ? 'rgba(59, 130, 246, 0.08)' : undefined,
                    '&:hover': {
                      backgroundColor: 'rgba(59, 130, 246, 0.08)',
                      color: '#3b82f6',
                    },
                    borderRadius: '8px',
                    marginBottom: '4px',
                    paddingLeft: level === 0 ? '12px' : '20px',
                    transition: 'all 0.3s ease',
                  };
                },
                subMenuContent: ({ level }) => ({
                  backgroundColor: 'transparent', // Inherit from parent (dark:bg-gray-900)
                  // dark mode check is done via CSS classes on parent, so transparent works best
                }),
                icon: {
                  fontSize: '18px',
                  width: '20px',
                  height: '20px',
                }
              }}
            >
              {renderMenuItems(filterMenuByRole(navItems, userRole))}
            </Menu>
          </div>

          <div className="px-4">
            {(!isExpanded && !isHovered && !isMobileOpen) ? (
              <div className="flex justify-center mb-4"><HorizontaLDots /></div>
            ) : (
              <h2 className="mb-4 text-xs font-semibold text-gray-400 uppercase">Others</h2>
            )}
            <Menu
              menuItemStyles={{
                button: ({ level, active, disabled }) => {
                  return {
                    color: disabled ? '#9ca3af' : active ? '#3b82f6' : 'inherit',
                    backgroundColor: active ? 'rgba(59, 130, 246, 0.08)' : undefined,
                    '&:hover': {
                      backgroundColor: 'rgba(59, 130, 246, 0.08)',
                      color: '#3b82f6',
                    },
                    borderRadius: '8px',
                    marginBottom: '4px',
                    paddingLeft: level === 0 ? '12px' : '20px',
                    transition: 'all 0.3s ease',
                  };
                },
              }}
            >
              {renderMenuItems(filterMenuByRole(othersItems, userRole))}
            </Menu>
          </div>
        </div>
        {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null}
      </Sidebar>
    </aside>
  );
};

export default AppSidebar;
