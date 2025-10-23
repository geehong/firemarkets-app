"use client";
import React, { useEffect, useRef, useState,useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useNavigation } from "../hooks/useNavigation";
import { useLanguage } from "../contexts/LanguageContext";
import {
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
} from "../icons/index";
import SidebarWidget from "./SidebarWidget";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { 
    name: string; 
    path?: string; 
    pro?: boolean; 
    new?: boolean;
    subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
  }[];
};


const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const { language, t } = useLanguage();
  const { menuItems, loading, error } = useNavigation(language);

  // Convert dynamic menu items to NavItem type
  const convertDynamicMenuToNavItems = (dynamicItems: any[]): NavItem[] => {
    return dynamicItems
      .filter(item => item.is_active)
      .sort((a, b) => a.order - b.order)
      .map(item => ({
        name: item.name,
        path: item.path,
        icon: <GridIcon />, // Default icon
        subItems: item.children && item.children.length > 0 
          ? item.children
              .filter((child: any) => child.is_active)
              .sort((a: any, b: any) => a.order - b.order)
              .map((child: any) => ({
                name: child.name,
                path: child.path,
                pro: false,
                new: false,
                subItems: child.children && child.children.length > 0
                  ? child.children
                      .filter((grandChild: any) => grandChild.is_active)
                      .sort((a: any, b: any) => a.order - b.order)
                      .map((grandChild: any) => ({
                        name: grandChild.name,
                        path: grandChild.path,
                        pro: false,
                        new: false
                      }))
                  : undefined
              }))
          : undefined
      }));
  };

  // Use dynamic menu items
  const dynamicNavItems = convertDynamicMenuToNavItems(menuItems);
  
  
  // Blog static menu items
  const blogNavItems = [
    {
      name: "Blog",
      icon: <GridIcon />,
      subItems: [
        {
          name: "All Posts",
          path: "/blog"
        },
        {
          name: "Search Posts",
          path: "/blog/search"
        },
        {
          name: "Categories",
          subItems: [
            { name: "Browse by Category", path: "/blog/category", pro: false, new: false }
          ]
        },
        {
          name: "Tags",
          subItems: [
            { name: "Browse by Tag", path: "/blog/tag", pro: false, new: false }
          ]
        },
        {
          name: "Admin",
          subItems: [
            { name: "Admin Dashboard", path: "/blog/admin", pro: false, new: false },
            { name: "Create Post", path: "/blog/admin/create", pro: false, new: false },
            { name: "Admin Dashboard Detail", path: "/blog/admin/dashboard", pro: false, new: false }
          ]
        }
      ]
    }
  ];

  const finalNavItems = [...dynamicNavItems, ...blogNavItems];

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: "main"
  ) => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSubmenuToggle(index, menuType);
              }}
              className={`menu-item group  ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
              style={{ zIndex: 9999, position: 'relative', pointerEvents: 'auto' }}
            >
              <span
                className={` ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className={`menu-item-text`}>{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200  ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </div>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path)
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
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem, subIndex) => (
                  <li key={subItem.name}>
                    {subItem.subItems && subItem.subItems.length > 0 ? (
                      // 3-level menu
                      <div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSubSubmenuToggle(index, subIndex);
                          }}
                          className={`menu-dropdown-item ${
                            openSubSubmenu === `${index}-${subIndex}`
                              ? "menu-dropdown-item-active"
                              : "menu-dropdown-item-inactive"
                          } cursor-pointer flex items-center justify-between w-full`}
                          style={{ zIndex: 9999, position: 'relative', pointerEvents: 'auto' }}
                        >
                          <span>{subItem.name}</span>
                          <ChevronDownIcon
                            className={`w-4 h-4 transition-transform duration-200 ${
                              openSubSubmenu === `${index}-${subIndex}`
                                ? "rotate-180"
                                : ""
                            }`}
                          />
                        </button>
                        <div
                          className={`transition-all duration-300 ${
                            openSubSubmenu === `${index}-${subIndex}`
                              ? "block"
                              : "hidden"
                          }`}
                        >
                          <ul className="mt-2 space-y-1 ml-9">
                            {subItem.subItems.map((subSubItem) => (
                              <li key={subSubItem.name}>
                                {subSubItem.path ? (
                                  <Link
                                    href={subSubItem.path}
                                    className={`menu-dropdown-item ${
                                      isActive(subSubItem.path)
                                        ? "menu-dropdown-item-active"
                                        : "menu-dropdown-item-inactive"
                                    }`}
                                  >
                                    {subSubItem.name}
                                    <span className="flex items-center gap-1 ml-auto">
                                      {subSubItem.new && (
                                        <span
                                          className={`ml-auto ${
                                            isActive(subSubItem.path)
                                              ? "menu-dropdown-badge-active"
                                              : "menu-dropdown-badge-inactive"
                                          } menu-dropdown-badge `}
                                        >
                                          new
                                        </span>
                                      )}
                                      {subSubItem.pro && (
                                        <span
                                          className={`ml-auto ${
                                            isActive(subSubItem.path)
                                              ? "menu-dropdown-badge-active"
                                              : "menu-dropdown-badge-inactive"
                                          } menu-dropdown-badge `}
                                        >
                                          pro
                                        </span>
                                      )}
                                    </span>
                                  </Link>
                                ) : (
                                  <span className="menu-dropdown-item menu-dropdown-item-inactive">
                                    {subSubItem.name}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      // 2-level menu
                      subItem.path ? (
                        <Link
                          href={subItem.path}
                          className={`menu-dropdown-item ${
                            isActive(subItem.path)
                              ? "menu-dropdown-item-active"
                              : "menu-dropdown-item-inactive"
                          }`}
                        >
                          {subItem.name}
                          <span className="flex items-center gap-1 ml-auto">
                            {subItem.new && (
                              <span
                                className={`ml-auto ${
                                  isActive(subItem.path)
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
                                  isActive(subItem.path)
                                    ? "menu-dropdown-badge-active"
                                    : "menu-dropdown-badge-inactive"
                                } menu-dropdown-badge `}
                              >
                                pro
                              </span>
                            )}
                          </span>
                        </Link>
                      ) : (
                        <span className="menu-dropdown-item menu-dropdown-item-inactive">
                          {subItem.name}
                        </span>
                      )
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

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main";
    index: number;
  } | null>(null);
  const [openSubSubmenu, setOpenSubSubmenu] = useState<string | null>(null);
  
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = (path: string) => path === pathname;
   const isActive = useCallback((path: string) => path === pathname, [pathname]);

  useEffect(() => {
    // Check if the current path matches any submenu item
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
          
          // Check 3-level menu
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

    // Only close submenu if no path matches (don't close manually opened menus)
    if (!submenuMatched) {
      // Don't close manually opened submenu
    }
    if (!subSubmenuMatched) {
      // Don't close manually opened sub-submenu
    }
  }, [pathname, isActive]);

  useEffect(() => {
    // Set the height of the submenu items when the submenu is opened
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        const height = subMenuRefs.current[key]?.scrollHeight || 0;
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: height,
        }));
      }
    }
  }, [openSubmenu]);


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

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex  ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="Logo"
                width={150}
                height={40}
                style={{ height: 'auto' }}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={150}
                height={40}
                style={{ height: 'auto' }}
              />
            </>
          ) : (
            <Image
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
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="text-sm text-gray-500">Loading...</div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-4">
                  <div className="text-sm text-red-500">Error loading menu</div>
                </div>
              ) : (
                renderMenuItems(finalNavItems, "main")
              )}
            </div>

          </div>
        </nav>
        {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null}
      </div>
    </aside>
  );
};

export default AppSidebar;
