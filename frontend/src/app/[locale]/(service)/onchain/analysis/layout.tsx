
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";

export default function AnalysisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const locale = useLocale();

  const tabs = [
    { name: "Moving Averages", path: "moving-averages", icon: "📊" },
    { name: "Quantitative", path: "quantitative", icon: "🧮" },
    { name: "Fundamental", path: "fundamental", icon: "🌍" },
    { name: "Technical", path: "technical", icon: "📈" },
    { name: "Speculative", path: "speculative", icon: "🎲" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <span className="text-3xl">🔍</span> Advanced Market Analysis
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Deep dive into market data with AI-powered insights, correlation matrices, and technical indicators.
        </p>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
        {tabs.map((tab) => {
          const fullPath = `/${locale}/onchain/analysis/${tab.path}`;
          const isActive = pathname.includes(tab.path);
          return (
            <Link
              key={tab.path}
              href={fullPath}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2
                ${
                  isActive
                    ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }
              `}
            >
              <span>{tab.icon}</span>
              {tab.name}
            </Link>
          );
        })}
      </div>

      <div className="min-h-[500px]">
        {children}
      </div>
    </div>
  );
}
