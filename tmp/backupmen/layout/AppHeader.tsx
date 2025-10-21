import Link from "next/link";
import React from "react";
import ClientHeader from "./ClientHeader";
import {
  BoxCubeIcon,
  CalenderIcon,
  GridIcon,
  ListIcon,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
  BookIcon,
} from "../icons/index";

// 사이드메뉴의 메인메뉴 아이템들
type NavItem = {
  icon?: React.ReactNode;
  name: string;
  path: string;
  subItems?: { name: string; path: string }[];
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Home",
    path: "/",
  },
  {
    icon: <PieChartIcon />,
    name: "Assets",
    path: "/assets",
  },
  {
    icon: <PlugInIcon />,
    name: "Onchain",
    path: "/onchain",
  },
  {
    icon: <BookIcon />,
    name: "Blog",
    path: "/blog",
    subItems: [
      { name: "All Posts", path: "/blog" },
      { name: "Admin", path: "/blog/admin" },
      { name: "New Post", path: "/blog/admin/create" },
    ],
  },

];

const AppHeader: React.FC = () => {
  return (
    <header className="hidden lg:flex sticky top-0 w-full bg-white border-gray-200 z-99999 dark:border-gray-800 dark:bg-gray-900 lg:border-b">
      <div className="flex items-center w-full px-1 py-1 lg:px-1 lg:py-1">
        {/* 햄버거 메뉴 버튼 */}
        <ClientHeader />

        {/* 메인 메뉴 네비게이션 - 중앙 정렬 */}
        <nav className="hidden lg:flex items-center justify-center flex-1 space-x-6">
          {navItems.map((item, index) => (
            <div key={index} className="relative group">
              <Link
                href={item.path}
                className="px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white transition-colors duration-200"
              >
                {item.name}
              </Link>
              {item.subItems && item.subItems.length > 0 && (
                <div className="absolute left-0 mt-2 hidden group-hover:block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md shadow-lg min-w-[160px] py-2 z-[100000]">
                  {item.subItems.map((sub, i) => (
                    <Link
                      key={i}
                      href={sub.path}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default AppHeader;
