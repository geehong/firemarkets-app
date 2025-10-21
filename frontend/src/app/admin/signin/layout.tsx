import GridShape from "@/components/common/GridShape";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import { ThemeProvider } from "@/context/ThemeContext";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <ThemeProvider>
        <div className="relative flex lg:flex-row w-full h-screen justify-center flex-col dark:bg-gray-900 sm:p-0">
          {children}
          <div className="lg:w-1/2 w-full h-full bg-gradient-to-br from-blue-600 to-purple-700 lg:grid items-center hidden">
            <div className="relative items-center justify-center flex z-1">
              {/* Grid Shape for visual appeal */}
              <GridShape />
              <div className="flex flex-col items-center max-w-xs">
                <Link href="/" className="block mb-4">
                  <div className="text-white text-3xl font-bold">
                    FireMarkets
                  </div>
                </Link>
                <p className="text-center text-white/80">
                  Advanced Investment Analytics Platform
                </p>
                <p className="text-center text-white/60 text-sm mt-2">
                  Real-time market data, on-chain insights, and comprehensive asset analysis
                </p>
              </div>
            </div>
          </div>
          <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
