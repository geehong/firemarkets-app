import React from "react";
import Link from "next/link";
import Image from "next/image";
import ClientSidebar from "./ClientSidebar";
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
import { useSidebar } from "../context/SidebarContext";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const AppSidebar: React.FC = () => {
  return (
    <>
      {/* 모바일 상단 메뉴 */}
      <ClientSidebar />
      
      {/* 사이드바 (모바일 + 데스크톱) */}
      <aside
        className={`fixed flex flex-col top-0 px-1 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
          w-[290px]
          lg:translate-x-0 lg:mt-0 mt-16`}
        suppressHydrationWarning
      >
      <div
        className={`py-8 flex items-center h-16 justify-start`}
      >
        <Link href="/">
          <div className="flex items-center gap-2">
            <Image
              className="h-8 w-8"
              src="/images/logo/logo-icon.svg"
              alt="FireMarkets Icon"
              width={32}
              height={32}
              priority
            />
            <Image
              className="h-12 w-auto max-w-full"
              src="/images/logo/logo.svg"
              alt="FireMarkets Logo"
              width={200}
              height={48}
              priority
            />
          </div>
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <ClientSidebar />
            </div>
          </div>
        </nav>
        <SidebarWidget />
      </div>
      </aside>
    </>
  );
};

export default AppSidebar;