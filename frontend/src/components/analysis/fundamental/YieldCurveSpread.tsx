
"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { useTheme } from "next-themes";

interface YieldCurveSpreadProps {
  data: any[];
}

export default function YieldCurveSpread({ data }: YieldCurveSpreadProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100">10Y-2Y Yield Spread (Recession Signal)</h3>
        <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#e5e7eb"} />
            <XAxis dataKey="date" stroke={isDark ? "#9CA3AF" : "#6B7280"} tickFormatter={(v) => v.slice(5)} />
            <YAxis stroke={isDark ? "#9CA3AF" : "#6B7280"} />
            <Tooltip 
                    contentStyle={{ backgroundColor: isDark ? '#1F2937' : '#fff', borderColor: isDark ? '#374151' : '#e5e7eb' }}
            />
            <Legend />
            <Line type="monotone" dataKey="year10" stroke="#8884d8" name="10 Year" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="year2" stroke="#82ca9d" name="2 Year" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="spread" stroke="#ff7300" name="Spread (10Y-2Y)" dot={false} strokeWidth={3} />
            {/* Zero Line Reference */}
            <Line type="monotone" dataKey="zero" stroke="#999" strokeDasharray="3 3" dot={false} strokeWidth={1} />
            </LineChart>
        </ResponsiveContainer>
        </div>
        <div className="mt-2 text-xs text-center text-gray-500">
            * Negative values (going below 0) historically predict recessions.
        </div>
    </div>
  );
}
