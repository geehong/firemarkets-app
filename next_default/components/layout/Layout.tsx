"use client";

import React, { useState, useEffect } from "react";
import { SideNav } from "./SideNav";
import { TopNav } from "./TopNav";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen">
      {/* 사이드 메뉴 */}
      <SideNav isOpen={isSidebarOpen} />

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 상단 메뉴 */}
        <TopNav onMenuClick={toggleSidebar} />

        {/* 페이지 콘텐츠 */}
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
};
