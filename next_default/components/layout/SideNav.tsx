"use client";

import React from "react";
import Link from "next/link";
import { LayoutDashboard, CandlestickChart, Settings, Landmark } from "lucide-react";

const menuItems = [
  { icon: <LayoutDashboard size={20} />, text: "대시보드", href: "/" },
  { icon: <CandlestickChart size={20} />, text: "실시간 시세", href: "/quotes" },
  { icon: <Landmark size={20} />, text: "시장 데이터", href: "/market" },
  { icon: <Settings size={20} />, text: "설정", href: "/settings" },
];

export const SideNav = ({ isOpen }: { isOpen: boolean }) => {
  return (
    <aside
      className={`
        bg-white text-gray-800 shadow-md transition-all duration-300 ease-in-out
        ${isOpen ? "w-64" : "w-20"}
        hidden md:flex flex-col sticky top-0 h-screen
      `}
    >
      {/* 로고 */}
      <div className="flex items-center justify-center h-16 border-b">
        <h1 className={`text-xl font-bold ${!isOpen && "hidden"}`}>FireMarkets</h1>
        <CandlestickChart className={`text-blue-600 ${isOpen && "hidden"}`} size={28} />
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 px-4 py-4 space-y-2">
        {menuItems.map((item, index) => (
          <Link
            key={index}
            href={item.href}
            className="
              group relative flex items-center px-4 py-2 text-gray-600 rounded-md
              hover:bg-gray-100 hover:text-gray-900
            "
          >
            {item.icon}
            <span
              className={`
                ml-4 transition-opacity duration-200
                ${isOpen ? "opacity-100" : "opacity-0"}
              `}
            >
              {item.text}
            </span>

            {/* 축소 상태일 때 호버 시 툴팁 표시 */}
            {!isOpen && (
              <div
                className="
                  absolute left-full rounded-md px-2 py-1 ml-4
                  bg-gray-800 text-white text-sm
                  invisible opacity-20 -translate-x-3 transition-all
                  group-hover:visible group-hover:opacity-100 group-hover:translate-x-0
                "
              >
                {item.text}
              </div>
            )}
          </Link>
        ))}
      </nav>
    </aside>
  );
};
