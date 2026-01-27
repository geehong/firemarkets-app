
"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

import { useFearAndGreed } from "@/hooks/analysis/useFearAndGreed";

export default function FearAndGreedGauge() {
  const { fngData, history, loading } = useFearAndGreed();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [mode, setMode] = useState<'daily'|'weekly'|'monthly'>('daily');

  // Calculate Values
  const getDisplayData = () => {
     if(!history || history.length === 0) return { value: 50, label: 'Loading...', chartData: [], categories: [] };
     
     if (mode === 'daily') {
         // Last 7 days trend
         const slice = history.slice(0, 7).reverse();
         return { 
             value: parseInt(history[0].value), 
             label: history[0].value_classification, 
             chartData: slice.map(d => parseInt(d.value)),
             categories: slice.map(d => new Date(parseInt(d.timestamp) * 1000).toLocaleDateString(undefined, {month:'numeric', day:'numeric'}))
         };
     }
     
     if (mode === 'weekly') {
         // 7 Day Avg
         const slice = history.slice(0, 7); // Last 7 days
         const sum = slice.reduce((acc: number, curr: any) => acc + parseInt(curr.value), 0);
         const avg = Math.round(sum / slice.length);
         // For Chart: Show last 14 days? or just the same 7 days?
         // User "Weekly" usually wants to see longer trend?
         // Let's show last 30 days for weekly/monthly view context
         const trendSlice = history.slice(0, 30).reverse();
         return { 
             value: avg, 
             label: getClassification(avg),
             chartData: trendSlice.map(d => parseInt(d.value)),
             categories: trendSlice.map(d => new Date(parseInt(d.timestamp) * 1000).toLocaleDateString(undefined, {month:'numeric', day:'numeric'}))
         };
     }
     
     if (mode === 'monthly') {
         // 30 Day Avg
         const slice = history.slice(0, 30);
         const sum = slice.reduce((acc: number, curr: any) => acc + parseInt(curr.value), 0);
         const avg = Math.round(sum / slice.length);
         // For Chart: Show last 60 days?
         const trendSlice = history.slice(0, 60).reverse(); // Hook only fetches 60
         return { 
             value: avg, 
             label: getClassification(avg),
             chartData: trendSlice.map(d => parseInt(d.value)),
             categories: trendSlice.map(d => new Date(parseInt(d.timestamp) * 1000).toLocaleDateString(undefined, {month:'numeric', day:'numeric'}))
         };
     }
     return { value: 50, label: 'No Data', chartData: [], categories: [] };
  };

  const getClassification = (val: number) => {
      if(val < 25) return "Extreme Fear";
      if(val < 46) return "Fear";
      if(val < 55) return "Neutral";
      if(val < 76) return "Greed";
      return "Extreme Greed";
  }

  const { value: fngValue, label: fngLabel, chartData, categories } = getDisplayData();
  
  const fngChartOptions: any = {
    chart: { type: 'radialBar', background: 'transparent' },
    plotOptions: {
      radialBar: {
        startAngle: -135, endAngle: 135, hollow: { size: '60%' },
        track: { background: isDark ? '#374151' : '#e5e7eb' },
        dataLabels: {
          name: { offsetY: -5, show: true, color: isDark ? '#9CA3AF' : '#888', fontSize: '13px' },
          value: { offsetY: 5, color: isDark ? '#fff' : '#111', fontSize: '26px', show: true, formatter: (val: number) => val }
        }
      }
    },
    colors: [fngValue < 25 ? '#FF4560' : fngValue < 46 ? '#FEB019' : fngValue < 55 ? '#775DD0' : fngValue < 76 ? '#008FFB' : '#00E396'],
    fill: { type: 'solid' },
    stroke: { lineCap: 'round' },
    labels: [fngLabel],
  };

  const lineChartOptions: any = {
      chart: { type: 'line', toolbar: { show: false } },
      stroke: { curve: 'smooth', width: 2 },
      colors: [isDark ? '#60A5FA' : '#3B82F6'],
      xaxis: { 
          categories: categories, 
          labels: { show: false }, // Hide labels to keep clean or true if space allows
          axisBorder: { show: false }, 
          axisTicks: { show: false },
          tooltip: { enabled: false }
      },
      yaxis: { show: false, min: 0, max: 100 },
      grid: { show: isDark ? false : true, borderColor: isDark ? '#374151' : '#f3f4f6', strokeDashArray: 4, xaxis: { lines: { show: false } } }, // Minimal grid
      tooltip: { enabled: true, theme: isDark ? 'dark' : 'light', x: { show: true } },
      markers: { size: 0, hover: { size: 5 } }
  };

  return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center">
        <div className="flex items-center justify-between w-full mb-4">
             <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Crypto Fear & Greed</h3>
             
             {/* Dropdown */}
             <select 
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
                className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1.5"
            >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly Avg</option>
                <option value="monthly">Monthly Avg</option>
            </select>
        </div>

        {/* Content Container - Constrained Width */}
        <div className="flex flex-col items-center w-full max-w-[280px]">
            {/* Gauge */}
            <div className="relative w-full flex justify-center">
                <ReactApexChart options={fngChartOptions} series={[fngValue]} type="radialBar" height={240} width={"100%"} />
                <div className="absolute bottom-4 w-full text-center">
                    <p className="text-xs text-gray-400">Next Update: {fngData ? new Date(parseInt(fngData.timestamp) * 1000 + 86400000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Unknown'}</p>
                </div>
            </div>
            
            {/* Trend Line - Width strictly matches Gauge container */}
            <div className="w-full mt-2">
                 <div className="text-center text-xs text-gray-400 mb-1 font-bold uppercase tracking-wider">
                     Trend ({categories.length} Days)
                 </div>
                 <div className="h-[100px] w-full">
                     {chartData.length > 0 ? (
                         <ReactApexChart options={lineChartOptions} series={[{ name: "F&G Index", data: chartData }]} type="line" height={100} width="100%" />
                     ) : (
                         <div className="flex items-center justify-center h-full text-gray-400 text-xs">No Trend Data</div>
                     )}
                 </div>
            </div>
        </div>
      </div>
  );
}
