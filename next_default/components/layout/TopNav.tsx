"use client";

import React from "react";
import { Menu, UserCircle } from "lucide-react";

export const TopNav = ({ onMenuClick }: { onMenuClick: () => void }) => {
  return (
    <header className="sticky top-0 bg-white h-16 flex items-center justify-between px-4 border-b z-10">
      {/* 햄버거 메뉴 버튼 */}
      <button
        onClick={onMenuClick}
        className="text-gray-600 hover:text-gray-900 focus:outline-none"
      >
        <Menu size={24} />
      </button>

      {/* 사용자 메뉴 */}
      <div className="flex items-center">
        <UserCircle size={24} className="text-gray-500" />
      </div>
    </header>
  );
};
